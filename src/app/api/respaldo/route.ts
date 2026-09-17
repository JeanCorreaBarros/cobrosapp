import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirRol } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET() {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirRol(sesion, ["ADMIN"]);
  if (permiso) return permiso;

  const [configuracion, zonas, usuarios, clientes, prestamos, cuotas, pagos, aplicaciones] =
    await Promise.all([
      prisma.configuracion.findMany(),
      prisma.zona.findMany(),
      prisma.usuario.findMany(),
      prisma.cliente.findMany(),
      prisma.prestamo.findMany(),
      prisma.cuota.findMany(),
      prisma.pago.findMany(),
      prisma.pagoAplicacion.findMany(),
    ]);

  const respaldo = {
    generadoEn: new Date().toISOString(),
    version: 1,
    tablas: { configuracion, zonas, usuarios, clientes, prestamos, cuotas, pagos, aplicaciones },
  };

  await prisma.auditoria.create({
    data: { usuarioId: sesion.id, accion: "RESPALDO", entidad: "Sistema" },
  });

  return new NextResponse(JSON.stringify(respaldo, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="respaldo-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
