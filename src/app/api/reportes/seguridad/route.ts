import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion } from "@/lib/api";
import { aCsv, respuestaCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const { searchParams } = new URL(request.url);
  const formato = searchParams.get("formato");

  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [polizasActivas, polizasAtrasadas, cuotasPendientes, pagosDelMes, proximas] =
    await Promise.all([
      prisma.polizaSeguridad.count({ where: { eliminadoEn: null, estado: "ACTIVA" } }),
      prisma.polizaSeguridad.count({ where: { eliminadoEn: null, estado: "ATRASADA" } }),
      prisma.cuotaSeguridad.findMany({
        where: { poliza: { eliminadoEn: null, estado: { in: ["ACTIVA", "ATRASADA"] } } },
        select: { montoCuota: true, montoPagado: true },
      }),
      prisma.pagoSeguridad.aggregate({
        where: { anulado: false, fecha: { gte: inicioMes } },
        _sum: { monto: true },
        _count: true,
      }),
      prisma.cuotaSeguridad.findMany({
        where: {
          poliza: { eliminadoEn: null, estado: { in: ["ACTIVA", "ATRASADA"] } },
        },
        include: {
          poliza: { select: { codigo: true, cliente: { select: { nombre: true, cedula: true } } } },
        },
        orderBy: { fechaVencimiento: "asc" },
        take: 300,
      }),
    ]);

  const totalPendiente = cuotasPendientes.reduce((acc, c) => {
    const pendiente = Number(c.montoCuota) - Number(c.montoPagado);
    return acc + Math.max(pendiente, 0);
  }, 0);

  const proximasPendientes = proximas
    .filter((c) => Number(c.montoPagado) < Number(c.montoCuota) - 0.009)
    .slice(0, 40)
    .map((c) => ({
      poliza: c.poliza.codigo,
      cliente: c.poliza.cliente.nombre,
      cedula: c.poliza.cliente.cedula,
      numero: c.numero,
      vence: c.fechaVencimiento,
      pendiente: Number(c.montoCuota) - Number(c.montoPagado),
    }));

  if (formato === "csv") {
    const filas = proximasPendientes.map((p) => ({
      poliza: p.poliza,
      cliente: p.cliente,
      cedula: p.cedula,
      cuota: p.numero,
      vence: new Date(p.vence).toISOString().slice(0, 10),
      pendiente: p.pendiente.toFixed(2),
    }));
    return respuestaCsv("seguridad.csv", aCsv(filas));
  }

  return NextResponse.json({
    polizasActivas,
    polizasAtrasadas,
    totalPendiente,
    cobradoMes: Number(pagosDelMes._sum.monto ?? 0),
    pagosMes: pagosDelMes._count,
    proximas: proximasPendientes,
  });
}
