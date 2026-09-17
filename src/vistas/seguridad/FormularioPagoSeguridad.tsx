"use client";

import { useEffect, useMemo, useState } from "react";
import Campo from "@/components/ui/Campo";
import Selector from "@/components/ui/Selector";
import Boton from "@/components/ui/Boton";
import Icono from "@/components/ui/Icono";
import BuscadorPoliza from "./BuscadorPoliza";
import { totalPendientePoliza } from "@/lib/seguridad";
import { ETIQUETA_METODO_PAGO } from "@/lib/pagos";
import { moneda, fecha as formatoFecha } from "@/lib/formato";
import type { PolizaSeguridad } from "@/lib/tipos";

function hoyISO() {
  const ahora = new Date();
  const desplazado = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return desplazado.toISOString().slice(0, 10);
}

export default function FormularioPagoSeguridad({
  polizaPreseleccionada,
  onRegistrar,
  onCancelar,
}: {
  polizaPreseleccionada?: PolizaSeguridad;
  onRegistrar: (valores: {
    polizaId: string;
    monto: number;
    metodo: string;
    fecha: string;
  }) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [poliza, setPoliza] = useState<PolizaSeguridad | null>(polizaPreseleccionada ?? null);
  const [detalle, setDetalle] = useState<PolizaSeguridad | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("EFECTIVO");
  const [fechaPago, setFechaPago] = useState(hoyISO());
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!poliza) {
      setDetalle(null);
      return;
    }
    setCargandoDetalle(true);
    fetch(`/api/polizas/${poliza.id}`)
      .then((r) => r.json())
      .then((d) => setDetalle(d.poliza ?? null))
      .finally(() => setCargandoDetalle(false));
  }, [poliza]);

  const resumen = useMemo(() => {
    if (!detalle?.cuotas) return null;
    const cuotas = detalle.cuotas.map((c) => ({
      id: c.id,
      numero: c.numero,
      montoCuota: Number(c.montoCuota),
      montoPagado: Number(c.montoPagado),
    }));
    const pendientes = cuotas.filter((c) => c.montoPagado < c.montoCuota - 0.009);
    const totalPendiente = totalPendientePoliza(pendientes);
    const proxima = detalle.cuotas
      .map((c) => ({ ...c, montoCuotaN: Number(c.montoCuota), montoPagadoN: Number(c.montoPagado) }))
      .find((c) => c.montoPagadoN < c.montoCuotaN - 0.009);
    return { totalPendiente, proxima, cuotasPendientes: pendientes.length };
  }, [detalle]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!poliza) {
      setError("Selecciona una póliza");
      return;
    }
    const valor = Number(monto);
    if (!valor || valor <= 0) {
      setError("Escribe un monto válido");
      return;
    }

    setGuardando(true);
    const resultado = await onRegistrar({ polizaId: poliza.id, monto: valor, metodo, fecha: fechaPago });
    setGuardando(false);
    if (resultado) setError(resultado);
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      {!polizaPreseleccionada && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-texto-2">Póliza</label>
          <BuscadorPoliza valor={poliza} onSeleccionar={setPoliza} />
        </div>
      )}

      {cargandoDetalle && (
        <div className="flex justify-center py-4 text-texto-3">
          <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      )}

      {resumen && (
        <div className="rounded-2xl bg-lienzo/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-texto-2">
            <Icono nombre="candado" className="size-4" />
            Saldo pendiente generado
          </div>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3">
            <div>
              <p className="text-lg font-bold">{moneda(resumen.totalPendiente)}</p>
              <p className="text-xs text-texto-3">Total pendiente</p>
            </div>
            <div>
              <p className="text-lg font-bold">{resumen.cuotasPendientes}</p>
              <p className="text-xs text-texto-3">Cuotas pendientes</p>
            </div>
            {resumen.proxima && (
              <div className="col-span-2 sm:col-span-1">
                <p className="text-lg font-bold">{moneda(resumen.proxima.montoCuotaN)}</p>
                <p className="text-xs text-texto-3">
                  Cuota #{resumen.proxima.numero} vence {formatoFecha(resumen.proxima.fechaVencimiento)}
                </p>
              </div>
            )}
          </div>
          {resumen.proxima && (
            <button
              type="button"
              onClick={() => setMonto(String(resumen.proxima!.montoCuotaN - resumen.proxima!.montoPagadoN))}
              className="mt-3 text-xs font-medium text-texto underline-offset-2 hover:underline"
            >
              Usar monto de la próxima cuota
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Monto a pagar"
          name="monto"
          type="number"
          min="1"
          step="0.01"
          value={monto}
          onChange={(e) => {
            setMonto(e.target.value);
            setError(null);
          }}
        />
        <Selector etiqueta="Método" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
          {Object.entries(ETIQUETA_METODO_PAGO).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </Selector>
      </div>

      <Campo
        etiqueta="Fecha del pago"
        name="fecha"
        type="date"
        value={fechaPago}
        onChange={(e) => setFechaPago(e.target.value)}
      />

      {error && (
        <p role="alert" className="rounded-2xl bg-rosa px-4 py-3 text-sm font-medium text-rosa-ink">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Boton type="button" variante="suave" onClick={onCancelar}>
          Cancelar
        </Boton>
        <Boton type="submit" cargando={guardando} disabled={!poliza}>
          Registrar pago
        </Boton>
      </div>
    </form>
  );
}
