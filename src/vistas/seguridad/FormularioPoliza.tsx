"use client";

import { useMemo, useState } from "react";
import Campo from "@/components/ui/Campo";
import CampoMoneda from "@/components/ui/CampoMoneda";
import Selector from "@/components/ui/Selector";
import AreaTexto from "@/components/ui/AreaTexto";
import Boton from "@/components/ui/Boton";
import Icono from "@/components/ui/Icono";
import BuscadorCliente from "@/vistas/prestamos/BuscadorCliente";
import { ETIQUETA_FRECUENCIA, type FrecuenciaPago } from "@/lib/amortizacion";
import { calcularCuotasFaltantes, finDeAnioPoliza } from "@/lib/seguridad";
import { moneda, fecha } from "@/lib/formato";
import type { Cliente } from "@/lib/tipos";

type ClienteResumen = Pick<Cliente, "id" | "nombre" | "codigo" | "cedula" | "telefono">;
type ClienteEdicion = { id: string; nombre: string };

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
  valoresIniciales,
  textoBoton = "Crear póliza",
  onGuardar,
  onCancelar,
}: {
  clientePreseleccionado?: ClienteResumen;
  valoresIniciales?: ValoresPoliza & { cliente: ClienteEdicion };
  textoBoton?: string;
  onGuardar: (valores: ValoresPoliza) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const editando = Boolean(valoresIniciales);
  const [cliente, setCliente] = useState<ClienteResumen | ClienteEdicion | null>(
    valoresIniciales?.cliente ?? clientePreseleccionado ?? null,
  );
  const [montoCuota, setMontoCuota] = useState(String(valoresIniciales?.montoCuota ?? "500"));
  const [frecuencia, setFrecuencia] = useState<FrecuenciaPago>(valoresIniciales?.frecuencia ?? "MENSUAL");
  const [fechaInicio, setFechaInicio] = useState(valoresIniciales?.fechaInicio ?? hoyISO());
  const [notas, setNotas] = useState(valoresIniciales?.notas ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const vistaPrevia = useMemo(() => {
    const monto = Number(montoCuota);
    if (!monto || monto <= 0 || !fechaInicio) return null;
    const inicio = new Date(fechaInicio);
    if (Number.isNaN(inicio.getTime())) return null;

    const cuotas = calcularCuotasFaltantes(inicio, frecuencia, monto, []);
    const finAnio = finDeAnioPoliza(inicio);
    return {
      cantidad: cuotas.length,
      total: cuotas.reduce((acc, c) => acc + c.montoCuota, 0),
      finAnio,
    };
  }, [montoCuota, frecuencia, fechaInicio]);

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
    const resultado = await onGuardar({
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
        {editando ? (
          <div className="flex items-center gap-3 rounded-2xl border border-borde bg-lienzo/70 px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie text-texto-2">
              <Icono nombre="usuario" className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{cliente?.nombre}</p>
              <p className="truncate text-xs text-texto-3">El cliente de una póliza no se puede cambiar</p>
            </div>
          </div>
        ) : (
          <BuscadorCliente valor={cliente as ClienteResumen | null} onSeleccionar={setCliente} />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoMoneda
          etiqueta="Monto de la cuota"
          name="montoCuota"
          value={montoCuota}
          onChange={setMontoCuota}
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

      {vistaPrevia !== null && (
        <div className="rounded-2xl bg-lienzo/70 p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-texto-2">
            <Icono nombre="candado" className="size-4" />
            Vista previa
          </div>
          <p className="text-lg font-bold">{moneda(vistaPrevia.total)}</p>
          <p className="text-xs text-texto-3">
            {vistaPrevia.cantidad} cuotas {ETIQUETA_FRECUENCIA[frecuencia].toLowerCase()}
            {vistaPrevia.cantidad === 1 ? "" : "s"}, generadas hasta el {fecha(vistaPrevia.finAnio)}
          </p>
          <p className="mt-2 text-xs text-texto-3">
            La póliza no tiene fecha de vencimiento propia: cubre este año hasta esa fecha. Al
            terminar, se debe registrar una póliza nueva para el año siguiente.
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
          {textoBoton}
        </Boton>
      </div>
    </form>
  );
}
