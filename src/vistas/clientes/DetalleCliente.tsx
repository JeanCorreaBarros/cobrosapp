"use client";

import { useCallback, useEffect, useState } from "react";
import Icono from "@/components/ui/Icono";
import Pildora from "@/components/ui/Pildora";
import Boton from "@/components/ui/Boton";
import Modal from "@/components/ui/Modal";
import FormularioCliente, { type ValoresFormulario } from "./FormularioCliente";
import FormularioPrestamo, {
  type ValoresPrestamo,
} from "@/vistas/prestamos/FormularioPrestamo";
import FormularioPoliza, { type ValoresPoliza } from "@/vistas/seguridad/FormularioPoliza";
import { usePestanas } from "@/components/pestanas/ContextoPestanas";
import { useSesion } from "@/lib/sesion-cliente";
import { fecha, iniciales, moneda } from "@/lib/formato";
import { ETIQUETA_TIPO_INTERES, ETIQUETA_FRECUENCIA } from "@/lib/amortizacion";
import type { Cliente, Prestamo, PolizaSeguridad, Zona } from "@/lib/tipos";

const TONO_ESTADO_POLIZA: Record<PolizaSeguridad["estado"], "menta" | "rosa" | "durazno" | "neutro"> = {
  ACTIVA: "menta",
  ATRASADA: "durazno",
  CANCELADA: "neutro",
};

const ETIQUETA_ESTADO_POLIZA: Record<PolizaSeguridad["estado"], string> = {
  ACTIVA: "Activa",
  ATRASADA: "Atrasada",
  CANCELADA: "Cancelada",
};

const TONO_ESTADO_PRESTAMO: Record<
  Prestamo["estado"],
  "menta" | "rosa" | "durazno" | "neutro" | "cielo"
> = {
  ACTIVO: "menta",
  ATRASADO: "durazno",
  PAGADO: "cielo",
  CANCELADO: "neutro",
  INCOBRABLE: "rosa",
};

const ETIQUETA_ESTADO_PRESTAMO: Record<Prestamo["estado"], string> = {
  ACTIVO: "Activo",
  ATRASADO: "Atrasado",
  PAGADO: "Pagado",
  CANCELADO: "Cancelado",
  INCOBRABLE: "Incobrable",
};

const TONO_ESTADO: Record<Cliente["estado"], "menta" | "rosa" | "durazno" | "neutro"> = {
  ACTIVO: "menta",
  MOROSO: "durazno",
  LISTA_NEGRA: "rosa",
  INACTIVO: "neutro",
};

const ETIQUETA_ESTADO: Record<Cliente["estado"], string> = {
  ACTIVO: "Activo",
  MOROSO: "Moroso",
  LISTA_NEGRA: "Lista negra",
  INACTIVO: "Inactivo",
};

function nombreZona(zona: Cliente["zona"]) {
  if (!zona) return null;
  return "nombre" in zona ? zona.nombre : null;
}

export default function DetalleCliente({ id }: { id: string }) {
  const sesion = useSesion();
  const { cerrar, abrir } = usePestanas();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [polizas, setPolizas] = useState<PolizaSeguridad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const [nuevoPrestamo, setNuevoPrestamo] = useState(false);
  const [nuevaPoliza, setNuevaPoliza] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const respuesta = await fetch(`/api/clientes/${id}`);
    if (respuesta.status === 404) {
      setNoEncontrado(true);
      setCargando(false);
      return;
    }
    const datos = await respuesta.json();
    setCliente(datos.cliente);
    setCargando(false);
  }, [id]);

  const cargarPrestamos = useCallback(async () => {
    const respuesta = await fetch(`/api/prestamos?clienteId=${id}`);
    if (respuesta.ok) {
      const datos = await respuesta.json();
      setPrestamos(datos.prestamos ?? []);
    }
  }, [id]);

  const cargarPolizas = useCallback(async () => {
    const respuesta = await fetch(`/api/polizas?clienteId=${id}`);
    if (respuesta.ok) {
      const datos = await respuesta.json();
      setPolizas(datos.polizas ?? []);
    }
  }, [id]);

  useEffect(() => {
    cargar();
    cargarPrestamos();
    cargarPolizas();
    fetch("/api/zonas")
      .then((r) => r.json())
      .then((d) => setZonas(d.zonas ?? []))
      .catch(() => {});
  }, [cargar, cargarPrestamos, cargarPolizas]);

  async function crearPrestamo(valores: ValoresPrestamo): Promise<string | null> {
    const respuesta = await fetch("/api/prestamos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) return datos.error ?? "No se pudo crear el préstamo";

    setNuevoPrestamo(false);
    await cargarPrestamos();
    abrir(`/prestamos/${datos.prestamo.id}`);
    return null;
  }

  async function crearPoliza(valores: ValoresPoliza): Promise<string | null> {
    const respuesta = await fetch("/api/polizas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) return datos.error ?? "No se pudo crear la póliza";

    setNuevaPoliza(false);
    await cargarPolizas();
    abrir(`/seguridad/${datos.poliza.id}`);
    return null;
  }

  async function guardarEdicion(valores: ValoresFormulario): Promise<string | null> {
    const respuesta = await fetch(`/api/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) return datos.error ?? "No se pudo guardar";

    setEditando(false);
    await cargar();
    return null;
  }

  async function eliminar() {
    const respuesta = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    if (respuesta.ok) {
      cerrar(`/clientes/${id}`);
    }
  }

  if (cargando) {
    return (
      <div className="tarjeta flex justify-center p-16 text-texto-3">
        <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  if (noEncontrado || !cliente) {
    return (
      <div className="tarjeta flex flex-col items-center gap-3 p-16 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-lienzo text-texto-3">
          <Icono nombre="usuario" className="size-6" />
        </span>
        <p className="text-sm text-texto-2">Este cliente ya no existe o fue eliminado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="tarjeta p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-lila text-lg font-bold text-lila-ink">
              {iniciales(cliente.nombre)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{cliente.nombre}</h1>
                <Pildora tono={TONO_ESTADO[cliente.estado]}>
                  {ETIQUETA_ESTADO[cliente.estado]}
                </Pildora>
              </div>
              <p className="text-sm text-texto-2">
                {cliente.codigo} · Cliente desde {fecha(cliente.creadoEn)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Boton variante="suave" onClick={() => setEditando(true)}>
              <Icono nombre="config" className="size-4" />
              Editar
            </Boton>
            {sesion.rol === "ADMIN" && (
              <Boton variante="fantasma" onClick={() => setConfirmarBaja(true)}>
                Dar de baja
              </Boton>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dato icono="usuario" etiqueta="Cédula / DNI" valor={cliente.cedula} />
          <Dato icono="mensaje" etiqueta="Teléfono" valor={cliente.telefono} />
          {cliente.telefonoAlt && (
            <Dato icono="mensaje" etiqueta="Teléfono alterno" valor={cliente.telefonoAlt} />
          )}
          {cliente.correo && <Dato icono="mensaje" etiqueta="Correo" valor={cliente.correo} />}
          {cliente.direccion && (
            <Dato icono="agenda" etiqueta="Dirección" valor={cliente.direccion} />
          )}
          <Dato
            icono="clientes"
            etiqueta="Zona"
            valor={nombreZona(cliente.zona) ?? "Sin asignar"}
          />
        </div>

        {(cliente.referencia1Nombre || cliente.referencia2Nombre) && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {cliente.referencia1Nombre && (
              <div className="rounded-2xl bg-lienzo/70 p-4">
                <p className="text-xs font-medium text-texto-3">Referencia 1</p>
                <p className="mt-1 text-sm font-semibold">{cliente.referencia1Nombre}</p>
                <p className="text-xs text-texto-2">{cliente.referencia1Telefono}</p>
              </div>
            )}
            {cliente.referencia2Nombre && (
              <div className="rounded-2xl bg-lienzo/70 p-4">
                <p className="text-xs font-medium text-texto-3">Referencia 2</p>
                <p className="mt-1 text-sm font-semibold">{cliente.referencia2Nombre}</p>
                <p className="text-xs text-texto-2">{cliente.referencia2Telefono}</p>
              </div>
            )}
          </div>
        )}

        {cliente.notas && (
          <div className="mt-6 rounded-2xl bg-lienzo/70 p-4">
            <p className="text-xs font-medium text-texto-3">Notas</p>
            <p className="mt-1 text-sm text-texto">{cliente.notas}</p>
          </div>
        )}
      </div>

      <div className="tarjeta p-5 sm:p-7">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Préstamos</h2>
          <Boton variante="suave" onClick={() => setNuevoPrestamo(true)}>
            <Icono nombre="prestamos" className="size-4" />
            Nuevo préstamo
          </Boton>
        </div>

        {prestamos.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-3 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-lienzo text-texto-3">
              <Icono nombre="prestamos" className="size-5" />
            </span>
            <p className="max-w-sm text-sm text-texto-2">
              Este cliente todavía no tiene préstamos registrados.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {prestamos.map((prestamo) => (
              <li key={prestamo.id}>
                <button
                  onClick={() => abrir(`/prestamos/${prestamo.id}`)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-lienzo/70 px-4 py-3 text-left transition hover:bg-lienzo"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie text-texto-2">
                    <Icono nombre="prestamos" className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{prestamo.codigo}</p>
                    <p className="truncate text-xs text-texto-3">
                      {ETIQUETA_TIPO_INTERES[prestamo.tipoInteres]} ·{" "}
                      {moneda(Number(prestamo.montoTotal))} · {prestamo.plazoCuotas} cuotas
                    </p>
                  </div>
                  <Pildora tono={TONO_ESTADO_PRESTAMO[prestamo.estado]}>
                    {ETIQUETA_ESTADO_PRESTAMO[prestamo.estado]}
                  </Pildora>
                  <Icono nombre="flecha" className="size-4 shrink-0 text-texto-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-texto-3">
          Entra a un préstamo para ver su tabla de amortización y registrar pagos. La rentabilidad
          por cliente está en Reportes.
        </p>
      </div>

      <div className="tarjeta p-5 sm:p-7">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Pólizas de seguridad</h2>
          <Boton variante="suave" onClick={() => setNuevaPoliza(true)}>
            <Icono nombre="candado" className="size-4" />
            Nueva póliza
          </Boton>
        </div>

        {polizas.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-3 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-lienzo text-texto-3">
              <Icono nombre="candado" className="size-5" />
            </span>
            <p className="max-w-sm text-sm text-texto-2">
              Este cliente todavía no tiene pólizas de seguridad registradas.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {polizas.map((poliza) => (
              <li key={poliza.id}>
                <button
                  onClick={() => abrir(`/seguridad/${poliza.id}`)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-lienzo/70 px-4 py-3 text-left transition hover:bg-lienzo"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie text-texto-2">
                    <Icono nombre="candado" className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{poliza.codigo}</p>
                    <p className="truncate text-xs text-texto-3">
                      {ETIQUETA_FRECUENCIA[poliza.frecuencia]} · {moneda(Number(poliza.montoCuota))}{" "}
                      por cuota
                    </p>
                  </div>
                  <Pildora tono={TONO_ESTADO_POLIZA[poliza.estado]}>
                    {ETIQUETA_ESTADO_POLIZA[poliza.estado]}
                  </Pildora>
                  <Icono nombre="flecha" className="size-4 shrink-0 text-texto-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editando && (
        <Modal titulo="Editar cliente" onCerrar={() => setEditando(false)} ancho="max-w-2xl">
          <FormularioCliente
            cliente={cliente}
            zonas={zonas}
            onGuardar={guardarEdicion}
            onCancelar={() => setEditando(false)}
          />
        </Modal>
      )}

      {nuevoPrestamo && (
        <Modal
          titulo={`Nuevo préstamo para ${cliente.nombre}`}
          onCerrar={() => setNuevoPrestamo(false)}
          ancho="max-w-2xl"
        >
          <FormularioPrestamo
            clientePreseleccionado={{
              id: cliente.id,
              nombre: cliente.nombre,
              codigo: cliente.codigo,
              cedula: cliente.cedula,
              telefono: cliente.telefono,
            }}
            onCrear={crearPrestamo}
            onCancelar={() => setNuevoPrestamo(false)}
          />
        </Modal>
      )}

      {nuevaPoliza && (
        <Modal
          titulo={`Nueva póliza para ${cliente.nombre}`}
          onCerrar={() => setNuevaPoliza(false)}
          ancho="max-w-2xl"
        >
          <FormularioPoliza
            clientePreseleccionado={{
              id: cliente.id,
              nombre: cliente.nombre,
              codigo: cliente.codigo,
              cedula: cliente.cedula,
              telefono: cliente.telefono,
            }}
            onCrear={crearPoliza}
            onCancelar={() => setNuevaPoliza(false)}
          />
        </Modal>
      )}

      {confirmarBaja && (
        <Modal titulo="Dar de baja cliente" onCerrar={() => setConfirmarBaja(false)}>
          <p className="text-sm text-texto-2">
            Esta acción marca a <strong className="font-semibold text-texto">{cliente.nombre}</strong>{" "}
            como eliminado. No se borra la información, pero dejará de aparecer en las listas.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Boton variante="suave" onClick={() => setConfirmarBaja(false)}>
              Cancelar
            </Boton>
            <Boton onClick={eliminar} className="bg-rosa-ink hover:bg-rosa-ink/90">
              Dar de baja
            </Boton>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Dato({
  icono,
  etiqueta,
  valor,
}: {
  icono: "usuario" | "mensaje" | "agenda" | "clientes";
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lienzo text-texto-2">
        <Icono nombre={icono} className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-texto-3">{etiqueta}</p>
        <p className="truncate text-sm font-medium">{valor}</p>
      </div>
    </div>
  );
}
