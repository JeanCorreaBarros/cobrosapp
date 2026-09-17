"use client";

export default function BotonImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 print:hidden"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
