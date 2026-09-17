import { sumarPeriodo, type FrecuenciaPago } from "@/lib/amortizacion";

// Una póliza de seguridad es indefinida: no tiene un número de cuotas fijo
// como un préstamo, así que no se pueden generar todas de una vez. En vez
// de eso, siempre se mantiene un "horizonte" de cuotas futuras generadas
// (HORIZONTE períodos por delante de hoy) y se completan más cada vez que
// se consulta la póliza o se le registra un pago.
export const HORIZONTE_CUOTAS = 12;

function redondear(valor: number) {
  return Math.round(valor * 100) / 100;
}

export type CuotaSeguridadExistente = {
  numero: number;
  fechaVencimiento: Date | string;
};

export type CuotaSeguridadNueva = {
  numero: number;
  fechaVencimiento: Date;
  montoCuota: number;
};

/** Calcula qué cuotas nuevas hay que crear para que siempre haya al menos
 *  HORIZONTE_CUOTAS cuotas vigentes (hoy o en el futuro) generadas. */
export function calcularCuotasFaltantes(
  fechaInicio: Date,
  frecuencia: FrecuenciaPago,
  montoCuota: number,
  cuotasExistentes: CuotaSeguridadExistente[],
  hoy: Date = new Date(),
): CuotaSeguridadNueva[] {
  const ultimoNumero = cuotasExistentes.reduce((max, c) => Math.max(max, c.numero), 0);
  const vigentes = cuotasExistentes.filter((c) => new Date(c.fechaVencimiento) >= hoy).length;

  const nuevas: CuotaSeguridadNueva[] = [];
  let numero = ultimoNumero;
  let faltan = Math.max(HORIZONTE_CUOTAS - vigentes, 0);

  while (faltan > 0) {
    numero += 1;
    nuevas.push({
      numero,
      fechaVencimiento: sumarPeriodo(fechaInicio, frecuencia, numero),
      montoCuota: redondear(montoCuota),
    });
    faltan -= 1;
  }

  return nuevas;
}

export type CuotaSeguridadPago = {
  id: string;
  numero: number;
  montoCuota: number;
  montoPagado: number;
};

export type AplicacionSeguridadCalculada = {
  cuotaId: string;
  monto: number;
  nuevoMontoPagado: number;
};

export function totalPendientePoliza(cuotas: CuotaSeguridadPago[]) {
  return redondear(
    cuotas.reduce((acc, c) => acc + Math.max(redondear(c.montoCuota - c.montoPagado), 0), 0),
  );
}

/** Sin mora: el pago se reparte entre las cuotas pendientes empezando por
 *  la más antigua, sin ningún recargo. */
export function distribuirPagoSeguridad(
  cuotasPendientes: CuotaSeguridadPago[],
  montoPago: number,
): { aplicaciones: AplicacionSeguridadCalculada[]; sobrante: number } {
  let restante = redondear(montoPago);
  const aplicaciones: AplicacionSeguridadCalculada[] = [];
  const ordenadas = [...cuotasPendientes].sort((a, b) => a.numero - b.numero);

  for (const cuota of ordenadas) {
    if (restante <= 0.009) break;
    const pendiente = redondear(cuota.montoCuota - cuota.montoPagado);
    if (pendiente <= 0.009) continue;

    const aPagar = Math.min(restante, pendiente);
    aplicaciones.push({
      cuotaId: cuota.id,
      monto: aPagar,
      nuevoMontoPagado: redondear(cuota.montoPagado + aPagar),
    });
    restante = redondear(restante - aPagar);
  }

  return { aplicaciones, sobrante: Math.max(restante, 0) };
}

export function calcularEstadoPoliza(
  cuotas: { montoCuota: number; montoPagado: number; fechaVencimiento: Date | string }[],
  hoy: Date = new Date(),
): "ACTIVA" | "ATRASADA" {
  const hayAtraso = cuotas.some(
    (c) => c.montoPagado < c.montoCuota - 0.009 && new Date(c.fechaVencimiento) < hoy,
  );
  return hayAtraso ? "ATRASADA" : "ACTIVA";
}
