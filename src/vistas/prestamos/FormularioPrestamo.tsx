"use client";

import { useEffect, useMemo, useState } from "react";
import Campo from "@/components/ui/Campo";
import Selector from "@/components/ui/Selector";
import AreaTexto from "@/components/ui/AreaTexto";
import Boton from "@/components/ui/Boton";
import Icono from "@/components/ui/Icono";
import BuscadorCliente from "./BuscadorCliente";
import {
  generarCronograma,
  ETIQUETA_TIPO_INTERES,
  ETIQUETA_FRECUENCIA,
  type TipoInteres,
  type FrecuenciaPago,
} from "@/lib/amortizacion";
import { moneda } from "@/lib/formato";
import type { Cliente } from "@/lib/tipos";

type ClienteResumen = Pick<Cliente, "id" | "nombre" | "codigo" | "cedula" | "telefono">;

type Plantilla = {
  id: string;
  nombre: string;
  montoCapital: string;
  tasaInteres: string;
  tipoInteres: TipoInteres;
  frecuencia: FrecuenciaPago;
  plazoCuotas: number;
};

export type ValoresPrestamo = {
  clienteId: string;
  montoCapital: number;
  tasaInteres: number;
  tipoInteres: TipoInteres;
  frecuencia: FrecuenciaPago;
  plazoCuotas: number;
  fechaInicio: string;
  notas: string;
};

function hoyISO() {
  const ahora = new Date();
  const desplazado = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return desplazado.toISOString().slice(0, 10);
}

export default function FormularioPrestamo({
  clientePreseleccionado,
  onCrear,
  onCancelar,
}: {
  clientePreseleccionado?: ClienteResumen;
  onCrear: (valores: ValoresPrestamo) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [cliente, setCliente] = useState<ClienteResumen | null>(clientePreseleccionado ?? null);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [plantillaId, setPlantillaId] = useState("");
  const [montoCapital, setMontoCapital] = useState("10000");
  const [modoInteres, setModoInteres] = useState<"PORCENTAJE" | "FIJO">("PORCENTAJE");
  const [tasaInteres, setTasaInteres] = useState("10");
  const [interesFijo, setInteresFijo] = useState("1000");
  const [tipoInteres, setTipoInteres] = useState<TipoInteres>("SIMPLE");
  const [frecuencia, setFrecuencia] = useState<FrecuenciaPago>("SEMANAL");
  const [plazoCuotas, setPlazoCuotas] = useState("10");
  const [fechaInicio, setFechaInicio] = useState(hoyISO());
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch("/api/plantillas")
      .then((r) => r.json())
      .then((d) => setPlantillas(d.plantillas ?? []))
      .catch(() => {});
  }, []);

  function aplicarPlantilla(id: string) {
    setPlantillaId(id);
    const p = plantillas.find((x) => x.id === id);
    if (!p) return;
    setMontoCapital(String(Number(p.montoCapital)));
    setTasaInteres(String(Number(p.tasaInteres)));
    setModoInteres("PORCENTAJE");
    setTipoInteres(p.tipoInteres);
    setFrecuencia(p.frecuencia);
    setPlazoCuotas(String(p.plazoCuotas));
  }

  // El interés fijo en $ solo tiene sentido con interés simple: sobre saldo
  // la tasa se aplica período a período, no como monto total de una vez.
  useEffect(() => {
    if (tipoInteres === "SOBRE_SALDO" && modoInteres === "FIJO") {
      setModoInteres("PORCENTAJE");
    }
  }, [tipoInteres, modoInteres]);

  const tasaEfectiva = useMemo(() => {
    if (modoInteres === "PORCENTAJE") return Number(tasaInteres);
    const capital = Number(montoCapital);
    const fijo = Number(interesFijo);
    if (!capital || capital <= 0 || !fijo || fijo < 0) return 0;
    return (fijo / capital) * 100;
  }, [modoInteres, tasaInteres, interesFijo, montoCapital]);

  const vistaPrevia = useMemo(() => {
    const capital = Number(montoCapital);
    const plazo = Number(plazoCuotas);
    if (!capital || capital <= 0 || tasaEfectiva < 0 || !plazo || plazo <= 0) return null;
    try {
      return generarCronograma({
        montoCapital: capital,
        tasaInteres: tasaEfectiva,
        tipoInteres,
        plazoCuotas: plazo,
        frecuencia,
        fechaInicio: new Date(fechaInicio || hoyISO()),
      });
    } catch {
      return null;
    }
  }, [montoCapital, tasaEfectiva, tipoInteres, plazoCuotas, frecuencia, fechaInicio]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!cliente) {
      setError("Selecciona un cliente");
      return;
    }
    const capital = Number(montoCapital);
    const plazo = Number(plazoCuotas);
    if (!capital || capital <= 0) {
      setError("Escribe un monto válido");
      return;
    }
    if (modoInteres === "FIJO" && (!Number(interesFijo) || Number(interesFijo) < 0)) {
      setError("Escribe un monto de interés válido");
      return;
    }
    if (modoInteres === "PORCENTAJE" && (Number.isNaN(tasaEfectiva) || tasaEfectiva < 0)) {
      setError("Escribe una tasa de interés válida");
      return;
    }
    if (!plazo || plazo <= 0) {
      setError("Escribe un plazo de cuotas válido");
      return;
    }

    setGuardando(true);
    const resultado = await onCrear({
      clienteId: cliente.id,
      montoCapital: capital,
      tasaInteres: tasaEfectiva,
      tipoInteres,
      frecuencia,
      plazoCuotas: plazo,
      fechaInicio,
      notas,
    });
    setGuardando(false);
    if (resultado) setError(resultado);
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      {plantillas.length > 0 && (
        <Selector
          etiqueta="Usar una plantilla (opcional)"
          value={plantillaId}
          onChange={(e) => aplicarPlantilla(e.target.value)}
        >
          <option value="">Empezar en blanco</option>
          {plantillas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Selector>
      )}

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-texto-2">Cliente</label>
        <BuscadorCliente valor={cliente} onSeleccionar={setCliente} />
      </div>

      <Campo
        etiqueta="Monto del préstamo"
        name="montoCapital"
        type="number"
        min="1"
        step="0.01"
        value={montoCapital}
        onChange={(e) => setMontoCapital(e.target.value)}
      />

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-texto-2">Método de interés</label>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(ETIQUETA_TIPO_INTERES) as TipoInteres[]).map((valor) => (
            <button
              key={valor}
              type="button"
              onClick={() => setTipoInteres(valor)}
              className={`rounded-2xl border px-4 py-3.5 text-left text-sm transition ${
                tipoInteres === valor
                  ? "border-tinta bg-tinta text-white"
                  : "border-borde bg-superficie text-texto hover:bg-lienzo"
              }`}
            >
              <span className="font-medium">{ETIQUETA_TIPO_INTERES[valor]}</span>
              <span
                className={`mt-0.5 block text-xs ${
                  tipoInteres === valor ? "text-white/70" : "text-texto-3"
                }`}
              >
                {valor === "SIMPLE"
                  ? "Interés fijo repartido en cuotas iguales"
                  : "Amortización francesa, interés sobre saldo pendiente"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {tipoInteres === "SIMPLE" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModoInteres("PORCENTAJE")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              modoInteres === "PORCENTAJE"
                ? "bg-tinta text-white"
                : "bg-lienzo text-texto-2 hover:text-texto"
            }`}
          >
            Definir por %
          </button>
          <button
            type="button"
            onClick={() => setModoInteres("FIJO")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              modoInteres === "FIJO"
                ? "bg-tinta text-white"
                : "bg-lienzo text-texto-2 hover:text-texto"
            }`}
          >
            Definir en $ fijo
          </button>
        </div>
      )}

      {modoInteres === "PORCENTAJE" ? (
        <Campo
          etiqueta={tipoInteres === "SIMPLE" ? "Tasa total del préstamo (%)" : "Tasa por cuota (%)"}
          name="tasaInteres"
          type="number"
          min="0"
          step="0.01"
          value={tasaInteres}
          onChange={(e) => setTasaInteres(e.target.value)}
        />
      ) : (
        <Campo
          etiqueta="Interés total del préstamo ($)"
          name="interesFijo"
          type="number"
          min="0"
          step="0.01"
          value={interesFijo}
          onChange={(e) => setInteresFijo(e.target.value)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Selector
          etiqueta="Frecuencia de cobro"
          value={frecuencia}
          onChange={(e) => setFrecuencia(e.target.value as FrecuenciaPago)}
        >
          {Object.entries(ETIQUETA_FRECUENCIA).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </Selector>
        <Campo
          etiqueta="Número de cuotas"
          name="plazoCuotas"
          type="number"
          min="1"
          step="1"
          value={plazoCuotas}
          onChange={(e) => setPlazoCuotas(e.target.value)}
        />
      </div>

      <Campo
        etiqueta="Fecha de inicio"
        name="fechaInicio"
        type="date"
        value={fechaInicio}
        onChange={(e) => setFechaInicio(e.target.value)}
      />

      <AreaTexto
        etiqueta="Notas (opcional)"
        name="notas"
        rows={2}
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
      />

      {vistaPrevia && (
        <div className="rounded-2xl bg-lienzo/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-texto-2">
            <Icono nombre="reportes" className="size-4" />
            Vista previa
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold">{moneda(vistaPrevia.montoInteres)}</p>
              <p className="text-xs text-texto-3">Interés total</p>
            </div>
            <div>
              <p className="text-lg font-bold">{moneda(vistaPrevia.montoTotal)}</p>
              <p className="text-xs text-texto-3">Total a pagar</p>
            </div>
            <div>
              <p className="text-lg font-bold">{moneda(vistaPrevia.montoCuota)}</p>
              <p className="text-xs text-texto-3">
                Cuota {tipoInteres === "SOBRE_SALDO" ? "fija" : "aprox."}
              </p>
            </div>
          </div>
          {modoInteres === "FIJO" && (
            <p className="mt-3 text-center text-xs text-texto-3">
              Equivale a una tasa de {tasaEfectiva.toFixed(2)}%
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-rosa px-4 py-3 text-sm font-medium text-rosa-ink">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Boton type="button" variante="suave" onClick={onCancelar}>
          Cancelar
        </Boton>
        <Boton type="submit" cargando={guardando}>
          Crear préstamo
        </Boton>
      </div>
    </form>
  );
}
