"use client";

import { useEffect, useState } from "react";
import Campo from "@/components/ui/Campo";
import Selector from "@/components/ui/Selector";
import Boton from "@/components/ui/Boton";
import { ETIQUETA_TIPO_INTERES, ETIQUETA_FRECUENCIA } from "@/lib/amortizacion";

type Configuracion = {
  empresaNombre: string;
  empresaRnc: string | null;
  empresaTelefono: string | null;
  empresaDireccion: string | null;
  moneda: string;
  simboloMoneda: string;
  zonaHoraria: string;
  tasaPorDefecto: string;
  frecuenciaDefecto: "DIARIO" | "SEMANAL" | "QUINCENAL" | "MENSUAL";
  tipoInteresDefecto: "SIMPLE" | "SOBRE_SALDO";
  moraPorcentaje: string;
};

export default function PanelEmpresa() {
  const [datos, setDatos] = useState<Configuracion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/configuracion")
      .then((r) => r.json())
      .then((d) => setDatos(d.configuracion));
  }, []);

  function actualizar<K extends keyof Configuracion>(campo: K, valor: Configuracion[K]) {
    setDatos((d) => (d ? { ...d, [campo]: valor } : d));
    setMensaje(null);
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!datos) return;
    setGuardando(true);
    setError(null);
    const respuesta = await fetch("/api/configuracion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    const resultado = await respuesta.json();
    setGuardando(false);
    if (!respuesta.ok) {
      setError(resultado.error ?? "No se pudo guardar");
      return;
    }
    setMensaje("Configuración guardada");
  }

  if (!datos) {
    return (
      <div className="flex justify-center py-16 text-texto-3">
        <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  return (
    <form onSubmit={guardar} className="space-y-6">
      <div>
        <h2 className="mb-3 font-semibold">Datos de la empresa</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Nombre de la empresa"
            value={datos.empresaNombre}
            onChange={(e) => actualizar("empresaNombre", e.target.value)}
          />
          <Campo
            etiqueta="NIT / RUT"
            value={datos.empresaRnc ?? ""}
            onChange={(e) => actualizar("empresaRnc", e.target.value)}
          />
          <Campo
            etiqueta="Teléfono"
            value={datos.empresaTelefono ?? ""}
            onChange={(e) => actualizar("empresaTelefono", e.target.value)}
          />
          <Campo
            etiqueta="Dirección"
            value={datos.empresaDireccion ?? ""}
            onChange={(e) => actualizar("empresaDireccion", e.target.value)}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Moneda y zona horaria</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo
            etiqueta="Código de moneda"
            value={datos.moneda}
            onChange={(e) => actualizar("moneda", e.target.value)}
          />
          <Campo
            etiqueta="Símbolo"
            value={datos.simboloMoneda}
            onChange={(e) => actualizar("simboloMoneda", e.target.value)}
          />
          <Campo
            etiqueta="Zona horaria"
            value={datos.zonaHoraria}
            onChange={(e) => actualizar("zonaHoraria", e.target.value)}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Valores por defecto para préstamos nuevos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Tasa de interés por defecto (%)"
            type="number"
            step="0.01"
            value={datos.tasaPorDefecto}
            onChange={(e) => actualizar("tasaPorDefecto", e.target.value)}
          />
          <Campo
            etiqueta="Mora por defecto (%)"
            type="number"
            step="0.01"
            value={datos.moraPorcentaje}
            onChange={(e) => actualizar("moraPorcentaje", e.target.value)}
          />
          <Selector
            etiqueta="Método de interés por defecto"
            value={datos.tipoInteresDefecto}
            onChange={(e) =>
              actualizar("tipoInteresDefecto", e.target.value as Configuracion["tipoInteresDefecto"])
            }
          >
            {Object.entries(ETIQUETA_TIPO_INTERES).map(([v, e]) => (
              <option key={v} value={v}>
                {e}
              </option>
            ))}
          </Selector>
          <Selector
            etiqueta="Frecuencia por defecto"
            value={datos.frecuenciaDefecto}
            onChange={(e) =>
              actualizar("frecuenciaDefecto", e.target.value as Configuracion["frecuenciaDefecto"])
            }
          >
            {Object.entries(ETIQUETA_FRECUENCIA).map(([v, e]) => (
              <option key={v} value={v}>
                {e}
              </option>
            ))}
          </Selector>
        </div>
        <p className="mt-2 text-xs text-texto-3">
          La mora se aplica como un porcentaje único sobre el saldo pendiente de cada cuota vencida.
        </p>
      </div>

      {mensaje && <p className="rounded-2xl bg-menta px-4 py-3 text-sm text-menta-ink">{mensaje}</p>}
      {error && <p className="rounded-2xl bg-rosa px-4 py-3 text-sm text-rosa-ink">{error}</p>}

      <div className="flex justify-end">
        <Boton type="submit" cargando={guardando}>
          Guardar cambios
        </Boton>
      </div>
    </form>
  );
}
