import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirEscritura, siguienteCodigoPoliza } from "@/lib/api";
import { esquemaPoliza } from "@/lib/validaciones/poliza";
import { calcularCuotasFaltantes } from "@/lib/seguridad";
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

  const where: Prisma.PolizaSeguridadWhereInput = {
    eliminadoEn: null,
    ...(estado ? { estado: estado as Prisma.EnumEstadoPolizaFilter["equals"] } : {}),
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

  const [polizas, total] = await Promise.all([
    prisma.polizaSeguridad.findMany({
      where,
      include: { cliente: { select: { id: true, nombre: true, codigo: true, telefono: true } } },
      orderBy: { creadoEn: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.polizaSeguridad.count({ where }),
  ]);

  return NextResponse.json({ polizas, total, pagina, porPagina });
}

export async function POST(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirEscritura(sesion);
  if (permiso) return permiso;

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaPoliza.safeParse(cuerpo);
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
      { error: "Este cliente está en lista negra y no puede recibir pólizas" },
      { status: 409 },
    );
  }

  const fechaInicio = new Date(datos.data.fechaInicio);
  if (Number.isNaN(fechaInicio.getTime())) {
    return NextResponse.json({ error: "Fecha de inicio inválida" }, { status: 400 });
  }

  const codigo = await siguienteCodigoPoliza();
  const cuotasIniciales = calcularCuotasFaltantes(
    fechaInicio,
    datos.data.frecuencia,
    datos.data.montoCuota,
    [],
  );

  const poliza = await prisma.polizaSeguridad.create({
    data: {
      codigo,
      clienteId: datos.data.clienteId,
      montoCuota: datos.data.montoCuota,
      frecuencia: datos.data.frecuencia,
      fechaInicio,
      notas: datos.data.notas || null,
      creadoPorId: sesion.id,
      cuotas: {
        create: cuotasIniciales.map((c) => ({
          numero: c.numero,
          fechaVencimiento: c.fechaVencimiento,
          montoCuota: c.montoCuota,
        })),
      },
    },
    include: { cliente: { select: { id: true, nombre: true, codigo: true, telefono: true } } },
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "CREAR",
      entidad: "PolizaSeguridad",
      entidadId: poliza.id,
      detalle: { codigo: poliza.codigo, cliente: cliente.nombre, monto: datos.data.montoCuota },
    },
  });

  return NextResponse.json({ poliza }, { status: 201 });
}
