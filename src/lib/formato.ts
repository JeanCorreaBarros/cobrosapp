export function moneda(valor: number, simbolo = "$") {
  return `${simbolo} ${valor.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Estas fechas (vencimientos, inicio de préstamo, fecha de pago) son fechas de
 *  calendario, no momentos exactos. Se formatean en UTC para que el día mostrado
 *  no cambie según la zona horaria del navegador de quien las mire. */
export function fecha(valor: Date | string) {
  return new Date(valor).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
