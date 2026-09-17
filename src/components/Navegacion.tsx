"use client";

import Link from "next/link";
import { usePestanas } from "@/components/pestanas/ContextoPestanas";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import Icono, { type NombreIcono } from "@/components/ui/Icono";
import { iniciales } from "@/lib/formato";
import type { Sesion } from "@/lib/auth";

const ENLACES: { href: string; etiqueta: string; icono: NombreIcono; roles?: Sesion["rol"][] }[] = [
  { href: "/dashboard", etiqueta: "Dashboard", icono: "dashboard" },
  { href: "/clientes", etiqueta: "Clientes", icono: "clientes" },
  { href: "/prestamos", etiqueta: "Préstamos", icono: "prestamos" },
  { href: "/cobros", etiqueta: "Cobros", icono: "cobros" },
  { href: "/agenda", etiqueta: "Agenda", icono: "agenda" },
  { href: "/reportes", etiqueta: "Reportes", icono: "reportes" },
  { href: "/configuracion", etiqueta: "Configuración", icono: "config", roles: ["ADMIN"] },
];

const ETIQUETA_ROL: Record<Sesion["rol"], string> = {
  ADMIN: "Administrador",
  COBRADOR: "Cobrador",
  CONSULTA: "Solo consulta",
};

export default function Navegacion({ sesion }: { sesion: Sesion }) {
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  const router = useRouter();
  const { abrir } = usePestanas();

  const enlaces = ENLACES.filter((e) => !e.roles || e.roles.includes(sesion.rol));

  async function salir() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const contenido = (
    <div className="flex h-full flex-col px-4 py-6">
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
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-lienzo/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="grid size-11 place-items-center rounded-full bg-superficie shadow-[0_2px_12px_rgba(17,24,39,0.06)]"
        >
          <Icono nombre="menu" className="size-5" />
        </button>
        <span className="text-base font-bold tracking-tight">Cobro</span>
        <span className="grid size-11 place-items-center rounded-full bg-lila text-sm font-bold text-lila-ink">
          {iniciales(sesion.nombre)}
        </span>
      </header>

      <aside className="hidden w-64 shrink-0 lg:block">{contenido}</aside>

      {abierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Cerrar menú"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-tinta/40 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-lienzo shadow-2xl">
            <button
              onClick={() => setAbierto(false)}
              aria-label="Cerrar menú"
              className="absolute top-6 right-4 grid size-9 place-items-center rounded-full bg-superficie text-texto-2"
            >
              <Icono nombre="cerrar" className="size-4.5" />
            </button>
            {contenido}
          </div>
        </div>
      )}
    </>
  );
}
