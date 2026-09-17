"use client";

import { useCallback, useEffect, useState } from "react";
import Icono from "@/components/ui/Icono";
import Pildora from "@/components/ui/Pildora";
import Boton from "@/components/ui/Boton";
import Modal from "@/components/ui/Modal";
import Campo from "@/components/ui/Campo";
import Selector from "@/components/ui/Selector";
import { useSesion } from "@/lib/sesion-cliente";
import { iniciales } from "@/lib/formato";
import type { Zona } from "@/lib/tipos";

type Usuario = {
  id: string;
  usuario: string;
  nombre: string;
  rol: "ADMIN" | "COBRADOR" | "CONSULTA";
  activo: boolean;
  zonaId: string | null;
  zona: { nombre: string } | null;
};

const ETIQUETA_ROL: Record<Usuario["rol"], string> = {
  ADMIN: "Administrador",
  COBRADOR: "Cobrador",
  CONSULTA: "Solo consulta",
};

export default function PanelUsuarios() {
  const sesion = useSesion();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Usuario | "nuevo" | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const respuesta = await fetch("/api/usuarios");
    if (respuesta.ok) {
      const datos = await respuesta.json();
      setUsuarios(datos.usuarios);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
    fetch("/api/zonas")
      .then((r) => r.json())
      .then((d) => setZonas(d.zonas ?? []));
  }, [cargar]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Usuarios del sistema</h2>
        <Boton onClick={() => setEditando("nuevo")}>
          <Icono nombre="usuario" className="size-4" />
          Nuevo usuario
        </Boton>
      </div>

      {cargando ? (
        <div className="flex justify-center py-10 text-texto-3">
          <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : (
        <ul className="space-y-2">
          {usuarios.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-2xl bg-lienzo/70 px-4 py-3"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lila text-sm font-bold text-lila-ink">
                {iniciales(u.nombre)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{u.nombre}</p>
                <p className="truncate text-xs text-texto-3">
                  @{u.usuario} · {ETIQUETA_ROL[u.rol]}
                  {u.zona ? ` · Zona ${u.zona.nombre}` : ""}
                </p>
              </div>
              {!u.activo && <Pildora tono="rosa">Inactivo</Pildora>}
              <button
                onClick={() => setEditando(u)}
                className="grid size-9 shrink-0 place-items-center rounded-full text-texto-3 transition hover:bg-superficie hover:text-texto"
                aria-label="Editar usuario"
              >
                <Icono nombre="config" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <ModalUsuario
          usuario={editando === "nuevo" ? null : editando}
          zonas={zonas}
          propioId={sesion.id}
          onCerrar={() => setEditando(null)}
          onGuardado={async () => {
            setEditando(null);
            await cargar();
          }}
        />
      )}
    </div>
  );
}

function ModalUsuario({
  usuario,
  zonas,
  propioId,
  onCerrar,
  onGuardado,
}: {
  usuario: Usuario | null;
  zonas: Zona[];
  propioId: string;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [nombreUsuario, setNombreUsuario] = useState(usuario?.usuario ?? "");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Usuario["rol"]>(usuario?.rol ?? "COBRADOR");
  const [zonaId, setZonaId] = useState(usuario?.zonaId ?? "");
  const [activo, setActivo] = useState(usuario?.activo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const esPropio = usuario?.id === propioId;

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);

    const payload: Record<string, unknown> = { nombre, rol, zonaId, activo };
    if (!usuario) {
      payload.usuario = nombreUsuario;
      payload.password = password;
    } else if (password) {
      payload.password = password;
    }

    const respuesta = await fetch(usuario ? `/api/usuarios/${usuario.id}` : "/api/usuarios", {
      method: usuario ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const datos = await respuesta.json();
    setGuardando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? "No se pudo guardar");
      return;
    }
    onGuardado();
  }

  return (
    <Modal titulo={usuario ? "Editar usuario" : "Nuevo usuario"} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <Campo etiqueta="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        {!usuario && (
          <Campo
            etiqueta="Nombre de usuario"
            value={nombreUsuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
            placeholder="usuario para iniciar sesión"
          />
        )}
        <Campo
          etiqueta={usuario ? "Nueva contraseña (opcional)" : "Contraseña"}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={usuario ? "Dejar en blanco para no cambiar" : ""}
        />
        <Selector
          etiqueta="Rol"
          value={rol}
          onChange={(e) => setRol(e.target.value as Usuario["rol"])}
          disabled={esPropio}
        >
          <option value="ADMIN">Administrador</option>
          <option value="COBRADOR">Cobrador</option>
          <option value="CONSULTA">Solo consulta</option>
        </Selector>
        <Selector etiqueta="Zona" value={zonaId ?? ""} onChange={(e) => setZonaId(e.target.value)}>
          <option value="">Sin zona asignada</option>
          {zonas.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}
            </option>
          ))}
        </Selector>
        {usuario && !esPropio && (
          <label className="flex items-center gap-2 text-sm text-texto-2">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            Usuario activo
          </label>
        )}

        {error && <p className="rounded-2xl bg-rosa px-4 py-3 text-sm text-rosa-ink">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Boton type="button" variante="suave" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" cargando={guardando}>
            Guardar
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
