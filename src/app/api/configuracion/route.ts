import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirRol } from "@/lib/api";
import { esquemaConfiguracion } from "@/lib/validaciones/configuracion";

export async function GET() {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const configuracion = await prisma.configuracion.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  return NextResponse.json({ configuracion });
}

export async function PATCH(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirRol(sesion, ["ADMIN"]);
  if (permiso) return permiso;

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaConfiguracion.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const configuracion = await prisma.configuracion.upsert({
    where: { id: "default" },
    update: {
      ...datos.data,
      empresaRnc: datos.data.empresaRnc || null,
      empresaTelefono: datos.data.empresaTelefono || null,
      empresaDireccion: datos.data.empresaDireccion || null,
    },
    create: { id: "default", ...datos.data },
  });

  await prisma.auditoria.create({
    data: { usuarioId: sesion.id, accion: "EDITAR", entidad: "Configuracion", entidadId: "default" },
  });

  return NextResponse.json({ configuracion });
}
