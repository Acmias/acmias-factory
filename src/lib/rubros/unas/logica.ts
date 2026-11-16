import type { EstadoAgenda, Turno } from '@/lib/rubros/barberia/tipos';
import { ESMALTES } from './datos-ejemplo';
import type { Diseno, EleccionDiseno, Esmalte, Forma, Patron } from './tipos';

export const NOMBRE_PATRON: Record<Patron, string> = {
  liso: 'Liso',
  francesa: 'Francesa',
  degrade: 'Degradé (baby boomer)',
  glitter: 'Glitter',
  marmol: 'Efecto mármol',
  flores: 'Flores a mano alzada',
  puntos: 'Lunares',
  lineas: 'Líneas finas',
  animal: 'Animal print',
  cromado: 'Efecto cromado',
};

export const NOMBRE_FORMA: Record<Forma, string> = {
  almendra: 'Almendra',
  cuadrada: 'Cuadrada',
  coffin: 'Coffin (bailarina)',
  redonda: 'Redonda',
  stiletto: 'Stiletto',
};

export const FORMAS = Object.keys(NOMBRE_FORMA) as Forma[];
export const PATRONES = Object.keys(NOMBRE_PATRON) as Patron[];
export const EQUIPO = 'equipo';

export const esmalte = (id: string): Esmalte | undefined => ESMALTES.find((x) => x.id === id);
export const disenoPorId = (e: EstadoAgenda, id?: string) => (id ? e.disenos?.find((d) => d.id === id) : undefined);
const primerNombre = (n: string) => n.split(' ')[0];

/** Quién lo hizo, en palabras: "de Sofía" o "del equipo". */
export function deQuien(e: EstadoAgenda, d: Pick<Diseno, 'autora'>) {
  if (d.autora === EQUIPO) return 'del equipo';
  const p = e.profesionales.find((x) => x.id === d.autora);
  return p ? `de ${primerNombre(p.nombre)}` : 'del equipo';
}

/** Trabajos de la manicurista que va a atender (los visibles, más nuevos primero). */
export function trabajosDe(e: EstadoAgenda, profId: string) {
  return (e.disenos ?? []).filter((d) => d.visible && d.autora === profId).sort((a, b) => b.creado.localeCompare(a.creado));
}

/** Lo que se hace en el equipo: el catálogo del salón y los trabajos de las demás. */
export function delEquipo(e: EstadoAgenda, profId: string) {
  return (e.disenos ?? []).filter((d) => d.visible && d.autora !== profId).sort((a, b) => Number(b.autora === EQUIPO) - Number(a.autora === EQUIPO) || b.creado.localeCompare(a.creado));
}

/**
 * Acepta pin.it y cualquier dominio de Pinterest (.com, .com.ar, .es…). Si la app compartió texto
 * junto con el enlace ("Mirá este pin… https://pin.it/…"), lo encuentra. Devuelve el enlace limpio o null.
 */
export function enlacePinterest(texto: string): string | null {
  const partes = texto.trim().split(/\s+/);
  const t = partes.find((x) => /(^|\/\/|\.)(pin\.it|pinterest\.)/i.test(x)) ?? partes[0] ?? '';
  if (!t) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const ok = host === 'pin.it' || /(^|\.)pinterest\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(host);
    if (!ok || (u.protocol !== 'https:' && u.protocol !== 'http:')) return null;
    u.protocol = 'https:';
    return u.toString().slice(0, 300);
  } catch {
    return null;
  }
}

/** Valida y limpia la elección antes de guardarla en la cita. */
export function limpiarEleccion(e: EstadoAgenda, x: EleccionDiseno): { error: string } | { eleccion: EleccionDiseno } {
  const out: EleccionDiseno = {};
  if (x.disenoId) {
    const d = disenoPorId(e, x.disenoId);
    if (!d) return { error: 'Ese diseño ya no está en el catálogo. Elegí otro.' };
    out.disenoId = d.id;
  }
  if (x.pinterest?.trim()) {
    const u = enlacePinterest(x.pinterest);
    if (!u) return { error: 'Ese enlace no es de Pinterest. Copiá el enlace del pin desde "Compartir" y pegalo acá.' };
    out.pinterest = u;
  }
  if (x.captura) {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(x.captura) || x.captura.length > 400_000) return { error: 'La captura es muy pesada o no es una imagen. Probá con otra.' };
    out.captura = x.captura;
  }
  if (x.forma && x.forma in NOMBRE_FORMA) out.forma = x.forma;
  const nota = x.nota?.trim().slice(0, 280);
  if (nota) out.nota = nota;
  return { eleccion: out };
}

export const eligioAlgo = (x?: EleccionDiseno) => !!x && !!(x.disenoId || x.pinterest || x.captura || x.nota || x.forma);

/** Forma final: la que pidió la clienta, o la del diseño elegido. */
export function formaDe(e: EstadoAgenda, x?: EleccionDiseno): Forma | undefined {
  return x?.forma ?? disenoPorId(e, x?.disenoId)?.forma;
}

/** Esmaltes que hay que tener a mano para la cita. */
export function esmaltesPara(e: EstadoAgenda, x?: EleccionDiseno): Esmalte[] {
  const d = disenoPorId(e, x?.disenoId);
  return (d?.esmaltes ?? []).map(esmalte).filter((v): v is Esmalte => !!v);
}

export function extraDe(e: EstadoAgenda, x?: EleccionDiseno) {
  return disenoPorId(e, x?.disenoId)?.extra ?? 0;
}

/** Precio del servicio más el nail art del diseño elegido. */
export function precioCita(e: EstadoAgenda, t: Pick<Turno, 'servicioId' | 'diseno'>) {
  const s = e.servicios.find((x) => x.id === t.servicioId);
  return (s?.precio ?? 0) + extraDe(e, t.diseno);
}

/** Una línea para WhatsApp y para la agenda: "Francesa almendra (de Sofía) + idea de Pinterest". */
export function resumenDiseno(e: EstadoAgenda, x?: EleccionDiseno) {
  if (!eligioAlgo(x)) return 'Lo decide en el local';
  const d = disenoPorId(e, x!.disenoId);
  const partes: string[] = [];
  if (d) partes.push(`${d.nombre} (${deQuien(e, d)})`);
  if (x!.pinterest || x!.captura) partes.push(d ? 'idea de Pinterest' : 'Idea de Pinterest');
  if (!partes.length && x!.forma) partes.push(`Forma ${NOMBRE_FORMA[x!.forma].toLowerCase()}`);
  if (!partes.length) partes.push('Con indicaciones');
  return partes.join(' + ');
}

/** La cita anterior de la clienta con diseño (para que la manicurista sepa qué se hizo la última vez). */
export function ultimaCita(e: EstadoAgenda, clienteId: string, antesDe: string) {
  return e.turnos
    .filter((t) => t.clienteId === clienteId && t.inicio < antesDe && t.estado === 'atendido')
    .sort((a, b) => b.inicio.localeCompare(a.inicio))[0];
}

/** Diseños más elegidos en las últimas 4 semanas. */
export function masElegidos(e: EstadoAgenda, ahora = Date.now()) {
  const desde = new Date(ahora - 28 * 86_400_000).toISOString();
  const n = new Map<string, number>();
  let pinterest = 0;
  for (const t of e.turnos) {
    if (t.inicio < desde || t.estado === 'cancelado' || !t.diseno) continue;
    if (t.diseno.disenoId) n.set(t.diseno.disenoId, (n.get(t.diseno.disenoId) ?? 0) + 1);
    if (t.diseno.pinterest || t.diseno.captura) pinterest++;
  }
  const lista = [...n.entries()].map(([id, c]) => ({ d: disenoPorId(e, id), n: c })).filter((x): x is { d: Diseno; n: number } => !!x.d).sort((a, b) => b.n - a.n);
  return { lista, pinterest };
}

/** Cambia el diseño de una cita (lo usa la clienta desde su enlace o el salón desde la agenda). */
export function cambiarDiseno(e: EstadoAgenda, turnoId: string, x: EleccionDiseno): { error: string } | { estado: EstadoAgenda } {
  const t = e.turnos.find((y) => y.id === turnoId);
  if (!t) return { error: 'No encontramos esa cita.' };
  if (t.estado === 'cancelado' || t.estado === 'atendido' || t.estado === 'ausente') return { error: 'Esa cita ya no se puede cambiar.' };
  const r = limpiarEleccion(e, x);
  if ('error' in r) return r;
  return { estado: { ...e, turnos: e.turnos.map((y) => (y.id === turnoId ? { ...y, diseno: r.eleccion } : y)) } };
}

export interface NuevoDiseno {
  nombre: string;
  autora: string;
  patron: Patron;
  forma: Forma;
  esmaltes: string[];
  extra: number;
}

export function agregarDiseno(e: EstadoAgenda, n: NuevoDiseno, fecha = new Date()): { error: string } | { estado: EstadoAgenda; diseno: Diseno } {
  const nombre = n.nombre.trim().slice(0, 50);
  if (nombre.length < 3) return { error: 'Poné un nombre al diseño (por ejemplo, "Francesa con brillo").' };
  if (n.autora !== EQUIPO && !e.profesionales.some((p) => p.id === n.autora)) return { error: 'Elegí quién lo hizo.' };
  if (!(n.patron in NOMBRE_PATRON) || !(n.forma in NOMBRE_FORMA)) return { error: 'Elegí la forma y el estilo.' };
  const esmaltes = n.esmaltes.filter((id, i, a) => esmalte(id) && a.indexOf(id) === i).slice(0, 3);
  if (!esmaltes.length) return { error: 'Elegí al menos un esmalte.' };
  if ((e.disenos ?? []).some((d) => d.nombre.toLowerCase() === nombre.toLowerCase() && d.autora === n.autora)) return { error: 'Ya hay un diseño con ese nombre.' };
  const diseno: Diseno = { id: `d-${Math.random().toString(36).slice(2, 9)}`, nombre, autora: n.autora, patron: n.patron, forma: n.forma, esmaltes, extra: Math.max(0, Math.round(n.extra) || 0), visible: true, creado: fecha.toISOString() };
  return { estado: { ...e, disenos: [...(e.disenos ?? []), diseno] }, diseno };
}

export function alternarVisible(e: EstadoAgenda, id: string): EstadoAgenda {
  return { ...e, disenos: (e.disenos ?? []).map((d) => (d.id === id ? { ...d, visible: !d.visible } : d)) };
}

/** Quita el diseño del catálogo. Las citas que ya lo eligieron no pierden la referencia: se ocultan, no se borran. */
export function quitarDiseno(e: EstadoAgenda, id: string): EstadoAgenda {
  const usado = e.turnos.some((t) => t.diseno?.disenoId === id);
  if (usado) return { ...e, disenos: (e.disenos ?? []).map((d) => (d.id === id ? { ...d, visible: false } : d)) };
  return { ...e, disenos: (e.disenos ?? []).filter((d) => d.id !== id) };
}
