/**
 * Rubro uñas (BRD 13). Usa la agenda genérica de la barbería y le suma:
 * - un catálogo para mirar en tres carpetas (del salón, inspiraciones, tendencias);
 * - una lista de diseños adicionales con precio, que la dueña activa si quiere;
 * - opiniones de clientas con estrellas;
 * - la seña por Mercado Pago (u otro medio) y el comprobante por WhatsApp.
 */

export type Patron = 'liso' | 'francesa' | 'degrade' | 'glitter' | 'marmol' | 'flores' | 'puntos' | 'lineas' | 'animal' | 'cromado';
export type Forma = 'almendra' | 'cuadrada' | 'coffin' | 'redonda' | 'stiletto';
export type Carpeta = 'salon' | 'inspiracion' | 'tendencia';

/** Esmalte del catálogo del salón: los colores son datos de producto, no de la interfaz. */
export interface Esmalte {
  id: string;
  nombre: string;
  color: string;
}

/** Una foto del catálogo. En la demo se dibuja (SVG); en la real, la dueña sube la foto. */
export interface Diseno {
  id: string;
  nombre: string;
  carpeta: Carpeta;
  /** Solo en "Diseños del salón": id de la manicurista que lo hizo, o 'equipo'. */
  autora?: string;
  patron: Patron;
  forma: Forma;
  /** Ids de esmaltes, en orden: base, detalle, acento. */
  esmaltes: string[];
  /** Foto subida por la dueña (data URL JPEG achicada). Si no hay, se dibuja la ilustración. */
  foto?: string;
  /** Inspiraciones: enlace al pin original (la foto se muestra solo si es propia o tiene permiso). */
  pin?: string;
  visible: boolean;
  creado: string;
}

/** Lo que la clienta deja en la cita. Todo opcional. */
export interface EleccionDiseno {
  /** Foto del catálogo que marcó como referencia. */
  disenoId?: string;
  nota?: string;
  /** Campos de la primera versión (se siguen mostrando si una cita los trae). */
  pinterest?: string;
  captura?: string;
  forma?: Forma;
}

/** Diseño adicional de la lista de precios (muñequitos, princesita, strass…). */
export interface Adicional {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  activo: boolean;
}

export interface Opinion {
  id: string;
  nombre: string;
  estrellas: 1 | 2 | 3 | 4 | 5;
  texto: string;
  servicioId?: string;
  profId?: string;
  /** Token del turno que la originó (una opinión por cita). */
  turnoToken?: string;
  fecha: string;
  visible: boolean;
  ejemplo?: boolean;
}

/** Cómo cobra el salón la seña. Sin pasarela: alias o enlace de pago y comprobante por WhatsApp. */
export interface CobroSalon {
  /** Nombre del medio: "Mercado Pago", "Pago Móvil", "Transferencia"… */
  medio: string;
  alias: string;
  titular: string;
  /** Enlace de pago del medio (opcional), por ejemplo un link de Mercado Pago. */
  enlace?: string;
  /** Porcentaje del total que se pide de seña (0 = sin seña). */
  senaPct: number;
  /** Si la dueña quiere mostrar la lista de diseños adicionales al reservar. */
  usarAdicionales: boolean;
}

export type FormaPago = 'efectivo' | 'medio';

export interface PagoTurno {
  /** Cómo paga el resto en el local. */
  forma: FormaPago;
  sena: number;
  /** pendiente → avisada (tocó "mandar comprobante") → confirmada (el salón la vio). */
  estadoSena: 'sin-sena' | 'pendiente' | 'avisada' | 'confirmada';
}
