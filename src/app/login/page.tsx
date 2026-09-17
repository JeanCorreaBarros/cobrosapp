import { Suspense } from "react";
import FormularioLogin from "./FormularioLogin";
import Icono from "@/components/ui/Icono";

export default function PaginaLogin() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] bg-superficie shadow-[0_8px_40px_rgba(17,24,39,0.08)] lg:grid-cols-2">
        <div className="p-7 sm:p-12">
          <div className="mb-10 flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-tinta text-white">
              <Icono nombre="cobros" className="size-5" />
            </span>
            <span className="text-xl font-bold tracking-tight">Cobro</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">Bienvenido de vuelta</h1>
          <p className="mt-2 mb-8 text-sm text-texto-2">
            Entra con tu usuario para gestionar clientes, préstamos y cobros.
          </p>

          <Suspense fallback={null}>
            <FormularioLogin />
          </Suspense>
        </div>

        <aside className="relative hidden bg-lienzo p-12 lg:block">
          <div className="tarjeta-oscura p-6">
            <div className="flex items-start justify-between">
              <span className="grid size-10 place-items-center rounded-full bg-white/10">
                <Icono nombre="historial" className="size-5" />
              </span>
              <span className="text-xs text-white/50">Este mes</span>
            </div>
            <p className="mt-6 text-3xl font-bold">RD$ 184,500</p>
            <p className="mt-1 text-sm text-white/60">Recuperado de cartera</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="tarjeta p-5">
              <span className="grid size-9 place-items-center rounded-full bg-menta text-menta-ink">
                <Icono nombre="clientes" className="size-4" />
              </span>
              <p className="mt-4 text-2xl font-bold">248</p>
              <p className="text-xs text-texto-2">Clientes activos</p>
            </div>
            <div className="tarjeta p-5">
              <span className="grid size-9 place-items-center rounded-full bg-lila text-lila-ink">
                <Icono nombre="prestamos" className="size-4" />
              </span>
              <p className="mt-4 text-2xl font-bold">96</p>
              <p className="text-xs text-texto-2">Préstamos vigentes</p>
            </div>
          </div>

          <div className="tarjeta mt-4 flex items-center gap-3 p-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-durazno text-durazno-ink">
              <Icono nombre="agenda" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">14 cobros para hoy</p>
              <p className="truncate text-xs text-texto-2">Ruta Centro · 3 atrasados</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
