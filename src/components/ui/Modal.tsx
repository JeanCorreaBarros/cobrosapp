"use client";

import { useEffect } from "react";
import Icono from "@/components/ui/Icono";

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
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", tecla);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = "";
    };
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0 bg-tinta/40 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`tarjeta relative max-h-[90vh] w-full ${ancho} overflow-y-auto scroll-fino p-6`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid size-9 place-items-center rounded-full text-texto-3 transition hover:bg-lienzo hover:text-texto"
          >
            <Icono nombre="cerrar" className="size-4.5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
