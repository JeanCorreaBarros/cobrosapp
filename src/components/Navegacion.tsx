"use client";

import Link from "next/link";
import { usePestanas } from "@/components/pestanas/ContextoPestanas";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import Icono, { type NombreIcono } from "@/components/ui/Icono";
import ModalMiCuenta from "@/components/ModalMiCuenta";
import { iniciales } from "@/lib/formato";
import type { Sesion } from "@/lib/auth";

type Enlace = { href: string; etiqueta: string; icono: NombreIcono; roles?: Sesion["rol"][] };

// Los 4 más usados en el día a día van en la barra inferior (como una app
// nativa); el resto queda detrás de "Más". En escritorio el sidebar los
// muestra todos igual, sin esta separación.
const PRINCIPALES: Enlace[] = [
  { href: "/dashboard", etiqueta: "Inicio", icono: "dashboard" },
  { href: "/clientes", etiqueta: "Clientes", icono: "clientes" },
  { href: "/prestamos", etiqueta: "Préstamos", icono: "prestamos" },
  { href: "/cobros", etiqueta: "Cobros", icono: "cobros" },
];

const SECUNDARIOS: Enlace[] = [
  { href: "/seguridad", etiqueta: "Seguridad", icono: "candado" },
  { href: "/agenda", etiqueta: "Agenda", icono: "agenda" },
  { href: "/reportes", etiqueta: "Reportes", icono: "reportes" },
  { href: "/configuracion", etiqueta: "Configuración", icono: "config", roles: ["ADMIN"] },
];

const ETIQUETA_ROL: Record<Sesion["rol"], string> = {
  ADMIN: "Administrador",
  COBRADOR: "Cobrador",
  CONSULTA: "Solo consulta",
};

// Misma curva que usan las hojas/menús nativos de iOS.
const EASE_NATIVO = "cubic-bezier(0.32,0.72,0,1)";

export default function Navegacion({ sesion }: { sesion: Sesion }) {
  const [masAbierto, setMasAbierto] = useState(false);
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const ruta = usePathname();
  const router = useRouter();
  const { abrir } = usePestanas();

  const secundarios = SECUNDARIOS.filter((e) => !e.roles || e.roles.includes(sesion.rol));
  const esActivo = (href: string) => ruta === href || ruta.startsWith(`${href}/`);

  useEffect(() => {
    if (!masAbierto) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setMasAbierto(false);
    }
    document.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", tecla);
    };
  }, [masAbierto]);

  async function salir() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function irA(href: string) {
    abrir(href);
    setMasAbierto(false);
  }

  const listaEscritorio = [...PRINCIPALES, ...secundarios];

  return (
    <>
      {/* Escritorio: sidebar completo, sin cambios de comportamiento */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="flex h-full flex-col px-4 py-6">
          <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2">
            <span className="grid size-9 place-items-center rounded-2xl bg-tinta text-white">
              <Icono nombre="cobros" className="size-4.5" />
            </span>
            <span className="text-lg font-bold tracking-tight">Cobro</span>
          </Link>

          <button
            onClick={() => setCuentaAbierta(true)}
            className="mb-8 flex flex-col items-center text-center transition active:scale-95"
          >
            <span className="grid size-16 place-items-center rounded-full bg-lila text-lg font-bold text-lila-ink">
              {iniciales(sesion.nombre)}
            </span>
            <p className="mt-3 text-sm font-semibold">{sesion.nombre}</p>
            <p className="text-xs text-texto-3">{ETIQUETA_ROL[sesion.rol]}</p>
          </button>

          <nav className="flex-1 space-y-1">
            {listaEscritorio.map((enlace) => {
              const activo = esActivo(enlace.href);
              return (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  onClick={(e) => {
                    e.preventDefault();
                    irA(enlace.href);
                  }}
                  aria-current={activo ? "page" : undefined}
                  className={clsx(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                    activo
                      ? "bg-superficie text-texto shadow-[0_2px_12px_rgba(17,24,39,0.06)]"
                      : "text-texto-2 hover:bg-superficie/60 hover:text-texto",
                  )}
                >
                  <span
                    className={clsx(
                      "grid size-9 shrink-0 place-items-center rounded-full transition",
                      activo ? "bg-tinta text-white" : "bg-superficie text-texto-2",
                    )}
                  >
                    <Icono nombre={enlace.icono} className="size-4.5" />
                  </span>
                  {enlace.etiqueta}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={salir}
            className="mt-6 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-texto-2 transition hover:bg-superficie hover:text-texto"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie">
              <Icono nombre="salir" className="size-4.5" />
            </span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Móvil: header simple + barra inferior flotante + hoja "Más" */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b border-borde bg-lienzo/90 px-4 backdrop-blur lg:hidden"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
          paddingBottom: "0.75rem",
        }}
      >
        <span className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-2xl bg-tinta text-white">
            <Icono nombre="cobros" className="size-4.5" />
          </span>
          <span className="text-base font-bold tracking-tight">Cobro</span>
        </span>
        <button
          onClick={() => setCuentaAbierta(true)}
          aria-label="Mi cuenta"
          className="grid size-11 place-items-center rounded-full bg-lila text-sm font-bold text-lila-ink transition active:scale-90"
        >
          {iniciales(sesion.nombre)}
        </button>
      </header>

      <nav
        className="fixed inset-x-3 z-30 flex items-center justify-around rounded-[28px] bg-superficie px-1 shadow-[0_8px_32px_rgba(17,24,39,0.16)] lg:hidden"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
          paddingTop: "0.5rem",
          paddingBottom: "0.5rem",
        }}
      >
        {PRINCIPALES.map((enlace) => {
          const activo = esActivo(enlace.href);
          return (
            <button
              key={enlace.href}
              onClick={() => irA(enlace.href)}
              aria-current={activo ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 transition active:scale-90"
            >
              <span
                className={clsx(
                  "h-0.5 w-4 rounded-full transition",
                  activo ? "bg-tinta" : "bg-transparent",
                )}
              />
              <Icono
                nombre={enlace.icono}
                className={clsx("size-5.5 transition", activo ? "text-tinta" : "text-texto-3")}
              />
              <span
                className={clsx(
                  "text-[10px] font-medium transition",
                  activo ? "text-tinta" : "text-texto-3",
                )}
              >
                {enlace.etiqueta}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => setMasAbierto(true)}
          className="flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 transition active:scale-90"
        >
          <span className="h-0.5 w-4 rounded-full bg-transparent" />
          <Icono nombre="menu" className="size-5.5 text-texto-3" />
          <span className="text-[10px] font-medium text-texto-3">Más</span>
        </button>
      </nav>

      {/* Hoja "Más": sube desde abajo, como una hoja nativa de acciones */}
      <div
        className={clsx(
          "fixed inset-0 z-50 lg:hidden",
          masAbierto ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!masAbierto}
      >
        <button
          aria-label="Cerrar menú"
          onClick={() => setMasAbierto(false)}
          tabIndex={masAbierto ? 0 : -1}
          className="absolute inset-0 bg-tinta/40 backdrop-blur-sm transition-opacity duration-300"
          style={{ opacity: masAbierto ? 1 : 0, transitionTimingFunction: EASE_NATIVO }}
        />
        <div
          className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-lienzo shadow-2xl transition-transform duration-300"
          style={{
            transform: masAbierto ? "translateY(0)" : "translateY(100%)",
            transitionTimingFunction: EASE_NATIVO,
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
            maxHeight: "80vh",
          }}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-borde" />

          <div className="max-h-[calc(80vh-2rem)] overflow-y-auto scroll-fino px-4 pt-4">
            <div className="mb-4 flex items-center gap-3 px-1">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-lila text-base font-bold text-lila-ink">
                {iniciales(sesion.nombre)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{sesion.nombre}</p>
                <p className="text-xs text-texto-3">{ETIQUETA_ROL[sesion.rol]}</p>
              </div>
              <button
                onClick={() => {
                  setMasAbierto(false);
                  setCuentaAbierta(true);
                }}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie text-texto-2 transition active:scale-90"
                aria-label="Mi cuenta"
              >
                <Icono nombre="config" className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {secundarios.map((enlace) => {
                const activo = esActivo(enlace.href);
                return (
                  <button
                    key={enlace.href}
                    onClick={() => irA(enlace.href)}
                    className="flex flex-col items-center gap-2 rounded-2xl py-3 transition active:scale-95"
                  >
                    <span
                      className={clsx(
                        "grid size-12 place-items-center rounded-full transition",
                        activo ? "bg-tinta text-white" : "bg-superficie text-texto-2",
                      )}
                    >
                      <Icono nombre={enlace.icono} className="size-5" />
                    </span>
                    <span className="text-center text-xs font-medium text-texto-2">
                      {enlace.etiqueta}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={salir}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-superficie px-3 py-3 text-sm font-medium text-texto-2 transition active:scale-[0.98]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lienzo">
                <Icono nombre="salir" className="size-4.5" />
              </span>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {cuentaAbierta && (
        <ModalMiCuenta sesion={sesion} onCerrar={() => setCuentaAbierta(false)} />
      )}
    </>
  );
}
