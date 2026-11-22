/**
 * Módulo clínico de la demo de consultorio (BRD 15 · DEMO 15).
 * Se guarda en una clave aparte de la agenda (`acmias:demo:{slug}:clinico`) para que la agenda
 * siga siendo solo administrativa. Todo es ficticio y se borra con "Reiniciar demo".
 */

export type Variante = 'clinica' | 'procedimientos';
export type Rol = 'medico' | 'secretaria';

export interface FichaClinica {
  pacienteId: string;
  alergias: string[];
  antecedentes: string;
  medicacion: string;
  /** Condición crónica que pide controles periódicos (lo carga el médico). */
  cronico?: string;
  /** Fecha (YYYY-MM-DD) del próximo control que indicó el médico. */
  proximoControl?: string;
  /** Pediatría: fecha de nacimiento y vacunas que la médica registró como pendientes. */
  nacimiento?: string;
  vacunasPendientes?: string[];
}

/** Preconsulta que completa el paciente desde el portal antes del turno (F3). */
export interface Preconsulta {
  id: string;
  turnoId: string;
  pacienteId: string;
  fecha: string;
  motivo: string;
  medicacion: string;
  alergias: string;
  antecedentes: string;
  archivos: string[];
  firma: { nombre: string; fecha: string };
}

/** Check-in en recepción (F4): cuándo llegó y cuándo pasó a consulta. */
export interface Llegada {
  turnoId: string;
  fecha: string;
  atendido?: string;
}

export type MedioPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'link';

export interface Cobro {
  id: string;
  fecha: string;
  concepto: string;
  monto: number;
  medio: MedioPago;
  origen: 'consulta' | 'presupuesto' | 'alquiler' | 'manual';
  profId?: string;
  pacienteId?: string;
  turnoId?: string;
}

export interface CierreCaja {
  dia: string;
  fecha: string;
  total: number;
  quien: string;
}

export interface Espacio {
  id: string;
  nombre: string;
  precioHora: number;
}

/** Alquiler de un consultorio por hora a un colega (F11). */
export interface Alquiler {
  id: string;
  espacioId: string;
  colega: string;
  especialidad: string;
  inicio: string;
  fin: string;
  monto: number;
  cobrado: boolean;
}

export interface Insumo {
  id: string;
  nombre: string;
  unidad: string;
  stock: number;
  minimo: number;
  costo: number;
}

export interface Agregado {
  fecha: string;
  texto: string;
}

export interface Evolucion {
  id: string;
  pacienteId: string;
  profId: string;
  turnoId?: string;
  fecha: string;
  motivo: string;
  texto: string;
  diagnostico?: string;
  /** Las evoluciones firmadas no se editan: las correcciones van como agregados con fecha. */
  agregados: Agregado[];
}

export type TipoDocumento = 'receta' | 'certificado' | 'orden' | 'indicacion';

export interface Documento {
  id: string;
  /** Código único de demostración (en producción: CUIR de ReNaPDiS). */
  codigo: string;
  tipo: TipoDocumento;
  pacienteId: string;
  profId: string;
  fecha: string;
  texto: string;
  evolucionId?: string;
}

export interface Valor {
  nombre: string;
  valor: number;
  unidad: string;
  /** Rango que configuró el médico; fuera de él aparece en la lista de trabajo. */
  rango: [number, number];
}

export interface Resultado {
  id: string;
  pacienteId: string;
  profId: string;
  fecha: string;
  estudio: string;
  origen: 'paciente' | 'laboratorio';
  estado: 'pendiente' | 'revisado';
  comentario?: string;
  valores: Valor[];
}

export interface ItemPresupuesto {
  concepto: string;
  monto: number;
}

export type EstadoPresupuesto = 'borrador' | 'enviado' | 'visto' | 'consulta' | 'aceptado' | 'rechazado' | 'vencido';
export type PlanPago = 'contado' | 'sena' | 'cuotas';

export interface PasoChecklist {
  id: string;
  texto: string;
  hecho: boolean;
}

export interface Control {
  dias: number;
  fecha: string;
  hecho: boolean;
}

export interface Presupuesto {
  id: string;
  codigo: string;
  pacienteId: string;
  profId: string;
  procedimiento: string;
  /** Servicio de la agenda con el que se reserva el procedimiento. */
  servicioId: string;
  items: ItemPresupuesto[];
  incluye: string;
  noIncluye: string;
  creado: string;
  validoHasta: string;
  version: number;
  estado: EstadoPresupuesto;
  enviado?: string;
  visto?: string;
  consulta?: string;
  plan?: PlanPago;
  firma?: { nombre: string; fecha: string };
  sena?: 'pendiente' | 'pagada';
  motivoRechazo?: string;
  turnoId?: string;
  realizado?: string;
  /** Insumos que se descontaron del stock al registrarlo realizado. */
  insumosUsados?: { insumoId: string; cantidad: number }[];
  checklist: PasoChecklist[];
  controles: Control[];
}

export interface Foto {
  id: string;
  pacienteId: string;
  fecha: string;
  zona: string;
  momento: 'antes' | 'control' | 'despues';
  /** Ilustración genérica (nunca fotos de personas en la demo). */
  dibujo: number;
}

export interface PermisosImagen {
  historia: boolean;
  academico: boolean;
  publicidadSinRostro: boolean;
  publicidadConRostro: boolean;
  firmado: string;
}

export interface Acceso {
  fecha: string;
  quien: string;
  que: string;
}

export type DestinoMensaje = 'portal' | 'turno' | 'presupuesto' | 'reserva';

export interface Mensaje {
  id: string;
  pacienteId: string;
  fecha: string;
  texto: string;
  /** Respuesta escrita por el paciente (para la conversación con la secretaria virtual). */
  delPaciente?: boolean;
  boton?: { texto: string; destino: DestinoMensaje; ref?: string };
}

export interface Compartido {
  id: string;
  pacienteId: string;
  alcance: 'todo' | 'anio' | 'resultados';
  creado: string;
  vence: string;
  codigo: string;
  revocado?: boolean;
}

export interface Invitacion {
  fecha: string;
  lista: string;
  pacientes: string[];
}

export interface EstadoClinico {
  version: number;
  variante: Variante;
  rol: Rol;
  /** Profesional con el que se ve el panel en el rol médico. */
  medicoId: string;
  pin: string;
  fichas: FichaClinica[];
  evoluciones: Evolucion[];
  documentos: Documento[];
  resultados: Resultado[];
  presupuestos: Presupuesto[];
  fotos: Foto[];
  permisos: Record<string, PermisosImagen>;
  accesos: Acceso[];
  mensajes: Mensaje[];
  compartidos: Compartido[];
  /** Titular → pacientes a cargo (grupo familiar). */
  familias: Record<string, string[]>;
  invitaciones: Invitacion[];
  preconsultas: Preconsulta[];
  llegadas: Llegada[];
  cobros: Cobro[];
  cierres: CierreCaja[];
  /** Porcentaje que se queda el consultorio de lo que cobra cada profesional. */
  porcConsultorio: number;
  espacios: Espacio[];
  alquileres: Alquiler[];
  insumos: Insumo[];
}
