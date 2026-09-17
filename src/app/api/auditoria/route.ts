import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirRol } from "@/lib/api";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirRol(sesion, ["ADMIN"]);
  if (permiso) return permiso;

  const { searchParams } = new URL(request.url);
  const entidad = searchParams.get("entidad");
  const accion = searchParams.get("accion");
  const usuarioId = searchParams.get("usuarioId");
  const buscar = searchParams.get("buscar")?.trim();
  const pagina = Math.max(1, Number(searchParams.get("pagina") ?? "1"));
  const porPagina = 40;

  const where: Prisma.AuditoriaWhereInput = {
    ...(entidad ? { entidad } : {}),
    ...(accion ? { accion } : {}),
    ...(usuarioId ? { usuarioId } : {}),
    ...(buscar
      ? {
          OR: [
            { entidad: { contains: buscar, mode: "insensitive" } },
            { accion: { contains: buscar, mode: "insensitive" } },
            { usuario: { nombre: { contains: buscar, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [registros, total, entidades] = await Promise.all([
    prisma.auditoria.findMany({
      where,
      include: { usuario: { select: { nombre: true, usuario: true } } },
      orderBy: { creadoEn: "desc" },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.auditoria.count({ where }),
    prisma.auditoria.findMany({
      distinct: ["entidad"],
      select: { entidad: true },
      orderBy: { entidad: "asc" },
    }),
  ]);

  return NextResponse.json({
    registros,
    total,
    pagina,
    porPagina,
    entidades: entidades.map((e) => e.entidad),
  });
}
