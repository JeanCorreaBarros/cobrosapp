import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirRol } from "@/lib/api";

type Contexto = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Contexto) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirRol(sesion, ["ADMIN"]);
  if (permiso) return permiso;

  const { id } = await params;
  const enUso = await prisma.cliente.count({ where: { zonaId: id, eliminadoEn: null } });
  if (enUso > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: ${enUso} cliente(s) siguen asignados a esta zona` },
      { status: 409 },
    );
  }

  await prisma.zona.update({ where: { id }, data: { eliminadoEn: new Date() } });
  return NextResponse.json({ ok: true });
}
