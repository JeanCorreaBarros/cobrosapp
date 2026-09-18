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

        <aside className="relative hidden items-center bg-lienzo p-12 lg:flex">
          <div className="tarjeta-oscura w-full p-8">
            <span className="grid size-11 place-items-center rounded-full bg-white/10">
              <Icono nombre="historial" className="size-5" />
            </span>
            <p className="mt-8 text-xs font-medium text-white/50">Recuperado este mes</p>
            <p className="mt-2 text-4xl font-bold tracking-tight">$ 184.500.000</p>
            <p className="mt-1 text-sm text-white/60">COP · Cartera de cobros</p>

            <div className="mt-8 flex items-center gap-6 border-t border-white/10 pt-6">
              <div>
                <p className="text-2xl font-bold">248</p>
                <p className="text-xs text-white/50">Clientes activos</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <p className="text-2xl font-bold">96</p>
                <p className="text-xs text-white/50">Préstamos vigentes</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
