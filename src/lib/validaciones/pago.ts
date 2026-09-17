import { z } from "zod";

export const METODOS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "OTRO"] as const;

export const esquemaPago = z.object({
  prestamoId: z.string().trim().min(1, "Selecciona un préstamo"),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero").max(1_000_000_000),
  metodo: z.enum(METODOS_PAGO).default("EFECTIVO"),
  fecha: z.string().optional(),
});

export type DatosPago = z.infer<typeof esquemaPago>;

export const esquemaAnulacion = z.object({
  motivo: z.string().trim().min(3, "Escribe un motivo para anular el pago").max(300),
});
