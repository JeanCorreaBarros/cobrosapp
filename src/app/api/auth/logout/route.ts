import { NextResponse } from "next/server";
import { borrarCookieSesion, sesionActual } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const sesion = await sesionActual();

  if (sesion) {
    await prisma.auditoria.create({
      data: {
        usuarioId: sesion.id,
        accion: "CIERRE_SESION",
        entidad: "Usuario",
        entidadId: sesion.id,
      },
    });
  }

  await borrarCookieSesion();
  return NextResponse.json({ ok: true });
}
