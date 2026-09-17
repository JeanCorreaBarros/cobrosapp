import { z } from "zod";

export const TIPOS_INTERES = ["SIMPLE", "SOBRE_SALDO"] as const;
export const FRECUENCIAS = ["DIARIO", "SEMANAL", "QUINCENAL", "MENSUAL"] as const;

export const esquemaPrestamo = z.object({
  clienteId: z.string().trim().min(1, "Selecciona un cliente"),
  montoCapital: z.coerce.number().positive("El monto debe ser mayor a cero").max(100_000_000),
  tasaInteres: z.coerce.number().min(0, "La tasa no puede ser negativa").max(1000),
  tipoInteres: z.enum(TIPOS_INTERES),
  frecuencia: z.enum(FRECUENCIAS),
  plazoCuotas: z.coerce.number().int().min(1, "Debe haber al menos 1 cuota").max(120),
  fechaInicio: z.string().min(1, "Selecciona una fecha de inicio"),
  notas: z.string().trim().max(500).optional().or(z.literal("")),
});

export type DatosPrestamo = z.infer<typeof esquemaPrestamo>;
