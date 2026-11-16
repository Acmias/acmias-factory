/**
 * Rubro uñas (BRD 13). Usa la agenda genérica de la barbería y le suma el catálogo de diseños
 * y la elección de diseño que la clienta deja guardada en su cita.
 */

export type Patron = 'liso' | 'francesa' | 'degrade' | 'glitter' | 'marmol' | 'flores' | 'puntos' | 'lineas' | 'animal' | 'cromado';
export type Forma = 'almendra' | 'cuadrada' | 'coffin' | 'redonda' | 'stiletto';

/** Esmalte del catálogo del salón: los colores son datos de producto, no de la interfaz. */
export interface Esmalte {
  id: string;
  nombre: string;
  color: string;
}

export interface Diseno {
  id: string;
  nombre: string;
  /** Id de la manicurista que lo hizo, o 'equipo' si es del catálogo del salón. */
  autora: string;
  patron: Patron;
  forma: Forma;
  /** Ids de esmaltes, en orden: base, detalle, acento. */
  esmaltes: string[];
  /** Precio extra por nail art (0 si va incluido). */
  extra: number;
  /** Se muestra a las clientas al reservar. */
  visible: boolean;
  creado: string;
}

/** Lo que la clienta deja en la cita. Todo opcional: puede decidirlo en el local. */
export interface EleccionDiseno {
  disenoId?: string;
  /** Enlace de Pinterest (pin, tablero o búsqueda). */
  pinterest?: string;
  /** Captura del pin, achicada en el teléfono (data URL JPEG). */
  captura?: string;
  forma?: Forma;
  nota?: string;
}
