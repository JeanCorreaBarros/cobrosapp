"use client";

import { useCallback, useEffect, useState } from "react";
import Icono from "@/components/ui/Icono";
import Pildora from "@/components/ui/Pildora";
import { moneda, fecha } from "@/lib/formato";
import { calcularMoraCuota } from "@/lib/pagos";
import { enlaceWhatsApp, mensajeRecordatorio } from "@/lib/whatsapp";
import { usePestanas } from "@/components/pestanas/ContextoPestanas";
import type { Zona } from "@/lib/tipos";

type CuotaAgenda = {
  id: string;
  numero: number;
  fechaVencimiento: string;
  montoCuota: string;
  montoPagado: string;
  prestamo: {
    id: string;
    codigo: string;
    cliente: {
      id: string;
      nombre: string;
      telefono: string;
      zona: { id: string; nombre: string } | null;
    };
  };
};

const RANGOS = [
  { valor: "hoy", etiqueta: "Hoy y atrasadas" },
  { valor: "semana", etiqueta: "Próximos 7 días" },
  { valor: "atrasadas", etiqueta: "Solo atrasadas" },
];

function diasAtraso(fechaVencimiento: string) {
  const dias = Math.floor((Date.now() - new Date(fechaVencimiento).getTime()) / 86400000);
  return dias;
}

export default function ListaAgenda() {
  const { abrir } = usePestanas();
  const [cuotas, setCuotas] = useState<CuotaAgenda[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [rango, setRango] = useState("hoy");
  const [zonaId, setZonaId] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const parametros = new URLSearchParams({ rango });
    if (zonaId) parametros.set("zonaId", zonaId);
    const respuesta = await fetch(`/api/agenda?${parametros}`);
    if (respuesta.ok) {
      const datos = await respuesta.json();
      setCuotas(datos.cuotas);
    }
    setCargando(false);
  }, [rango, zonaId]);

  useEffect(() => {
    cargar();
    fetch("/api/zonas")
      .then((r) => r.json())
      .then((d) => setZonas(d.zonas ?? []))
      .catch(() => {});
  }, [cargar]);

  const totalPendiente = cuotas.reduce(
    (acc, c) => acc + (Number(c.montoCuota) - Number(c.montoPagado)),
    0,
  );

  const grupos = cuotas.reduce<Record<string, CuotaAgenda[]>>((acc, c) => {
    const zona = c.prestamo.cliente.zona?.nombre ?? "Sin zona";
    acc[zona] = acc[zona] ?? [];
    acc[zona].push(c);
    return acc;
  }, {});

  return (
    <div className="tarjeta space-y-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda de cobro</h1>
          <p className="text-sm text-texto-2">
            {cuotas.length} cuotas pendientes · {moneda(totalPendiente)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {RANGOS.map((r) => (
            <button
              key={r.valor}
              onClick={() => setRango(r.valor)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                rango === r.valor ? "bg-tinta text-white" : "bg-lienzo text-texto-2 hover:text-texto"
              }`}
            >
              {r.etiqueta}
            </button>
          ))}
        </div>

        <select
          value={zonaId}
          onChange={(e) => setZonaId(e.target.value)}
          className="rounded-2xl border border-borde bg-superficie px-4 py-2 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-tinta/15"
        >
          <option value="">Todas las zonas</option>
          {zonas.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}
            </option>
          ))}
        </select>
      </div>

      {cargando ? (
        <div className="flex justify-center py-16 text-texto-3">
          <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : cuotas.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-lienzo text-texto-3">
            <Icono nombre="agenda" className="size-6" />
          </span>
          <p className="mt-4 text-sm text-texto-2">No hay cobros pendientes en este rango.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grupos).map(([zona, items]) => (
            <div key={zona}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-texto-2">
                <Icono nombre="clientes" className="size-4" />
                Zona {zona}
                <span className="text-texto-3">({items.length})</span>
              </h2>
              <ul className="space-y-2">
                {items.map((c) => {
                  const dias = diasAtraso(c.fechaVencimiento);
                  const mora = calcularMoraCuota(
                    { montoCuota: Number(c.montoCuota), montoPagado: Number(c.montoPagado), fechaVencimiento: c.fechaVencimiento },
                    2,
                  );
                  const mensaje = mensajeRecordatorio({
                    nombreCliente: c.prestamo.cliente.nombre,
                    codigoPrestamo: c.prestamo.codigo,
                    monto: moneda(Number(c.montoCuota) - Number(c.montoPagado) + mora),
                    fechaVencimiento: fecha(c.fechaVencimiento),
                    diasAtraso: dias,
                  });
                  return (
                    <li key={c.id} className="flex items-center gap-2">
                      <button
                        onClick={() => abrir(`/prestamos/${c.prestamo.id}`)}
                        className="flex flex-1 items-center gap-3 rounded-2xl bg-lienzo/70 px-4 py-3 text-left transition hover:bg-lienzo"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie text-texto-2">
                          <Icono nombre="usuario" className="size-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {c.prestamo.cliente.nombre}
                          </p>
                          <p className="truncate text-xs text-texto-3">
                            {c.prestamo.codigo} · Cuota #{c.numero} · {c.prestamo.cliente.telefono}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {moneda(Number(c.montoCuota) - Number(c.montoPagado) + mora)}
                          </p>
                          {dias > 0 ? (
                            <Pildora tono="rosa">{dias} día(s) de atraso</Pildora>
                          ) : dias === 0 ? (
                            <Pildora tono="cielo">Vence hoy</Pildora>
                          ) : (
                            <Pildora tono="neutro">En {Math.abs(dias)} día(s)</Pildora>
                          )}
                        </div>
                      </button>
                      <a
                        href={enlaceWhatsApp(c.prestamo.cliente.telefono, mensaje)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Recordar por WhatsApp a ${c.prestamo.cliente.nombre}`}
                        title="Enviar recordatorio por WhatsApp"
                        className="grid size-10 shrink-0 place-items-center rounded-full bg-menta text-menta-ink transition hover:opacity-80"
                      >
                        <Icono nombre="mensaje" className="size-4.5" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
