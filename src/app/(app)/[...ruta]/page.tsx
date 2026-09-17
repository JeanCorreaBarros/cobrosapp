import { notFound } from "next/navigation";
import { resolverVista } from "@/lib/registro-vistas";
import { sesionActual } from "@/lib/auth";
import AreaTrabajo from "@/components/pestanas/AreaTrabajo";

export default async function PaginaArea({
  params,
}: {
  params: Promise<{ ruta: string[] }>;
}) {
  const { ruta } = await params;
  const camino = `/${ruta.join("/")}`;
  const vista = resolverVista(camino);
  if (!vista) notFound();

  const sesion = await sesionActual();
  if (vista.definicion.soloAdmin && sesion?.rol !== "ADMIN") notFound();

  return <AreaTrabajo />;
}
