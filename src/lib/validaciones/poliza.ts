import { z } from "zod";
import { FRECUENCIAS } from "./prestamo";

export const esquemaPoliza = z.object({
  clienteId: z.string().trim().min(1, "Selecciona un cliente"),
  montoCuota: z.coerce.number().positive("El monto debe ser mayor a cero").max(100_000_000),
  frecuencia: z.enum(FRECUENCIAS),
  fechaInicio: z.string().min(1, "Selecciona una fecha de inicio"),
  notas: z.string().trim().max(500).optional().or(z.literal("")),
});

export type DatosPoliza = z.infer<typeof esquemaPoliza>;

export const esquemaPagoSeguridad = z.object({
  polizaId: z.string().trim().min(1, "Selecciona una póliza"),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero").max(1_000_000_000),
  metodo: z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "OTRO"]).default("EFECTIVO"),
  fecha: z.string().optional(),
});
