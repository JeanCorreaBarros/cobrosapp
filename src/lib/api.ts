import { NextResponse } from "next/server";
import { sesionActual, type Sesion } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requerirSesion(): Promise<Sesion | NextResponse> {
  const sesion = await sesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return sesion;
}

export function esSesion(valor: Sesion | NextResponse): valor is Sesion {
  return !(valor instanceof NextResponse);
}

export function requerirRol(sesion: Sesion, roles: Sesion["rol"][]): NextResponse | null {
  if (!roles.includes(sesion.rol)) {
    return NextResponse.json({ error: "No tienes permiso para esta acción" }, { status: 403 });
  }
  return null;
}

export async function siguienteCodigoCliente(): Promise<string> {
  const ultimo = await prisma.cliente.findFirst({
    orderBy: { codigo: "desc" },
    select: { codigo: true },
  });
  const numero = ultimo ? parseInt(ultimo.codigo.split("-")[1] ?? "0", 10) || 0 : 0;
  return `CLI-${String(numero + 1).padStart(4, "0")}`;
}

export async function siguienteCodigoPrestamo(): Promise<string> {
  const ultimo = await prisma.prestamo.findFirst({
    orderBy: { codigo: "desc" },
    select: { codigo: true },
  });
  const numero = ultimo ? parseInt(ultimo.codigo.split("-")[1] ?? "0", 10) || 0 : 0;
  return `PR-${String(numero + 1).padStart(4, "0")}`;
}

export async function siguienteCodigoPago(): Promise<string> {
  const ultimo = await prisma.pago.findFirst({
    orderBy: { codigo: "desc" },
    select: { codigo: true },
  });
  const numero = ultimo ? parseInt(ultimo.codigo.split("-")[1] ?? "0", 10) || 0 : 0;
  return `PAG-${String(numero + 1).padStart(5, "0")}`;
}
