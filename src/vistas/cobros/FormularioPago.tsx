"use client";

import { useEffect, useMemo, useState } from "react";
import Campo from "@/components/ui/Campo";
import Selector from "@/components/ui/Selector";
import Boton from "@/components/ui/Boton";
import Icono from "@/components/ui/Icono";
import BuscadorPrestamo from "./BuscadorPrestamo";
import { totalPendientePrestamo, calcularMoraCuota, ETIQUETA_METODO_PAGO } from "@/lib/pagos";
import { moneda, fecha as formatoFecha } from "@/lib/formato";
import type { Prestamo } from "@/lib/tipos";

function hoyISO() {
  const ahora = new Date();
  const desplazado = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return desplazado.toISOString().slice(0, 10);
}

export default function FormularioPago({
  prestamoPreseleccionado,
  onRegistrar,
  onCancelar,
}: {
  prestamoPreseleccionado?: Prestamo;
  onRegistrar: (valores: {
    prestamoId: string;
    monto: number;
    metodo: string;
    fecha: string;
  }) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [prestamo, setPrestamo] = useState<Prestamo | null>(prestamoPreseleccionado ?? null);
  const [detalle, setDetalle] = useState<Prestamo | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("EFECTIVO");
  const [fechaPago, setFechaPago] = useState(hoyISO());
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!prestamo) {
      setDetalle(null);
      return;
    }
    setCargandoDetalle(true);
    fetch(`/api/prestamos/${prestamo.id}`)
      .then((r) => r.json())
      .then((d) => setDetalle(d.prestamo ?? null))
      .finally(() => setCargandoDetalle(false));
  }, [prestamo]);

  const resumen = useMemo(() => {
    if (!detalle?.cuotas) return null;
    const moraPorcentaje = 2; // valor visual; el servidor recalcula con la configuración real
    const cuotas = detalle.cuotas.map((c) => ({
      id: c.id,
      numero: c.numero,
      capital: Number(c.capital),
      interes: Number(c.interes),
      montoCuota: Number(c.montoCuota),
      montoPagado: Number(c.montoPagado),
      fechaVencimiento: c.fechaVencimiento,
    }));
    const pendientes = cuotas.filter((c) => c.montoPagado < c.montoCuota - 0.009);
    const totalPendiente = totalPendientePrestamo(pendientes, moraPorcentaje);
    const proxima = pendientes[0];
    const moraProxima = proxima ? calcularMoraCuota(proxima, moraPorcentaje) : 0;
    return { totalPendiente, proxima, moraProxima, cuotasPendientes: pendientes.length };
  }, [detalle]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!prestamo) {
      setError("Selecciona un préstamo");
      return;
    }
    const valor = Number(monto);
    if (!valor || valor <= 0) {
      setError("Escribe un monto válido");
      return;
    }

    setGuardando(true);
    const resultado = await onRegistrar({
      prestamoId: prestamo.id,
      monto: valor,
      metodo,
      fecha: fechaPago,
    });
    setGuardando(false);
    if (resultado) setError(resultado);
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      {!prestamoPreseleccionado && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-texto-2">Préstamo</label>
          <BuscadorPrestamo valor={prestamo} onSeleccionar={setPrestamo} />
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
            <Icono nombre="cobros" className="size-4" />
            Saldo pendiente
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
                <p className="text-lg font-bold">
                  {moneda(resumen.proxima.montoCuota - resumen.proxima.montoPagado + resumen.moraProxima)}
                </p>
                <p className="text-xs text-texto-3">
                  Cuota #{resumen.proxima.numero} vence {formatoFecha(resumen.proxima.fechaVencimiento)}
                  {resumen.moraProxima > 0 ? ` · mora ${moneda(resumen.moraProxima)}` : ""}
                </p>
              </div>
            )}
          </div>
          {resumen.proxima && (
            <button
              type="button"
              onClick={() =>
                setMonto(
                  String(
                    Math.round(
                      (resumen.proxima!.montoCuota -
                        resumen.proxima!.montoPagado +
                        resumen.moraProxima) *
                        100,
                    ) / 100,
                  ),
                )
              }
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
        <Boton type="submit" cargando={guardando} disabled={!prestamo}>
          Registrar pago
        </Boton>
      </div>
    </form>
  );
}
