import { prisma } from "@/lib/prisma";

export type CobroHoy = {
  cuotaId: string;
  tipo: "prestamo" | "seguridad";
  ruta: string;
  codigo: string;
  cliente: string;
  monto: number;
  cuotasPendientes: number;
  fechaVencimiento: Date;
  atrasada: boolean;
};

/** Préstamos y pólizas de seguridad con cobro pendiente para hoy o ya
 *  atrasado, para las pantallas de "cobros pendientes" y para la campana de
 *  notificaciones. Una fila por préstamo/póliza (no por cuota): si a un
 *  mismo cliente se le acumularon varias cuotas sin pagar, se junta en un
 *  solo total pendiente en vez de repetir una fila por cada cuota vencida.
 *  Como la comparación es por fecha (hoy a las 23:59:59), una cuota entra a
 *  esta lista automáticamente en el instante en que pasa la medianoche del
 *  día en que vence, sin ningún paso manual. */
export async function obtenerCobrosHoy(): Promise<CobroHoy[]> {
  const hoy = new Date();
  const finHoy = new Date(hoy);
  finHoy.setHours(23, 59, 59, 999);
  const inicioHoy = new Date(hoy);
  inicioHoy.setHours(0, 0, 0, 0);

  const [cuotasPrestamo, cuotasSeguridad] = await Promise.all([
    prisma.cuota.findMany({
      where: {
        fechaVencimiento: { lte: finHoy },
        prestamo: { eliminadoEn: null, estado: { in: ["ACTIVO", "ATRASADO"] } },
      },
      include: {
        prestamo: { select: { id: true, codigo: true, cliente: { select: { nombre: true } } } },
      },
      orderBy: { fechaVencimiento: "asc" },
    }),
    prisma.cuotaSeguridad.findMany({
      where: {
        fechaVencimiento: { lte: finHoy },
        poliza: { eliminadoEn: null, estado: { in: ["ACTIVA", "ATRASADA"] } },
      },
      include: {
        poliza: { select: { id: true, codigo: true, cliente: { select: { nombre: true } } } },
      },
      orderBy: { fechaVencimiento: "asc" },
    }),
  ]);

  function agrupar<T extends { montoCuota: unknown; montoPagado: unknown; fechaVencimiento: Date }>(
    cuotas: T[],
    idDe: (c: T) => string,
    tipo: CobroHoy["tipo"],
    rutaDe: (c: T) => string,
    codigoDe: (c: T) => string,
    clienteDe: (c: T) => string,
  ): CobroHoy[] {
    const grupos = new Map<string, CobroHoy>();

    for (const c of cuotas) {
      const pendiente = Number(c.montoCuota) - Number(c.montoPagado);
      if (pendiente < 0.009) continue;

      const id = idDe(c);
      const existente = grupos.get(id);
      const atrasada = c.fechaVencimiento < inicioHoy;

      if (!existente) {
        grupos.set(id, {
          cuotaId: id,
          tipo,
          ruta: rutaDe(c),
          codigo: codigoDe(c),
          cliente: clienteDe(c),
          monto: pendiente,
          cuotasPendientes: 1,
          fechaVencimiento: c.fechaVencimiento,
          atrasada,
        });
      } else {
        existente.monto += pendiente;
        existente.cuotasPendientes += 1;
        if (c.fechaVencimiento < existente.fechaVencimiento) {
          existente.fechaVencimiento = c.fechaVencimiento;
        }
        existente.atrasada = existente.atrasada || atrasada;
      }
    }

    return [...grupos.values()];
  }

  const deLoansPendientes = agrupar(
    cuotasPrestamo,
    (c) => c.prestamo.id,
    "prestamo",
    (c) => `/prestamos/${c.prestamo.id}`,
    (c) => c.prestamo.codigo,
    (c) => c.prestamo.cliente.nombre,
  );

  const dePolizasPendientes = agrupar(
    cuotasSeguridad,
    (c) => c.poliza.id,
    "seguridad",
    (c) => `/seguridad/${c.poliza.id}`,
    (c) => c.poliza.codigo,
    (c) => c.poliza.cliente.nombre,
  );

  return [...deLoansPendientes, ...dePolizasPendientes].sort(
    (a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime(),
  );
}
