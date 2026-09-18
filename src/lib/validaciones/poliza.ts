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

export const esquemaEdicionPoliza = z.object({
  montoCuota: z.coerce.number().positive("El monto debe ser mayor a cero").max(100_000_000).optional(),
  frecuencia: z.enum(FRECUENCIAS).optional(),
  fechaInicio: z.string().min(1).optional(),
  notas: z.string().trim().max(500).optional().or(z.literal("")),
  estado: z.enum(["CANCELADA", "ACTIVA"]).optional(),
});

export const esquemaEliminacionPoliza = z.object({
  motivo: z.string().trim().min(3, "Escribe un motivo de al menos 3 caracteres").max(500),
});

export const esquemaPagoSeguridad = z.object({
  polizaId: z.string().trim().min(1, "Selecciona una póliza"),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero").max(1_000_000_000),
  metodo: z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "OTRO"]).default("EFECTIVO"),
  fecha: z.string().optional(),
});
