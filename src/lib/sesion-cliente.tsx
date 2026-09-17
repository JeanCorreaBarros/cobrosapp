"use client";

import { createContext, useContext } from "react";
import type { Sesion } from "@/lib/auth";

const ContextoSesion = createContext<Sesion | null>(null);

export function ProveedorSesion({
  sesion,
  children,
}: {
  sesion: Sesion;
  children: React.ReactNode;
}) {
  return <ContextoSesion.Provider value={sesion}>{children}</ContextoSesion.Provider>;
}

export function useSesion() {
  const sesion = useContext(ContextoSesion);
  if (!sesion) throw new Error("useSesion debe usarse dentro de ProveedorSesion");
  return sesion;
}
