import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirRol } from "@/lib/api";
import { z } from "zod";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const { id } = await params;
  const prestamo = await prisma.prestamo.findFirst({
    where: { id, eliminadoEn: null },
    include: {
      cliente: { select: { id: true, nombre: true, codigo: true, telefono: true } },
      cuotas: { orderBy: { numero: "asc" } },
    },
  });

  if (!prestamo) {
    return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ prestamo });
}

const esquemaEdicion = z.object({
  notas: z.string().trim().max(500).optional().or(z.literal("")),
  estado: z.enum(["ACTIVO", "ATRASADO", "PAGADO", "CANCELADO", "INCOBRABLE"]).optional(),
});

export async function PATCH(request: Request, { params }: Contexto) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const { id } = await params;
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaEdicion.safeParse(cuerpo);

  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const existente = await prisma.prestamo.findFirst({ where: { id, eliminadoEn: null } });
  if (!existente) {
    return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 });
  }

  if (datos.data.estado === "CANCELADO" || datos.data.estado === "INCOBRABLE") {
    const permiso = requerirRol(sesion, ["ADMIN"]);
    if (permiso) return permiso;
  }

  const prestamo = await prisma.prestamo.update({
    where: { id },
    data: {
      notas: datos.data.notas !== undefined ? datos.data.notas || null : undefined,
      estado: datos.data.estado,
    },
    include: {
      cliente: { select: { id: true, nombre: true, codigo: true, telefono: true } },
      cuotas: { orderBy: { numero: "asc" } },
    },
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "EDITAR",
      entidad: "Prestamo",
      entidadId: prestamo.id,
      detalle: { cambios: datos.data },
    },
  });

  return NextResponse.json({ prestamo });
}
