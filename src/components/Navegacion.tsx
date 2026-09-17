"use client";

import Link from "next/link";
import { usePestanas } from "@/components/pestanas/ContextoPestanas";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import Icono, { type NombreIcono } from "@/components/ui/Icono";
import { iniciales } from "@/lib/formato";
import type { Sesion } from "@/lib/auth";

const ENLACES: { href: string; etiqueta: string; icono: NombreIcono; roles?: Sesion["rol"][] }[] = [
  { href: "/dashboard", etiqueta: "Dashboard", icono: "dashboard" },
  { href: "/clientes", etiqueta: "Clientes", icono: "clientes" },
  { href: "/prestamos", etiqueta: "Préstamos", icono: "prestamos" },
  { href: "/cobros", etiqueta: "Cobros", icono: "cobros" },
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

// Misma curva que usan las hojas/menús nativos de iOS: entra rápido y
// frena suave, en vez de la curva lineal/ease por defecto de un modal web.
const EASE_NATIVO = "cubic-bezier(0.32,0.72,0,1)";

export default function Navegacion({ sesion }: { sesion: Sesion }) {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  const router = useRouter();
  const { abrir } = usePestanas();

  const enlaces = ENLACES.filter((e) => !e.roles || e.roles.includes(sesion.rol));

  // Bloquea el scroll del fondo mientras el menú está abierto, como en una
  // hoja nativa, y cierra con la tecla atrás/Escape.
  useEffect(() => {
    if (!abierto) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  async function salir() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const contenido = (
    <div
      className="flex h-full flex-col overflow-y-auto scroll-fino px-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.5rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
      }}
    >
      <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2">
        <span className="grid size-9 place-items-center rounded-2xl bg-tinta text-white">
          <Icono nombre="cobros" className="size-4.5" />
        </span>
        <span className="text-lg font-bold tracking-tight">Cobro</span>
      </Link>

      <div className="mb-8 flex flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-full bg-lila text-lg font-bold text-lila-ink">
          {iniciales(sesion.nombre)}
        </span>
        <p className="mt-3 text-sm font-semibold">{sesion.nombre}</p>
        <p className="text-xs text-texto-3">{ETIQUETA_ROL[sesion.rol]}</p>
      </div>

      <nav className="flex-1 space-y-1">
        {enlaces.map((enlace) => {
          const activo = ruta === enlace.href || ruta.startsWith(`${enlace.href}/`);
          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              onClick={(e) => {
                e.preventDefault();
                abrir(enlace.href);
                setAbierto(false);
              }}
              aria-current={activo ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition active:scale-[0.97]",
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
        className="mt-6 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-texto-2 transition active:scale-[0.97] hover:bg-superficie hover:text-texto"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie">
          <Icono nombre="salir" className="size-4.5" />
        </span>
        Cerrar sesión
      </button>
    </div>
  );

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b border-borde bg-lienzo/90 px-4 backdrop-blur lg:hidden"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
          paddingBottom: "0.75rem",
        }}
      >
        <button
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="grid size-11 place-items-center rounded-full bg-superficie shadow-[0_2px_12px_rgba(17,24,39,0.06)] transition active:scale-90"
        >
          <Icono nombre="menu" className="size-5" />
        </button>
        <span className="text-base font-bold tracking-tight">Cobro</span>
        <span className="grid size-11 place-items-center rounded-full bg-lila text-sm font-bold text-lila-ink">
          {iniciales(sesion.nombre)}
        </span>
      </header>

      <aside className="hidden w-64 shrink-0 lg:block">{contenido}</aside>

      {/* Siempre montado (solo se anima con transform/opacity) para que el
          deslizamiento de entrada y salida sea real, no un aparecer/desaparecer
          instantáneo. */}
      <div
        className={clsx(
          "fixed inset-0 z-50 lg:hidden",
          abierto ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!abierto}
      >
        <button
          aria-label="Cerrar menú"
          onClick={() => setAbierto(false)}
          tabIndex={abierto ? 0 : -1}
          className="absolute inset-0 bg-tinta/40 backdrop-blur-sm transition-opacity duration-300"
          style={{ opacity: abierto ? 1 : 0, transitionTimingFunction: EASE_NATIVO }}
        />
        <div
          className="absolute inset-y-0 left-0 w-[82%] max-w-80 rounded-r-[28px] bg-lienzo shadow-2xl transition-transform duration-300"
          style={{
            transform: abierto ? "translateX(0)" : "translateX(-100%)",
            transitionTimingFunction: EASE_NATIVO,
          }}
        >
          {contenido}
        </div>
      </div>
    </>
  );
}
