import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion } from "@/lib/api";
import { crearCookieSesion } from "@/lib/auth";

// A diferencia de /api/usuarios (solo ADMIN, edita a cualquiera), esta ruta
// la puede usar cualquier rol para editar SU PROPIA cuenta: nombre y
// contraseña. Nunca el rol, la zona o el estado activo/inactivo.
const esquema = z.object({
  nombre: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(120),
  passwordActual: z.string().min(1, "Escribe tu contraseña actual"),
  passwordNueva: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres").optional().or(z.literal("")),
});

export async function PATCH(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const cuerpo = await request.json().catch(() => null);
  const datos = esquema.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: sesion.id } });
  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const claveCorrecta = await bcrypt.compare(datos.data.passwordActual, usuario.passwordHash);
  if (!claveCorrecta) {
    return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 401 });
  }

  const actualizado = await prisma.usuario.update({
    where: { id: sesion.id },
    data: {
      nombre: datos.data.nombre,
      ...(datos.data.passwordNueva
        ? { passwordHash: await bcrypt.hash(datos.data.passwordNueva, 10) }
        : {}),
    },
  });

  // Se reemite la cookie ya con el nombre nuevo para que se vea reflejado
  // sin tener que volver a iniciar sesión.
  await crearCookieSesion({
    id: actualizado.id,
    usuario: actualizado.usuario,
    nombre: actualizado.nombre,
    rol: actualizado.rol,
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "EDITAR",
      entidad: "MiCuenta",
      entidadId: sesion.id,
      detalle: { cambioPassword: Boolean(datos.data.passwordNueva) },
    },
  });

  return NextResponse.json({ ok: true, nombre: actualizado.nombre });
}
