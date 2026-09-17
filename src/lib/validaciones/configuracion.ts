import { z } from "zod";
import { TIPOS_INTERES, FRECUENCIAS } from "./prestamo";

export const esquemaConfiguracion = z.object({
  empresaNombre: z.string().trim().min(2).max(120),
  empresaRnc: z.string().trim().max(40).optional().or(z.literal("")),
  empresaTelefono: z.string().trim().max(30).optional().or(z.literal("")),
  empresaDireccion: z.string().trim().max(200).optional().or(z.literal("")),
  moneda: z.string().trim().min(2).max(10),
  simboloMoneda: z.string().trim().min(1).max(10),
  zonaHoraria: z.string().trim().min(2).max(60),
  tasaPorDefecto: z.coerce.number().min(0).max(1000),
  frecuenciaDefecto: z.enum(FRECUENCIAS),
  tipoInteresDefecto: z.enum(TIPOS_INTERES),
  moraPorcentaje: z.coerce.number().min(0).max(100),
});

export type DatosConfiguracion = z.infer<typeof esquemaConfiguracion>;

export const esquemaUsuario = z.object({
  usuario: z.string().trim().min(3).max(40),
  nombre: z.string().trim().min(3).max(120),
  password: z.string().min(6).max(100).optional(),
  rol: z.enum(["ADMIN", "COBRADOR", "CONSULTA"]),
  zonaId: z.string().trim().optional().or(z.literal("")),
  activo: z.boolean().optional(),
});

export type DatosUsuario = z.infer<typeof esquemaUsuario>;

export const esquemaZona = z.object({
  nombre: z.string().trim().min(2).max(60),
  descripcion: z.string().trim().max(200).optional().or(z.literal("")),
});
