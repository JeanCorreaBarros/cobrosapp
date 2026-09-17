import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirRol } from "@/lib/api";
import { esquemaUsuario } from "@/lib/validaciones/configuracion";

export async function GET() {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirRol(sesion, ["ADMIN"]);
  if (permiso) return permiso;

  const usuarios = await prisma.usuario.findMany({
    where: { eliminadoEn: null },
    include: { zona: { select: { nombre: true } } },
    orderBy: { creadoEn: "asc" },
  });

  return NextResponse.json({
    usuarios: usuarios.map((u) => ({ ...u, passwordHash: undefined })),
  });
}

export async function POST(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirRol(sesion, ["ADMIN"]);
  if (permiso) return permiso;

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaUsuario.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json({ error: datos.error.issues[0]?.message }, { status: 400 });
  }
  if (!datos.data.password || datos.data.password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 },
    );
  }

  const existente = await prisma.usuario.findUnique({ where: { usuario: datos.data.usuario } });
  if (existente) {
    return NextResponse.json({ error: "Ese nombre de usuario ya existe" }, { status: 409 });
  }

  const usuario = await prisma.usuario.create({
    data: {
      usuario: datos.data.usuario,
      nombre: datos.data.nombre,
      passwordHash: await bcrypt.hash(datos.data.password, 10),
      rol: datos.data.rol,
      zonaId: datos.data.zonaId || null,
      activo: datos.data.activo ?? true,
    },
  });

  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "CREAR",
      entidad: "Usuario",
      entidadId: usuario.id,
      detalle: { usuario: usuario.usuario, rol: usuario.rol },
    },
  });

  return NextResponse.json({ usuario: { ...usuario, passwordHash: undefined } }, { status: 201 });
}
