import { sumarPeriodo, type FrecuenciaPago } from "@/lib/amortizacion";

function redondear(valor: number) {
  return Math.round(valor * 100) / 100;
}

/** Una póliza cubre un solo año calendario: desde su fecha de inicio hasta
 *  el 31 de diciembre del año en que arranca (si empieza hoy, hasta fin de
 *  este año; si se registra desde enero del año siguiente, hasta diciembre
 *  de ese año siguiente). Al llegar esa fecha no se generan más cuotas: hay
 *  que registrar una póliza nueva para el año que sigue. */
export function finDeAnioPoliza(fechaInicio: Date): Date {
  return new Date(Date.UTC(fechaInicio.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
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

/** Calcula las cuotas que faltan crear para cubrir todo el año de la
 *  póliza (no un número fijo de meses: una póliza semanal necesita muchas
 *  más cuotas que una mensual para llegar al 31 de diciembre). Una vez el
 *  año está completo, deja de generar cuotas nuevas aunque se siga
 *  consultando la póliza. */
export function calcularCuotasFaltantes(
  fechaInicio: Date,
  frecuencia: FrecuenciaPago,
  montoCuota: number,
  cuotasExistentes: CuotaSeguridadExistente[],
): CuotaSeguridadNueva[] {
  const finAnio = finDeAnioPoliza(fechaInicio);
  const ultimoNumero = cuotasExistentes.reduce((max, c) => Math.max(max, c.numero), 0);

  const nuevas: CuotaSeguridadNueva[] = [];
  let numero = ultimoNumero;

  // Tope de seguridad para no generar cuotas infinitas si la frecuencia y
  // la fecha de inicio produjeran un cálculo inesperado.
  for (let i = 0; i < 400; i++) {
    const siguiente = sumarPeriodo(fechaInicio, frecuencia, numero + 1);
    if (siguiente > finAnio) break;
    numero += 1;
    nuevas.push({ numero, fechaVencimiento: siguiente, montoCuota: redondear(montoCuota) });
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
