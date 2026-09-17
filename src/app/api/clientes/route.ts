import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirEscritura, siguienteCodigoCliente } from "@/lib/api";
import { esquemaCliente } from "@/lib/validaciones/cliente";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const { searchParams } = new URL(request.url);
  const buscar = searchParams.get("buscar")?.trim();
  const estado = searchParams.get("estado");
  const zonaId = searchParams.get("zonaId");
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? "1"));
  const porPagina = 20;

  const where: Prisma.ClienteWhereInput = {
    eliminadoEn: null,
    ...(estado ? { estado: estado as Prisma.EnumEstadoClienteFilter["equals"] } : {}),
    ...(zonaId ? { zonaId } : {}),
    ...(buscar
      ? {
          OR: [
            { nombre: { contains: buscar, mode: "insensitive" } },
            { cedula: { contains: buscar, mode: "insensitive" } },
            { telefono: { contains: buscar } },
            { codigo: { contains: buscar, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      include: { zona: { select: { nombre: true } } },
      orderBy: { creadoEn: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.cliente.count({ where }),
  ]);

  return NextResponse.json({ clientes, total, pagina, porPagina });
}

export async function POST(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirEscritura(sesion);
  if (permiso) return permiso;

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaCliente.safeParse(cuerpo);

  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const cedulaExistente = await prisma.cliente.findFirst({
    where: { cedula: datos.data.cedula, eliminadoEn: null },
  });
  if (cedulaExistente) {
    return NextResponse.json(
      { error: "Ya existe un cliente activo con esa cédula/DNI" },
      { status: 409 },
    );
  }

  const codigo = await siguienteCodigoCliente();

  const cliente = await prisma.cliente.create({
    data: {
      codigo,
      nombre: datos.data.nombre,
      cedula: datos.data.cedula,
      telefono: datos.data.telefono,
      telefonoAlt: datos.data.telefonoAlt || null,
      correo: datos.data.correo || null,
      direccion: datos.data.direccion || null,
      zonaId: datos.data.zonaId || null,
      referencia1Nombre: datos.data.referencia1Nombre || null,
      referencia1Telefono: datos.data.referencia1Telefono || null,
      referencia2Nombre: datos.data.referencia2Nombre || null,
      referencia2Telefono: datos.data.referencia2Telefono || null,
      notas: datos.data.notas || null,
      creadoPorId: sesion.id,
    },
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "CREAR",
      entidad: "Cliente",
      entidadId: cliente.id,
      detalle: { nombre: cliente.nombre, codigo: cliente.codigo },
    },
  });

  return NextResponse.json({ cliente }, { status: 201 });
}
