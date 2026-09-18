import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion } from "@/lib/api";
import { obtenerCobrosHoy } from "@/lib/cobrosHoy";
import { finDeAnioPoliza } from "@/lib/seguridad";

const DIAS_AVISO_RENOVACION = 30;

/** Cobros pendientes para hoy (préstamos + pólizas de seguridad) y pólizas
 *  cuyo año de cobertura está por terminar, para la campana de
 *  notificaciones. Se consulta por polling desde el cliente; en cuanto pasa
 *  la medianoche del día de vencimiento de una cuota (o del fin de año de
 *  una póliza), aparece aquí sola, sin ninguna acción manual. */
export async function GET() {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const [cobros, polizasActivas] = await Promise.all([
    obtenerCobrosHoy(),
    prisma.polizaSeguridad.findMany({
      where: { eliminadoEn: null, estado: { in: ["ACTIVA", "ATRASADA"] } },
      select: {
        id: true,
        codigo: true,
        fechaInicio: true,
        cliente: { select: { nombre: true } },
      },
    }),
  ]);

  const ahora = Date.now();
  const renovaciones = polizasActivas
    .map((p) => {
      const finAnio = finDeAnioPoliza(new Date(p.fechaInicio));
      const diasParaFinAnio = Math.ceil((finAnio.getTime() - ahora) / 86_400_000);
      return {
        polizaId: p.id,
        ruta: `/seguridad/${p.id}`,
        codigo: p.codigo,
        cliente: p.cliente.nombre,
        finAnio,
        anioSiguiente: finAnio.getFullYear() + 1,
        vencida: diasParaFinAnio < 0,
        diasParaFinAnio,
      };
    })
    .filter((p) => p.diasParaFinAnio <= DIAS_AVISO_RENOVACION)
    .sort((a, b) => a.diasParaFinAnio - b.diasParaFinAnio);

  return NextResponse.json({
    total: cobros.length,
    atrasadas: cobros.filter((c) => c.atrasada).length,
    items: cobros.slice(0, 30),
    renovaciones,
  });
}
