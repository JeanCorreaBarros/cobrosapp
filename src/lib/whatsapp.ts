/** Construye un enlace wa.me que abre WhatsApp Web/App con un mensaje precargado.
 *  No requiere API de pago: usa la sesión de WhatsApp del propio cobrador. */
export function enlaceWhatsApp(telefono: string, mensaje: string) {
  const soloDigitos = telefono.replace(/\D/g, "");
  const conCodigoPais = soloDigitos.startsWith("57") ? soloDigitos : `57${soloDigitos}`;
  return `https://wa.me/${conCodigoPais}?text=${encodeURIComponent(mensaje)}`;
}

export function mensajeRecordatorio(datos: {
  nombreCliente: string;
  codigoPrestamo: string;
  monto: string;
  fechaVencimiento: string;
  diasAtraso: number;
  empresaNombre?: string;
}) {
  const firma = datos.empresaNombre ? ` de ${datos.empresaNombre}` : "";
  if (datos.diasAtraso > 0) {
    return `Hola ${datos.nombreCliente}, te escribimos${firma} por tu préstamo ${datos.codigoPrestamo}. Tienes una cuota de ${datos.monto} vencida desde el ${datos.fechaVencimiento} (${datos.diasAtraso} día(s) de atraso). Por favor ponte al día lo antes posible. ¡Gracias!`;
  }
  return `Hola ${datos.nombreCliente}, te recordamos${firma} que tu cuota del préstamo ${datos.codigoPrestamo} por ${datos.monto} vence el ${datos.fechaVencimiento}. ¡Gracias por tu puntualidad!`;
}
