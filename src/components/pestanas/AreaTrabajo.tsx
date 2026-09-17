"use client";

import VistaDashboard from "@/vistas/Dashboard";
import VistaClientes from "@/vistas/Clientes";
import VistaPrestamos from "@/vistas/Prestamos";
import VistaCobros from "@/vistas/Cobros";
import VistaSeguridad from "@/vistas/Seguridad";
import VistaAgenda from "@/vistas/Agenda";
import VistaReportes from "@/vistas/Reportes";
import VistaConfiguracion from "@/vistas/Configuracion";
import BarraPestanas from "./BarraPestanas";
import { usePestanas } from "./ContextoPestanas";

const VISTAS: Record<string, React.ComponentType<{ parametro?: string | null }>> = {
  "/dashboard": VistaDashboard,
  "/clientes": VistaClientes,
  "/prestamos": VistaPrestamos,
  "/cobros": VistaCobros,
  "/seguridad": VistaSeguridad,
  "/agenda": VistaAgenda,
  "/reportes": VistaReportes,
  "/configuracion": VistaConfiguracion,
};

function componenteDe(ruta: string) {
  if (VISTAS[ruta]) return { Componente: VISTAS[ruta], parametro: null };
  const base = `/${ruta.split("/")[1] ?? ""}`;
  const Componente = VISTAS[base];
  return Componente ? { Componente, parametro: ruta.split("/")[2] ?? null } : null;
}

export default function AreaTrabajo() {
  const { pestanas, activa } = usePestanas();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <BarraPestanas />

      <div className="min-h-0 flex-1">
        {pestanas.map((pestana) => {
          const resuelto = componenteDe(pestana.ruta);
          if (!resuelto) return null;
          const { Componente, parametro } = resuelto;
          const esActiva = pestana.id === activa;

          return (
            <div
              key={pestana.id}
              role="tabpanel"
              hidden={!esActiva}
              aria-hidden={!esActiva}
              className={esActiva ? "block" : "hidden"}
            >
              <Componente parametro={parametro} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
