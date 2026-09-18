import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirRol, requerirEscritura, asegurarCuotasSeguridad } from "@/lib/api";
import { esquemaEdicionPoliza, esquemaEliminacionPoliza } from "@/lib/validaciones/poliza";
import { calcularCuotasFaltantes } from "@/lib/seguridad";

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

// ACTIVA/ATRASADA las calcula el sistema de pagos; a mano se permite cancelar
// (o revertir una cancelación) y editar monto, frecuencia, fecha de inicio y
// notas. Si cambian monto/frecuencia/fecha, las cuotas todavía no pagadas se
// regeneran con los nuevos términos; las ya pagadas quedan intactas.
export async function PATCH(request: Request, { params }: Contexto) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirEscritura(sesion);
  if (permiso) return permiso;

  const { id } = await params;
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaEdicionPoliza.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const existente = await prisma.polizaSeguridad.findFirst({
    where: { id, eliminadoEn: null },
    include: { cuotas: true },
  });
  if (!existente) {
    return NextResponse.json({ error: "Póliza no encontrada" }, { status: 404 });
  }

  if (datos.data.estado) {
    const permisoAdmin = requerirRol(sesion, ["ADMIN"]);
    if (permisoAdmin) return permisoAdmin;
  }

  let fechaInicio = existente.fechaInicio;
  if (datos.data.fechaInicio) {
    const nueva = new Date(datos.data.fechaInicio);
    if (Number.isNaN(nueva.getTime())) {
      return NextResponse.json({ error: "Fecha de inicio inválida" }, { status: 400 });
    }
    fechaInicio = nueva;
  }
  const montoCuota = datos.data.montoCuota ?? Number(existente.montoCuota);
  const frecuencia = datos.data.frecuencia ?? existente.frecuencia;

  const cambianTerminos =
    datos.data.montoCuota !== undefined ||
    datos.data.frecuencia !== undefined ||
    datos.data.fechaInicio !== undefined;

  const poliza = await prisma.$transaction(async (tx) => {
    if (cambianTerminos) {
      // Las cuotas sin ningún pago aplicado se descartan y se regeneran con
      // los nuevos términos; las que ya tienen algo pagado se conservan tal
      // cual para no alterar el historial de cobros.
      const cuotasPagadas = existente.cuotas.filter((c) => Number(c.montoPagado) > 0);
      const sinPagar = existente.cuotas.filter((c) => Number(c.montoPagado) === 0);
      if (sinPagar.length > 0) {
        await tx.cuotaSeguridad.deleteMany({
          where: { id: { in: sinPagar.map((c) => c.id) } },
        });
      }

      const nuevas = calcularCuotasFaltantes(fechaInicio, frecuencia, montoCuota, cuotasPagadas);
      if (nuevas.length > 0) {
        await tx.cuotaSeguridad.createMany({
          data: nuevas.map((c) => ({
            polizaId: id,
            numero: c.numero,
            fechaVencimiento: c.fechaVencimiento,
            montoCuota: c.montoCuota,
          })),
        });
      }
    }

    return tx.polizaSeguridad.update({
      where: { id },
      data: {
        montoCuota: datos.data.montoCuota,
        frecuencia: datos.data.frecuencia,
        fechaInicio: datos.data.fechaInicio ? fechaInicio : undefined,
        notas: datos.data.notas !== undefined ? datos.data.notas || null : undefined,
        estado: datos.data.estado,
      },
      include: {
        cliente: { select: { id: true, nombre: true, codigo: true, telefono: true } },
        cuotas: { orderBy: { numero: "asc" } },
      },
    });
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

export async function DELETE(request: Request, { params }: Contexto) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirRol(sesion, ["ADMIN"]);
  if (permiso) return permiso;

  const { id } = await params;
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaEliminacionPoliza.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const existente = await prisma.polizaSeguridad.findFirst({ where: { id, eliminadoEn: null } });
  if (!existente) {
    return NextResponse.json({ error: "Póliza no encontrada" }, { status: 404 });
  }

  const eliminadoEn = new Date();
  await prisma.polizaSeguridad.update({
    where: { id },
    data: { eliminadoEn, motivoEliminacion: datos.data.motivo },
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "ELIMINAR",
      entidad: "PolizaSeguridad",
      entidadId: id,
      detalle: { codigo: existente.codigo, motivo: datos.data.motivo, fecha: eliminadoEn },
    },
  });

  return NextResponse.json({ ok: true });
}
