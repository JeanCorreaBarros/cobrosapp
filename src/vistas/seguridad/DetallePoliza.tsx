"use client";

import { useCallback, useEffect, useState } from "react";
import Icono from "@/components/ui/Icono";
import Pildora from "@/components/ui/Pildora";
import Boton from "@/components/ui/Boton";
import Modal from "@/components/ui/Modal";
import FormularioPagoSeguridad from "./FormularioPagoSeguridad";
import { usePestanas } from "@/components/pestanas/ContextoPestanas";
import { useSesion } from "@/lib/sesion-cliente";
import { moneda, fecha } from "@/lib/formato";
import { ETIQUETA_FRECUENCIA } from "@/lib/amortizacion";
import { ETIQUETA_METODO_PAGO } from "@/lib/pagos";
import type { PagoSeguridad, PolizaSeguridad } from "@/lib/tipos";

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

function estadoCuota(fechaVencimiento: string, montoCuota: string, montoPagado: string) {
  const pagado = Number(montoPagado);
  const total = Number(montoCuota);
  if (pagado >= total - 0.009) return { texto: "Pagada", tono: "menta" as const };
  if (new Date(fechaVencimiento) < new Date()) return { texto: "Atrasada", tono: "rosa" as const };
  return { texto: "Pendiente", tono: "neutro" as const };
}

export default function DetallePoliza({ id }: { id: string }) {
  const sesion = useSesion();
  const { abrir } = usePestanas();
  const [poliza, setPoliza] = useState<PolizaSeguridad | null>(null);
  const [pagos, setPagos] = useState<PagoSeguridad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [nuevoPago, setNuevoPago] = useState(false);
  const [anulando, setAnulando] = useState<PagoSeguridad | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [errorAnulacion, setErrorAnulacion] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const respuesta = await fetch(`/api/polizas/${id}`);
    if (respuesta.status === 404) {
      setNoEncontrado(true);
      setCargando(false);
      return;
    }
    const datos = await respuesta.json();
    setPoliza(datos.poliza);
    setCargando(false);
  }, [id]);

  const cargarPagos = useCallback(async () => {
    const respuesta = await fetch(`/api/pagos-seguridad?polizaId=${id}`);
    if (respuesta.ok) {
      const datos = await respuesta.json();
      setPagos(datos.pagos ?? []);
    }
  }, [id]);

  useEffect(() => {
    cargar();
    cargarPagos();
  }, [cargar, cargarPagos]);

  async function cancelar() {
    const respuesta = await fetch(`/api/polizas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "CANCELADA" }),
    });
    if (respuesta.ok) {
      setConfirmarCancelar(false);
      await cargar();
    }
  }

  async function registrarPago(valores: {
    polizaId: string;
    monto: number;
    metodo: string;
    fecha: string;
  }): Promise<string | null> {
    const respuesta = await fetch("/api/pagos-seguridad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) return datos.error ?? "No se pudo registrar el pago";

    setNuevoPago(false);
    await Promise.all([cargar(), cargarPagos()]);
    return null;
  }

  async function anularPago() {
    if (!anulando) return;
    if (motivoAnulacion.trim().length < 3) {
      setErrorAnulacion("Escribe un motivo de al menos 3 caracteres");
      return;
    }
    const respuesta = await fetch(`/api/pagos-seguridad/${anulando.id}/anular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo: motivoAnulacion }),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      setErrorAnulacion(datos.error ?? "No se pudo anular el pago");
      return;
    }
    setAnulando(null);
    setMotivoAnulacion("");
    setErrorAnulacion(null);
    await Promise.all([cargar(), cargarPagos()]);
  }

  if (cargando) {
    return (
      <div className="tarjeta flex justify-center p-16 text-texto-3">
        <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  if (noEncontrado || !poliza) {
    return (
      <div className="tarjeta flex flex-col items-center gap-3 p-16 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-lienzo text-texto-3">
          <Icono nombre="candado" className="size-6" />
        </span>
        <p className="text-sm text-texto-2">Esta póliza ya no existe.</p>
      </div>
    );
  }

  const saldoPendiente =
    poliza.cuotas?.reduce((acc, c) => acc + (Number(c.montoCuota) - Number(c.montoPagado)), 0) ?? 0;
  const puedeGestionar = sesion.rol === "ADMIN" && poliza.estado !== "CANCELADA";

  return (
    <div className="space-y-4">
      <div className="tarjeta p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{poliza.codigo}</h1>
              <Pildora tono={TONO_ESTADO[poliza.estado]}>{ETIQUETA_ESTADO[poliza.estado]}</Pildora>
            </div>
            <button
              onClick={() => abrir(`/clientes/${poliza.clienteId}`)}
              className="mt-1 text-sm text-texto-2 underline-offset-2 hover:text-texto hover:underline"
            >
              {poliza.cliente.nombre}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {poliza.estado !== "CANCELADA" && sesion.rol !== "CONSULTA" && (
              <Boton onClick={() => setNuevoPago(true)}>
                <Icono nombre="cobros" className="size-4" />
                Registrar pago
              </Boton>
            )}
            {puedeGestionar && (
              <Boton variante="fantasma" onClick={() => setConfirmarCancelar(true)}>
                Cancelar póliza
              </Boton>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metrica etiqueta="Cuota" valor={moneda(Number(poliza.montoCuota))} />
          <Metrica etiqueta="Frecuencia" valor={ETIQUETA_FRECUENCIA[poliza.frecuencia]} />
          <Metrica etiqueta="Saldo generado pendiente" valor={moneda(Math.max(saldoPendiente, 0))} />
          <Metrica etiqueta="Inicio" valor={fecha(poliza.fechaInicio)} />
        </div>

        {poliza.notas && (
          <div className="mt-6 rounded-2xl bg-lienzo/70 p-4">
            <p className="text-xs font-medium text-texto-3">Notas</p>
            <p className="mt-1 text-sm text-texto">{poliza.notas}</p>
          </div>
        )}

        <p className="mt-4 text-xs text-texto-3">
          Esta póliza no vence: se generan cuotas nuevas automáticamente mientras esté activa. No
          aplica mora si una cuota se atrasa.
        </p>
      </div>

      <div className="tarjeta p-5 sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Próximas cuotas</h2>
          <span className="text-xs text-texto-3">{poliza.cuotas?.length ?? 0} generadas</span>
        </div>

        <div className="overflow-x-auto scroll-fino">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-texto-3">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Vence</th>
                <th className="px-3 py-2 font-medium text-right">Cuota</th>
                <th className="px-3 py-2 font-medium text-right">Pagado</th>
                <th className="px-3 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {poliza.cuotas?.map((c) => {
                const estado = estadoCuota(c.fechaVencimiento, c.montoCuota, c.montoPagado);
                return (
                  <tr key={c.id} className="border-t border-borde">
                    <td className="px-3 py-2.5 text-texto-2">{c.numero}</td>
                    <td className="px-3 py-2.5">{fecha(c.fechaVencimiento)}</td>
                    <td className="px-3 py-2.5 text-right font-medium">
                      {moneda(Number(c.montoCuota))}
                    </td>
                    <td className="px-3 py-2.5 text-right text-texto-2">
                      {moneda(Number(c.montoPagado))}
                    </td>
                    <td className="px-3 py-2.5">
                      <Pildora tono={estado.tono}>{estado.texto}</Pildora>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="tarjeta p-5 sm:p-7">
        <h2 className="mb-4 font-semibold">Historial de pagos</h2>
        {pagos.length === 0 ? (
          <p className="py-6 text-center text-sm text-texto-2">
            Todavía no se ha registrado ningún pago para esta póliza.
          </p>
        ) : (
          <ul className="space-y-2">
            {pagos.map((pago) => (
              <li
                key={pago.id}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                  pago.anulado ? "bg-rosa/40" : "bg-lienzo/70"
                }`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie text-texto-2">
                  <Icono nombre="cobros" className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {pago.codigo} · {ETIQUETA_METODO_PAGO[pago.metodo]}
                  </p>
                  <p className="truncate text-xs text-texto-3">
                    {fecha(pago.fecha)} · {pago.usuario?.nombre ?? "—"}
                    {pago.anulado && ` · Anulado: ${pago.motivoAnulacion}`}
                  </p>
                </div>
                <p className={`font-semibold ${pago.anulado ? "text-texto-3 line-through" : ""}`}>
                  {moneda(Number(pago.monto))}
                </p>
                {!pago.anulado && sesion.rol !== "CONSULTA" && (
                  <button
                    onClick={() => setAnulando(pago)}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-texto-3 transition hover:bg-superficie hover:text-rosa-ink"
                    aria-label="Anular pago"
                  >
                    <Icono nombre="cerrar" className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {nuevoPago && (
        <Modal titulo="Registrar pago" onCerrar={() => setNuevoPago(false)} ancho="max-w-2xl">
          <FormularioPagoSeguridad
            polizaPreseleccionada={poliza}
            onRegistrar={registrarPago}
            onCancelar={() => setNuevoPago(false)}
          />
        </Modal>
      )}

      {confirmarCancelar && (
        <Modal titulo="Cancelar póliza" onCerrar={() => setConfirmarCancelar(false)}>
          <p className="text-sm text-texto-2">
            La póliza dejará de generar cuotas nuevas y no se podrá seguir cobrando. Esta acción no
            se puede deshacer desde aquí.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Boton variante="suave" onClick={() => setConfirmarCancelar(false)}>
              Volver
            </Boton>
            <Boton onClick={cancelar}>Cancelar póliza</Boton>
          </div>
        </Modal>
      )}

      {anulando && (
        <Modal
          titulo="Anular pago"
          onCerrar={() => {
            setAnulando(null);
            setMotivoAnulacion("");
            setErrorAnulacion(null);
          }}
        >
          <p className="mb-4 text-sm text-texto-2">
            Vas a anular el pago <strong className="font-semibold text-texto">{anulando.codigo}</strong>{" "}
            por {moneda(Number(anulando.monto))}. Las cuotas afectadas volverán a quedar pendientes.
          </p>
          <label className="mb-1.5 block text-sm font-medium text-texto-2">Motivo</label>
          <textarea
            value={motivoAnulacion}
            onChange={(e) => {
              setMotivoAnulacion(e.target.value);
              setErrorAnulacion(null);
            }}
            rows={2}
            className="w-full resize-none rounded-2xl border border-borde bg-superficie px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-tinta/15"
            placeholder="Ej: se registró por error"
          />
          {errorAnulacion && <p className="mt-2 text-sm text-rosa-ink">{errorAnulacion}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <Boton
              variante="suave"
              onClick={() => {
                setAnulando(null);
                setMotivoAnulacion("");
                setErrorAnulacion(null);
              }}
            >
              Volver
            </Boton>
            <Boton onClick={anularPago}>Anular pago</Boton>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Metrica({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-lienzo p-4">
      <p className="text-xs text-texto-3">{etiqueta}</p>
      <p className="mt-1 text-lg font-bold tracking-tight">{valor}</p>
    </div>
  );
}
