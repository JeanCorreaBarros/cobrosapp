export type Zona = { id: string; nombre: string };

export type Cliente = {
  id: string;
  codigo: string;
  nombre: string;
  cedula: string;
  telefono: string;
  telefonoAlt: string | null;
  correo: string | null;
  direccion: string | null;
  fotoUrl: string | null;
  referencia1Nombre: string | null;
  referencia1Telefono: string | null;
  referencia2Nombre: string | null;
  referencia2Telefono: string | null;
  notas: string | null;
  estado: "ACTIVO" | "MOROSO" | "LISTA_NEGRA" | "INACTIVO";
  zonaId: string | null;
  zona: { nombre: string } | { id: string; nombre: string } | null;
  creadoEn: string;
  actualizadoEn: string;
};

export type Cuota = {
  id: string;
  numero: number;
  fechaVencimiento: string;
  capital: string;
  interes: string;
  montoCuota: string;
  saldoCapital: string;
  montoPagado: string;
};

export type Prestamo = {
  id: string;
  codigo: string;
  clienteId: string;
  cliente: { id: string; nombre: string; codigo: string; telefono: string } | { nombre: string };
  montoCapital: string;
  tasaInteres: string;
  tipoInteres: "SIMPLE" | "SOBRE_SALDO";
  frecuencia: "DIARIO" | "SEMANAL" | "QUINCENAL" | "MENSUAL";
  plazoCuotas: number;
  fechaInicio: string;
  montoTotal: string;
  montoCuota: string;
  estado: "ACTIVO" | "ATRASADO" | "PAGADO" | "CANCELADO" | "INCOBRABLE";
  notas: string | null;
  cuotas?: Cuota[];
  creadoEn: string;
  actualizadoEn: string;
};

export type AplicacionPago = {
  id: string;
  montoMora: string;
  montoInteres: string;
  montoCapital: string;
  cuota: { numero: number };
};

export type Pago = {
  id: string;
  codigo: string;
  prestamoId: string;
  monto: string;
  metodo: "EFECTIVO" | "TRANSFERENCIA" | "TARJETA" | "OTRO";
  fecha: string;
  anulado: boolean;
  motivoAnulacion: string | null;
  usuario: { nombre: string } | null;
  prestamo?: {
    codigo: string;
    tipoInteres?: "SIMPLE" | "SOBRE_SALDO";
    frecuencia?: "DIARIO" | "SEMANAL" | "QUINCENAL" | "MENSUAL";
    cliente: { id?: string; nombre: string; codigo?: string; cedula?: string; telefono?: string };
  };
  aplicaciones?: AplicacionPago[];
  creadoEn: string;
};
