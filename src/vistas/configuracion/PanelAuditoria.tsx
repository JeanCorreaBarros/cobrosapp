"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icono from "@/components/ui/Icono";
import Boton from "@/components/ui/Boton";

type RegistroAuditoria = {
  id: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: unknown;
  ip: string | null;
  creadoEn: string;
  usuario: { nombre: string; usuario: string } | null;
};

const ETIQUETA_ACCION: Record<string, string> = {
  CREAR: "Creó",
  EDITAR: "Editó",
  ELIMINAR: "Eliminó",
  ANULAR: "Anuló",
  INICIO_SESION: "Inició sesión",
  CIERRE_SESION: "Cerró sesión",
  RESPALDO: "Descargó respaldo",
  IMPORTAR: "Restauró un respaldo",
};

const TONO_ACCION: Record<string, string> = {
  CREAR: "text-menta-ink bg-menta",
  EDITAR: "text-cielo-ink bg-cielo",
  ELIMINAR: "text-rosa-ink bg-rosa",
  ANULAR: "text-rosa-ink bg-rosa",
  INICIO_SESION: "text-texto-2 bg-lienzo",
  CIERRE_SESION: "text-texto-2 bg-lienzo",
  RESPALDO: "text-durazno-ink bg-durazno",
  IMPORTAR: "text-durazno-ink bg-durazno",
};

function fechaHora(valor: string) {
  return new Date(valor).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PanelAuditoria() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [entidades, setEntidades] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [entidad, setEntidad] = useState("");
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [buscar, setBuscar] = useState("");
  const [cargando, setCargando] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const porPagina = 40;

  const cargar = useCallback(async () => {
    setCargando(true);
    const parametros = new URLSearchParams({ pagina: String(pagina) });
    if (entidad) parametros.set("entidad", entidad);
    if (buscar) parametros.set("buscar", buscar);
    const respuesta = await fetch(`/api/auditoria?${parametros}`);
    if (respuesta.ok) {
      const datos = await respuesta.json();
      setRegistros(datos.registros);
      setTotal(datos.total);
      setEntidades(datos.entidades);
    }
    setCargando(false);
  }, [pagina, entidad, buscar]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function alBuscar(valor: string) {
    setTextoBusqueda(valor);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setBuscar(valor);
      setPagina(1);
    }, 300);
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Auditoría del sistema</h2>
        <p className="text-xs text-texto-3">{total} registros</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Icono
            nombre="buscar"
            className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-texto-3"
          />
          <input
            value={textoBusqueda}
            onChange={(e) => alBuscar(e.target.value)}
            placeholder="Buscar por usuario, acción o entidad"
            className="w-full rounded-2xl border border-borde bg-superficie py-2.5 pr-4 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-tinta/15"
          />
        </div>
        <select
          value={entidad}
          onChange={(e) => {
            setEntidad(e.target.value);
            setPagina(1);
          }}
          className="rounded-2xl border border-borde bg-superficie px-4 py-2.5 text-sm text-texto focus:outline-none focus:ring-2 focus:ring-tinta/15"
        >
          <option value="">Todas las entidades</option>
          {entidades.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      {cargando ? (
        <div className="flex justify-center py-10 text-texto-3">
          <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : registros.length === 0 ? (
        <p className="py-10 text-center text-sm text-texto-2">No hay registros con esos filtros.</p>
      ) : (
        <ul className="space-y-1.5">
          {registros.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl bg-lienzo/70 px-4 py-3"
            >
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  TONO_ACCION[r.accion] ?? "bg-lienzo text-texto-2"
                }`}
              >
                {ETIQUETA_ACCION[r.accion] ?? r.accion}
              </span>
              <span className="text-sm font-medium">{r.entidad}</span>
              {r.usuario && (
                <span className="text-xs text-texto-3">
                  por {r.usuario.nombre} (@{r.usuario.usuario})
                </span>
              )}
              <span className="ml-auto shrink-0 text-xs text-texto-3">{fechaHora(r.creadoEn)}</span>
              {Boolean(r.detalle) && (
                <details className="w-full">
                  <summary className="cursor-pointer text-xs text-texto-3">Ver detalle</summary>
                  <pre className="mt-1 overflow-x-auto rounded-xl bg-superficie p-2 text-xs text-texto-2">
                    {JSON.stringify(r.detalle, null, 2)}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-texto-3">
            Página {pagina} de {totalPaginas}
          </p>
          <div className="flex gap-2">
            <Boton variante="suave" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Boton>
            <Boton
              variante="suave"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
            </Boton>
          </div>
        </div>
      )}
    </div>
  );
}
