import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, siguienteCodigoPago } from "@/lib/api";
import { esquemaPago } from "@/lib/validaciones/pago";
import { distribuirPago, totalPendientePrestamo, calcularEstadoPrestamo } from "@/lib/pagos";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const { searchParams } = new URL(request.url);
  const prestamoId = searchParams.get("prestamoId");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const usuarioId = searchParams.get("usuarioId");
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? "1"));
  const porPagina = 30;

  const where: Prisma.PagoWhereInput = {
    ...(prestamoId ? { prestamoId } : {}),
    ...(usuarioId ? { usuarioId } : {}),
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
    prisma.pago.findMany({
      where,
      include: {
        prestamo: {
          select: { codigo: true, cliente: { select: { id: true, nombre: true } } },
        },
        usuario: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.pago.count({ where }),
  ]);

  return NextResponse.json({ pagos, total, pagina, porPagina });
}

export async function POST(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaPago.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const prestamo = await prisma.prestamo.findFirst({
    where: { id: datos.data.prestamoId, eliminadoEn: null },
    include: { cuotas: { orderBy: { numero: "asc" } } },
  });
  if (!prestamo) {
    return NextResponse.json({ error: "Préstamo no encontrado" }, { status: 404 });
  }
  if (["PAGADO", "CANCELADO", "INCOBRABLE"].includes(prestamo.estado)) {
    return NextResponse.json(
      { error: "Este préstamo no admite más pagos por su estado actual" },
      { status: 409 },
    );
  }

  const config = await prisma.configuracion.findUnique({ where: { id: "default" } });
  const moraPorcentaje = Number(config?.moraPorcentaje ?? 2);
  const hoy = new Date();

  const cuotasParaCalculo = prestamo.cuotas.map((c) => ({
    id: c.id,
    numero: c.numero,
    capital: Number(c.capital),
    interes: Number(c.interes),
    montoCuota: Number(c.montoCuota),
    montoPagado: Number(c.montoPagado),
    fechaVencimiento: c.fechaVencimiento,
  }));

  const pendientes = cuotasParaCalculo.filter((c) => c.montoPagado < c.montoCuota - 0.009);
  if (pendientes.length === 0) {
    return NextResponse.json({ error: "Este préstamo ya está completamente pagado" }, { status: 409 });
  }

  const totalPendiente = totalPendientePrestamo(pendientes, moraPorcentaje, hoy);
  if (datos.data.monto > totalPendiente + 0.01) {
    return NextResponse.json(
      {
        error: `El monto excede el saldo pendiente del préstamo (${totalPendiente.toLocaleString(
          "es-CO",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        )})`,
      },
      { status: 400 },
    );
  }

  const { aplicaciones, sobrante } = distribuirPago(pendientes, datos.data.monto, moraPorcentaje, hoy);
  if (sobrante > 0.01) {
    return NextResponse.json({ error: "No se pudo aplicar el pago correctamente" }, { status: 500 });
  }

  const codigo = await siguienteCodigoPago();
  const fechaPago = datos.data.fecha ? new Date(datos.data.fecha) : new Date();

  const resultado = await prisma.$transaction(async (tx) => {
    const pago = await tx.pago.create({
      data: {
        codigo,
        prestamoId: prestamo.id,
        monto: datos.data.monto,
        metodo: datos.data.metodo,
        fecha: fechaPago,
        usuarioId: sesion.id,
        aplicaciones: {
          create: aplicaciones.map((a) => ({
            cuotaId: a.cuotaId,
            montoMora: a.montoMora,
            montoInteres: a.montoInteres,
            montoCapital: a.montoCapital,
          })),
        },
      },
    });

    for (const a of aplicaciones) {
      await tx.cuota.update({
        where: { id: a.cuotaId },
        data: { montoPagado: a.nuevoMontoPagado },
      });
    }

    const cuotasActualizadas = await tx.cuota.findMany({ where: { prestamoId: prestamo.id } });
    const nuevoEstado = calcularEstadoPrestamo(
      cuotasActualizadas.map((c) => ({
        montoCuota: Number(c.montoCuota),
        montoPagado: Number(c.montoPagado),
        fechaVencimiento: c.fechaVencimiento,
      })),
      hoy,
    );
    await tx.prestamo.update({ where: { id: prestamo.id }, data: { estado: nuevoEstado } });

    return { pago, nuevoEstado };
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "CREAR",
      entidad: "Pago",
      entidadId: resultado.pago.id,
      detalle: { codigo, prestamoId: prestamo.id, monto: datos.data.monto },
    },
  });

  return NextResponse.json({ pago: resultado.pago, estadoPrestamo: resultado.nuevoEstado }, { status: 201 });
}
