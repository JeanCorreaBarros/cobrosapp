import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirRol } from "@/lib/api";
import { esquemaPlantilla } from "@/lib/validaciones/plantilla";

export async function GET() {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const plantillas = await prisma.plantillaPrestamo.findMany({
    where: { activa: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ plantillas });
}

export async function POST(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirRol(sesion, ["ADMIN"]);
  if (permiso) return permiso;

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaPlantilla.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const plantilla = await prisma.plantillaPrestamo.create({ data: datos.data });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "CREAR",
      entidad: "PlantillaPrestamo",
      entidadId: plantilla.id,
      detalle: { nombre: plantilla.nombre },
    },
  });

  return NextResponse.json({ plantilla }, { status: 201 });
}
