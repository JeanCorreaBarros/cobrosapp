import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion } from "@/lib/api";
import { calcularMoraCuota } from "@/lib/pagos";
import { aCsv, respuestaCsv } from "@/lib/csv";

const BUCKETS = ["AL_DIA", "1-30", "31-60", "61-90", "90+"] as const;

function bucketDe(diasAtraso: number): (typeof BUCKETS)[number] {
  if (diasAtraso <= 0) return "AL_DIA";
  if (diasAtraso <= 30) return "1-30";
  if (diasAtraso <= 60) return "31-60";
  if (diasAtraso <= 90) return "61-90";
  return "90+";
}

export async function GET(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const { searchParams } = new URL(request.url);
  const formato = searchParams.get("formato");

  const config = await prisma.configuracion.findUnique({ where: { id: "default" } });
  const moraPorcentaje = Number(config?.moraPorcentaje ?? 2);

  const cuotas = await prisma.cuota.findMany({
    where: {
      prestamo: { eliminadoEn: null, estado: { in: ["ACTIVO", "ATRASADO"] } },
    },
    include: {
      prestamo: {
        select: { codigo: true, cliente: { select: { nombre: true, cedula: true } } },
      },
    },
  });

  const pendientes = cuotas.filter((c) => Number(c.montoPagado) < Number(c.montoCuota) - 0.009);

  const buckets = Object.fromEntries(
    BUCKETS.map((b) => [b, { clave: b, total: 0, mora: 0, cantidad: 0 }]),
  ) as Record<(typeof BUCKETS)[number], { clave: string; total: number; mora: number; cantidad: number }>;

  const filasDetalle: Record<string, string | number>[] = [];
  const hoy = new Date();

  for (const c of pendientes) {
    const diasAtraso = Math.floor((hoy.getTime() - new Date(c.fechaVencimiento).getTime()) / 86400000);
    const bucket = bucketDe(diasAtraso);
    const pendiente = Number(c.montoCuota) - Number(c.montoPagado);
    const mora = calcularMoraCuota(
      { montoCuota: Number(c.montoCuota), montoPagado: Number(c.montoPagado), fechaVencimiento: c.fechaVencimiento },
      moraPorcentaje,
      hoy,
    );
    buckets[bucket].total += pendiente + mora;
    buckets[bucket].mora += mora;
    buckets[bucket].cantidad += 1;

    filasDetalle.push({
      prestamo: c.prestamo.codigo,
      cliente: c.prestamo.cliente.nombre,
      cedula: c.prestamo.cliente.cedula,
      cuota: c.numero,
      vence: new Date(c.fechaVencimiento).toISOString().slice(0, 10),
      diasAtraso,
      rango: bucket,
      pendiente: pendiente.toFixed(2),
      mora: mora.toFixed(2),
    });
  }

  const totalGeneral = Object.values(buckets).reduce((a, b) => a + b.total, 0);

  const incobrables = await prisma.prestamo.aggregate({
    where: { estado: "INCOBRABLE", eliminadoEn: null },
    _sum: { montoCapital: true },
    _count: true,
  });

  if (formato === "csv") {
    return respuestaCsv("cartera.csv", aCsv(filasDetalle));
  }

  return NextResponse.json({
    buckets: Object.values(buckets),
    totalGeneral,
    incobrables: {
      cantidad: incobrables._count,
      capital: Number(incobrables._sum.montoCapital ?? 0),
    },
  });
}
