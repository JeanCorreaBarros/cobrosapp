"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icono from "@/components/ui/Icono";
import Pildora from "@/components/ui/Pildora";
import Boton from "@/components/ui/Boton";
import Modal from "@/components/ui/Modal";
import FormularioCliente, { type ValoresFormulario } from "./FormularioCliente";
import { usePestanas } from "@/components/pestanas/ContextoPestanas";
import { useSesion } from "@/lib/sesion-cliente";
import type { Cliente, Zona } from "@/lib/tipos";

const TONO_ESTADO: Record<Cliente["estado"], "menta" | "rosa" | "durazno" | "neutro"> = {
  ACTIVO: "menta",
  MOROSO: "durazno",
  LISTA_NEGRA: "rosa",
  INACTIVO: "neutro",
};

const ETIQUETA_ESTADO: Record<Cliente["estado"], string> = {
  ACTIVO: "Activo",
  MOROSO: "Moroso",
  LISTA_NEGRA: "Lista negra",
  INACTIVO: "Inactivo",
};

function nombreZona(zona: Cliente["zona"]) {
  if (!zona) return null;
  return "nombre" in zona ? zona.nombre : null;
}

export default function ListaClientes() {
  const { abrir } = usePestanas();
  const sesion = useSesion();
  const puedeEscribir = sesion.rol !== "CONSULTA";
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [buscar, setBuscar] = useState("");
  const [estado, setEstado] = useState("");
  const [zonaId, setZonaId] = useState("");
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const porPagina = 20;

  const cargar = useCallback(async () => {
    setCargando(true);
    const parametros = new URLSearchParams();
    if (buscar) parametros.set("buscar", buscar);
    if (estado) parametros.set("estado", estado);
    if (zonaId) parametros.set("zonaId", zonaId);
    parametros.set("pagina", String(pagina));

    const respuesta = await fetch(`/api/clientes?${parametros}`);
    if (respuesta.ok) {
      const datos = await respuesta.json();
      setClientes(datos.clientes);
      setTotal(datos.total);
    }
    setCargando(false);
  }, [buscar, estado, zonaId, pagina]);

  useEffect(() => {
    fetch("/api/zonas")
      .then((r) => r.json())
      .then((d) => setZonas(d.zonas ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function alBuscar(valor: string) {
    setTextoBusqueda(valor);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setBuscar(valor);
      setPagina(1);
    }, 300);
  }

  async function crearCliente(valores: ValoresFormulario): Promise<string | null> {
    const respuesta = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) return datos.error ?? "No se pudo crear el cliente";

    setModalAbierto(false);
    setError(null);
    await cargar();
    abrir(`/clientes/${datos.cliente.id}`);
    return null;
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="tarjeta space-y-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-texto-2">{total} clientes registrados</p>
        </div>
        {puedeEscribir && (
          <Boton onClick={() => setModalAbierto(true)}>
            <Icono nombre="usuario" className="size-4" />
            Nuevo cliente
          </Boton>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Icono
            nombre="buscar"
            className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-texto-3"
          />
          <input
            value={textoBusqueda}
            onChange={(e) => alBuscar(e.target.value)}
            placeholder="Buscar por nombre, cédula, teléfono o código"
            className="w-full rounded-2xl border border-borde bg-superficie py-3 pr-4 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-tinta/15"
          />
        </div>

        <select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            setPagina(1);
          }}
          className="rounded-2xl border border-borde bg-superficie px-4 py-3 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-tinta/15"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ETIQUETA_ESTADO).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>

        <select
          value={zonaId}
          onChange={(e) => {
            setZonaId(e.target.value);
            setPagina(1);
          }}
          className="rounded-2xl border border-borde bg-superficie px-4 py-3 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-tinta/15"
        >
          <option value="">Todas las zonas</option>
          {zonas.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}
            </option>
          ))}
        </select>
      </div>

      {cargando ? (
        <div className="flex justify-center py-16 text-texto-3">
          <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : clientes.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-lienzo text-texto-3">
            <Icono nombre="clientes" className="size-6" />
          </span>
          <p className="mt-4 text-sm text-texto-2">
            {buscar || estado || zonaId
              ? "No se encontraron clientes con esos filtros"
              : "Todavía no hay clientes registrados"}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {clientes.map((cliente) => (
              <li key={cliente.id}>
                <button
                  onClick={() => abrir(`/clientes/${cliente.id}`)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-lienzo/70 px-4 py-3 text-left transition hover:bg-lienzo"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-superficie text-texto-2">
                    <Icono nombre="usuario" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{cliente.nombre}</p>
                    <p className="truncate text-xs text-texto-3">
                      {cliente.codigo} · {cliente.cedula} · {cliente.telefono}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {nombreZona(cliente.zona) && (
                      <span className="hidden text-xs text-texto-3 sm:inline">
                        {nombreZona(cliente.zona)}
                      </span>
                    )}
                    <Pildora tono={TONO_ESTADO[cliente.estado]}>
                      {ETIQUETA_ESTADO[cliente.estado]}
                    </Pildora>
                    <Icono nombre="flecha" className="size-4 text-texto-3" />
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-texto-3">
                Página {pagina} de {totalPaginas}
              </p>
              <div className="flex gap-2">
                <Boton
                  variante="suave"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  Anterior
                </Boton>
                <Boton
                  variante="suave"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Siguiente
                </Boton>
              </div>
            </div>
          )}
        </>
      )}

      {modalAbierto && (
        <Modal titulo="Nuevo cliente" onCerrar={() => setModalAbierto(false)} ancho="max-w-2xl">
          <FormularioCliente
            zonas={zonas}
            onGuardar={crearCliente}
            onCancelar={() => setModalAbierto(false)}
          />
        </Modal>
      )}
      {error && <p className="text-sm text-rosa-ink">{error}</p>}
    </div>
  );
}
