"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icono from "@/components/ui/Icono";
import Pildora from "@/components/ui/Pildora";
import { usePestanas } from "@/components/pestanas/ContextoPestanas";
import { moneda, fecha } from "@/lib/formato";

type ItemNotificacion = {
  cuotaId: string;
  tipo: "prestamo" | "seguridad";
  ruta: string;
  codigo: string;
  cliente: string;
  monto: number;
  fechaVencimiento: string;
  atrasada: boolean;
};

type Renovacion = {
  polizaId: string;
  ruta: string;
  codigo: string;
  cliente: string;
  anioSiguiente: number;
  vencida: boolean;
  diasParaFinAnio: number;
};

const INTERVALO_MS = 45_000;

/** Campana global (visible en cualquier pantalla, junto a las pestañas
 *  abiertas) con los cobros pendientes para hoy: cuotas de préstamos y de
 *  pólizas de seguridad. Se refresca sola cada INTERVALO_MS, así que si se
 *  deja la app abierta, en cuanto pasa la medianoche del día de vencimiento
 *  de una cuota, esta aparece en la lista sin recargar nada a mano. */
export default function NotificacionesCampana() {
  const { abrir } = usePestanas();
  const [total, setTotal] = useState(0);
  const [atrasadas, setAtrasadas] = useState(0);
  const [items, setItems] = useState<ItemNotificacion[]>([]);
  const [renovaciones, setRenovaciones] = useState<Renovacion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    const respuesta = await fetch("/api/notificaciones");
    if (!respuesta.ok) return;
    const datos = await respuesta.json();
    setTotal(datos.total ?? 0);
    setAtrasadas(datos.atrasadas ?? 0);
    setItems(datos.items ?? []);
    setRenovaciones(datos.renovaciones ?? []);
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const totalConAvisos = total + renovaciones.length;

  return (
    <div ref={contenedor} className="relative shrink-0">
      <button
        aria-label="Notificaciones de cobro"
        onClick={() => setAbierto((v) => !v)}
        className="relative grid size-10 shrink-0 place-items-center rounded-full bg-superficie text-texto-2 transition hover:text-texto"
      >
        <Icono nombre="campana" className="size-4.5" />
        {totalConAvisos > 0 && (
          <span
            className={`absolute -top-1 -right-1 grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white ${
              atrasadas > 0 ? "bg-rosa-ink" : "bg-tinta"
            }`}
          >
            {totalConAvisos > 9 ? "9+" : totalConAvisos}
          </span>
        )}
      </button>

      {abierto && (
        <div className="tarjeta absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-borde px-4 py-3">
            <p className="text-sm font-semibold">Cobros pendientes hoy</p>
            <Pildora tono={atrasadas > 0 ? "rosa" : "menta"}>{total} en total</Pildora>
          </div>
          <div className="max-h-80 overflow-y-auto scroll-fino">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-texto-2">
                No hay cobros pendientes para hoy.
              </p>
            ) : (
              <ul className="divide-y divide-borde">
                {items.map((item) => (
                  <li key={item.cuotaId}>
                    <button
                      onClick={() => {
                        abrir(item.ruta);
                        setAbierto(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-lienzo"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lienzo text-texto-2">
                        <Icono nombre={item.tipo === "seguridad" ? "candado" : "prestamos"} className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.cliente}</p>
                        <p className="truncate text-xs text-texto-3">
                          {item.codigo} · vence {fecha(item.fechaVencimiento)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">{moneda(item.monto)}</p>
                        <p className={`text-xs ${item.atrasada ? "text-rosa-ink" : "text-texto-3"}`}>
                          {item.atrasada ? "Atrasado" : "Hoy"}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {renovaciones.length > 0 && (
            <>
              <div className="border-t border-borde px-4 py-2.5">
                <p className="text-xs font-semibold text-texto-2">Pólizas por renovar</p>
              </div>
              <ul className="max-h-56 divide-y divide-borde overflow-y-auto scroll-fino">
                {renovaciones.map((r) => (
                  <li key={r.polizaId}>
                    <button
                      onClick={() => {
                        abrir(r.ruta);
                        setAbierto(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-lienzo"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-durazno/60 text-durazno-ink">
                        <Icono nombre="candado" className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{r.cliente}</p>
                        <p className="truncate text-xs text-texto-3">
                          {r.codigo} ·{" "}
                          {r.vencida
                            ? `venció, registra la de ${r.anioSiguiente}`
                            : `vence pronto (${r.diasParaFinAnio}d), prepara la de ${r.anioSiguiente}`}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
