import type { NombreIcono } from "@/components/ui/Icono";

export type DefinicionVista = {
  patron: RegExp;
  ruta: string;
  titulo: string | ((coincidencia: RegExpMatchArray) => string);
  icono: NombreIcono;
  fijada?: boolean;
  soloAdmin?: boolean;
};

export const VISTAS: DefinicionVista[] = [
  { patron: /^\/dashboard$/, ruta: "/dashboard", titulo: "Dashboard", icono: "dashboard", fijada: true },
  { patron: /^\/clientes$/, ruta: "/clientes", titulo: "Clientes", icono: "clientes" },
  {
    patron: /^\/clientes\/([\w-]+)$/,
    ruta: "/clientes",
    titulo: (m) => `Cliente ${m[1].slice(0, 6)}`,
    icono: "usuario",
  },
  { patron: /^\/prestamos$/, ruta: "/prestamos", titulo: "Préstamos", icono: "prestamos" },
  {
    patron: /^\/prestamos\/([\w-]+)$/,
    ruta: "/prestamos",
    titulo: (m) => `Préstamo ${m[1].slice(0, 6)}`,
    icono: "prestamos",
  },
  { patron: /^\/cobros$/, ruta: "/cobros", titulo: "Cobros", icono: "cobros" },
  { patron: /^\/agenda$/, ruta: "/agenda", titulo: "Agenda", icono: "agenda" },
  { patron: /^\/reportes$/, ruta: "/reportes", titulo: "Reportes", icono: "reportes" },
  {
    patron: /^\/configuracion$/,
    ruta: "/configuracion",
    titulo: "Configuración",
    icono: "config",
    soloAdmin: true,
  },
];

export function resolverVista(ruta: string) {
  for (const vista of VISTAS) {
    const coincidencia = ruta.match(vista.patron);
    if (coincidencia) {
      return {
        definicion: vista,
        titulo: typeof vista.titulo === "function" ? vista.titulo(coincidencia) : vista.titulo,
        parametro: coincidencia[1] ?? null,
      };
    }
  }
  return null;
}
