import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirRol } from "@/lib/api";
import { esquemaUsuario } from "@/lib/validaciones/configuracion";

type Contexto = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Contexto) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirRol(sesion, ["ADMIN"]);
  if (permiso) return permiso;

  const { id } = await params;
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaUsuario.partial().safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const existente = await prisma.usuario.findFirst({ where: { id, eliminadoEn: null } });
  if (!existente) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (id === sesion.id && datos.data.activo === false) {
    return NextResponse.json({ error: "No puedes desactivar tu propia cuenta" }, { status: 400 });
  }
  if (id === sesion.id && datos.data.rol && datos.data.rol !== "ADMIN") {
    return NextResponse.json({ error: "No puedes quitarte el rol de administrador" }, { status: 400 });
  }

  const usuario = await prisma.usuario.update({
    where: { id },
    data: {
      nombre: datos.data.nombre,
      rol: datos.data.rol,
      zonaId: datos.data.zonaId !== undefined ? datos.data.zonaId || null : undefined,
      activo: datos.data.activo,
      ...(datos.data.password
        ? { passwordHash: await bcrypt.hash(datos.data.password, 10), intentosFallidos: 0, bloqueadoHasta: null }
        : {}),
    },
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "EDITAR",
      entidad: "Usuario",
      entidadId: id,
      detalle: { cambios: { ...datos.data, password: datos.data.password ? "***" : undefined } },
    },
  });

  return NextResponse.json({ usuario: { ...usuario, passwordHash: undefined } });
}
