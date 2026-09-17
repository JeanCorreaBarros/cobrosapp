import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirEscritura, siguienteCodigoPrestamo } from "@/lib/api";
import { esquemaPrestamo } from "@/lib/validaciones/prestamo";
import { generarCronograma } from "@/lib/amortizacion";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const { searchParams } = new URL(request.url);
  const buscar = searchParams.get("buscar")?.trim();
  const estado = searchParams.get("estado");
  const clienteId = searchParams.get("clienteId");
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? "1"));
  const porPagina = 20;

  const where: Prisma.PrestamoWhereInput = {
    eliminadoEn: null,
    ...(estado ? { estado: estado as Prisma.EnumEstadoPrestamoFilter["equals"] } : {}),
    ...(clienteId ? { clienteId } : {}),
    ...(buscar
      ? {
          OR: [
            { codigo: { contains: buscar, mode: "insensitive" } },
            { cliente: { nombre: { contains: buscar, mode: "insensitive" } } },
            { cliente: { cedula: { contains: buscar, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [prestamos, total] = await Promise.all([
    prisma.prestamo.findMany({
      where,
      include: { cliente: { select: { id: true, nombre: true, codigo: true, telefono: true } } },
      orderBy: { creadoEn: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.prestamo.count({ where }),
  ]);

  return NextResponse.json({ prestamos, total, pagina, porPagina });
}

export async function POST(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirEscritura(sesion);
  if (permiso) return permiso;

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaPrestamo.safeParse(cuerpo);

  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const cliente = await prisma.cliente.findFirst({
    where: { id: datos.data.clienteId, eliminadoEn: null },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }
  if (cliente.estado === "LISTA_NEGRA") {
    return NextResponse.json(
      { error: "Este cliente está en lista negra y no puede recibir préstamos" },
      { status: 409 },
    );
  }

  const fechaInicio = new Date(datos.data.fechaInicio);
  if (Number.isNaN(fechaInicio.getTime())) {
    return NextResponse.json({ error: "Fecha de inicio inválida" }, { status: 400 });
  }

  let cronograma;
  try {
    cronograma = generarCronograma({
      montoCapital: datos.data.montoCapital,
      tasaInteres: datos.data.tasaInteres,
      tipoInteres: datos.data.tipoInteres,
      plazoCuotas: datos.data.plazoCuotas,
      frecuencia: datos.data.frecuencia,
      fechaInicio,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo calcular el préstamo" },
      { status: 400 },
    );
  }

  const codigo = await siguienteCodigoPrestamo();

  const prestamo = await prisma.$transaction(async (tx) => {
    const creado = await tx.prestamo.create({
      data: {
        codigo,
        clienteId: datos.data.clienteId,
        montoCapital: datos.data.montoCapital,
        tasaInteres: datos.data.tasaInteres,
        tipoInteres: datos.data.tipoInteres,
        frecuencia: datos.data.frecuencia,
        plazoCuotas: datos.data.plazoCuotas,
        fechaInicio,
        montoTotal: cronograma.montoTotal,
        montoCuota: cronograma.montoCuota,
        notas: datos.data.notas || null,
        creadoPorId: sesion.id,
        cuotas: {
          create: cronograma.cuotas.map((c) => ({
            numero: c.numero,
            fechaVencimiento: c.fechaVencimiento,
            capital: c.capital,
            interes: c.interes,
            montoCuota: c.montoCuota,
            saldoCapital: c.saldoCapital,
          })),
        },
      },
      include: { cliente: { select: { id: true, nombre: true, codigo: true, telefono: true } } },
    });
    return creado;
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "CREAR",
      entidad: "Prestamo",
      entidadId: prestamo.id,
      detalle: { codigo: prestamo.codigo, cliente: cliente.nombre, monto: datos.data.montoCapital },
    },
  });

  return NextResponse.json({ prestamo }, { status: 201 });
}
