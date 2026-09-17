"use client";

import { useEffect, useRef, useState } from "react";
import Icono from "@/components/ui/Icono";
import type { Cliente } from "@/lib/tipos";

type ClienteResumen = Pick<Cliente, "id" | "nombre" | "codigo" | "cedula" | "telefono">;

export default function BuscadorCliente({
  valor,
  onSeleccionar,
}: {
  valor: ClienteResumen | null;
  onSeleccionar: (cliente: ClienteResumen | null) => void;
}) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ClienteResumen[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  function buscar(valorTexto: string) {
    setTexto(valorTexto);
    if (debounce.current) clearTimeout(debounce.current);
    if (valorTexto.trim().length < 2) {
      setResultados([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setCargando(true);
      const respuesta = await fetch(`/api/clientes?buscar=${encodeURIComponent(valorTexto)}`);
      const datos = await respuesta.json();
      setResultados(datos.clientes ?? []);
      setCargando(false);
    }, 250);
  }

  if (valor) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-borde bg-lienzo/70 px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie text-texto-2">
          <Icono nombre="usuario" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{valor.nombre}</p>
          <p className="truncate text-xs text-texto-3">
            {valor.codigo} · {valor.cedula} · {valor.telefono}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onSeleccionar(null);
            setTexto("");
          }}
          className="grid size-8 shrink-0 place-items-center rounded-full text-texto-3 transition hover:bg-superficie hover:text-texto"
          aria-label="Cambiar cliente"
        >
          <Icono nombre="cerrar" className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={contenedor} className="relative">
      <div className="relative">
        <Icono
          nombre="buscar"
          className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-texto-3"
        />
        <input
          value={texto}
          onChange={(e) => {
            buscar(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          placeholder="Busca por nombre, cédula o código"
          className="w-full rounded-2xl border border-borde bg-superficie py-3.5 pr-4 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-tinta/15"
        />
      </div>

      {abierto && texto.trim().length >= 2 && (
        <div className="tarjeta absolute top-full left-0 z-40 mt-1.5 max-h-64 w-full overflow-y-auto scroll-fino p-1.5">
          {cargando ? (
            <p className="px-3 py-3 text-sm text-texto-3">Buscando…</p>
          ) : resultados.length === 0 ? (
            <p className="px-3 py-3 text-sm text-texto-3">Sin resultados</p>
          ) : (
            resultados.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                onClick={() => {
                  onSeleccionar(cliente);
                  setAbierto(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition hover:bg-lienzo"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{cliente.nombre}</p>
                  <p className="truncate text-xs text-texto-3">
                    {cliente.codigo} · {cliente.cedula}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
