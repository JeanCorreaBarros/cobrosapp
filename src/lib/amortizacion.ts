export type TipoInteres = "SIMPLE" | "SOBRE_SALDO";
export type FrecuenciaPago = "DIARIO" | "SEMANAL" | "QUINCENAL" | "MENSUAL";

export type CuotaCalculada = {
  numero: number;
  fechaVencimiento: Date;
  capital: number;
  interes: number;
  montoCuota: number;
  saldoCapital: number;
};

export type Cronograma = {
  montoTotal: number;
  montoInteres: number;
  montoCuota: number;
  cuotas: CuotaCalculada[];
};

function redondear(valor: number) {
  return Math.round(valor * 100) / 100;
}

function sumarPeriodo(fecha: Date, frecuencia: FrecuenciaPago, periodos: number) {
  const resultado = new Date(fecha);
  switch (frecuencia) {
    case "DIARIO":
      resultado.setDate(resultado.getDate() + periodos);
      break;
    case "SEMANAL":
      resultado.setDate(resultado.getDate() + periodos * 7);
      break;
    case "QUINCENAL":
      resultado.setDate(resultado.getDate() + periodos * 15);
      break;
    case "MENSUAL":
      resultado.setMonth(resultado.getMonth() + periodos);
      break;
  }
  return resultado;
}

/**
 * Genera el cronograma de pagos para un préstamo.
 *
 * SIMPLE: el interés se calcula una sola vez sobre el capital total y se reparte
 * en partes iguales entre las cuotas (ej. presta 10,000 al 10% -> paga 11,000 en 10 cuotas de 1,100).
 *
 * SOBRE_SALDO: amortización francesa. La tasa se aplica cada período sobre el saldo
 * pendiente, la cuota es fija y la proporción capital/interés cambia en cada pago.
 */
export function generarCronograma(datos: {
  montoCapital: number;
  tasaInteres: number;
  tipoInteres: TipoInteres;
  plazoCuotas: number;
  frecuencia: FrecuenciaPago;
  fechaInicio: Date;
}): Cronograma {
  const { montoCapital, tasaInteres, tipoInteres, plazoCuotas, frecuencia, fechaInicio } = datos;

  if (montoCapital <= 0) throw new Error("El monto del préstamo debe ser mayor a cero");
  if (plazoCuotas <= 0) throw new Error("El plazo debe ser al menos 1 cuota");
  if (tasaInteres < 0) throw new Error("La tasa de interés no puede ser negativa");

  if (tipoInteres === "SIMPLE") {
    return calcularSimple(montoCapital, tasaInteres, plazoCuotas, frecuencia, fechaInicio);
  }
  return calcularSobreSaldo(montoCapital, tasaInteres, plazoCuotas, frecuencia, fechaInicio);
}

function calcularSimple(
  montoCapital: number,
  tasaInteres: number,
  plazoCuotas: number,
  frecuencia: FrecuenciaPago,
  fechaInicio: Date,
): Cronograma {
  const interesTotal = redondear(montoCapital * (tasaInteres / 100));
  const montoTotal = redondear(montoCapital + interesTotal);

  const capitalBase = redondear(montoCapital / plazoCuotas);
  const interesBase = redondear(interesTotal / plazoCuotas);
  const cuotaBase = redondear(capitalBase + interesBase);

  const cuotas: CuotaCalculada[] = [];
  let saldo = montoCapital;

  for (let n = 1; n <= plazoCuotas; n++) {
    const esUltima = n === plazoCuotas;
    const capital = esUltima ? redondear(saldo) : capitalBase;
    const interes = esUltima
      ? redondear(interesTotal - interesBase * (plazoCuotas - 1))
      : interesBase;
    saldo = redondear(saldo - capital);

    cuotas.push({
      numero: n,
      fechaVencimiento: sumarPeriodo(fechaInicio, frecuencia, n),
      capital,
      interes,
      montoCuota: esUltima ? redondear(capital + interes) : cuotaBase,
      saldoCapital: Math.max(saldo, 0),
    });
  }

  return { montoTotal, montoInteres: interesTotal, montoCuota: cuotaBase, cuotas };
}

function calcularSobreSaldo(
  montoCapital: number,
  tasaInteres: number,
  plazoCuotas: number,
  frecuencia: FrecuenciaPago,
  fechaInicio: Date,
): Cronograma {
  const i = tasaInteres / 100;
  const cuotaFija =
    i === 0
      ? redondear(montoCapital / plazoCuotas)
      : redondear((montoCapital * i) / (1 - Math.pow(1 + i, -plazoCuotas)));

  const cuotas: CuotaCalculada[] = [];
  let saldo = montoCapital;
  let interesAcumulado = 0;

  for (let n = 1; n <= plazoCuotas; n++) {
    const esUltima = n === plazoCuotas;
    const interes = redondear(saldo * i);
    let capital = redondear(cuotaFija - interes);
    let montoCuota = cuotaFija;

    if (esUltima) {
      capital = redondear(saldo);
      montoCuota = redondear(capital + interes);
    }

    saldo = Math.max(redondear(saldo - capital), 0);
    interesAcumulado = redondear(interesAcumulado + interes);

    cuotas.push({
      numero: n,
      fechaVencimiento: sumarPeriodo(fechaInicio, frecuencia, n),
      capital,
      interes,
      montoCuota,
      saldoCapital: saldo,
    });
  }

  const montoTotal = redondear(montoCapital + interesAcumulado);

  return { montoTotal, montoInteres: interesAcumulado, montoCuota: cuotaFija, cuotas };
}

export const ETIQUETA_TIPO_INTERES: Record<TipoInteres, string> = {
  SIMPLE: "Interés simple",
  SOBRE_SALDO: "Interés sobre saldo",
};

export const ETIQUETA_FRECUENCIA: Record<FrecuenciaPago, string> = {
  DIARIO: "Diario",
  SEMANAL: "Semanal",
  QUINCENAL: "Quincenal",
  MENSUAL: "Mensual",
};
