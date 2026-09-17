"use client";

import { useCallback, useEffect, useState } from "react";
import Icono from "@/components/ui/Icono";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Selector from "@/components/ui/Selector";
import Modal from "@/components/ui/Modal";
import { moneda } from "@/lib/formato";
import { ETIQUETA_TIPO_INTERES, ETIQUETA_FRECUENCIA } from "@/lib/amortizacion";
import type { TipoInteres, FrecuenciaPago } from "@/lib/amortizacion";

type Plantilla = {
  id: string;
  nombre: string;
  montoCapital: string;
  tasaInteres: string;
  tipoInteres: TipoInteres;
  frecuencia: FrecuenciaPago;
  plazoCuotas: number;
};

const VACIO = {
  nombre: "",
  montoCapital: "10000",
  tasaInteres: "10",
  tipoInteres: "SIMPLE" as TipoInteres,
  frecuencia: "SEMANAL" as FrecuenciaPago,
  plazoCuotas: "10",
};

export default function PanelPlantillas() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const respuesta = await fetch("/api/plantillas");
    const datos = await respuesta.json();
    setPlantillas(datos.plantillas ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    if (nuevo.nombre.trim().length < 2) {
      setError("Escribe un nombre para la plantilla");
      return;
    }
    setGuardando(true);
    const respuesta = await fetch("/api/plantillas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevo),
    });
    const datos = await respuesta.json();
    setGuardando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? "No se pudo crear la plantilla");
      return;
    }
    setCreando(false);
    setNuevo(VACIO);
    setError(null);
    await cargar();
  }

  async function eliminar(id: string) {
    const respuesta = await fetch(`/api/plantillas/${id}`, { method: "DELETE" });
    if (respuesta.ok) await cargar();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Plantillas de préstamo</h2>
          <p className="text-sm text-texto-2">
            Presets seleccionables al crear un préstamo nuevo, para no escribir los mismos
            valores cada vez.
          </p>
        </div>
        <Boton onClick={() => setCreando(true)}>
          <Icono nombre="prestamos" className="size-4" />
          Nueva plantilla
        </Boton>
      </div>

      {cargando ? (
        <div className="flex justify-center py-10 text-texto-3">
          <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : plantillas.length === 0 ? (
        <p className="py-10 text-center text-sm text-texto-2">
          Todavía no hay plantillas. Crea una para agilizar el alta de préstamos.
        </p>
      ) : (
        <ul className="space-y-2">
          {plantillas.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-lienzo/70 px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie text-texto-2">
                <Icono nombre="prestamos" className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.nombre}</p>
                <p className="truncate text-xs text-texto-3">
                  {moneda(Number(p.montoCapital))} · {ETIQUETA_TIPO_INTERES[p.tipoInteres]} ·{" "}
                  {ETIQUETA_FRECUENCIA[p.frecuencia]} · {p.plazoCuotas} cuotas
                </p>
              </div>
              <button
                onClick={() => eliminar(p.id)}
                className="grid size-8 shrink-0 place-items-center rounded-full text-texto-3 transition hover:bg-superficie hover:text-rosa-ink"
                aria-label="Eliminar plantilla"
              >
                <Icono nombre="cerrar" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {creando && (
        <Modal titulo="Nueva plantilla" onCerrar={() => setCreando(false)}>
          <form onSubmit={crear} className="space-y-4">
            <Campo
              etiqueta="Nombre"
              value={nuevo.nombre}
              onChange={(e) => setNuevo((n) => ({ ...n, nombre: e.target.value }))}
              placeholder="Ej. Préstamo semanal estándar"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Monto"
                type="number"
                value={nuevo.montoCapital}
                onChange={(e) => setNuevo((n) => ({ ...n, montoCapital: e.target.value }))}
              />
              <Campo
                etiqueta="Tasa (%)"
                type="number"
                value={nuevo.tasaInteres}
                onChange={(e) => setNuevo((n) => ({ ...n, tasaInteres: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Selector
                etiqueta="Método de interés"
                value={nuevo.tipoInteres}
                onChange={(e) =>
                  setNuevo((n) => ({ ...n, tipoInteres: e.target.value as TipoInteres }))
                }
              >
                {Object.entries(ETIQUETA_TIPO_INTERES).map(([v, e]) => (
                  <option key={v} value={v}>
                    {e}
                  </option>
                ))}
              </Selector>
              <Selector
                etiqueta="Frecuencia"
                value={nuevo.frecuencia}
                onChange={(e) =>
                  setNuevo((n) => ({ ...n, frecuencia: e.target.value as FrecuenciaPago }))
                }
              >
                {Object.entries(ETIQUETA_FRECUENCIA).map(([v, e]) => (
                  <option key={v} value={v}>
                    {e}
                  </option>
                ))}
              </Selector>
            </div>
            <Campo
              etiqueta="Número de cuotas"
              type="number"
              value={nuevo.plazoCuotas}
              onChange={(e) => setNuevo((n) => ({ ...n, plazoCuotas: e.target.value }))}
            />

            {error && <p className="rounded-2xl bg-rosa px-4 py-3 text-sm text-rosa-ink">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Boton type="button" variante="suave" onClick={() => setCreando(false)}>
                Cancelar
              </Boton>
              <Boton type="submit" cargando={guardando}>
                Guardar plantilla
              </Boton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
