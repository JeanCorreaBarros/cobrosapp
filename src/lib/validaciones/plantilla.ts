import { z } from "zod";
import { TIPOS_INTERES, FRECUENCIAS } from "./prestamo";

export const esquemaPlantilla = z.object({
  nombre: z.string().trim().min(2, "Escribe un nombre").max(80),
  montoCapital: z.coerce.number().positive("El monto debe ser mayor a cero").max(100_000_000),
  tasaInteres: z.coerce.number().min(0).max(1000),
  tipoInteres: z.enum(TIPOS_INTERES),
  frecuencia: z.enum(FRECUENCIAS),
  plazoCuotas: z.coerce.number().int().min(1).max(120),
});

export type DatosPlantilla = z.infer<typeof esquemaPlantilla>;
