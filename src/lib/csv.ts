export function aCsv(filas: Record<string, string | number>[]): string {
  if (filas.length === 0) return "";
  const columnas = Object.keys(filas[0]);
  const escapar = (valor: string | number) => {
    const texto = String(valor);
    return /[",\n;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const encabezado = columnas.join(";");
  const lineas = filas.map((fila) => columnas.map((c) => escapar(fila[c])).join(";"));
  return [encabezado, ...lineas].join("\r\n");
}

export function respuestaCsv(nombreArchivo: string, contenido: string) {
  return new Response("﻿" + contenido, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
