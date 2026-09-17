"use client";

import ListaClientes from "./clientes/ListaClientes";
import DetalleCliente from "./clientes/DetalleCliente";

export default function VistaClientes({ parametro }: { parametro?: string | null }) {
  if (parametro) return <DetalleCliente id={parametro} />;
  return <ListaClientes />;
}
