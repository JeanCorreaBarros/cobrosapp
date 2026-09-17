"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Icono from "@/components/ui/Icono";

export default function FormularioLogin() {
  const router = useRouter();
  const parametros = useSearchParams();
  const destino = parametros.get("desde") || "/dashboard";
  const aviso = parametros.get("aviso");

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);

    if (!usuario.trim() || !password) {
      setError("Completa usuario y contraseña");
      return;
    }

    setCargando(true);
    try {
      const respuesta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuario.trim(), password }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos.error ?? "No se pudo iniciar sesión");
        return;
      }

      router.replace(destino);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      {aviso === "restauracion" && (
        <p className="rounded-2xl bg-cielo px-4 py-3 text-sm font-medium text-cielo-ink">
          Se restauró un respaldo. Entra con las credenciales que tenías en ese respaldo.
        </p>
      )}

      <Campo
        etiqueta="Usuario"
        name="usuario"
        autoComplete="username"
        placeholder="admin"
        value={usuario}
        onChange={(e) => {
          setUsuario(e.target.value);
          setError(null);
        }}
      />

      <Campo
        etiqueta="Contraseña"
        name="password"
        type={verPassword ? "text" : "password"}
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(null);
        }}
        complemento={
          <button
            type="button"
            onClick={() => setVerPassword((v) => !v)}
            aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="grid size-9 place-items-center rounded-full text-texto-3 transition hover:bg-lienzo hover:text-texto"
          >
            <Icono nombre={verPassword ? "ojoOff" : "ojo"} className="size-4.5" />
          </button>
        }
      />

      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-rosa px-4 py-3 text-sm font-medium text-rosa-ink"
        >
          {error}
        </p>
      )}

      <Boton type="submit" cargando={cargando} className="w-full">
        {cargando ? "Entrando…" : "Iniciar sesión"}
        {!cargando && <Icono nombre="flecha" className="size-4" />}
      </Boton>

      <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-texto-3">
        <Icono nombre="candado" className="size-3.5" />
        Conexión protegida · La cuenta se bloquea tras 5 intentos fallidos
      </p>
    </form>
  );
}
