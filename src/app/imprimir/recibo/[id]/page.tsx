import { notFound, redirect } from "next/navigation";
import { sesionActual } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moneda, fecha } from "@/lib/formato";
import { ETIQUETA_METODO_PAGO } from "@/lib/pagos";
import BotonImprimir from "./BotonImprimir";

export default async function PaginaRecibo({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");

  const { id } = await params;
  const pago = await prisma.pago.findUnique({
    where: { id },
    include: {
      prestamo: { include: { cliente: true } },
      usuario: { select: { nombre: true } },
      aplicaciones: { include: { cuota: { select: { numero: true } } }, orderBy: { cuota: { numero: "asc" } } },
    },
  });
  if (!pago) notFound();

  const config = await prisma.configuracion.findUnique({ where: { id: "default" } });
  const simbolo = config?.simboloMoneda ?? "$";

  const totalMora = pago.aplicaciones.reduce((a, x) => a + Number(x.montoMora), 0);
  const totalInteres = pago.aplicaciones.reduce((a, x) => a + Number(x.montoInteres), 0);
  const totalCapital = pago.aplicaciones.reduce((a, x) => a + Number(x.montoCapital), 0);

  return (
    <div className="mx-auto max-w-md p-6 print:p-0">
      <div className="mb-5 flex justify-center print:hidden">
        <BotonImprimir />
      </div>

      <div className="rounded-3xl border border-neutral-200 bg-white p-7 print:rounded-none print:border-0">
        <div className="mb-6 text-center">
          <p className="text-lg font-bold">{config?.empresaNombre ?? "Mi empresa de cobro"}</p>
          {config?.empresaDireccion && (
            <p className="text-xs text-neutral-500">{config.empresaDireccion}</p>
          )}
          {config?.empresaTelefono && (
            <p className="text-xs text-neutral-500">{config.empresaTelefono}</p>
          )}
        </div>

        <div className="mb-5 border-y border-dashed border-neutral-300 py-3 text-center">
          <p className="text-sm text-neutral-500">Recibo de pago</p>
          <p className="text-xl font-bold">{pago.codigo}</p>
          {pago.anulado && (
            <p className="mt-1 text-sm font-semibold text-red-600">ANULADO</p>
          )}
        </div>

        <div className="mb-5 space-y-1.5 text-sm">
          <Fila etiqueta="Cliente" valor={pago.prestamo.cliente.nombre} />
          <Fila etiqueta="Cédula" valor={pago.prestamo.cliente.cedula} />
          <Fila etiqueta="Préstamo" valor={pago.prestamo.codigo} />
          <Fila etiqueta="Fecha de pago" valor={fecha(pago.fecha)} />
          <Fila etiqueta="Método" valor={ETIQUETA_METODO_PAGO[pago.metodo]} />
          <Fila etiqueta="Recibido por" valor={pago.usuario?.nombre ?? "—"} />
        </div>

        <div className="mb-5 space-y-1.5 border-t border-dashed border-neutral-300 pt-4 text-sm">
          {totalMora > 0 && <Fila etiqueta="Mora" valor={moneda(totalMora, simbolo)} />}
          <Fila etiqueta="Interés" valor={moneda(totalInteres, simbolo)} />
          <Fila etiqueta="Capital" valor={moneda(totalCapital, simbolo)} />
          <div className="flex justify-between border-t border-neutral-300 pt-2 text-base font-bold">
            <span>Total pagado</span>
            <span>{moneda(Number(pago.monto), simbolo)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-neutral-300 pt-4">
          <p className="mb-2 text-xs font-semibold text-neutral-500">Cuotas cubiertas</p>
          <ul className="space-y-1 text-xs text-neutral-600">
            {pago.aplicaciones.map((a) => (
              <li key={a.id} className="flex justify-between">
                <span>Cuota #{a.cuota.numero}</span>
                <span>{moneda(Number(a.montoMora) + Number(a.montoInteres) + Number(a.montoCapital), simbolo)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Gracias por su pago puntual
        </p>
      </div>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-500">{etiqueta}</span>
      <span className="font-medium">{valor}</span>
    </div>
  );
}
