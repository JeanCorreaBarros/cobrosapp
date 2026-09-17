import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/auth";
import Navegacion from "@/components/Navegacion";
import { ProveedorSesion } from "@/lib/sesion-cliente";
import { ProveedorPestanas } from "@/components/pestanas/ContextoPestanas";
import RegistroPWA from "@/components/RegistroPWA";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");

  return (
    <ProveedorSesion sesion={sesion}>
      <RegistroPWA />
      <ProveedorPestanas>
        <div className="flex min-h-dvh flex-col lg:flex-row">
          <Navegacion sesion={sesion} />
          <main className="flex min-w-0 flex-1 flex-col px-4 pb-10 lg:py-6 lg:pr-6 lg:pl-0">
            {children}
          </main>
        </div>
      </ProveedorPestanas>
    </ProveedorSesion>
  );
}
