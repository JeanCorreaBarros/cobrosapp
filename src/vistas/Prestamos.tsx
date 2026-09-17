"use client";

import ListaPrestamos from "./prestamos/ListaPrestamos";
import DetallePrestamo from "./prestamos/DetallePrestamo";

export default function VistaPrestamos({ parametro }: { parametro?: string | null }) {
  if (parametro) return <DetallePrestamo id={parametro} />;
  return <ListaPrestamos />;
}
