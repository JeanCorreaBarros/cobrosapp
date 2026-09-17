"use client";

import { useRef, useState } from "react";
import Icono from "@/components/ui/Icono";
import Boton from "@/components/ui/Boton";
import Modal from "@/components/ui/Modal";

export default function PanelRespaldo() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [entendido, setEntendido] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setArchivo(f);
    setError(null);
    if (f) setConfirmando(true);
  }

  async function restaurar() {
    if (!archivo || !entendido) return;
    setRestaurando(true);
    setError(null);
    try {
      const texto = await archivo.text();
      const contenido = JSON.parse(texto);
      const respuesta = await fetch("/api/respaldo/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contenido),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        setError(datos.error ?? "No se pudo restaurar el respaldo");
        setRestaurando(false);
        return;
      }
      try {
        localStorage.removeItem("cobro_pestanas_v1");
      } catch {
        /* almacenamiento no disponible */
      }
      window.location.href = "/login?aviso=restauracion";
    } catch {
      setError("El archivo no es un JSON válido");
      setRestaurando(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">Respaldo de datos</h2>

      <div className="rounded-2xl bg-lienzo/70 p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie text-texto-2">
            <Icono nombre="reportes" className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Exportar todos los datos</p>
            <p className="mt-1 text-sm text-texto-2">
              Descarga clientes, préstamos, cuotas, pagos, usuarios y configuración en un archivo
              JSON. Incluye las contraseñas cifradas de los usuarios (necesario para poder
              restaurarlas), así que <strong className="font-semibold text-texto">guarda este
              archivo en un lugar seguro</strong>, igual que harías con la clave de un banco.
            </p>
          </div>
        </div>
        <a href="/api/respaldo" className="mt-4 inline-block">
          <Boton>
            <Icono nombre="reportes" className="size-4" />
            Descargar respaldo
          </Boton>
        </a>
      </div>

      <div className="rounded-2xl border border-dashed border-rosa-ink/30 bg-rosa/30 p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie text-rosa-ink">
            <Icono nombre="historial" className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Restaurar desde un respaldo</p>
            <p className="mt-1 text-sm text-texto-2">
              Úsalo cuando instales la app de nuevo (otro servidor, tras una falla) y quieras
              recuperar todos los datos que tenías. <strong className="font-semibold text-texto">
              Esto reemplaza por completo</strong> los clientes, préstamos, pagos y usuarios
              actuales por los del archivo — no se puede deshacer.
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/json"
          onChange={elegirArchivo}
          className="hidden"
        />
        <Boton variante="suave" className="mt-4" onClick={() => inputRef.current?.click()}>
          <Icono nombre="upload" className="size-4" />
          Elegir archivo de respaldo
        </Boton>
      </div>

      <div className="rounded-2xl border border-dashed border-borde p-4">
        <p className="text-sm font-semibold">Respaldo SQL completo (alternativa)</p>
        <p className="mt-1 text-sm text-texto-2">
          Para un respaldo binario exacto de PostgreSQL, ejecuta esto desde una terminal en el
          servidor:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-tinta p-3 text-xs text-white">
          docker compose exec db pg_dump -U cobro cobro {">"} respaldo.sql
        </pre>
      </div>

      {confirmando && archivo && (
        <Modal
          titulo="Confirmar restauración"
          onCerrar={() => {
            setConfirmando(false);
            setArchivo(null);
            setEntendido(false);
            if (inputRef.current) inputRef.current.value = "";
          }}
        >
          <p className="text-sm text-texto-2">
            Vas a restaurar <strong className="font-semibold text-texto">{archivo.name}</strong>.
            Todos los clientes, préstamos, pagos, usuarios y zonas actuales se van a{" "}
            <strong className="font-semibold text-rosa-ink">borrar y reemplazar</strong> por los
            del archivo. Se cerrará tu sesión al terminar y deberás entrar con las credenciales
            del respaldo.
          </p>
          <label className="mt-4 flex items-start gap-2 text-sm text-texto-2">
            <input
              type="checkbox"
              checked={entendido}
              onChange={(e) => setEntendido(e.target.checked)}
              className="mt-0.5"
            />
            Entiendo que esto reemplaza todos los datos actuales y no se puede deshacer.
          </label>

          {error && <p className="mt-3 rounded-2xl bg-rosa px-4 py-3 text-sm text-rosa-ink">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <Boton
              variante="suave"
              onClick={() => {
                setConfirmando(false);
                setArchivo(null);
                setEntendido(false);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Cancelar
            </Boton>
            <Boton onClick={restaurar} disabled={!entendido} cargando={restaurando}>
              Restaurar ahora
            </Boton>
          </div>
        </Modal>
      )}
    </div>
  );
}
