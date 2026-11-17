import type { EstadoAgenda, Turno } from '@/lib/rubros/barberia/tipos';
import { formatoPrecio } from '@/lib/utiles';
import { ESMALTES } from './datos-ejemplo';
import type { Adicional, Carpeta, CobroSalon, Diseno, EleccionDiseno, Esmalte, Forma, FormaPago, Opinion, Patron, PagoTurno } from './tipos';

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

export const NOMBRE_CARPETA: Record<Carpeta, string> = {
  salon: 'Diseños del salón',
  inspiracion: 'Inspiraciones',
  tendencia: 'Tendencias 2027',
};
export const AYUDA_CARPETA: Record<Carpeta, string> = {
  salon: 'Trabajos hechos por nosotras.',
  inspiracion: 'Ideas para inspirarte, tipo Pinterest.',
  tendencia: 'Diseños y colores de la temporada.',
};

export const FORMAS = Object.keys(NOMBRE_FORMA) as Forma[];
export const PATRONES = Object.keys(NOMBRE_PATRON) as Patron[];
export const CARPETAS = Object.keys(NOMBRE_CARPETA) as Carpeta[];
export const EQUIPO = 'equipo';

export const COBRO_INICIAL: CobroSalon = { medio: 'Mercado Pago', alias: '', titular: '', senaPct: 30, usarAdicionales: true };

export const esmalte = (id: string): Esmalte | undefined => ESMALTES.find((x) => x.id === id);
export const disenoPorId = (e: EstadoAgenda, id?: string) => (id ? e.disenos?.find((d) => d.id === id) : undefined);
export const cobroDe = (e: EstadoAgenda): CobroSalon => e.cobro ?? COBRO_INICIAL;
const primerNombre = (n: string) => n.split(' ')[0];

/** Quién lo hizo, en palabras: "de Sofía", "del salón", o la carpeta. */
export function deQuien(e: EstadoAgenda, d: Pick<Diseno, 'autora' | 'carpeta'>) {
  if (d.carpeta !== 'salon') return NOMBRE_CARPETA[d.carpeta];
  const p = e.profesionales.find((x) => x.id === d.autora);
  return p ? `de ${primerNombre(p.nombre)}` : 'del salón';
}

/** Fotos visibles de una carpeta (más nuevas primero). */
export function carpeta(e: EstadoAgenda, c: Carpeta) {
  return (e.disenos ?? []).filter((d) => d.visible && d.carpeta === c).sort((a, b) => b.creado.localeCompare(a.creado));
}

// ---------------- Diseños adicionales (lista de precios opcional) ----------------

/** Los adicionales que ve la clienta: solo si la dueña activó la lista. */
export function adicionalesVisibles(e: EstadoAgenda) {
  return cobroDe(e).usarAdicionales ? (e.adicionales ?? []).filter((a) => a.activo) : [];
}

export function adicionalesDe(e: EstadoAgenda, ids?: string[]): Adicional[] {
  return (ids ?? []).map((id) => e.adicionales?.find((a) => a.id === id)).filter((a): a is Adicional => !!a);
}

export const sumaAdicionales = (e: EstadoAgenda, ids?: string[]) => adicionalesDe(e, ids).reduce((s, a) => s + a.precio, 0);

/** Precio total de la cita: servicio + adicionales. */
export function precioCita(e: EstadoAgenda, t: Pick<Turno, 'servicioId' | 'adicionales'>) {
  const s = e.servicios.find((x) => x.id === t.servicioId);
  return (s?.precio ?? 0) + sumaAdicionales(e, t.adicionales);
}

/** Seña: porcentaje del total, redondeado a la centena. */
export function montoSena(e: EstadoAgenda, total: number) {
  const pct = cobroDe(e).senaPct;
  if (!pct || total <= 0) return 0;
  return Math.max(100, Math.round((total * pct) / 100 / 100) * 100);
}

export function pagoInicial(e: EstadoAgenda, total: number, forma: FormaPago): PagoTurno {
  const sena = montoSena(e, total);
  return { forma, sena, estadoSena: sena ? 'pendiente' : 'sin-sena' };
}

export const ESTADO_SENA: Record<PagoTurno['estadoSena'], string> = {
  'sin-sena': 'Sin seña',
  pendiente: 'Seña pendiente',
  avisada: 'Mandó el comprobante',
  confirmada: 'Seña confirmada',
};

/** La clienta tocó "Mandar comprobante": queda avisada hasta que el salón lo confirme. */
export function avisarComprobante(e: EstadoAgenda, turnoId: string): EstadoAgenda {
  return { ...e, turnos: e.turnos.map((t) => (t.id === turnoId && t.pago?.estadoSena === 'pendiente' ? { ...t, pago: { ...t.pago, estadoSena: 'avisada' } } : t)) };
}

/** El salón vio el comprobante: la seña queda confirmada y la cita también. */
export function confirmarSena(e: EstadoAgenda, turnoId: string): EstadoAgenda {
  return {
    ...e,
    turnos: e.turnos.map((t) =>
      t.id === turnoId && t.pago && t.pago.estadoSena !== 'sin-sena' ? { ...t, pago: { ...t.pago, estadoSena: 'confirmada' }, estado: t.estado === 'reservado' ? 'confirmado' : t.estado } : t,
    ),
  };
}

// ---------------- Foto de referencia (opcional) ----------------

export function limpiarEleccion(e: EstadoAgenda, x: EleccionDiseno): { error: string } | { eleccion: EleccionDiseno } {
  const out: EleccionDiseno = {};
  if (x.disenoId) {
    if (!disenoPorId(e, x.disenoId)) return { error: 'Esa foto ya no está en el catálogo. Elegí otra o seguí sin foto.' };
    out.disenoId = x.disenoId;
  }
  const nota = x.nota?.trim().slice(0, 280);
  if (nota) out.nota = nota;
  return { eleccion: out };
}

export const eligioAlgo = (x?: EleccionDiseno) => !!x && !!(x.disenoId || x.pinterest || x.captura || x.nota || x.forma);

export function formaDe(e: EstadoAgenda, x?: EleccionDiseno): Forma | undefined {
  return x?.forma ?? disenoPorId(e, x?.disenoId)?.forma;
}

export function esmaltesPara(e: EstadoAgenda, x?: EleccionDiseno): Esmalte[] {
  const d = disenoPorId(e, x?.disenoId);
  if (!d || d.foto) return [];
  return d.esmaltes.map(esmalte).filter((v): v is Esmalte => !!v);
}

/** "Flores lilas (de Sofía)", "Cromado mocha (Tendencias 2027)" o "Sin foto". */
export function resumenDiseno(e: EstadoAgenda, x?: EleccionDiseno) {
  const d = disenoPorId(e, x?.disenoId);
  if (d) return `${d.nombre} (${deQuien(e, d)})`;
  if (x?.pinterest || x?.captura) return 'Idea de Pinterest';
  return 'Sin foto: lo charlan en el local';
}

export function resumenAdicionales(e: EstadoAgenda, ids?: string[]) {
  const a = adicionalesDe(e, ids);
  return a.length ? a.map((x) => x.nombre).join(', ') : 'Sin adicional';
}

/** Líneas para el WhatsApp de confirmación. */
export function lineasCita(e: EstadoAgenda, t: Turno, moneda: string) {
  const p = (v: number) => formatoPrecio(v, moneda);
  const out: string[] = [];
  const ad = adicionalesDe(e, t.adicionales);
  if (ad.length) out.push(`✨ Diseño: ${ad.map((a) => `${a.nombre} (${p(a.precio)})`).join(', ')}.`);
  if (t.diseno?.disenoId) out.push(`📷 Foto de referencia: ${resumenDiseno(e, t.diseno)}.`);
  out.push(`Total: ${p(precioCita(e, t))}.`);
  if (t.pago?.sena) {
    const c = cobroDe(e);
    out.push(t.pago.estadoSena === 'confirmada' ? `Seña de ${p(t.pago.sena)} recibida. ¡Gracias!` : `Seña: ${p(t.pago.sena)} por ${c.medio}${c.alias ? ` al alias ${c.alias}` : ''}. Mandanos el comprobante por acá.`);
  }
  return out;
}

/** El WhatsApp que manda la clienta al salón con el comprobante de la seña. */
export function mensajeComprobante(e: EstadoAgenda, t: Turno, nombre: string, negocio: string, moneda: string, cuando: string) {
  const p = (v: number) => formatoPrecio(v, moneda);
  const s = e.servicios.find((x) => x.id === t.servicioId);
  const pr = e.profesionales.find((x) => x.id === t.profId);
  const c = cobroDe(e);
  const lineas = [`Hola ${negocio}, soy ${nombre}. Reservé ${s?.nombre ?? 'un turno'} ${cuando}${pr ? ` con ${primerNombre(pr.nombre)}` : ''}.`];
  const ad = adicionalesDe(e, t.adicionales);
  if (ad.length) lineas.push(`Diseño adicional: ${ad.map((a) => a.nombre).join(', ')}.`);
  if (t.diseno?.disenoId) lineas.push(`Foto de referencia: ${resumenDiseno(e, t.diseno)}.`);
  lineas.push(`Total: ${p(precioCita(e, t))}.`);
  if (t.pago?.sena) lineas.push(`Te mando el comprobante de la seña de ${p(t.pago.sena)} por ${c.medio}. El resto lo pago ${t.pago.forma === 'efectivo' ? 'en efectivo' : `por ${c.medio}`}.`);
  else lineas.push(`Pago ${t.pago?.forma === 'medio' ? `por ${c.medio}` : 'en efectivo'} en el local.`);
  return lineas.join('\n');
}

// ---------------- Panel: catálogo ----------------

export interface NuevoDiseno {
  nombre: string;
  carpeta: Carpeta;
  autora?: string;
  patron: Patron;
  forma: Forma;
  esmaltes: string[];
  foto?: string;
  pin?: string;
}

/** Acepta pin.it y dominios de Pinterest; encuentra el enlace aunque venga con texto alrededor. */
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

export function agregarDiseno(e: EstadoAgenda, n: NuevoDiseno, fecha = new Date()): { error: string } | { estado: EstadoAgenda; diseno: Diseno } {
  const nombre = n.nombre.trim().slice(0, 50);
  if (nombre.length < 3) return { error: 'Poné un nombre (por ejemplo, "Francesa con brillo").' };
  if (!(n.carpeta in NOMBRE_CARPETA)) return { error: 'Elegí la carpeta.' };
  if (n.carpeta === 'salon' && n.autora && n.autora !== EQUIPO && !e.profesionales.some((p) => p.id === n.autora)) return { error: 'Elegí quién lo hizo.' };
  if (!(n.patron in NOMBRE_PATRON) || !(n.forma in NOMBRE_FORMA)) return { error: 'Elegí la forma y el estilo.' };
  const esmaltes = n.esmaltes.filter((id, i, a) => esmalte(id) && a.indexOf(id) === i).slice(0, 3);
  if (!esmaltes.length && !n.foto) return { error: 'Subí una foto o elegí al menos un esmalte para la ilustración.' };
  if (n.foto && (!/^data:image\/(jpeg|png|webp);base64,/.test(n.foto) || n.foto.length > 400_000)) return { error: 'La foto es muy pesada o no es una imagen. Probá con otra.' };
  let pin: string | undefined;
  if (n.pin?.trim()) {
    pin = enlacePinterest(n.pin) ?? undefined;
    if (!pin) return { error: 'Ese enlace no es de Pinterest.' };
  }
  if ((e.disenos ?? []).some((d) => d.nombre.toLowerCase() === nombre.toLowerCase() && d.carpeta === n.carpeta)) return { error: 'Ya hay una foto con ese nombre en esa carpeta.' };
  const diseno: Diseno = {
    id: `d-${Math.random().toString(36).slice(2, 9)}`,
    nombre,
    carpeta: n.carpeta,
    ...(n.carpeta === 'salon' ? { autora: n.autora || EQUIPO } : {}),
    patron: n.patron,
    forma: n.forma,
    esmaltes: esmaltes.length ? esmaltes : ['nude'],
    ...(n.foto ? { foto: n.foto } : {}),
    ...(pin ? { pin } : {}),
    visible: true,
    creado: fecha.toISOString(),
  };
  return { estado: { ...e, disenos: [...(e.disenos ?? []), diseno] }, diseno };
}

export function alternarVisible(e: EstadoAgenda, id: string): EstadoAgenda {
  return { ...e, disenos: (e.disenos ?? []).map((d) => (d.id === id ? { ...d, visible: !d.visible } : d)) };
}

/** Quita la foto. Si alguna cita la eligió, se oculta en vez de borrarse (la cita la conserva). */
export function quitarDiseno(e: EstadoAgenda, id: string): EstadoAgenda {
  const usado = e.turnos.some((t) => t.diseno?.disenoId === id);
  if (usado) return { ...e, disenos: (e.disenos ?? []).map((d) => (d.id === id ? { ...d, visible: false } : d)) };
  return { ...e, disenos: (e.disenos ?? []).filter((d) => d.id !== id) };
}

// ---------------- Panel: adicionales y cobro ----------------

export function agregarAdicional(e: EstadoAgenda, nombre: string, precio: number, descripcion = ''): { error: string } | { estado: EstadoAgenda } {
  const n = nombre.trim().slice(0, 40);
  if (n.length < 3) return { error: 'Poné el nombre del diseño adicional (por ejemplo, "Muñequitos").' };
  if (!(precio > 0)) return { error: 'Poné el precio del adicional.' };
  if ((e.adicionales ?? []).some((a) => a.nombre.toLowerCase() === n.toLowerCase())) return { error: 'Ese adicional ya está en la lista.' };
  const a: Adicional = { id: `a-${Math.random().toString(36).slice(2, 8)}`, nombre: n, descripcion: descripcion.trim().slice(0, 80), precio: Math.round(precio), activo: true };
  return { estado: { ...e, adicionales: [...(e.adicionales ?? []), a] } };
}

export function cambiarAdicional(e: EstadoAgenda, id: string, cambio: Partial<Pick<Adicional, 'precio' | 'activo'>>): EstadoAgenda {
  return { ...e, adicionales: (e.adicionales ?? []).map((a) => (a.id === id ? { ...a, ...cambio, precio: cambio.precio !== undefined ? Math.max(0, Math.round(cambio.precio)) : a.precio } : a)) };
}

export function quitarAdicional(e: EstadoAgenda, id: string): EstadoAgenda {
  return { ...e, adicionales: (e.adicionales ?? []).filter((a) => a.id !== id) };
}

/** Valida y guarda los datos de cobro. El enlace de pago tiene que ser https. */
export function guardarCobro(e: EstadoAgenda, c: CobroSalon): { error: string } | { estado: EstadoAgenda } {
  const medio = c.medio.trim().slice(0, 30) || 'Mercado Pago';
  const alias = c.alias.trim().slice(0, 60);
  const senaPct = Math.round(Number(c.senaPct));
  if (!(senaPct >= 0 && senaPct <= 100)) return { error: 'La seña tiene que ser un porcentaje entre 0 y 100.' };
  if (senaPct > 0 && !alias && !c.enlace?.trim()) return { error: `Para pedir seña, cargá el alias o el enlace de ${medio}.` };
  let enlace: string | undefined;
  if (c.enlace?.trim()) {
    try {
      const u = new URL(c.enlace.trim());
      if (u.protocol !== 'https:') throw new Error();
      enlace = u.toString();
    } catch {
      return { error: 'El enlace de pago tiene que empezar con https://' };
    }
  }
  return { estado: { ...e, cobro: { medio, alias, titular: c.titular.trim().slice(0, 60), ...(enlace ? { enlace } : {}), senaPct, usarAdicionales: !!c.usarAdicionales } } };
}

// ---------------- Opiniones ----------------

export function opinionesVisibles(e: EstadoAgenda) {
  return (e.opiniones ?? []).filter((o) => o.visible).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function promedio(ops: Opinion[]) {
  if (!ops.length) return 0;
  return Math.round((ops.reduce((s, o) => s + o.estrellas, 0) / ops.length) * 10) / 10;
}

/** La clienta opina desde el enlace de su cita, una sola vez y solo si ya fue atendida. */
export function dejarOpinion(e: EstadoAgenda, token: string, estrellas: number, texto: string, fecha = new Date()): { error: string } | { estado: EstadoAgenda } {
  const t = e.turnos.find((x) => x.token === token);
  if (!t) return { error: 'No encontramos esa cita.' };
  if (t.estado !== 'atendido') return { error: 'Vas a poder opinar después de tu cita.' };
  if ((e.opiniones ?? []).some((o) => o.turnoToken === token)) return { error: 'Ya dejaste tu opinión de esta cita. ¡Gracias!' };
  const n = Math.round(estrellas);
  if (n < 1 || n > 5) return { error: 'Elegí de 1 a 5 estrellas.' };
  const c = e.clientes.find((x) => x.id === t.clienteId);
  const [nom, ape] = (c?.nombre ?? 'Clienta').split(' ');
  const op: Opinion = { id: `o-${Math.random().toString(36).slice(2, 8)}`, nombre: ape ? `${nom} ${ape[0]}.` : nom, estrellas: n as Opinion['estrellas'], texto: texto.trim().slice(0, 400), servicioId: t.servicioId, profId: t.profId, turnoToken: token, fecha: fecha.toISOString(), visible: true };
  return { estado: { ...e, opiniones: [...(e.opiniones ?? []), op] } };
}

export function alternarOpinion(e: EstadoAgenda, id: string): EstadoAgenda {
  return { ...e, opiniones: (e.opiniones ?? []).map((o) => (o.id === id ? { ...o, visible: !o.visible } : o)) };
}

// ---------------- Métricas y ficha ----------------

/** Fotos y adicionales más elegidos en las últimas 4 semanas. */
export function masElegidos(e: EstadoAgenda, ahora = Date.now()) {
  const desde = new Date(ahora - 28 * 86_400_000).toISOString();
  const fotos = new Map<string, number>();
  const ads = new Map<string, number>();
  for (const t of e.turnos) {
    if (t.inicio < desde || t.estado === 'cancelado') continue;
    if (t.diseno?.disenoId) fotos.set(t.diseno.disenoId, (fotos.get(t.diseno.disenoId) ?? 0) + 1);
    for (const a of t.adicionales ?? []) ads.set(a, (ads.get(a) ?? 0) + 1);
  }
  const lista = [...fotos.entries()].map(([id, n]) => ({ d: disenoPorId(e, id), n })).filter((x): x is { d: Diseno; n: number } => !!x.d).sort((a, b) => b.n - a.n);
  const adicionales = [...ads.entries()].map(([id, n]) => ({ a: e.adicionales?.find((x) => x.id === id), n })).filter((x): x is { a: Adicional; n: number } => !!x.a).sort((a, b) => b.n - a.n);
  return { lista, adicionales };
}

/** La cita anterior atendida de la clienta. */
export function ultimaCita(e: EstadoAgenda, clienteId: string, antesDe: string) {
  return e.turnos.filter((t) => t.clienteId === clienteId && t.inicio < antesDe && t.estado === 'atendido').sort((a, b) => b.inicio.localeCompare(a.inicio))[0];
}
