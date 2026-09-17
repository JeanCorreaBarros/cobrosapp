import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requerirSesion, esSesion, requerirRol } from "@/lib/api";
import { borrarCookieSesion } from "@/lib/auth";

const TABLAS_ESPERADAS = [
  "configuracion",
  "zonas",
  "usuarios",
  "clientes",
  "prestamos",
  "cuotas",
  "pagos",
  "aplicaciones",
] as const;

export async function POST(request: Request) {
  const sesion = await requerirSesion();
  if (!esSesion(sesion)) return sesion;
  const permiso = requerirRol(sesion, ["ADMIN"]);
  if (permiso) return permiso;

  const cuerpo = await request.json().catch(() => null);

  if (!cuerpo || typeof cuerpo !== "object" || !cuerpo.tablas) {
    return NextResponse.json(
      { error: "El archivo no tiene el formato de un respaldo válido" },
      { status: 400 },
    );
  }

  const tablas = cuerpo.tablas as Record<string, unknown[]>;
  for (const clave of TABLAS_ESPERADAS) {
    if (!Array.isArray(tablas[clave])) {
      return NextResponse.json(
        { error: `El archivo no tiene la tabla "${clave}" esperada` },
        { status: 400 },
      );
    }
  }

  // Se registra antes de borrar nada: si el usuario actual no sobrevive la
  // restauración, esta entrada de auditoría igual queda guardada.
  await prisma.auditoria.create({
    data: {
      usuarioId: sesion.id,
      accion: "IMPORTAR",
      entidad: "Sistema",
      detalle: {
        generadoEn: cuerpo.generadoEn ?? null,
        totales: Object.fromEntries(TABLAS_ESPERADAS.map((t) => [t, tablas[t].length])),
      },
    },
  });

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.pagoAplicacion.deleteMany({});
        await tx.pago.deleteMany({});
        await tx.cuota.deleteMany({});
        await tx.prestamo.deleteMany({});
        await tx.cliente.deleteMany({});
        await tx.usuario.deleteMany({});
        await tx.zona.deleteMany({});
        await tx.configuracion.deleteMany({});

        // @ts-expect-error los datos vienen de un JSON externo con la forma de cada tabla
        if (tablas.configuracion.length) await tx.configuracion.createMany({ data: tablas.configuracion });
        // @ts-expect-error idem
        if (tablas.zonas.length) await tx.zona.createMany({ data: tablas.zonas });
        // @ts-expect-error idem
        if (tablas.usuarios.length) await tx.usuario.createMany({ data: tablas.usuarios });
        // @ts-expect-error idem
        if (tablas.clientes.length) await tx.cliente.createMany({ data: tablas.clientes });
        // @ts-expect-error idem
        if (tablas.prestamos.length) await tx.prestamo.createMany({ data: tablas.prestamos });
        // @ts-expect-error idem
        if (tablas.cuotas.length) await tx.cuota.createMany({ data: tablas.cuotas });
        // @ts-expect-error idem
        if (tablas.pagos.length) await tx.pago.createMany({ data: tablas.pagos });
        // @ts-expect-error idem
        if (tablas.aplicaciones.length) await tx.pagoAplicacion.createMany({ data: tablas.aplicaciones });
      },
      { timeout: 60_000 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "No se pudo restaurar el respaldo. La base puede haber quedado incompleta; revisa los logs (docker compose logs web) o restaura desde un pg_dump si tienes uno.",
        detalle: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  // La tabla de usuarios fue reemplazada: la sesión actual ya no es de fiar.
  await borrarCookieSesion();

  return NextResponse.json({ ok: true, reautenticar: true });
}
