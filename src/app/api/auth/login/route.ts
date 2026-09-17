import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { crearCookieSesion } from "@/lib/auth";

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

const esquema = z.object({
  usuario: z.string().trim().min(1, "Escribe tu usuario"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => null);
  const datos = esquema.safeParse(cuerpo);

  if (!datos.success) {
    return NextResponse.json(
      { error: datos.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const { usuario, password } = datos.data;
  const registro = await prisma.usuario.findUnique({ where: { usuario } });
  const generico = { error: "Usuario o contraseña incorrectos" };

  if (!registro || !registro.activo || registro.eliminadoEn) {
    return NextResponse.json(generico, { status: 401 });
  }

  if (registro.bloqueadoHasta && registro.bloqueadoHasta > new Date()) {
    const minutos = Math.ceil((registro.bloqueadoHasta.getTime() - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Cuenta bloqueada. Intenta de nuevo en ${minutos} minuto(s).` },
      { status: 423 },
    );
  }

  const correcta = await bcrypt.compare(password, registro.passwordHash);

  if (!correcta) {
    const intentos = registro.intentosFallidos + 1;
    await prisma.usuario.update({
      where: { id: registro.id },
      data: {
        intentosFallidos: intentos,
        bloqueadoHasta:
          intentos >= MAX_INTENTOS
            ? new Date(Date.now() + BLOQUEO_MINUTOS * 60000)
            : registro.bloqueadoHasta,
      },
    });
    const restantes = MAX_INTENTOS - intentos;
    return NextResponse.json(
      {
        error:
          restantes > 0
            ? `Usuario o contraseña incorrectos. Te quedan ${restantes} intento(s).`
            : `Cuenta bloqueada por ${BLOQUEO_MINUTOS} minutos.`,
      },
      { status: 401 },
    );
  }

  await prisma.usuario.update({
    where: { id: registro.id },
    data: { intentosFallidos: 0, bloqueadoHasta: null, ultimoAcceso: new Date() },
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: registro.id,
      accion: "INICIO_SESION",
      entidad: "Usuario",
      entidadId: registro.id,
      ip: request.headers.get("x-forwarded-for") ?? undefined,
    },
  });

  await crearCookieSesion({
    id: registro.id,
    usuario: registro.usuario,
    nombre: registro.nombre,
    rol: registro.rol,
  });

  return NextResponse.json({ ok: true });
}
