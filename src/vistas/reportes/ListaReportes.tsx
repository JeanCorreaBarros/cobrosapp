"use client";

import { useEffect, useState } from "react";
import Icono from "@/components/ui/Icono";
import Boton from "@/components/ui/Boton";
import { moneda, fecha } from "@/lib/formato";

type Bucket = { clave: string; total: number; mora: number; cantidad: number };
type Cartera = {
  buckets: Bucket[];
  totalGeneral: number;
  incobrables: { cantidad: number; capital: number };
};
type FilaRentabilidad = {
  clienteId: string;
  nombre: string;
  cedula: string;
  codigo: string;
  prestamos: number;
  capitalPrestado: number;
  interesCobrado: number;
  capitalCobrado: number;
  rentabilidad: number;
};
type Rentabilidad = { ranking: FilaRentabilidad[]; totales: { capitalPrestado: number; interesCobrado: number } };
type ProximaSeguridad = {
  poliza: string;
  cliente: string;
  cedula: string;
  numero: number;
  vence: string;
  pendiente: number;
};
type Seguridad = {
  polizasActivas: number;
  polizasAtrasadas: number;
  totalPendiente: number;
  cobradoMes: number;
  pagosMes: number;
  proximas: ProximaSeguridad[];
};

const ETIQUETA_BUCKET: Record<string, string> = {
  AL_DIA: "Al día",
  "1-30": "1 a 30 días",
  "31-60": "31 a 60 días",
  "61-90": "61 a 90 días",
  "90+": "Más de 90 días",
};

const COLOR_BUCKET: Record<string, string> = {
  AL_DIA: "bg-menta",
  "1-30": "bg-cielo",
  "31-60": "bg-durazno",
  "61-90": "bg-rosa",
  "90+": "bg-tinta",
};

export default function ListaReportes() {
  const [tab, setTab] = useState<"cartera" | "rentabilidad" | "seguridad">("cartera");
  const [cartera, setCartera] = useState<Cartera | null>(null);
  const [rentabilidad, setRentabilidad] = useState<Rentabilidad | null>(null);
  const [seguridad, setSeguridad] = useState<Seguridad | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    Promise.all([
      fetch("/api/reportes/cartera").then((r) => r.json()),
      fetch("/api/reportes/rentabilidad").then((r) => r.json()),
      fetch("/api/reportes/seguridad").then((r) => r.json()),
    ])
      .then(([c, r, s]) => {
        setCartera(c);
        setRentabilidad(r);
        setSeguridad(s);
      })
      .finally(() => setCargando(false));
  }, []);

  const maxBucket = cartera ? Math.max(...cartera.buckets.map((b) => b.total), 1) : 1;

  return (
    <div className="tarjeta space-y-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTab("cartera")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === "cartera" ? "bg-tinta text-white" : "bg-lienzo text-texto-2 hover:text-texto"
            }`}
          >
            Cartera y mora
          </button>
          <button
            onClick={() => setTab("rentabilidad")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === "rentabilidad" ? "bg-tinta text-white" : "bg-lienzo text-texto-2 hover:text-texto"
            }`}
          >
            Rentabilidad por cliente
          </button>
          <button
            onClick={() => setTab("seguridad")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === "seguridad" ? "bg-tinta text-white" : "bg-lienzo text-texto-2 hover:text-texto"
            }`}
          >
            Pólizas
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-16 text-texto-3">
          <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : tab === "cartera" && cartera ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Metrica etiqueta="Total por cobrar (activo)" valor={moneda(cartera.totalGeneral)} />
            <Metrica
              etiqueta="Préstamos incobrables"
              valor={`${cartera.incobrables.cantidad} · ${moneda(cartera.incobrables.capital)}`}
            />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Antigüedad de la cartera (aging)</h2>
            <a href="/api/reportes/cartera?formato=csv" className="text-sm">
              <Boton variante="suave">
                <Icono nombre="reportes" className="size-4" />
                Exportar CSV
              </Boton>
            </a>
          </div>

          <div className="space-y-3">
            {cartera.buckets.map((b) => (
              <div key={b.clave}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{ETIQUETA_BUCKET[b.clave]}</span>
                  <span className="text-texto-2">
                    {moneda(b.total)} · {b.cantidad} cuota(s)
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-lienzo">
                  <div
                    className={`h-full rounded-full ${COLOR_BUCKET[b.clave]}`}
                    style={{ width: `${Math.max((b.total / maxBucket) * 100, b.total > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : tab === "rentabilidad" && rentabilidad ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Metrica etiqueta="Capital prestado (histórico)" valor={moneda(rentabilidad.totales.capitalPrestado)} />
            <Metrica etiqueta="Interés cobrado (ganancia)" valor={moneda(rentabilidad.totales.interesCobrado)} />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Ranking de clientes por ganancia</h2>
            <a href="/api/reportes/rentabilidad?formato=csv">
              <Boton variante="suave">
                <Icono nombre="reportes" className="size-4" />
                Exportar CSV
              </Boton>
            </a>
          </div>

          <div className="max-h-96 overflow-y-auto overflow-x-auto scroll-fino">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-superficie">
                <tr className="text-left text-xs text-texto-3">
                  <th className="px-3 py-2 font-medium">Cliente</th>
                  <th className="px-3 py-2 font-medium text-right">Préstamos</th>
                  <th className="px-3 py-2 font-medium text-right">Capital prestado</th>
                  <th className="px-3 py-2 font-medium text-right">Interés cobrado</th>
                  <th className="px-3 py-2 font-medium text-right">Rentabilidad</th>
                </tr>
              </thead>
              <tbody>
                {rentabilidad.ranking.map((r) => (
                  <tr key={r.clienteId} className="border-t border-borde">
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{r.nombre}</p>
                      <p className="text-xs text-texto-3">{r.codigo}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right">{r.prestamos}</td>
                    <td className="px-3 py-2.5 text-right">{moneda(r.capitalPrestado)}</td>
                    <td className="px-3 py-2.5 text-right font-medium">{moneda(r.interesCobrado)}</td>
                    <td className="px-3 py-2.5 text-right text-texto-2">
                      {r.rentabilidad.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === "seguridad" && seguridad ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metrica etiqueta="Pólizas activas" valor={String(seguridad.polizasActivas)} />
            <Metrica etiqueta="Pólizas atrasadas" valor={String(seguridad.polizasAtrasadas)} />
            <Metrica etiqueta="Cobrado este mes" valor={moneda(seguridad.cobradoMes)} />
            <Metrica etiqueta="Pendiente generado" valor={moneda(seguridad.totalPendiente)} />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Próximos vencimientos</h2>
            <a href="/api/reportes/seguridad?formato=csv">
              <Boton variante="suave">
                <Icono nombre="reportes" className="size-4" />
                Exportar CSV
              </Boton>
            </a>
          </div>

          {seguridad.proximas.length === 0 ? (
            <p className="py-10 text-center text-sm text-texto-2">
              No hay cuotas de seguridad pendientes.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto overflow-x-auto scroll-fino">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-superficie">
                  <tr className="text-left text-xs text-texto-3">
                    <th className="px-3 py-2 font-medium">Cliente</th>
                    <th className="px-3 py-2 font-medium">Póliza</th>
                    <th className="px-3 py-2 font-medium">Vence</th>
                    <th className="px-3 py-2 font-medium text-right">Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {seguridad.proximas.slice(0, 15).map((p, i) => (
                    <tr key={i} className="border-t border-borde">
                      <td className="px-3 py-2.5 font-medium">{p.cliente}</td>
                      <td className="px-3 py-2.5 text-texto-2">{p.poliza}</td>
                      <td className="px-3 py-2.5">{fecha(p.vence)}</td>
                      <td className="px-3 py-2.5 text-right">{moneda(p.pendiente)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
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
