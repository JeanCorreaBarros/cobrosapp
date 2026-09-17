"use client";

import { useState } from "react";
import PanelEmpresa from "./configuracion/PanelEmpresa";
import PanelUsuarios from "./configuracion/PanelUsuarios";
import PanelZonas from "./configuracion/PanelZonas";
import PanelAuditoria from "./configuracion/PanelAuditoria";
import PanelRespaldo from "./configuracion/PanelRespaldo";

const TABS = [
  { valor: "empresa", etiqueta: "Empresa y préstamos" },
  { valor: "usuarios", etiqueta: "Usuarios" },
  { valor: "zonas", etiqueta: "Zonas" },
  { valor: "auditoria", etiqueta: "Auditoría" },
  { valor: "respaldo", etiqueta: "Respaldo" },
] as const;

export default function VistaConfiguracion() {
  const [tab, setTab] = useState<(typeof TABS)[number]["valor"]>("empresa");

  return (
    <div className="tarjeta space-y-6 p-5 sm:p-7">
      <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.valor}
            onClick={() => setTab(t.valor)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === t.valor ? "bg-tinta text-white" : "bg-lienzo text-texto-2 hover:text-texto"
            }`}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>

      {tab === "empresa" && <PanelEmpresa />}
      {tab === "usuarios" && <PanelUsuarios />}
      {tab === "zonas" && <PanelZonas />}
      {tab === "auditoria" && <PanelAuditoria />}
      {tab === "respaldo" && <PanelRespaldo />}
    </div>
  );
}
