"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import Icono from "@/components/ui/Icono";
import { usePestanas } from "./ContextoPestanas";

export default function BarraPestanas() {
  const { pestanas, activa, activar, cerrar, cerrarOtras, cerrarTodas, mover } = usePestanas();
  const [menu, setMenu] = useState<string | null>(null);
  const [arrastrada, setArrastrada] = useState<number | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const cerrarMenu = () => setMenu(null);
    document.addEventListener("click", cerrarMenu);
    return () => document.removeEventListener("click", cerrarMenu);
  }, [menu]);

  useEffect(() => {
    const activo = contenedor.current?.querySelector('[data-activa="true"]');
    activo?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activa]);

  function atajos(evento: React.KeyboardEvent, id: string) {
    if (evento.key === "Delete" || (evento.key === "w" && (evento.ctrlKey || evento.metaKey))) {
      evento.preventDefault();
      cerrar(id);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div
        ref={contenedor}
        role="tablist"
        aria-label="Secciones abiertas"
        className="scroll-fino flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-1"
      >
        {pestanas.map((pestana, indice) => {
          const esActiva = pestana.id === activa;
          return (
            <div key={pestana.id} className="relative shrink-0">
              <div
                role="tab"
                tabIndex={0}
                aria-selected={esActiva}
                data-activa={esActiva}
                draggable
                onDragStart={() => setArrastrada(indice)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (arrastrada !== null) mover(arrastrada, indice);
                  setArrastrada(null);
                }}
                onDragEnd={() => setArrastrada(null)}
                onClick={() => activar(pestana.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    activar(pestana.id);
                  }
                  atajos(e, pestana.id);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu(menu === pestana.id ? null : pestana.id);
                }}
                className={clsx(
                  "group flex cursor-pointer items-center gap-2 rounded-full py-2 pr-2 pl-3.5 text-sm font-medium transition-all duration-200 ease-out select-none active:scale-95",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta",
                  arrastrada === indice && "opacity-40",
                  esActiva
                    ? "bg-tinta text-white"
                    : "bg-superficie text-texto-2 hover:bg-superficie hover:text-texto",
                )}
              >
                <Icono nombre={pestana.icono} className="size-4 shrink-0" />
                <span className="max-w-36 truncate">{pestana.titulo}</span>
                {pestana.fijada ? (
                  <span className="w-1" />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cerrar(pestana.id);
                    }}
                    aria-label={`Cerrar ${pestana.titulo}`}
                    className={clsx(
                      "grid size-5 shrink-0 place-items-center rounded-full transition",
                      esActiva
                        ? "text-white/60 hover:bg-white/15 hover:text-white"
                        : "text-texto-3 opacity-0 group-hover:opacity-100 hover:bg-lienzo hover:text-texto",
                    )}
                  >
                    <Icono nombre="cerrar" className="size-3" />
                  </button>
                )}
              </div>

              {menu === pestana.id && (
                <div className="tarjeta absolute top-full left-0 z-40 mt-1.5 w-52 overflow-hidden p-1.5 text-sm">
                  <button
                    onClick={() => cerrar(pestana.id)}
                    disabled={pestana.fijada}
                    className="w-full rounded-xl px-3 py-2 text-left text-texto-2 transition hover:bg-lienzo hover:text-texto disabled:opacity-40"
                  >
                    Cerrar pestaña
                  </button>
                  <button
                    onClick={() => cerrarOtras(pestana.id)}
                    className="w-full rounded-xl px-3 py-2 text-left text-texto-2 transition hover:bg-lienzo hover:text-texto"
                  >
                    Cerrar las demás
                  </button>
                  <button
                    onClick={cerrarTodas}
                    className="w-full rounded-xl px-3 py-2 text-left text-texto-2 transition hover:bg-lienzo hover:text-texto"
                  >
                    Cerrar todas
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pestanas.length > 1 && (
        <div className="sticky right-0 shrink-0 bg-lienzo pl-2">
        <button
          onClick={cerrarTodas}
          aria-label="Cerrar todas las pestañas"
          title="Cerrar todas"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie text-texto-3 transition hover:text-texto"
        >
          <Icono nombre="cerrar" className="size-4" />
        </button>
        </div>
      )}
    </div>
  );
}
