"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icono from "@/components/ui/Icono";
import Pildora from "@/components/ui/Pildora";
import Boton from "@/components/ui/Boton";
import Modal from "@/components/ui/Modal";
import FormularioPoliza, { type ValoresPoliza } from "./FormularioPoliza";
import { usePestanas } from "@/components/pestanas/ContextoPestanas";
import { useSesion } from "@/lib/sesion-cliente";
import { moneda, fecha } from "@/lib/formato";
import { ETIQUETA_FRECUENCIA } from "@/lib/amortizacion";
import { finDeAnioPoliza } from "@/lib/seguridad";
import type { PolizaSeguridad } from "@/lib/tipos";

function diasParaFinAnio(fechaInicio: string) {
  const finAnio = finDeAnioPoliza(new Date(fechaInicio));
  return Math.ceil((finAnio.getTime() - Date.now()) / 86_400_000);
}

const TONO_ESTADO: Record<PolizaSeguridad["estado"], "menta" | "rosa" | "durazno" | "neutro"> = {
  ACTIVA: "menta",
  ATRASADA: "durazno",
  CANCELADA: "neutro",
};

const ETIQUETA_ESTADO: Record<PolizaSeguridad["estado"], string> = {
  ACTIVA: "Activa",
  ATRASADA: "Atrasada",
  CANCELADA: "Cancelada",
};

export default function ListaPolizas() {
  const { abrir } = usePestanas();
  const sesion = useSesion();
  const [polizas, setPolizas] = useState<PolizaSeguridad[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [buscar, setBuscar] = useState("");
  const [estado, setEstado] = useState("");
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const porPagina = 20;

  const cargar = useCallback(async () => {
    setCargando(true);
    const parametros = new URLSearchParams();
    if (buscar) parametros.set("buscar", buscar);
    if (estado) parametros.set("estado", estado);
    parametros.set("pagina", String(pagina));

    const respuesta = await fetch(`/api/polizas?${parametros}`);
    if (respuesta.ok) {
      const datos = await respuesta.json();
      setPolizas(datos.polizas);
      setTotal(datos.total);
    }
    setCargando(false);
  }, [buscar, estado, pagina]);

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

  async function crearPoliza(valores: ValoresPoliza): Promise<string | null> {
    const respuesta = await fetch("/api/polizas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) return datos.error ?? "No se pudo crear la póliza";

    setModalAbierto(false);
    await cargar();
    abrir(`/seguridad/${datos.poliza.id}`);
    return null;
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="tarjeta space-y-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pólizas</h1>
          <p className="text-sm text-texto-2">{total} pólizas registradas</p>
        </div>
        {sesion.rol !== "CONSULTA" && (
          <Boton onClick={() => setModalAbierto(true)}>
            <Icono nombre="candado" className="size-4" />
            Nueva póliza
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
            placeholder="Buscar por código, cliente o cédula"
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
      </div>

      {cargando ? (
        <div className="flex justify-center py-16 text-texto-3">
          <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : polizas.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-lienzo text-texto-3">
            <Icono nombre="candado" className="size-6" />
          </span>
          <p className="mt-4 text-sm text-texto-2">
            {buscar || estado
              ? "No se encontraron pólizas con esos filtros"
              : "Todavía no hay pólizas de seguridad registradas"}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {polizas.map((poliza) => (
              <li key={poliza.id}>
                <button
                  onClick={() => abrir(`/seguridad/${poliza.id}`)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-lienzo/70 px-4 py-3 text-left transition hover:bg-lienzo"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-superficie text-texto-2">
                    <Icono nombre="candado" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{poliza.cliente.nombre}</p>
                    <p className="truncate text-xs text-texto-3">
                      {poliza.codigo} · {ETIQUETA_FRECUENCIA[poliza.frecuencia]} · desde{" "}
                      {fecha(poliza.fechaInicio)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-right text-sm sm:block">
                      <span className="block font-semibold">{moneda(Number(poliza.montoCuota))}</span>
                      <span className="block text-xs text-texto-3">por cuota</span>
                    </span>
                    {poliza.estado !== "CANCELADA" && diasParaFinAnio(poliza.fechaInicio) <= 30 && (
                      <Pildora tono="durazno">
                        {diasParaFinAnio(poliza.fechaInicio) < 0 ? "Vencida" : "Vence pronto"}
                      </Pildora>
                    )}
                    <Pildora tono={TONO_ESTADO[poliza.estado]}>
                      {ETIQUETA_ESTADO[poliza.estado]}
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
        <Modal titulo="Nueva póliza de seguridad" onCerrar={() => setModalAbierto(false)} ancho="max-w-2xl">
          <FormularioPoliza onGuardar={crearPoliza} onCancelar={() => setModalAbierto(false)} />
        </Modal>
      )}
    </div>
  );
}
