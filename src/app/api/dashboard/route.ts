import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion } from "@/lib/api";
import { calcularMoraCuota } from "@/lib/pagos";
import { obtenerCobrosHoy } from "@/lib/cobrosHoy";

export async function GET() {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioHoy = new Date(hoy);
  inicioHoy.setHours(0, 0, 0, 0);

  const config = await prisma.configuracion.findUnique({ where: { id: "default" } });
  const moraPorcentaje = Number(config?.moraPorcentaje ?? 2);

  const [
    cuotasPendientes,
    pagosDelMes,
    cuotasHoyTodas,
    clientesActivos,
    prestamosActivos,
    cuotasSeguridadPendientes,
    pagosSeguridadDelMes,
    polizasActivas,
    polizasAtrasadas,
  ] = await Promise.all([
    prisma.cuota.findMany({
      where: { prestamo: { eliminadoEn: null, estado: { in: ["ACTIVO", "ATRASADO"] } } },
      select: { montoCuota: true, montoPagado: true, fechaVencimiento: true },
    }),
    prisma.pago.findMany({
      where: { anulado: false, fecha: { gte: inicioMes } },
      include: { aplicaciones: true },
    }),
    obtenerCobrosHoy(),
    prisma.cliente.count({ where: { eliminadoEn: null, estado: "ACTIVO" } }),
    prisma.prestamo.count({ where: { eliminadoEn: null, estado: { in: ["ACTIVO", "ATRASADO"] } } }),
    prisma.cuotaSeguridad.findMany({
      where: { poliza: { eliminadoEn: null, estado: { in: ["ACTIVA", "ATRASADA"] } } },
      select: {
        montoCuota: true,
        montoPagado: true,
        fechaVencimiento: true,
        poliza: { select: { id: true, codigo: true, cliente: { select: { nombre: true } } } },
      },
      orderBy: { fechaVencimiento: "asc" },
    }),
    prisma.pagoSeguridad.findMany({
      where: { anulado: false, fecha: { gte: inicioMes } },
      select: { monto: true },
    }),
    prisma.polizaSeguridad.count({ where: { eliminadoEn: null, estado: "ACTIVA" } }),
    prisma.polizaSeguridad.count({ where: { eliminadoEn: null, estado: "ATRASADA" } }),
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

  const pendientesSeguridad = cuotasSeguridadPendientes.filter(
    (c) => Number(c.montoPagado) < Number(c.montoCuota) - 0.009,
  );

  const porCobrarPolizas = pendientesSeguridad.reduce(
    (acc, c) => acc + (Number(c.montoCuota) - Number(c.montoPagado)),
    0,
  );

  const cobradoMesPolizas = pagosSeguridadDelMes.reduce((acc, p) => acc + Number(p.monto), 0);

  const proximasPolizas = pendientesSeguridad.slice(0, 8).map((c) => ({
    cuotaId: `${c.poliza.id}-${c.fechaVencimiento}`,
    ruta: `/seguridad/${c.poliza.id}`,
    codigo: c.poliza.codigo,
    cliente: c.poliza.cliente.nombre,
    monto: Number(c.montoCuota) - Number(c.montoPagado),
    fechaVencimiento: c.fechaVencimiento,
    atrasada: new Date(c.fechaVencimiento) < inicioHoy,
  }));

  return NextResponse.json({
    porCobrar,
    cobradoMes,
    enMora,
    gananciaMes,
    clientesActivos,
    prestamosActivos,
    cobrosHoyTotal: cuotasHoyTodas.length,
    cuotasHoy: cuotasHoyTodas.slice(0, 6),
    polizas: {
      activas: polizasActivas,
      atrasadas: polizasAtrasadas,
      porCobrar: porCobrarPolizas,
      cobradoMes: cobradoMesPolizas,
      cuotasPendientesTotal: pendientesSeguridad.length,
      proximas: proximasPolizas,
    },
  });
}
