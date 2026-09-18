"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Campo from "@/components/ui/Campo";
import Boton from "@/components/ui/Boton";
import type { Sesion } from "@/lib/auth";

export default function ModalMiCuenta({
  sesion,
  onCerrar,
}: {
  sesion: Sesion;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(sesion.nombre);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);
    if (nombre.trim().length < 3) {
      setError("El nombre debe tener al menos 3 caracteres");
      return;
    }
    if (!passwordActual) {
      setError("Escribe tu contraseña actual para confirmar los cambios");
      return;
    }

    setGuardando(true);
    const respuesta = await fetch("/api/mi-cuenta", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, passwordActual, passwordNueva }),
    });
    const datos = await respuesta.json();
    setGuardando(false);

    if (!respuesta.ok) {
      setError(datos.error ?? "No se pudo guardar");
      return;
    }

    setExito(true);
    setPasswordActual("");
    setPasswordNueva("");
    // Refresca los datos del servidor (nombre en la sesión, etc.) sin
    // pisar el mensaje de éxito que se acaba de mostrar.
    setTimeout(() => router.refresh(), 50);
  }

  return (
    <Modal titulo="Mi cuenta" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <Campo
          etiqueta="Nombre completo"
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            setExito(false);
          }}
        />

        <div className="rounded-2xl bg-lienzo/70 p-4">
          <p className="mb-3 text-xs font-medium text-texto-3">
            Para cambiar cualquier dato confirma tu contraseña actual
          </p>
          <div className="space-y-3">
            <Campo
              etiqueta="Contraseña actual"
              type="password"
              value={passwordActual}
              onChange={(e) => {
                setPasswordActual(e.target.value);
                setExito(false);
              }}
              autoComplete="current-password"
            />
            <Campo
              etiqueta="Contraseña nueva (opcional)"
              type="password"
              value={passwordNueva}
              onChange={(e) => {
                setPasswordNueva(e.target.value);
                setExito(false);
              }}
              placeholder="Dejar en blanco para no cambiarla"
              autoComplete="new-password"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-2xl bg-rosa px-4 py-3 text-sm font-medium text-rosa-ink">{error}</p>
        )}
        {exito && (
          <p className="rounded-2xl bg-menta px-4 py-3 text-sm font-medium text-menta-ink">
            Cambios guardados
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Boton type="button" variante="suave" onClick={onCerrar}>
            Cerrar
          </Boton>
          <Boton type="submit" cargando={guardando}>
            Guardar cambios
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
