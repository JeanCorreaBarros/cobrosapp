import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requerirSesion,
  esSesion,
  requerirEscritura,
  siguienteCodigoPagoSeguridad,
  asegurarCuotasSeguridad,
} from "@/lib/api";
import { esquemaPagoSeguridad } from "@/lib/validaciones/poliza";
import { distribuirPagoSeguridad, totalPendientePoliza, calcularEstadoPoliza } from "@/lib/seguridad";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const { searchParams } = new URL(request.url);
  const polizaId = searchParams.get("polizaId");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? "1"));
  const porPagina = 30;

  const where: Prisma.PagoSeguridadWhereInput = {
    ...(polizaId ? { polizaId } : {}),
    ...(desde || hasta
      ? {
          fecha: {
            ...(desde ? { gte: new Date(desde) } : {}),
            ...(hasta ? { lte: new Date(hasta) } : {}),
          },
        }
      : {}),
  };

  const [pagos, total] = await Promise.all([
    prisma.pagoSeguridad.findMany({
      where,
      include: {
        poliza: { select: { codigo: true, cliente: { select: { id: true, nombre: true } } } },
        usuario: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.pagoSeguridad.count({ where }),
  ]);

  return NextResponse.json({ pagos, total, pagina, porPagina });
}

export async function POST(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirEscritura(sesion);
  if (permiso) return permiso;

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaPagoSeguridad.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const existente = await prisma.polizaSeguridad.findFirst({
    where: { id: datos.data.polizaId, eliminadoEn: null },
  });
  if (!existente) {
    return NextResponse.json({ error: "Póliza no encontrada" }, { status: 404 });
  }
  if (existente.estado === "CANCELADA") {
    return NextResponse.json({ error: "Esta póliza está cancelada" }, { status: 409 });
  }

  await asegurarCuotasSeguridad(existente.id);

  const poliza = await prisma.polizaSeguridad.findUniqueOrThrow({
    where: { id: existente.id },
    include: { cuotas: { orderBy: { numero: "asc" } } },
  });

  const cuotasParaCalculo = poliza.cuotas.map((c) => ({
    id: c.id,
    numero: c.numero,
    montoCuota: Number(c.montoCuota),
    montoPagado: Number(c.montoPagado),
  }));
  const pendientes = cuotasParaCalculo.filter((c) => c.montoPagado < c.montoCuota - 0.009);
  if (pendientes.length === 0) {
    return NextResponse.json({ error: "No hay cuotas pendientes por cobrar" }, { status: 409 });
  }

  const totalPendiente = totalPendientePoliza(pendientes);
  if (datos.data.monto > totalPendiente + 0.01) {
    return NextResponse.json(
      {
        error: `El monto excede el saldo pendiente generado (${totalPendiente.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Se generan más cuotas automáticamente con el tiempo.`,
      },
      { status: 400 },
    );
  }

  const { aplicaciones, sobrante } = distribuirPagoSeguridad(pendientes, datos.data.monto);
  if (sobrante > 0.01) {
    return NextResponse.json({ error: "No se pudo aplicar el pago correctamente" }, { status: 500 });
  }

  const codigo = await siguienteCodigoPagoSeguridad();
  const fechaPago = datos.data.fecha ? new Date(datos.data.fecha) : new Date();

  const resultado = await prisma.$transaction(async (tx) => {
    const pago = await tx.pagoSeguridad.create({
      data: {
        codigo,
        polizaId: poliza.id,
        monto: datos.data.monto,
        metodo: datos.data.metodo,
        fecha: fechaPago,
        usuarioId: sesion.id,
        aplicaciones: {
          create: aplicaciones.map((a) => ({ cuotaId: a.cuotaId, monto: a.monto })),
        },
      },
    });

    for (const a of aplicaciones) {
      await tx.cuotaSeguridad.update({
        where: { id: a.cuotaId },
        data: { montoPagado: a.nuevoMontoPagado },
      });
    }

    const cuotasActualizadas = await tx.cuotaSeguridad.findMany({ where: { polizaId: poliza.id } });
    const nuevoEstado = calcularEstadoPoliza(
      cuotasActualizadas.map((c) => ({
        montoCuota: Number(c.montoCuota),
        montoPagado: Number(c.montoPagado),
        fechaVencimiento: c.fechaVencimiento,
      })),
    );
    await tx.polizaSeguridad.update({ where: { id: poliza.id }, data: { estado: nuevoEstado } });

    return { pago, nuevoEstado };
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "CREAR",
      entidad: "PagoSeguridad",
      entidadId: resultado.pago.id,
      detalle: { codigo, polizaId: poliza.id, monto: datos.data.monto },
    },
  });

  return NextResponse.json({ pago: resultado.pago, estadoPoliza: resultado.nuevoEstado }, { status: 201 });
}
