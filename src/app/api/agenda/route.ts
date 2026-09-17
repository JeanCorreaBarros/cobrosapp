import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion } from "@/lib/api";

function finDeHoy() {
  const f = new Date();
  f.setHours(23, 59, 59, 999);
  return f;
}
function inicioDeHoy() {
  const f = new Date();
  f.setHours(0, 0, 0, 0);
  return f;
}

export async function GET(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const { searchParams } = new URL(request.url);
  const rango = searchParams.get("rango") ?? "hoy";
  const zonaId = searchParams.get("zonaId");

  let limiteFecha: Date;
  if (rango === "semana") {
    limiteFecha = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  } else if (rango === "atrasadas") {
    limiteFecha = inicioDeHoy();
  } else {
    limiteFecha = finDeHoy();
  }

  const cuotas = await prisma.cuota.findMany({
    where: {
      fechaVencimiento: rango === "atrasadas" ? { lt: limiteFecha } : { lte: limiteFecha },
      prestamo: {
        eliminadoEn: null,
        estado: { in: ["ACTIVO", "ATRASADO"] },
        ...(zonaId ? { cliente: { zonaId } } : {}),
      },
    },
    include: {
      prestamo: {
        select: {
          id: true,
          codigo: true,
          cliente: {
            select: {
              id: true,
              nombre: true,
              telefono: true,
              zona: { select: { id: true, nombre: true } },
            },
          },
        },
      },
    },
    orderBy: { fechaVencimiento: "asc" },
  });

  const pendientes = cuotas.filter((c) => Number(c.montoPagado) < Number(c.montoCuota) - 0.009);

  return NextResponse.json({ cuotas: pendientes });
}
