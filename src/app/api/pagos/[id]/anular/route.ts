import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirEscritura } from "@/lib/api";
import { esquemaAnulacion } from "@/lib/validaciones/pago";
import { calcularEstadoPrestamo } from "@/lib/pagos";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Contexto) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirEscritura(sesion);
  if (permiso) return permiso;

  const { id } = await params;
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaAnulacion.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const pago = await prisma.pago.findUnique({
    where: { id },
    include: { aplicaciones: true },
  });
  if (!pago) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }
  if (pago.anulado) {
    return NextResponse.json({ error: "Este pago ya estaba anulado" }, { status: 409 });
  }

  const aFechaUTC = (f: Date) => f.toISOString().slice(0, 10);
  const esCreador = pago.usuarioId === sesion.id;
  const mismodDia = aFechaUTC(new Date(pago.fecha)) === aFechaUTC(new Date());
  if (sesion.rol !== "ADMIN" && !(esCreador && mismodDia)) {
    return NextResponse.json(
      { error: "Solo un administrador puede anular este pago" },
      { status: 403 },
    );
  }

  const nuevoEstado = await prisma.$transaction(async (tx) => {
    for (const aplicacion of pago.aplicaciones) {
      await tx.cuota.update({
        where: { id: aplicacion.cuotaId },
        data: {
          montoPagado: {
            decrement: Number(aplicacion.montoInteres) + Number(aplicacion.montoCapital),
          },
        },
      });
    }

    await tx.pago.update({
      where: { id },
      data: { anulado: true, motivoAnulacion: datos.data.motivo },
    });

    const cuotas = await tx.cuota.findMany({ where: { prestamoId: pago.prestamoId } });
    const estado = calcularEstadoPrestamo(
      cuotas.map((c) => ({
        montoCuota: Number(c.montoCuota),
        montoPagado: Number(c.montoPagado),
        fechaVencimiento: c.fechaVencimiento,
      })),
    );
    await tx.prestamo.update({ where: { id: pago.prestamoId }, data: { estado } });
    return estado;
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "ANULAR",
      entidad: "Pago",
      entidadId: id,
      detalle: { motivo: datos.data.motivo },
    },
  });

  return NextResponse.json({ ok: true, estadoPrestamo: nuevoEstado });
}
