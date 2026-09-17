"use client";

import { useEffect, useRef, useState } from "react";
import Icono from "@/components/ui/Icono";
import Pildora from "@/components/ui/Pildora";
import { usePestanas } from "@/components/pestanas/ContextoPestanas";
import { moneda } from "@/lib/formato";
import type { Cliente, Prestamo } from "@/lib/tipos";

type ResultadoCliente = Pick<Cliente, "id" | "nombre" | "codigo" | "cedula">;
type ResultadoPrestamo = Pick<Prestamo, "id" | "codigo" | "montoTotal" | "estado"> & {
  cliente: { nombre: string };
};

const TONO_ESTADO: Record<Prestamo["estado"], "menta" | "rosa" | "durazno" | "neutro" | "cielo"> = {
  ACTIVO: "menta",
  ATRASADO: "durazno",
  PAGADO: "cielo",
  CANCELADO: "neutro",
  INCOBRABLE: "rosa",
};

export default function BuscadorGlobal() {
  const { abrir } = usePestanas();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [clientes, setClientes] = useState<ResultadoCliente[]>([]);
  const [prestamos, setPrestamos] = useState<ResultadoPrestamo[]>([]);
  const [cargando, setCargando] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, []);

  function buscar(valor: string) {
    setTexto(valor);
    if (debounce.current) clearTimeout(debounce.current);
    if (valor.trim().length < 2) {
      setClientes([]);
      setPrestamos([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setCargando(true);
      const [rc, rp] = await Promise.all([
        fetch(`/api/clientes?buscar=${encodeURIComponent(valor)}`).then((r) => r.json()),
        fetch(`/api/prestamos?buscar=${encodeURIComponent(valor)}`).then((r) => r.json()),
      ]);
      setClientes(rc.clientes ?? []);
      setPrestamos(rp.prestamos ?? []);
      setCargando(false);
    }, 250);
  }

  function irA(ruta: string) {
    abrir(ruta);
    setAbierto(false);
    setTexto("");
    setClientes([]);
    setPrestamos([]);
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="hidden items-center gap-2 rounded-full bg-lienzo px-4 py-2.5 text-sm text-texto-3 transition hover:text-texto sm:flex"
      >
        <Icono nombre="buscar" className="size-4" />
        Buscar
      </button>
    );
  }

  const sinResultados =
    texto.trim().length >= 2 && !cargando && clientes.length === 0 && prestamos.length === 0;

  return (
    <div ref={contenedor} className="relative">
      <div className="flex items-center gap-2 rounded-full bg-superficie px-4 py-2.5 ring-2 ring-tinta/15">
        <Icono nombre="buscar" className="size-4 shrink-0 text-texto-3" />
        <input
          ref={inputRef}
          value={texto}
          onChange={(e) => buscar(e.target.value)}
          placeholder="Buscar cliente o préstamo…"
          className="w-40 bg-transparent text-sm outline-none placeholder:text-texto-3 sm:w-56"
        />
        <button
          onClick={() => setAbierto(false)}
          aria-label="Cerrar búsqueda"
          className="grid size-5 shrink-0 place-items-center rounded-full text-texto-3 hover:text-texto"
        >
          <Icono nombre="cerrar" className="size-3.5" />
        </button>
      </div>

      {texto.trim().length >= 2 && (
        <div className="tarjeta absolute top-full right-0 z-40 mt-1.5 max-h-80 w-80 overflow-y-auto scroll-fino p-1.5">
          {cargando ? (
            <p className="px-3 py-3 text-sm text-texto-3">Buscando…</p>
          ) : sinResultados ? (
            <p className="px-3 py-3 text-sm text-texto-3">Sin resultados</p>
          ) : (
            <>
              {clientes.length > 0 && (
                <div className="mb-1">
                  <p className="px-3 py-1.5 text-xs font-medium text-texto-3">Clientes</p>
                  {clientes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => irA(`/clientes/${c.id}`)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition hover:bg-lienzo"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lienzo text-texto-2">
                        <Icono nombre="usuario" className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.nombre}</p>
                        <p className="truncate text-xs text-texto-3">
                          {c.codigo} · {c.cedula}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {prestamos.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-xs font-medium text-texto-3">Préstamos</p>
                  {prestamos.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => irA(`/prestamos/${p.id}`)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition hover:bg-lienzo"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lienzo text-texto-2">
                        <Icono nombre="prestamos" className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {p.codigo} · {p.cliente.nombre}
                        </p>
                        <p className="truncate text-xs text-texto-3">{moneda(Number(p.montoTotal))}</p>
                      </div>
                      <Pildora tono={TONO_ESTADO[p.estado]}>{p.estado}</Pildora>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
