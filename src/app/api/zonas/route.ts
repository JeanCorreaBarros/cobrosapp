import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirRol } from "@/lib/api";
import { esquemaZona } from "@/lib/validaciones/configuracion";

export async function GET() {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const zonas = await prisma.zona.findMany({
    where: { eliminadoEn: null },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, descripcion: true },
  });

  return NextResponse.json({ zonas });
}

export async function POST(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirRol(sesion, ["ADMIN"]);
  if (permiso) return permiso;

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaZona.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const existente = await prisma.zona.findFirst({ where: { nombre: datos.data.nombre, eliminadoEn: null } });
  if (existente) {
    return NextResponse.json({ error: "Ya existe una zona con ese nombre" }, { status: 409 });
  }

  const zona = await prisma.zona.create({
    data: { nombre: datos.data.nombre, descripcion: datos.data.descripcion || null },
  });

  return NextResponse.json({ zona }, { status: 201 });
}
