"use client";

import { useCallback, useEffect, useState } from "react";
import Icono from "@/components/ui/Icono";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";

type Zona = { id: string; nombre: string; descripcion: string | null };

export default function PanelZonas() {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const respuesta = await fetch("/api/zonas");
    const datos = await respuesta.json();
    setZonas(datos.zonas ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    if (nombre.trim().length < 2) {
      setError("Escribe un nombre de al menos 2 caracteres");
      return;
    }
    setCreando(true);
    const respuesta = await fetch("/api/zonas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    const datos = await respuesta.json();
    setCreando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? "No se pudo crear la zona");
      return;
    }
    setNombre("");
    setError(null);
    await cargar();
  }

  async function eliminar(id: string) {
    const respuesta = await fetch(`/api/zonas/${id}`, { method: "DELETE" });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      setError(datos.error ?? "No se pudo eliminar la zona");
      return;
    }
    setError(null);
    await cargar();
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Zonas de cobro</h2>

      <form onSubmit={crear} className="flex gap-3">
        <div className="flex-1">
          <Campo
            etiqueta="Nueva zona"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Zona Norte"
          />
        </div>
        <div className="flex items-end">
          <Boton type="submit" cargando={creando}>
            Agregar
          </Boton>
        </div>
      </form>

      {error && <p className="rounded-2xl bg-rosa px-4 py-3 text-sm text-rosa-ink">{error}</p>}

      {cargando ? (
        <div className="flex justify-center py-10 text-texto-3">
          <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : (
        <ul className="space-y-2">
          {zonas.map((z) => (
            <li key={z.id} className="flex items-center gap-3 rounded-2xl bg-lienzo/70 px-4 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie text-texto-2">
                <Icono nombre="agenda" className="size-4" />
              </span>
              <p className="flex-1 text-sm font-medium">{z.nombre}</p>
              <button
                onClick={() => eliminar(z.id)}
                className="grid size-8 place-items-center rounded-full text-texto-3 transition hover:bg-superficie hover:text-rosa-ink"
                aria-label="Eliminar zona"
              >
                <Icono nombre="cerrar" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
