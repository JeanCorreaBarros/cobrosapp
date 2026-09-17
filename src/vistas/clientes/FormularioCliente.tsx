"use client";

import { useEffect, useState } from "react";
import Campo from "@/components/ui/Campo";
import Selector from "@/components/ui/Selector";
import AreaTexto from "@/components/ui/AreaTexto";
import Boton from "@/components/ui/Boton";
import type { Cliente, Zona } from "@/lib/tipos";

const ETIQUETA_ESTADO: Record<Cliente["estado"], string> = {
  ACTIVO: "Activo",
  MOROSO: "Moroso",
  LISTA_NEGRA: "Lista negra",
  INACTIVO: "Inactivo",
};

export type ValoresFormulario = {
  nombre: string;
  cedula: string;
  telefono: string;
  telefonoAlt: string;
  correo: string;
  direccion: string;
  zonaId: string;
  estado: Cliente["estado"];
  referencia1Nombre: string;
  referencia1Telefono: string;
  referencia2Nombre: string;
  referencia2Telefono: string;
  notas: string;
};

const VACIO: ValoresFormulario = {
  nombre: "",
  cedula: "",
  telefono: "",
  telefonoAlt: "",
  correo: "",
  direccion: "",
  zonaId: "",
  estado: "ACTIVO",
  referencia1Nombre: "",
  referencia1Telefono: "",
  referencia2Nombre: "",
  referencia2Telefono: "",
  notas: "",
};

export default function FormularioCliente({
  cliente,
  zonas,
  onGuardar,
  onCancelar,
}: {
  cliente?: Cliente | null;
  zonas: Zona[];
  onGuardar: (valores: ValoresFormulario) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [valores, setValores] = useState<ValoresFormulario>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (cliente) {
      setValores({
        nombre: cliente.nombre,
        cedula: cliente.cedula,
        telefono: cliente.telefono,
        telefonoAlt: cliente.telefonoAlt ?? "",
        correo: cliente.correo ?? "",
        direccion: cliente.direccion ?? "",
        zonaId: cliente.zonaId ?? "",
        estado: cliente.estado,
        referencia1Nombre: cliente.referencia1Nombre ?? "",
        referencia1Telefono: cliente.referencia1Telefono ?? "",
        referencia2Nombre: cliente.referencia2Nombre ?? "",
        referencia2Telefono: cliente.referencia2Telefono ?? "",
        notas: cliente.notas ?? "",
      });
    }
  }, [cliente]);

  function actualizar<K extends keyof ValoresFormulario>(campo: K, valor: ValoresFormulario[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
    setError(null);
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (valores.nombre.trim().length < 3) {
      setError("El nombre debe tener al menos 3 caracteres");
      return;
    }
    if (valores.cedula.trim().length < 5) {
      setError("Escribe una cédula/DNI válida");
      return;
    }
    if (valores.telefono.trim().length < 7) {
      setError("Escribe un teléfono válido");
      return;
    }

    setGuardando(true);
    const resultado = await onGuardar(valores);
    setGuardando(false);
    if (resultado) setError(resultado);
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Nombre completo"
          name="nombre"
          value={valores.nombre}
          onChange={(e) => actualizar("nombre", e.target.value)}
          placeholder="María Rodríguez"
        />
        <Campo
          etiqueta="Cédula / DNI"
          name="cedula"
          value={valores.cedula}
          onChange={(e) => actualizar("cedula", e.target.value)}
          placeholder="1020304050"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Teléfono"
          name="telefono"
          value={valores.telefono}
          onChange={(e) => actualizar("telefono", e.target.value)}
          placeholder="300 555 0000"
        />
        <Campo
          etiqueta="Teléfono alterno (opcional)"
          name="telefonoAlt"
          value={valores.telefonoAlt}
          onChange={(e) => actualizar("telefonoAlt", e.target.value)}
          placeholder="310 555 0000"
        />
      </div>

      <Campo
        etiqueta="Correo (opcional)"
        name="correo"
        type="email"
        value={valores.correo}
        onChange={(e) => actualizar("correo", e.target.value)}
        placeholder="correo@ejemplo.com"
      />

      <Campo
        etiqueta="Dirección (opcional)"
        name="direccion"
        value={valores.direccion}
        onChange={(e) => actualizar("direccion", e.target.value)}
        placeholder="Calle, sector, ciudad"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Selector
          etiqueta="Zona"
          value={valores.zonaId}
          onChange={(e) => actualizar("zonaId", e.target.value)}
        >
          <option value="">Sin zona asignada</option>
          {zonas.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}
            </option>
          ))}
        </Selector>

        <Selector
          etiqueta="Estado"
          value={valores.estado}
          onChange={(e) => actualizar("estado", e.target.value as Cliente["estado"])}
        >
          {Object.entries(ETIQUETA_ESTADO).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </Selector>
      </div>

      <div className="rounded-2xl bg-lienzo/70 p-4">
        <p className="mb-3 text-sm font-semibold text-texto-2">Referencia 1 (opcional)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo
            etiqueta="Nombre"
            name="referencia1Nombre"
            value={valores.referencia1Nombre}
            onChange={(e) => actualizar("referencia1Nombre", e.target.value)}
          />
          <Campo
            etiqueta="Teléfono"
            name="referencia1Telefono"
            value={valores.referencia1Telefono}
            onChange={(e) => actualizar("referencia1Telefono", e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-lienzo/70 p-4">
        <p className="mb-3 text-sm font-semibold text-texto-2">Referencia 2 (opcional)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo
            etiqueta="Nombre"
            name="referencia2Nombre"
            value={valores.referencia2Nombre}
            onChange={(e) => actualizar("referencia2Nombre", e.target.value)}
          />
          <Campo
            etiqueta="Teléfono"
            name="referencia2Telefono"
            value={valores.referencia2Telefono}
            onChange={(e) => actualizar("referencia2Telefono", e.target.value)}
          />
        </div>
      </div>

      <AreaTexto
        etiqueta="Notas (opcional)"
        name="notas"
        rows={3}
        value={valores.notas}
        onChange={(e) => actualizar("notas", e.target.value)}
        placeholder="Cualquier información adicional relevante"
      />

      {error && (
        <p role="alert" className="rounded-2xl bg-rosa px-4 py-3 text-sm font-medium text-rosa-ink">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Boton type="button" variante="suave" onClick={onCancelar}>
          Cancelar
        </Boton>
        <Boton type="submit" cargando={guardando}>
          {cliente ? "Guardar cambios" : "Crear cliente"}
        </Boton>
      </div>
    </form>
  );
}
