"use client";

import { useEffect, useState } from "react";
import { useSesion } from "@/lib/sesion-cliente";
import { usePestanas } from "@/components/pestanas/ContextoPestanas";
import BuscadorGlobal from "@/components/BuscadorGlobal";
import Icono from "@/components/ui/Icono";
import Pildora from "@/components/ui/Pildora";
import { Tarjeta, TarjetaOscura } from "@/components/ui/Tarjeta";
import { moneda } from "@/lib/formato";

const TONOS_KPI = {
  lila: "bg-lila text-lila-ink",
  menta: "bg-menta text-menta-ink",
  rosa: "bg-rosa text-rosa-ink",
} as const;

type DatosDashboard = {
  porCobrar: number;
  cobradoMes: number;
  enMora: number;
  gananciaMes: number;
  clientesActivos: number;
  prestamosActivos: number;
  cobrosHoyTotal: number;
  cuotasHoy: {
    cuotaId: string;
    prestamoId: string;
    codigo: string;
    cliente: string;
    monto: number;
    atrasada: boolean;
  }[];
};

export default function VistaDashboard() {
  const sesion = useSesion();
  const { abrir } = usePestanas();
  const [datos, setDatos] = useState<DatosDashboard | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setDatos)
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="tarjeta space-y-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-texto-2">Hola {sesion.nombre}, este es el resumen de hoy.</p>
        </div>
        <div className="flex items-center gap-2">
          <BuscadorGlobal />
          <button
            aria-label="Notificaciones"
            className="grid size-11 place-items-center rounded-full bg-lienzo text-texto-2 transition hover:text-texto"
          >
            <Icono nombre="campana" className="size-4.5" />
          </button>
          <button
            aria-label="Mensajes"
            className="grid size-11 place-items-center rounded-full bg-lienzo text-texto-2 transition hover:text-texto"
          >
            <Icono nombre="mensaje" className="size-4.5" />
          </button>
        </div>
      </div>

      {cargando || !datos ? (
        <div className="flex justify-center py-16 text-texto-3">
          <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                etiqueta: "Por cobrar",
                valor: datos.porCobrar,
                tono: "lila",
                icono: "cobros",
                nota: `${datos.prestamosActivos} préstamos vigentes`,
              },
              {
                etiqueta: "Cobrado este mes",
                valor: datos.cobradoMes,
                tono: "menta",
                icono: "reportes",
                nota: `${datos.clientesActivos} clientes activos`,
              },
              {
                etiqueta: "En mora",
                valor: datos.enMora,
                tono: "rosa",
                icono: "agenda",
                nota: `${datos.cobrosHoyTotal} cuotas pendientes hoy`,
              },
            ].map((k) => (
              <Tarjeta key={k.etiqueta} className="border border-borde shadow-none">
                <div className="flex items-start justify-between">
                  <span
                    className={`grid size-11 place-items-center rounded-full ${TONOS_KPI[k.tono as keyof typeof TONOS_KPI]}`}
                  >
                    <Icono nombre={k.icono as "cobros"} className="size-5" />
                  </span>
                </div>
                <p className="mt-5 text-2xl font-bold tracking-tight">{moneda(k.valor)}</p>
                <p className="mt-1 text-sm text-texto-2">{k.etiqueta}</p>
                <p className="mt-3 text-xs text-texto-3">{k.nota}</p>
              </Tarjeta>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Tarjeta className="border border-borde shadow-none lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Cobros de hoy</h2>
                  <p className="text-sm text-texto-2">Cuotas por vencer o atrasadas</p>
                </div>
                <Pildora tono="cielo">{datos.cobrosHoyTotal} pendientes</Pildora>
              </div>
              {datos.cuotasHoy.length === 0 ? (
                <p className="mt-5 py-6 text-center text-sm text-texto-2">
                  No hay cobros pendientes para hoy.
                </p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {datos.cuotasHoy.map((c) => (
                    <li key={c.cuotaId}>
                      <button
                        onClick={() => abrir(`/prestamos/${c.prestamoId}`)}
                        className="flex w-full items-center gap-3 rounded-2xl bg-lienzo/70 px-4 py-3 text-left transition hover:bg-lienzo"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie text-texto-2">
                          <Icono nombre="usuario" className="size-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{c.cliente}</p>
                          <p className="truncate text-xs text-texto-3">{c.codigo}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{moneda(c.monto)}</p>
                          <Pildora tono={c.atrasada ? "rosa" : "menta"} className="mt-1">
                            {c.atrasada ? "Atrasado" : "Al día"}
                          </Pildora>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>

            <TarjetaOscura className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="grid size-10 place-items-center rounded-full bg-white/10">
                  <Icono nombre="reportes" className="size-5" />
                </span>
                <span className="text-xs text-white/50">Este mes</span>
              </div>
              <div className="mt-8">
                <p className="text-3xl font-bold tracking-tight">{moneda(datos.gananciaMes)}</p>
                <p className="mt-1 text-sm text-white/60">Ganancia por intereses y mora</p>
                <p className="mt-6 text-xs leading-relaxed text-white/40">
                  Incluye todos los pagos no anulados registrados este mes.
                </p>
              </div>
            </TarjetaOscura>
          </div>
        </>
      )}
    </div>
  );
}
