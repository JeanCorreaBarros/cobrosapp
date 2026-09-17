import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion } from "@/lib/api";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const { id } = await params;
  const pago = await prisma.pago.findUnique({
    where: { id },
    include: {
      prestamo: {
        select: {
          codigo: true,
          tipoInteres: true,
          frecuencia: true,
          cliente: { select: { id: true, nombre: true, codigo: true, cedula: true, telefono: true } },
        },
      },
      usuario: { select: { nombre: true } },
      aplicaciones: { include: { cuota: { select: { numero: true } } } },
    },
  });

  if (!pago) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ pago });
}
