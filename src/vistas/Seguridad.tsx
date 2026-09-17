"use client";

import ListaPolizas from "./seguridad/ListaPolizas";
import DetallePoliza from "./seguridad/DetallePoliza";

export default function VistaSeguridad({ parametro }: { parametro?: string | null }) {
  if (parametro) return <DetallePoliza id={parametro} />;
  return <ListaPolizas />;
}
