export type CuotaParaPago = {
  id: string;
  numero: number;
  capital: number;
  interes: number;
  montoCuota: number;
  montoPagado: number;
  fechaVencimiento: Date | string;
};

export type AplicacionCalculada = {
  cuotaId: string;
  montoMora: number;
  montoInteres: number;
  montoCapital: number;
  nuevoMontoPagado: number;
};

function redondear(valor: number) {
  return Math.round(valor * 100) / 100;
}

/** Mora simple: un % único sobre el saldo pendiente de la cuota, una vez que está vencida. */
export function calcularMoraCuota(
  cuota: Pick<CuotaParaPago, "montoCuota" | "montoPagado" | "fechaVencimiento">,
  moraPorcentaje: number,
  hoy: Date = new Date(),
): number {
  const pendiente = redondear(cuota.montoCuota - cuota.montoPagado);
  if (pendiente <= 0.009) return 0;
  if (new Date(cuota.fechaVencimiento) >= hoy) return 0;
  return redondear(pendiente * (moraPorcentaje / 100));
}

export function totalPendientePrestamo(
  cuotas: CuotaParaPago[],
  moraPorcentaje: number,
  hoy: Date = new Date(),
) {
  return redondear(
    cuotas.reduce((acc, c) => {
      const pendiente = Math.max(redondear(c.montoCuota - c.montoPagado), 0);
      return acc + pendiente + calcularMoraCuota(c, moraPorcentaje, hoy);
    }, 0),
  );
}

/**
 * Distribuye un pago entre las cuotas pendientes, en orden: mora -> interés -> capital,
 * empezando por la cuota más antigua. Si el pago sobra tras cubrir todo lo pendiente,
 * el sobrante se devuelve en `sobrante` (debería validarse antes para que sea 0).
 */
export function distribuirPago(
  cuotasPendientes: CuotaParaPago[],
  montoPago: number,
  moraPorcentaje: number,
  hoy: Date = new Date(),
): { aplicaciones: AplicacionCalculada[]; sobrante: number } {
  let restante = redondear(montoPago);
  const aplicaciones: AplicacionCalculada[] = [];

  const ordenadas = [...cuotasPendientes].sort((a, b) => a.numero - b.numero);

  for (const cuota of ordenadas) {
    if (restante <= 0.009) break;

    const pendienteCuota = redondear(cuota.montoCuota - cuota.montoPagado);
    if (pendienteCuota <= 0.009) continue;

    const mora = calcularMoraCuota(cuota, moraPorcentaje, hoy);
    const totalPendiente = redondear(pendienteCuota + mora);
    const aPagar = Math.min(restante, totalPendiente);

    const montoMora = Math.min(aPagar, mora);
    const restoParaCuota = redondear(aPagar - montoMora);

    const pendienteInteres = redondear(cuota.interes * (pendienteCuota / cuota.montoCuota));
    const montoInteres = Math.min(restoParaCuota, Math.max(pendienteInteres, 0));
    const montoCapital = redondear(restoParaCuota - montoInteres);

    aplicaciones.push({
      cuotaId: cuota.id,
      montoMora: redondear(montoMora),
      montoInteres: redondear(montoInteres),
      montoCapital,
      nuevoMontoPagado: redondear(cuota.montoPagado + restoParaCuota),
    });

    restante = redondear(restante - aPagar);
  }

  return { aplicaciones, sobrante: Math.max(restante, 0) };
}

export function calcularEstadoPrestamo(
  cuotas: Pick<CuotaParaPago, "montoCuota" | "montoPagado" | "fechaVencimiento">[],
  hoy: Date = new Date(),
): "PAGADO" | "ATRASADO" | "ACTIVO" {
  const todasPagadas = cuotas.every((c) => c.montoPagado >= c.montoCuota - 0.009);
  if (todasPagadas) return "PAGADO";

  const hayAtraso = cuotas.some(
    (c) => c.montoPagado < c.montoCuota - 0.009 && new Date(c.fechaVencimiento) < hoy,
  );
  return hayAtraso ? "ATRASADO" : "ACTIVO";
}

export const ETIQUETA_METODO_PAGO: Record<"EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "OTRO", string> =
  {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia",
    TARJETA: "Tarjeta",
    OTRO: "Otro",
  };
