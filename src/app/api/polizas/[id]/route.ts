import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirRol, requerirEscritura, asegurarCuotasSeguridad } from "@/lib/api";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const { id } = await params;
  const existe = await prisma.polizaSeguridad.findFirst({ where: { id, eliminadoEn: null } });
  if (!existe) {
    return NextResponse.json({ error: "Póliza no encontrada" }, { status: 404 });
  }

  await asegurarCuotasSeguridad(id);

  const poliza = await prisma.polizaSeguridad.findFirst({
    where: { id, eliminadoEn: null },
    include: {
      cliente: { select: { id: true, nombre: true, codigo: true, telefono: true } },
      cuotas: { orderBy: { numero: "asc" } },
    },
  });

  return NextResponse.json({ poliza });
}

// ACTIVA/ATRASADA las calcula el sistema de pagos; a mano solo se permite
// cancelar (o revertir una cancelación), y editar notas.
const esquemaEdicion = z.object({
  notas: z.string().trim().max(500).optional().or(z.literal("")),
  estado: z.enum(["CANCELADA", "ACTIVA"]).optional(),
});

export async function PATCH(request: Request, { params }: Contexto) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirEscritura(sesion);
  if (permiso) return permiso;

  const { id } = await params;
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaEdicion.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const existente = await prisma.polizaSeguridad.findFirst({ where: { id, eliminadoEn: null } });
  if (!existente) {
    return NextResponse.json({ error: "Póliza no encontrada" }, { status: 404 });
  }

  if (datos.data.estado) {
    const permisoAdmin = requerirRol(sesion, ["ADMIN"]);
    if (permisoAdmin) return permisoAdmin;
  }

  const poliza = await prisma.polizaSeguridad.update({
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
      entidad: "PolizaSeguridad",
      entidadId: poliza.id,
      detalle: { cambios: datos.data },
    },
  });

  return NextResponse.json({ poliza });
}
