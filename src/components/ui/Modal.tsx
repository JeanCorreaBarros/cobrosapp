"use client";

import { useEffect, useState } from "react";
import Icono from "@/components/ui/Icono";

const EASE_NATIVO = "cubic-bezier(0.32,0.72,0,1)";
const DURACION_MS = 220;

export default function Modal({
  titulo,
  onCerrar,
  children,
  ancho = "max-w-lg",
}: {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
  ancho?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const abierto = visible && !saliendo;

  useEffect(() => {
    // Un frame después del montaje para que el navegador sí anime desde
    // el estado inicial (si se marca visible en el mismo tick, no hay
    // transición: entraría ya en su posición final).
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function cerrar() {
    setSaliendo(true);
    setTimeout(onCerrar, DURACION_MS);
  }

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") cerrar();
    }
    document.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Cerrar"
        onClick={cerrar}
        className="absolute inset-0 bg-tinta/40 backdrop-blur-sm transition-opacity"
        style={{
          opacity: abierto ? 1 : 0,
          transitionDuration: `${DURACION_MS}ms`,
          transitionTimingFunction: EASE_NATIVO,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`tarjeta relative max-h-[90vh] w-full ${ancho} overflow-y-auto scroll-fino p-6 transition-[transform,opacity]`}
        style={{
          opacity: abierto ? 1 : 0,
          transform: abierto ? "scale(1) translateY(0)" : "scale(0.94) translateY(12px)",
          transitionDuration: `${DURACION_MS}ms`,
          transitionTimingFunction: EASE_NATIVO,
        }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button
            onClick={cerrar}
            aria-label="Cerrar"
            className="grid size-9 place-items-center rounded-full text-texto-3 transition hover:bg-lienzo hover:text-texto active:scale-90"
          >
            <Icono nombre="cerrar" className="size-4.5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
