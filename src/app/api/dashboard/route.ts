import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion } from "@/lib/api";
import { calcularMoraCuota } from "@/lib/pagos";

export async function GET() {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finHoy = new Date(hoy);
  finHoy.setHours(23, 59, 59, 999);
  const inicioHoy = new Date(hoy);
  inicioHoy.setHours(0, 0, 0, 0);

  const config = await prisma.configuracion.findUnique({ where: { id: "default" } });
  const moraPorcentaje = Number(config?.moraPorcentaje ?? 2);

  const [cuotasPendientes, pagosDelMes, cuotasHoy, clientesActivos, prestamosActivos] =
    await Promise.all([
      prisma.cuota.findMany({
        where: { prestamo: { eliminadoEn: null, estado: { in: ["ACTIVO", "ATRASADO"] } } },
        select: { montoCuota: true, montoPagado: true, fechaVencimiento: true },
      }),
      prisma.pago.findMany({
        where: { anulado: false, fecha: { gte: inicioMes } },
        include: { aplicaciones: true },
      }),
      prisma.cuota.findMany({
        where: {
          fechaVencimiento: { lte: finHoy },
          prestamo: { eliminadoEn: null, estado: { in: ["ACTIVO", "ATRASADO"] } },
        },
        include: {
          prestamo: {
            select: { id: true, codigo: true, cliente: { select: { nombre: true } } },
          },
        },
        orderBy: { fechaVencimiento: "asc" },
      }),
      prisma.cliente.count({ where: { eliminadoEn: null, estado: "ACTIVO" } }),
      prisma.prestamo.count({ where: { eliminadoEn: null, estado: { in: ["ACTIVO", "ATRASADO"] } } }),
    ]);

  const pendientes = cuotasPendientes.filter(
    (c) => Number(c.montoPagado) < Number(c.montoCuota) - 0.009,
  );

  const porCobrar = pendientes.reduce((acc, c) => {
    const pendiente = Number(c.montoCuota) - Number(c.montoPagado);
    const mora = calcularMoraCuota(
      { montoCuota: Number(c.montoCuota), montoPagado: Number(c.montoPagado), fechaVencimiento: c.fechaVencimiento },
      moraPorcentaje,
      hoy,
    );
    return acc + pendiente + mora;
  }, 0);

  const enMora = pendientes
    .filter((c) => new Date(c.fechaVencimiento) < inicioHoy)
    .reduce((acc, c) => {
      const pendiente = Number(c.montoCuota) - Number(c.montoPagado);
      const mora = calcularMoraCuota(
        { montoCuota: Number(c.montoCuota), montoPagado: Number(c.montoPagado), fechaVencimiento: c.fechaVencimiento },
        moraPorcentaje,
        hoy,
      );
      return acc + pendiente + mora;
    }, 0);

  const cobradoMes = pagosDelMes.reduce((acc, p) => acc + Number(p.monto), 0);
  const gananciaMes = pagosDelMes.reduce(
    (acc, p) =>
      acc + p.aplicaciones.reduce((a, x) => a + Number(x.montoInteres) + Number(x.montoMora), 0),
    0,
  );

  const cuotasHoyPendientes = cuotasHoy
    .filter((c) => Number(c.montoPagado) < Number(c.montoCuota) - 0.009)
    .slice(0, 6)
    .map((c) => ({
      cuotaId: c.id,
      prestamoId: c.prestamo.id,
      codigo: c.prestamo.codigo,
      cliente: c.prestamo.cliente.nombre,
      monto: Number(c.montoCuota) - Number(c.montoPagado),
      atrasada: new Date(c.fechaVencimiento) < inicioHoy,
    }));

  return NextResponse.json({
    porCobrar,
    cobradoMes,
    enMora,
    gananciaMes,
    clientesActivos,
    prestamosActivos,
    cobrosHoyTotal: cuotasHoy.filter((c) => Number(c.montoPagado) < Number(c.montoCuota) - 0.009).length,
    cuotasHoy: cuotasHoyPendientes,
  });
}
