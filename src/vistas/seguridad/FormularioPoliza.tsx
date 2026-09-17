"use client";

import { useMemo, useState } from "react";
import Campo from "@/components/ui/Campo";
import Selector from "@/components/ui/Selector";
import AreaTexto from "@/components/ui/AreaTexto";
import Boton from "@/components/ui/Boton";
import Icono from "@/components/ui/Icono";
import BuscadorCliente from "@/vistas/prestamos/BuscadorCliente";
import { ETIQUETA_FRECUENCIA, type FrecuenciaPago } from "@/lib/amortizacion";
import { moneda } from "@/lib/formato";
import type { Cliente } from "@/lib/tipos";

type ClienteResumen = Pick<Cliente, "id" | "nombre" | "codigo" | "cedula" | "telefono">;

export type ValoresPoliza = {
  clienteId: string;
  montoCuota: number;
  frecuencia: FrecuenciaPago;
  fechaInicio: string;
  notas: string;
};

function hoyISO() {
  const ahora = new Date();
  const desplazado = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return desplazado.toISOString().slice(0, 10);
}

export default function FormularioPoliza({
  clientePreseleccionado,
  onCrear,
  onCancelar,
}: {
  clientePreseleccionado?: ClienteResumen;
  onCrear: (valores: ValoresPoliza) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [cliente, setCliente] = useState<ClienteResumen | null>(clientePreseleccionado ?? null);
  const [montoCuota, setMontoCuota] = useState("500");
  const [frecuencia, setFrecuencia] = useState<FrecuenciaPago>("MENSUAL");
  const [fechaInicio, setFechaInicio] = useState(hoyISO());
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const anual = useMemo(() => {
    const monto = Number(montoCuota);
    if (!monto || monto <= 0) return null;
    const periodosPorAnio: Record<FrecuenciaPago, number> = {
      DIARIO: 365,
      SEMANAL: 52,
      QUINCENAL: 24,
      MENSUAL: 12,
    };
    return monto * periodosPorAnio[frecuencia];
  }, [montoCuota, frecuencia]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!cliente) {
      setError("Selecciona un cliente");
      return;
    }
    const monto = Number(montoCuota);
    if (!monto || monto <= 0) {
      setError("Escribe un monto válido");
      return;
    }

    setGuardando(true);
    const resultado = await onCrear({
      clienteId: cliente.id,
      montoCuota: monto,
      frecuencia,
      fechaInicio,
      notas,
    });
    setGuardando(false);
    if (resultado) setError(resultado);
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-texto-2">Cliente</label>
        <BuscadorCliente valor={cliente} onSeleccionar={setCliente} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Monto de la cuota"
          name="montoCuota"
          type="number"
          min="1"
          step="0.01"
          value={montoCuota}
          onChange={(e) => setMontoCuota(e.target.value)}
        />
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
        placeholder="Ej. tipo de cobertura, referencia de la póliza física, etc."
      />

      {anual !== null && (
        <div className="rounded-2xl bg-lienzo/70 p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-texto-2">
            <Icono nombre="candado" className="size-4" />
            Vista previa
          </div>
          <p className="text-lg font-bold">{moneda(anual)}</p>
          <p className="text-xs text-texto-3">
            estimado al año si se mantiene activa ({ETIQUETA_FRECUENCIA[frecuencia].toLowerCase()})
          </p>
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
          Crear póliza
        </Boton>
      </div>
    </form>
  );
}
