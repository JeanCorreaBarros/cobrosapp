"use client";

import { useCallback, useEffect, useState } from "react";
import Icono from "@/components/ui/Icono";
import Pildora from "@/components/ui/Pildora";
import Boton from "@/components/ui/Boton";
import Modal from "@/components/ui/Modal";
import { usePestanas } from "@/components/pestanas/ContextoPestanas";
import { useSesion } from "@/lib/sesion-cliente";
import { moneda, fecha } from "@/lib/formato";
import { ETIQUETA_TIPO_INTERES, ETIQUETA_FRECUENCIA } from "@/lib/amortizacion";
import { calcularMoraCuota, ETIQUETA_METODO_PAGO } from "@/lib/pagos";
import FormularioPago from "@/vistas/cobros/FormularioPago";
import type { Pago, Prestamo } from "@/lib/tipos";

const TONO_ESTADO: Record<Prestamo["estado"], "menta" | "rosa" | "durazno" | "neutro" | "cielo"> = {
  ACTIVO: "menta",
  ATRASADO: "durazno",
  PAGADO: "cielo",
  CANCELADO: "neutro",
  INCOBRABLE: "rosa",
};

const ETIQUETA_ESTADO: Record<Prestamo["estado"], string> = {
  ACTIVO: "Activo",
  ATRASADO: "Atrasado",
  PAGADO: "Pagado",
  CANCELADO: "Cancelado",
  INCOBRABLE: "Incobrable",
};

function estadoCuota(fechaVencimiento: string, montoCuota: string, montoPagado: string) {
  const pagado = Number(montoPagado);
  const total = Number(montoCuota);
  if (pagado >= total - 0.009) return { texto: "Pagada", tono: "menta" as const };
  if (new Date(fechaVencimiento) < new Date()) return { texto: "Atrasada", tono: "rosa" as const };
  return { texto: "Pendiente", tono: "neutro" as const };
}

export default function DetallePrestamo({ id }: { id: string }) {
  const sesion = useSesion();
  const { abrir } = usePestanas();
  const [prestamo, setPrestamo] = useState<Prestamo | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [confirmarAccion, setConfirmarAccion] = useState<"CANCELADO" | "INCOBRABLE" | null>(null);
  const [nuevoPago, setNuevoPago] = useState(false);
  const [anulando, setAnulando] = useState<Pago | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [errorAnulacion, setErrorAnulacion] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const respuesta = await fetch(`/api/prestamos/${id}`);
    if (respuesta.status === 404) {
      setNoEncontrado(true);
      setCargando(false);
      return;
    }
    const datos = await respuesta.json();
    setPrestamo(datos.prestamo);
    setCargando(false);
  }, [id]);

  const cargarPagos = useCallback(async () => {
    const respuesta = await fetch(`/api/pagos?prestamoId=${id}`);
    if (respuesta.ok) {
      const datos = await respuesta.json();
      setPagos(datos.pagos ?? []);
    }
  }, [id]);

  useEffect(() => {
    cargar();
    cargarPagos();
  }, [cargar, cargarPagos]);

  async function cambiarEstado(estado: "CANCELADO" | "INCOBRABLE") {
    const respuesta = await fetch(`/api/prestamos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (respuesta.ok) {
      setConfirmarAccion(null);
      await cargar();
    }
  }

  async function registrarPago(valores: {
    prestamoId: string;
    monto: number;
    metodo: string;
    fecha: string;
  }): Promise<string | null> {
    const respuesta = await fetch("/api/pagos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) return datos.error ?? "No se pudo registrar el pago";

    setNuevoPago(false);
    await Promise.all([cargar(), cargarPagos()]);
    window.open(`/imprimir/recibo/${datos.pago.id}`, "_blank");
    return null;
  }

  async function anularPago() {
    if (!anulando) return;
    if (motivoAnulacion.trim().length < 3) {
      setErrorAnulacion("Escribe un motivo de al menos 3 caracteres");
      return;
    }
    const respuesta = await fetch(`/api/pagos/${anulando.id}/anular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo: motivoAnulacion }),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      setErrorAnulacion(datos.error ?? "No se pudo anular el pago");
      return;
    }
    setAnulando(null);
    setMotivoAnulacion("");
    setErrorAnulacion(null);
    await Promise.all([cargar(), cargarPagos()]);
  }

  if (cargando) {
    return (
      <div className="tarjeta flex justify-center p-16 text-texto-3">
        <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  if (noEncontrado || !prestamo) {
    return (
      <div className="tarjeta flex flex-col items-center gap-3 p-16 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-lienzo text-texto-3">
          <Icono nombre="prestamos" className="size-6" />
        </span>
        <p className="text-sm text-texto-2">Este préstamo ya no existe.</p>
      </div>
    );
  }

  const interesTotal = Number(prestamo.montoTotal) - Number(prestamo.montoCapital);
  const saldoPendiente =
    prestamo.cuotas?.reduce((acc, c) => acc + (Number(c.montoCuota) - Number(c.montoPagado)), 0) ??
    Number(prestamo.montoTotal);
  const puedeGestionar = sesion.rol === "ADMIN" && prestamo.estado !== "PAGADO";

  return (
    <div className="space-y-4">
      <div className="tarjeta p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{prestamo.codigo}</h1>
              <Pildora tono={TONO_ESTADO[prestamo.estado]}>
                {ETIQUETA_ESTADO[prestamo.estado]}
              </Pildora>
            </div>
            <button
              onClick={() => abrir(`/clientes/${prestamo.clienteId}`)}
              className="mt-1 text-sm text-texto-2 underline-offset-2 hover:text-texto hover:underline"
            >
              {prestamo.cliente.nombre}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {prestamo.estado !== "PAGADO" &&
              prestamo.estado !== "CANCELADO" &&
              prestamo.estado !== "INCOBRABLE" && (
                <Boton onClick={() => setNuevoPago(true)}>
                  <Icono nombre="cobros" className="size-4" />
                  Registrar pago
                </Boton>
              )}
            {puedeGestionar && (
              <>
                <Boton variante="fantasma" onClick={() => setConfirmarAccion("CANCELADO")}>
                  Cancelar
                </Boton>
                <Boton variante="fantasma" onClick={() => setConfirmarAccion("INCOBRABLE")}>
                  Marcar incobrable
                </Boton>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metrica etiqueta="Capital" valor={moneda(Number(prestamo.montoCapital))} />
          <Metrica etiqueta="Interés total" valor={moneda(interesTotal)} />
          <Metrica etiqueta="Total a pagar" valor={moneda(Number(prestamo.montoTotal))} />
          <Metrica etiqueta="Saldo pendiente" valor={moneda(Math.max(saldoPendiente, 0))} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dato
            icono="reportes"
            etiqueta="Método de interés"
            valor={ETIQUETA_TIPO_INTERES[prestamo.tipoInteres]}
          />
          <Dato
            icono="agenda"
            etiqueta="Frecuencia"
            valor={ETIQUETA_FRECUENCIA[prestamo.frecuencia]}
          />
          <Dato icono="cobros" etiqueta="Cuota" valor={moneda(Number(prestamo.montoCuota))} />
          <Dato icono="agenda" etiqueta="Inicio" valor={fecha(prestamo.fechaInicio)} />
        </div>

        {prestamo.notas && (
          <div className="mt-6 rounded-2xl bg-lienzo/70 p-4">
            <p className="text-xs font-medium text-texto-3">Notas</p>
            <p className="mt-1 text-sm text-texto">{prestamo.notas}</p>
          </div>
        )}
      </div>

      <div className="tarjeta p-5 sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Tabla de amortización</h2>
          <span className="text-xs text-texto-3">{prestamo.plazoCuotas} cuotas</span>
        </div>

        <div className="max-h-96 overflow-y-auto overflow-x-auto scroll-fino">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-superficie">
              <tr className="text-left text-xs text-texto-3">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Vence</th>
                <th className="px-3 py-2 font-medium text-right">Capital</th>
                <th className="px-3 py-2 font-medium text-right">Interés</th>
                <th className="px-3 py-2 font-medium text-right">Cuota</th>
                <th className="px-3 py-2 font-medium text-right">Saldo</th>
                <th className="px-3 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {prestamo.cuotas?.map((c) => {
                const estado = estadoCuota(c.fechaVencimiento, c.montoCuota, c.montoPagado);
                const mora =
                  estado.texto === "Atrasada"
                    ? calcularMoraCuota(
                        {
                          montoCuota: Number(c.montoCuota),
                          montoPagado: Number(c.montoPagado),
                          fechaVencimiento: c.fechaVencimiento,
                        },
                        2,
                      )
                    : 0;
                return (
                  <tr key={c.id} className="border-t border-borde">
                    <td className="px-3 py-2.5 text-texto-2">{c.numero}</td>
                    <td className="px-3 py-2.5">{fecha(c.fechaVencimiento)}</td>
                    <td className="px-3 py-2.5 text-right">{moneda(Number(c.capital))}</td>
                    <td className="px-3 py-2.5 text-right">{moneda(Number(c.interes))}</td>
                    <td className="px-3 py-2.5 text-right font-medium">
                      {moneda(Number(c.montoCuota))}
                      {mora > 0 && (
                        <span className="ml-1 block text-xs font-normal text-rosa-ink">
                          +{moneda(mora)} mora
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-texto-2">
                      {moneda(Number(c.saldoCapital))}
                    </td>
                    <td className="px-3 py-2.5">
                      <Pildora tono={estado.tono}>{estado.texto}</Pildora>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="tarjeta p-5 sm:p-7">
        <h2 className="mb-4 font-semibold">Historial de pagos</h2>
        {pagos.length === 0 ? (
          <p className="py-6 text-center text-sm text-texto-2">
            Todavía no se ha registrado ningún pago para este préstamo.
          </p>
        ) : (
          <ul className="space-y-2">
            {pagos.map((pago) => (
              <li
                key={pago.id}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                  pago.anulado ? "bg-rosa/40" : "bg-lienzo/70"
                }`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie text-texto-2">
                  <Icono nombre="cobros" className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {pago.codigo} · {ETIQUETA_METODO_PAGO[pago.metodo]}
                  </p>
                  <p className="truncate text-xs text-texto-3">
                    {fecha(pago.fecha)} · {pago.usuario?.nombre ?? "—"}
                    {pago.anulado && ` · Anulado: ${pago.motivoAnulacion}`}
                  </p>
                </div>
                <p className={`font-semibold ${pago.anulado ? "text-texto-3 line-through" : ""}`}>
                  {moneda(Number(pago.monto))}
                </p>
                <div className="flex shrink-0 gap-1">
                  <a
                    href={`/imprimir/recibo/${pago.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="grid size-8 place-items-center rounded-full text-texto-3 transition hover:bg-superficie hover:text-texto"
                    aria-label="Ver recibo"
                  >
                    <Icono nombre="reportes" className="size-4" />
                  </a>
                  {!pago.anulado && (
                    <button
                      onClick={() => setAnulando(pago)}
                      className="grid size-8 place-items-center rounded-full text-texto-3 transition hover:bg-superficie hover:text-rosa-ink"
                      aria-label="Anular pago"
                    >
                      <Icono nombre="cerrar" className="size-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmarAccion && (
        <Modal
          titulo={confirmarAccion === "CANCELADO" ? "Cancelar préstamo" : "Marcar como incobrable"}
          onCerrar={() => setConfirmarAccion(null)}
        >
          <p className="text-sm text-texto-2">
            {confirmarAccion === "CANCELADO"
              ? "El préstamo quedará cancelado y no se seguirá cobrando."
              : "El préstamo se marcará como pérdida. Esta acción es para casos donde ya no se espera recuperar el dinero."}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Boton variante="suave" onClick={() => setConfirmarAccion(null)}>
              Volver
            </Boton>
            <Boton onClick={() => cambiarEstado(confirmarAccion)}>Confirmar</Boton>
          </div>
        </Modal>
      )}

      {nuevoPago && (
        <Modal titulo="Registrar pago" onCerrar={() => setNuevoPago(false)} ancho="max-w-2xl">
          <FormularioPago
            prestamoPreseleccionado={prestamo}
            onRegistrar={registrarPago}
            onCancelar={() => setNuevoPago(false)}
          />
        </Modal>
      )}

      {anulando && (
        <Modal
          titulo="Anular pago"
          onCerrar={() => {
            setAnulando(null);
            setMotivoAnulacion("");
            setErrorAnulacion(null);
          }}
        >
          <p className="mb-4 text-sm text-texto-2">
            Vas a anular el pago <strong className="font-semibold text-texto">{anulando.codigo}</strong>{" "}
            por {moneda(Number(anulando.monto))}. Las cuotas afectadas volverán a quedar pendientes.
          </p>
          <label className="mb-1.5 block text-sm font-medium text-texto-2">Motivo</label>
          <textarea
            value={motivoAnulacion}
            onChange={(e) => {
              setMotivoAnulacion(e.target.value);
              setErrorAnulacion(null);
            }}
            rows={2}
            className="w-full resize-none rounded-2xl border border-borde bg-superficie px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-tinta/15"
            placeholder="Ej: se registró por error"
          />
          {errorAnulacion && <p className="mt-2 text-sm text-rosa-ink">{errorAnulacion}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <Boton
              variante="suave"
              onClick={() => {
                setAnulando(null);
                setMotivoAnulacion("");
                setErrorAnulacion(null);
              }}
            >
              Volver
            </Boton>
            <Boton onClick={anularPago}>Anular pago</Boton>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Metrica({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-lienzo p-4">
      <p className="text-xs text-texto-3">{etiqueta}</p>
      <p className="mt-1 text-lg font-bold tracking-tight">{valor}</p>
    </div>
  );
}

function Dato({
  icono,
  etiqueta,
  valor,
}: {
  icono: "reportes" | "agenda" | "cobros";
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
