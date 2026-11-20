/**
 * Administración de consorcios (BRD 14). Una administración con N edificios.
 * Pensado para Provincia de Buenos Aires (Ley 14.701): la liquidación y el recibo llevan los datos que pide la ley.
 */

export type Rubro = 'personal' | 'servicios' | 'abonos' | 'reparaciones' | 'limpieza' | 'seguros' | 'administracion' | 'bancarios' | 'otros';
export type TipoGasto = 'ordinario' | 'extraordinario';
export type MedioPago = 'mercadopago' | 'transferencia' | 'efectivo';

export interface Administracion {
  nombre: string;
  responsable: string;
  cuit: string;
  matricula: string;
  domicilio: string;
  telefono: string;
}

export interface EspacioComun {
  nombre: string;
  precio: number;
  turnos: string[];
  reglas: string;
}

export interface Edificio {
  id: string;
  nombre: string;
  direccion: string;
  localidad: string;
  cuit: string;
  claveSindical: string;
  /** Día del mes en que vencen las expensas. */
  vencimientoDia: number;
  /** Interés por mora mensual (%), fijado por la asamblea. */
  interesMensual: number;
  /** Fondo de reserva: porcentaje sobre las ordinarias. */
  fondoReservaPct: number;
  honorarios: number;
  banco: { entidad: string; cbu: string };
  /** Cuenta de Mercado Pago del consorcio (a su nombre). En la demo, la vinculación es simulada. */
  mp: { vinculada: boolean; cuenta: string; titular: string };
  seguro: { compania: string; poliza: string; vence: string; cuota: number };
  espacio?: EspacioComun;
}

export interface Unidad {
  id: string;
  edificioId: string;
  /** "3° B", "PB A"… */
  nombre: string;
  /** Porcentual del reglamento (suma 100 por edificio). */
  coef: number;
  propietario: string;
  whatsapp: string;
  /** Código para entrar a "Mi expensa" (va en el enlace del WhatsApp). */
  codigo: string;
}

export interface Personal {
  id: string;
  edificioId: string;
  nombre: string;
  rol: string;
  categoria?: string;
  horario: string;
  /** Sueldo neto mensual (0 si es un servicio tercerizado con factura). */
  sueldo: number;
  /** Aportes, contribuciones y cuota sindical. */
  cargas: number;
  tercerizado: boolean;
  whatsapp?: string;
}

export interface Gasto {
  id: string;
  edificioId: string;
  /** Mes de los gastos (YYYY-MM). */
  periodo: string;
  rubro: Rubro;
  detalle: string;
  proveedor: string;
  cuit?: string;
  importe: number;
  tipo: TipoGasto;
  fecha: string;
  /** Foto o PDF de la factura (data URL), o 'ejemplo' en la demo. */
  comprobante?: string;
  obraId?: string;
}

export interface Presupuesto {
  id: string;
  proveedor: string;
  cuit: string;
  materiales: number;
  manoObra: number;
  plazoDias: number;
  garantiaMeses: number;
  validezDias: number;
  seguros: boolean;
  elegido?: boolean;
}

export interface Evidencia {
  id: string;
  etapa: 'antes' | 'durante' | 'despues';
  fecha: string;
  nota: string;
  /** Foto subida (data URL). En la demo, sin foto se dibuja una ilustración. */
  foto?: string;
}

export interface Obra {
  id: string;
  edificioId: string;
  titulo: string;
  descripcion: string;
  estado: 'presupuestos' | 'aprobada' | 'en-curso' | 'terminada';
  presupuestos: Presupuesto[];
  evidencias: Evidencia[];
  /** En cuántas expensas se cobra como extraordinaria. */
  cuotas: number;
  aprobadaPor?: string;
  creada: string;
}

export interface Liquidacion {
  id: string;
  edificioId: string;
  periodo: string;
  numero: number;
  cerrada: string;
  ordinarias: number;
  extraordinarias: number;
  fondo: number;
  porRubro: Partial<Record<Rubro, number>>;
}

/** Lo que se le cobra a una unidad en una liquidación (sin el saldo anterior, que se calcula). */
export interface Expensa {
  id: string;
  unidadId: string;
  edificioId: string;
  periodo: string;
  liquidacionId: string;
  saldoAnterior: number;
  interes: number;
  ordinaria: number;
  extraordinaria: number;
  fondo: number;
  /** Cargos del espacio común que se suman a esta expensa. */
  otros: number;
  vence: string;
  numero: number;
}

export interface Pago {
  id: string;
  unidadId: string;
  importe: number;
  medio: MedioPago;
  fecha: string;
  numero: number;
  estado: 'acreditado' | 'a-confirmar';
  /** Pago de Mercado Pago (en la demo, simulado). */
  operacion?: string;
  comprobante?: string;
}

export interface Aviso {
  id: string;
  unidadId: string;
  tipo: 'expensa' | 'recordatorio' | 'vencimiento' | 'deuda' | 'recibo' | 'comunicado' | 'reserva';
  fecha: string;
  texto: string;
}

export interface Comunicado {
  id: string;
  edificioId: string;
  titulo: string;
  texto: string;
  fecha: string;
  leidos: string[];
}

export interface Reclamo {
  id: string;
  edificioId: string;
  unidadId?: string;
  lugar: string;
  texto: string;
  fecha: string;
  estado: 'nuevo' | 'asignado' | 'resuelto';
  asignadoA?: string;
  resolucion?: string;
  resuelto?: string;
}

export interface Reserva {
  id: string;
  edificioId: string;
  unidadId: string;
  /** Día (YYYY-MM-DD). */
  dia: string;
  turno: string;
  precio: number;
  cobro: 'expensa' | 'mercadopago';
  estado: 'confirmada' | 'cancelada';
  /** Si se cargó a una expensa, en cuál período. */
  cargadaEn?: string;
  creada: string;
}

export interface Cobranza {
  activa: boolean;
  diasAntes: number;
  diasDespues: number[];
}

export interface EstadoConsorcio {
  version: number;
  rubro: 'consorcio';
  administracion: Administracion;
  edificios: Edificio[];
  unidades: Unidad[];
  personal: Personal[];
  gastos: Gasto[];
  obras: Obra[];
  liquidaciones: Liquidacion[];
  expensas: Expensa[];
  pagos: Pago[];
  avisos: Aviso[];
  comunicados: Comunicado[];
  reclamos: Reclamo[];
  reservas: Reserva[];
  cobranza: Cobranza;
  ultimoRecibo: number;
  ultimoPago: number;
}
