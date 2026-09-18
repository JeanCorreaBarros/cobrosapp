import { prisma } from "@/lib/prisma";

export type CobroHoy = {
  cuotaId: string;
  tipo: "prestamo" | "seguridad";
  ruta: string;
  codigo: string;
  cliente: string;
  monto: number;
  fechaVencimiento: Date;
  atrasada: boolean;
};

/** Cuotas de préstamos y de pólizas de seguridad que vencen hoy o ya están
 *  atrasadas, para las pantallas de "cobros pendientes" y para la campana
 *  de notificaciones. Como la comparación es por fecha (hoy a las 23:59:59),
 *  una cuota entra a esta lista automáticamente en el instante en que pasa
 *  la medianoche del día en que vence, sin ningún paso manual. */
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

  const deLoansPendientes: CobroHoy[] = cuotasPrestamo
    .filter((c) => Number(c.montoPagado) < Number(c.montoCuota) - 0.009)
    .map((c) => ({
      cuotaId: c.id,
      tipo: "prestamo",
      ruta: `/prestamos/${c.prestamo.id}`,
      codigo: c.prestamo.codigo,
      cliente: c.prestamo.cliente.nombre,
      monto: Number(c.montoCuota) - Number(c.montoPagado),
      fechaVencimiento: c.fechaVencimiento,
      atrasada: new Date(c.fechaVencimiento) < inicioHoy,
    }));

  const dePolizasPendientes: CobroHoy[] = cuotasSeguridad
    .filter((c) => Number(c.montoPagado) < Number(c.montoCuota) - 0.009)
    .map((c) => ({
      cuotaId: c.id,
      tipo: "seguridad",
      ruta: `/seguridad/${c.poliza.id}`,
      codigo: c.poliza.codigo,
      cliente: c.poliza.cliente.nombre,
      monto: Number(c.montoCuota) - Number(c.montoPagado),
      fechaVencimiento: c.fechaVencimiento,
      atrasada: new Date(c.fechaVencimiento) < inicioHoy,
    }));

  return [...deLoansPendientes, ...dePolizasPendientes].sort(
    (a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime(),
  );
}
