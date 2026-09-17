"use client";

import { useCallback, useEffect, useState } from "react";
import Icono from "@/components/ui/Icono";
import Pildora from "@/components/ui/Pildora";
import Boton from "@/components/ui/Boton";
import Modal from "@/components/ui/Modal";
import FormularioPago from "./FormularioPago";
import { moneda, fecha } from "@/lib/formato";
import { ETIQUETA_METODO_PAGO } from "@/lib/pagos";
import { useSesion } from "@/lib/sesion-cliente";
import { usePestanas } from "@/components/pestanas/ContextoPestanas";
import type { Pago } from "@/lib/tipos";

function hoyISO() {
  const ahora = new Date();
  const desplazado = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return desplazado.toISOString().slice(0, 10);
}

export default function ListaCobros() {
  const sesion = useSesion();
  const { abrir } = usePestanas();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [soloHoy, setSoloHoy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const parametros = new URLSearchParams();
    if (soloHoy) {
      parametros.set("desde", hoyISO());
      parametros.set("hasta", hoyISO());
    }
    const respuesta = await fetch(`/api/pagos?${parametros}`);
    if (respuesta.ok) {
      const datos = await respuesta.json();
      setPagos(datos.pagos);
      setTotal(datos.total);
    }
    setCargando(false);
  }, [soloHoy]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function registrarPago(valores: {
    prestamoId: string;
    monto: number;
    metodo: string;
    fecha: string;
  }): Promise<string | null> {
    const respuesta = await fetch("/api/pagos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) return datos.error ?? "No se pudo registrar el pago";

    setModalAbierto(false);
    setError(null);
    await cargar();
    window.open(`/imprimir/recibo/${datos.pago.id}`, "_blank");
    return null;
  }

  const totalMonto = pagos
    .filter((p) => !p.anulado)
    .reduce((acc, p) => acc + Number(p.monto), 0);

  const porMetodo = pagos
    .filter((p) => !p.anulado)
    .reduce<Record<string, number>>((acc, p) => {
      acc[p.metodo] = (acc[p.metodo] ?? 0) + Number(p.monto);
      return acc;
    }, {});

  return (
    <div className="tarjeta space-y-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cobros</h1>
          <p className="text-sm text-texto-2">
            {soloHoy ? "Caja del día" : "Historial de pagos"} · {total} pagos
          </p>
        </div>
        {sesion.rol !== "CONSULTA" && (
          <Boton onClick={() => setModalAbierto(true)}>
            <Icono nombre="cobros" className="size-4" />
            Registrar pago
          </Boton>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica etiqueta="Total recibido" valor={moneda(totalMonto)} />
        {Object.entries(ETIQUETA_METODO_PAGO)
          .filter(([clave]) => porMetodo[clave] > 0)
          .map(([clave, etiqueta]) => (
            <Metrica key={clave} etiqueta={etiqueta} valor={moneda(porMetodo[clave] ?? 0)} />
          ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setSoloHoy(true)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            soloHoy ? "bg-tinta text-white" : "bg-lienzo text-texto-2 hover:text-texto"
          }`}
        >
          Hoy
        </button>
        <button
          onClick={() => setSoloHoy(false)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            !soloHoy ? "bg-tinta text-white" : "bg-lienzo text-texto-2 hover:text-texto"
          }`}
        >
          Todo el historial
        </button>
      </div>

      {cargando ? (
        <div className="flex justify-center py-16 text-texto-3">
          <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : pagos.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-lienzo text-texto-3">
            <Icono nombre="cobros" className="size-6" />
          </span>
          <p className="mt-4 text-sm text-texto-2">
            {soloHoy ? "Todavía no se han registrado cobros hoy" : "No hay pagos registrados"}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {pagos.map((pago) => (
            <li key={pago.id}>
              <button
                onClick={() => pago.prestamoId && abrir(`/prestamos/${pago.prestamoId}`)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  pago.anulado ? "bg-rosa/40" : "bg-lienzo/70 hover:bg-lienzo"
                }`}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-superficie text-texto-2">
                  <Icono nombre="cobros" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {pago.prestamo?.cliente.nombre} · {pago.prestamo?.codigo}
                  </p>
                  <p className="truncate text-xs text-texto-3">
                    {pago.codigo} · {ETIQUETA_METODO_PAGO[pago.metodo]} · {fecha(pago.fecha)} ·{" "}
                    {pago.usuario?.nombre ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${pago.anulado ? "text-texto-3 line-through" : ""}`}>
                    {moneda(Number(pago.monto))}
                  </p>
                  {pago.anulado && <Pildora tono="rosa">Anulado</Pildora>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {sesion.rol === "COBRADOR" && (
        <p className="text-xs text-texto-3">
          Estás viendo todos los cobros. Los reportes de desempeño por cobrador llegan en la fase 6.
        </p>
      )}

      {modalAbierto && (
        <Modal titulo="Registrar pago" onCerrar={() => setModalAbierto(false)} ancho="max-w-2xl">
          <FormularioPago onRegistrar={registrarPago} onCancelar={() => setModalAbierto(false)} />
        </Modal>
      )}
      {error && <p className="text-sm text-rosa-ink">{error}</p>}
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
