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
  const existente = await prisma.plantillaPrestamo.findUnique({ where: { id } });
  if (!existente) {
    return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
  }

  // Soft delete: si alguien ya la tenía seleccionada en un formulario abierto,
  // que no se rompa; simplemente deja de aparecer en la lista.
  await prisma.plantillaPrestamo.update({ where: { id }, data: { activa: false } });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "ELIMINAR",
      entidad: "PlantillaPrestamo",
      entidadId: id,
      detalle: { nombre: existente.nombre },
    },
  });

  return NextResponse.json({ ok: true });
}
