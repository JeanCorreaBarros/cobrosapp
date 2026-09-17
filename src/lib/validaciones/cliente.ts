import { z } from "zod";

export const ESTADOS_CLIENTE = ["ACTIVO", "MOROSO", "LISTA_NEGRA", "INACTIVO"] as const;

export const esquemaCliente = z.object({
  nombre: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(120),
  cedula: z
    .string()
    .trim()
    .min(5, "La cédula/DNI debe tener al menos 5 caracteres")
    .max(30),
  telefono: z.string().trim().min(7, "Escribe un teléfono válido").max(20),
  telefonoAlt: z.string().trim().max(20).optional().or(z.literal("")),
  correo: z.string().trim().email("Correo inválido").optional().or(z.literal("")),
  direccion: z.string().trim().max(240).optional().or(z.literal("")),
  zonaId: z.string().trim().optional().or(z.literal("")),
  referencia1Nombre: z.string().trim().max(120).optional().or(z.literal("")),
  referencia1Telefono: z.string().trim().max(20).optional().or(z.literal("")),
  referencia2Nombre: z.string().trim().max(120).optional().or(z.literal("")),
  referencia2Telefono: z.string().trim().max(20).optional().or(z.literal("")),
  notas: z.string().trim().max(500).optional().or(z.literal("")),
  estado: z.enum(ESTADOS_CLIENTE).optional(),
});

export type DatosCliente = z.infer<typeof esquemaCliente>;
