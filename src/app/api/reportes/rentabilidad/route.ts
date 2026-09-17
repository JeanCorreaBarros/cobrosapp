import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion } from "@/lib/api";
import { aCsv, respuestaCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const { searchParams } = new URL(request.url);
  const formato = searchParams.get("formato");

  const [capitalPorCliente, aplicaciones, clientes] = await Promise.all([
    prisma.prestamo.groupBy({
      by: ["clienteId"],
      where: { eliminadoEn: null },
      _sum: { montoCapital: true },
      _count: true,
    }),
    prisma.pagoAplicacion.findMany({
      where: { pago: { anulado: false } },
      select: {
        montoInteres: true,
        montoMora: true,
        montoCapital: true,
        pago: { select: { prestamo: { select: { clienteId: true } } } },
      },
    }),
    prisma.cliente.findMany({
      where: { eliminadoEn: null },
      select: { id: true, nombre: true, cedula: true, codigo: true, estado: true },
    }),
  ]);

  const porCliente = new Map<
    string,
    { capitalPrestado: number; prestamos: number; interesCobrado: number; capitalCobrado: number }
  >();

  for (const fila of capitalPorCliente) {
    porCliente.set(fila.clienteId, {
      capitalPrestado: Number(fila._sum.montoCapital ?? 0),
      prestamos: fila._count,
      interesCobrado: 0,
      capitalCobrado: 0,
    });
  }

  for (const ap of aplicaciones) {
    const clienteId = ap.pago.prestamo.clienteId;
    const entrada = porCliente.get(clienteId);
    if (!entrada) continue;
    entrada.interesCobrado += Number(ap.montoInteres) + Number(ap.montoMora);
    entrada.capitalCobrado += Number(ap.montoCapital);
  }

  const nombresClientes = new Map(clientes.map((c) => [c.id, c]));

  const ranking = Array.from(porCliente.entries())
    .map(([clienteId, datos]) => {
      const cliente = nombresClientes.get(clienteId);
      return {
        clienteId,
        nombre: cliente?.nombre ?? "Cliente eliminado",
        cedula: cliente?.cedula ?? "",
        codigo: cliente?.codigo ?? "",
        estado: cliente?.estado ?? "",
        ...datos,
        rentabilidad:
          datos.capitalPrestado > 0 ? (datos.interesCobrado / datos.capitalPrestado) * 100 : 0,
      };
    })
    .sort((a, b) => b.interesCobrado - a.interesCobrado);

  if (formato === "csv") {
    const filas = ranking.map((r) => ({
      cliente: r.nombre,
      cedula: r.cedula,
      codigo: r.codigo,
      prestamos: r.prestamos,
      capitalPrestado: r.capitalPrestado.toFixed(2),
      interesCobrado: r.interesCobrado.toFixed(2),
      rentabilidadPorcentaje: r.rentabilidad.toFixed(2),
    }));
    return respuestaCsv("rentabilidad.csv", aCsv(filas));
  }

  const totales = ranking.reduce(
    (acc, r) => ({
      capitalPrestado: acc.capitalPrestado + r.capitalPrestado,
      interesCobrado: acc.interesCobrado + r.interesCobrado,
    }),
    { capitalPrestado: 0, interesCobrado: 0 },
  );

  return NextResponse.json({ ranking, totales });
}
