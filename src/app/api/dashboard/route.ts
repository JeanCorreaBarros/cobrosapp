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

  // Una fila por póliza (no por cuota): si una póliza acumuló varias cuotas
  // sin pagar, se junta en un solo total pendiente con la fecha de la más
  // antigua, en vez de repetir una fila por cada cuota vencida.
  const porPoliza = new Map<
    string,
    { ruta: string; codigo: string; cliente: string; monto: number; cuotasPendientes: number; fechaVencimiento: Date }
  >();
  for (const c of pendientesSeguridad) {
    const existente = porPoliza.get(c.poliza.id);
    const pendiente = Number(c.montoCuota) - Number(c.montoPagado);
    if (!existente) {
      porPoliza.set(c.poliza.id, {
        ruta: `/seguridad/${c.poliza.id}`,
        codigo: c.poliza.codigo,
        cliente: c.poliza.cliente.nombre,
        monto: pendiente,
        cuotasPendientes: 1,
        fechaVencimiento: c.fechaVencimiento,
      });
    } else {
      existente.monto += pendiente;
      existente.cuotasPendientes += 1;
      if (c.fechaVencimiento < existente.fechaVencimiento) existente.fechaVencimiento = c.fechaVencimiento;
    }
  }

  const proximasPolizas = [...porPoliza.entries()]
    .sort((a, b) => a[1].fechaVencimiento.getTime() - b[1].fechaVencimiento.getTime())
    .slice(0, 8)
    .map(([polizaId, p]) => ({
      cuotaId: polizaId,
      ruta: p.ruta,
      codigo: p.codigo,
      cliente: p.cliente,
      monto: p.monto,
      cuotasPendientes: p.cuotasPendientes,
      fechaVencimiento: p.fechaVencimiento,
      atrasada: p.fechaVencimiento < inicioHoy,
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
