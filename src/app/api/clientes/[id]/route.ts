import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirRol, requerirEscritura } from "@/lib/api";
import { esquemaCliente } from "@/lib/validaciones/cliente";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const { id } = await params;
  const cliente = await prisma.cliente.findFirst({
    where: { id, eliminadoEn: null },
    include: { zona: { select: { id: true, nombre: true } } },
  });

  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ cliente });
}

export async function PATCH(request: Request, { params }: Contexto) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirEscritura(sesion);
  if (permiso) return permiso;

  const { id } = await params;
  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaCliente.partial().safeParse(cuerpo);

  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }

  const existente = await prisma.cliente.findFirst({ where: { id, eliminadoEn: null } });
  if (!existente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  if (datos.data.cedula && datos.data.cedula !== existente.cedula) {
    const duplicada = await prisma.cliente.findFirst({
      where: { cedula: datos.data.cedula, eliminadoEn: null, id: { not: id } },
    });
    if (duplicada) {
      return NextResponse.json(
        { error: "Ya existe un cliente activo con esa cédula/DNI" },
        { status: 409 },
      );
    }
  }

  const cliente = await prisma.cliente.update({
    where: { id },
    data: {
      ...datos.data,
      telefonoAlt: datos.data.telefonoAlt || undefined,
      correo: datos.data.correo || undefined,
      direccion: datos.data.direccion || undefined,
      zonaId: datos.data.zonaId || undefined,
    },
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "EDITAR",
      entidad: "Cliente",
      entidadId: cliente.id,
      detalle: { cambios: datos.data },
    },
  });

  return NextResponse.json({ cliente });
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;

  const permiso = requerirRol(sesion, ["ADMIN"]);
  if (permiso) return permiso;

  const { id } = await params;
  const existente = await prisma.cliente.findFirst({ where: { id, eliminadoEn: null } });
  if (!existente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  await prisma.cliente.update({ where: { id }, data: { eliminadoEn: new Date() } });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "ELIMINAR",
      entidad: "Cliente",
      entidadId: id,
      detalle: { nombre: existente.nombre },
    },
  });

  return NextResponse.json({ ok: true });
}
