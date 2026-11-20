import { formatoPrecio } from '@/lib/utiles';
import { nombreMes, sumarMeses, vencimiento } from '@/lib/rubros/contador/periodos';
import type { Comunicado, Edificio, EstadoConsorcio, Evidencia, Expensa, Gasto, Liquidacion, MedioPago, Pago, Personal, Presupuesto, Reclamo, Reserva, Rubro, TipoGasto, Unidad } from './tipos';

export const DIA = 86_400_000;

export const RUBROS: { id: Rubro; nombre: string }[] = [
  { id: 'personal', nombre: 'Sueldos y cargas sociales' },
  { id: 'servicios', nombre: 'Servicios públicos' },
  { id: 'abonos', nombre: 'Abonos y mantenimiento' },
  { id: 'reparaciones', nombre: 'Reparaciones' },
  { id: 'limpieza', nombre: 'Limpieza' },
  { id: 'seguros', nombre: 'Seguros' },
  { id: 'administracion', nombre: 'Gastos de administración' },
  { id: 'bancarios', nombre: 'Gastos bancarios' },
  { id: 'otros', nombre: 'Otros' },
];
export const NOMBRE_RUBRO = Object.fromEntries(RUBROS.map((r) => [r.id, r.nombre])) as Record<Rubro, string>;
export const NOMBRE_MEDIO: Record<MedioPago, string> = { mercadopago: 'Mercado Pago', transferencia: 'Transferencia', efectivo: 'Efectivo' };
export const NOMBRE_ETAPA: Record<Evidencia['etapa'], string> = { antes: 'Antes', durante: 'Durante', despues: 'Después' };
export const NOMBRE_ESTADO_OBRA: Record<string, string> = { presupuestos: 'Comparando presupuestos', aprobada: 'Aprobada', 'en-curso': 'En curso', terminada: 'Terminada' };

export const dinero = (v: number, moneda: string) => formatoPrecio(v, moneda);
const id = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
export const fechaCorta = (iso: string | number | Date) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric', year: 'numeric' });
export const diaYMes = (iso: string | number | Date) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
export const mesLargo = (periodo: string) => nombreMes(periodo, false);
const diaLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hoyClave = (ahora: number) => diaLocal(new Date(ahora));

export const edificio = (e: EstadoConsorcio, edId: string) => e.edificios.find((x) => x.id === edId)!;
export const unidad = (e: EstadoConsorcio, uId: string) => e.unidades.find((x) => x.id === uId);
export const unidadesDe = (e: EstadoConsorcio, edId: string) => e.unidades.filter((u) => u.edificioId === edId);
export const unidadPorCodigo = (e: EstadoConsorcio, codigo: string) => e.unidades.find((u) => u.codigo.toLowerCase() === codigo.trim().toLowerCase());

// ---------------- Cuenta corriente de cada unidad

export const cargos = (x: Expensa) => x.interes + x.ordinaria + x.extraordinaria + x.fondo + x.otros;
export const totalRecibo = (x: Expensa) => x.saldoAnterior + cargos(x);

export function expensasDe(e: EstadoConsorcio, uId: string) {
  return e.expensas.filter((x) => x.unidadId === uId).sort((a, b) => a.periodo.localeCompare(b.periodo));
}
export const ultimaExpensa = (e: EstadoConsorcio, uId: string) => expensasDe(e, uId).at(-1);
export const pagosDe = (e: EstadoConsorcio, uId: string) => e.pagos.filter((p) => p.unidadId === uId).sort((a, b) => b.fecha.localeCompare(a.fecha));

/** Lo que debe hoy la unidad: todo lo cargado menos todo lo acreditado. */
export function deuda(e: EstadoConsorcio, uId: string) {
  const cargado = expensasDe(e, uId).reduce((s, x) => s + cargos(x), 0);
  const pagado = e.pagos.filter((p) => p.unidadId === uId && p.estado === 'acreditado').reduce((s, p) => s + p.importe, 0);
  return Math.round(cargado - pagado);
}

export type EstadoUnidad = 'al-dia' | 'por-vencer' | 'en-mora';
export const NOMBRE_ESTADO: Record<EstadoUnidad, string> = { 'al-dia': 'Al día', 'por-vencer': 'Por vencer', 'en-mora': 'En mora' };

/** Estado de la unidad y desde cuándo debe (se imputan los pagos a las expensas más viejas primero). */
export function situacion(e: EstadoConsorcio, uId: string, ahora: number) {
  const d = deuda(e, uId);
  const xs = expensasDe(e, uId);
  if (d <= 0) return { estado: 'al-dia' as EstadoUnidad, deuda: d, meses: 0, desde: null as string | null, dias: 0 };
  let pagado = e.pagos.filter((p) => p.unidadId === uId && p.estado === 'acreditado').reduce((s, p) => s + p.importe, 0);
  const impagas: Expensa[] = [];
  for (const x of xs) {
    const c = cargos(x);
    if (pagado >= c) pagado -= c;
    else {
      impagas.push(x);
      pagado = 0;
    }
  }
  const vieja = impagas[0];
  const vencida = impagas.filter((x) => +new Date(x.vence) < ahora);
  const estado: EstadoUnidad = vencida.length ? 'en-mora' : 'por-vencer';
  const desde = vieja?.vence ?? null;
  const dias = vencida.length ? Math.floor((ahora - +new Date(vencida[0].vence)) / DIA) : 0;
  return { estado, deuda: d, meses: vencida.length, desde, dias };
}

export function morosos(e: EstadoConsorcio, ahora: number, edId?: string) {
  return e.unidades
    .filter((u) => !edId || u.edificioId === edId)
    .map((u) => ({ u, s: situacion(e, u.id, ahora) }))
    .filter((x) => x.s.estado === 'en-mora')
    .sort((a, b) => b.s.dias - a.s.dias || b.s.deuda - a.s.deuda);
}

// ---------------- Gastos y cierre del mes

/** El período abierto de un edificio: el mes siguiente a la última liquidación. */
export function periodoAbierto(e: EstadoConsorcio, edId: string, ahora: number) {
  const ult = e.liquidaciones.filter((l) => l.edificioId === edId).sort((a, b) => a.periodo.localeCompare(b.periodo)).at(-1);
  if (ult) return sumarMeses(ult.periodo, 1);
  const d = new Date(ahora);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const gastosDe = (e: EstadoConsorcio, edId: string, periodo: string) => e.gastos.filter((g) => g.edificioId === edId && g.periodo === periodo).sort((a, b) => a.fecha.localeCompare(b.fecha));

export function resumenGastos(e: EstadoConsorcio, edId: string, periodo: string) {
  const gs = gastosDe(e, edId, periodo);
  const porRubro: Partial<Record<Rubro, number>> = {};
  let ordinarias = 0;
  let extraordinarias = 0;
  for (const g of gs) {
    porRubro[g.rubro] = (porRubro[g.rubro] ?? 0) + g.importe;
    if (g.tipo === 'ordinario') ordinarias += g.importe;
    else extraordinarias += g.importe;
  }
  const fondo = Math.round((ordinarias * edificio(e, edId).fondoReservaPct) / 100);
  return { gastos: gs, porRubro, ordinarias, extraordinarias, fondo, total: ordinarias + extraordinarias + fondo };
}

export interface NuevoGasto {
  edificioId: string;
  periodo: string;
  rubro: Rubro;
  detalle: string;
  proveedor: string;
  cuit?: string;
  importe: number;
  tipo: TipoGasto;
  comprobante?: string;
  obraId?: string;
}

export function agregarGasto(e: EstadoConsorcio, n: NuevoGasto, ahora: number): { error: string } | { estado: EstadoConsorcio; gasto: Gasto } {
  if (!e.edificios.some((x) => x.id === n.edificioId)) return { error: 'Elegí el edificio.' };
  if (e.liquidaciones.some((l) => l.edificioId === n.edificioId && l.periodo === n.periodo)) return { error: `${mesLargo(n.periodo)} ya está liquidado en este edificio. Cargalo en el mes abierto.` };
  if (n.detalle.trim().length < 3) return { error: 'Escribí qué se pagó (por ejemplo, "Luz espacios comunes").' };
  if (n.proveedor.trim().length < 2) return { error: 'Escribí el proveedor.' };
  const importe = Math.round(n.importe);
  if (!(importe > 0)) return { error: 'Escribí el importe.' };
  if (n.comprobante && n.comprobante !== 'ejemplo' && (!/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(n.comprobante) || n.comprobante.length > 700_000)) return { error: 'El comprobante es muy pesado o no es una imagen. Probá con una foto.' };
  const gasto: Gasto = {
    id: id('g'), edificioId: n.edificioId, periodo: n.periodo, rubro: n.rubro, detalle: n.detalle.trim().slice(0, 120), proveedor: n.proveedor.trim().slice(0, 80),
    ...(n.cuit?.trim() ? { cuit: n.cuit.trim().slice(0, 13) } : {}), importe, tipo: n.tipo, fecha: new Date(ahora).toISOString(),
    ...(n.comprobante ? { comprobante: n.comprobante } : {}), ...(n.obraId ? { obraId: n.obraId } : {}),
  };
  return { estado: { ...e, gastos: [...e.gastos, gasto] }, gasto };
}

export function quitarGasto(e: EstadoConsorcio, gId: string): EstadoConsorcio {
  const g = e.gastos.find((x) => x.id === gId);
  if (!g || e.liquidaciones.some((l) => l.edificioId === g.edificioId && l.periodo === g.periodo)) return e;
  return { ...e, gastos: e.gastos.filter((x) => x.id !== gId) };
}

/** Carga como gasto del mes el costo de cada persona (sueldo + cargas). No duplica. */
export function cargarSueldos(e: EstadoConsorcio, edId: string, periodo: string, ahora: number): { estado: EstadoConsorcio; cargados: number } {
  const ya = new Set(gastosDe(e, edId, periodo).filter((g) => g.rubro === 'personal').map((g) => g.detalle));
  const nuevos: Gasto[] = e.personal
    .filter((p) => p.edificioId === edId && !p.tercerizado)
    .map((p) => ({ p, detalle: `Sueldo y cargas · ${p.nombre} (${p.rol})` }))
    .filter(({ detalle }) => !ya.has(detalle))
    .map(({ p, detalle }) => ({ id: id('g'), edificioId: edId, periodo, rubro: 'personal' as Rubro, detalle, proveedor: p.nombre, importe: p.sueldo + p.cargas, tipo: 'ordinario' as TipoGasto, fecha: new Date(ahora).toISOString() }));
  return { estado: { ...e, gastos: [...e.gastos, ...nuevos] }, cargados: nuevos.length };
}

/** Reparte un total por porcentual y corrige el redondeo en la unidad más grande. */
function prorratear(total: number, us: Unidad[]) {
  const suma = us.reduce((s, u) => s + u.coef, 0) || 1;
  const partes = us.map((u) => Math.round((total * u.coef) / suma));
  const dif = total - partes.reduce((s, x) => s + x, 0);
  if (dif && us.length) {
    const i = us.reduce((m, u, k) => (u.coef > us[m].coef ? k : m), 0);
    partes[i] += dif;
  }
  return partes;
}

/**
 * Cierra el mes de un edificio: liquidación numerada y una expensa por unidad con
 * saldo anterior, interés por mora, ordinarias, extraordinarias, fondo de reserva y SUM.
 */
export function cerrarMes(e: EstadoConsorcio, edId: string, periodo: string, ahora: number): { error: string } | { estado: EstadoConsorcio; liquidacion: Liquidacion } {
  if (e.liquidaciones.some((l) => l.edificioId === edId && l.periodo === periodo)) return { error: `${mesLargo(periodo)} ya está liquidado.` };
  const ed = edificio(e, edId);
  const r = resumenGastos(e, edId, periodo);
  if (!r.gastos.length) return { error: 'No hay gastos cargados en este mes.' };
  const us = unidadesDe(e, edId);
  const coefs = Math.round(us.reduce((s, u) => s + u.coef, 0) * 100) / 100;
  if (Math.abs(coefs - 100) > 0.05) return { error: `Los porcentuales del edificio suman ${coefs}%. Revisalos en Edificios antes de liquidar.` };
  const numero = Math.max(0, ...e.liquidaciones.filter((l) => l.edificioId === edId).map((l) => l.numero)) + 1;
  const liq: Liquidacion = { id: id('l'), edificioId: edId, periodo, numero, cerrada: new Date(ahora).toISOString(), ordinarias: r.ordinarias, extraordinarias: r.extraordinarias, fondo: r.fondo, porRubro: r.porRubro };
  const vence = vencimiento(sumarMeses(periodo, 1), ed.vencimientoDia).toISOString();
  const ord = prorratear(r.ordinarias, us);
  const ext = prorratear(r.extraordinarias, us);
  const fon = prorratear(r.fondo, us);
  let recibo = e.ultimoRecibo;
  const reservas = e.reservas.map((x) => ({ ...x }));
  const expensas: Expensa[] = us.map((u, i) => {
    const saldo = deuda(e, u.id);
    const interes = saldo > 0 ? Math.round((saldo * ed.interesMensual) / 100) : 0;
    let otros = 0;
    for (const res of reservas) {
      if (res.unidadId === u.id && res.cobro === 'expensa' && res.estado === 'confirmada' && !res.cargadaEn) {
        otros += res.precio;
        res.cargadaEn = periodo;
      }
    }
    recibo += 1;
    return { id: id('x'), unidadId: u.id, edificioId: edId, periodo, liquidacionId: liq.id, saldoAnterior: saldo, interes, ordinaria: ord[i], extraordinaria: ext[i], fondo: fon[i], otros, vence, numero: recibo };
  });
  return { estado: { ...e, liquidaciones: [...e.liquidaciones, liq], expensas: [...e.expensas, ...expensas], reservas, ultimoRecibo: recibo }, liquidacion: liq };
}

// ---------------- WhatsApp

export function enlaceExpensa(origen: string, slug: string, u: Unidad) {
  return `${origen}/d/${slug}?uf=${u.codigo}`;
}

export function textoExpensa(e: EstadoConsorcio, x: Expensa, moneda: string, enlace: string) {
  const u = unidad(e, x.unidadId)!;
  const ed = edificio(e, x.edificioId);
  const lineas = [
    `🏢 ${ed.nombre} · ${u.nombre}`,
    `Hola ${u.propietario.split(' ')[0]}, ya está tu expensa de ${mesLargo(x.periodo)}: ${dinero(totalRecibo(x), moneda)}${x.saldoAnterior > 0 ? ` (incluye ${dinero(x.saldoAnterior + x.interes, moneda)} de saldo anterior con interés)` : ''}.`,
    `Vence el ${diaYMes(x.vence)}.`,
    `Ver el recibo, la liquidación y pagar con Mercado Pago: ${enlace}`,
  ];
  return lineas.join('\n');
}

export type TipoRecordatorio = 'recordatorio' | 'vencimiento' | 'deuda';

export function textoRecordatorio(e: EstadoConsorcio, uId: string, tipo: TipoRecordatorio, ahora: number, moneda: string, enlace: string) {
  const u = unidad(e, uId)!;
  const ed = edificio(e, u.edificioId);
  const x = ultimaExpensa(e, uId);
  const s = situacion(e, uId, ahora);
  const nombre = u.propietario.split(' ')[0];
  if (tipo === 'recordatorio') return `Hola ${nombre}, te recordamos que la expensa de ${ed.nombre} (${u.nombre}) vence el ${x ? diaYMes(x.vence) : ''}: ${dinero(s.deuda, moneda)}. Pagala en un minuto: ${enlace}`;
  if (tipo === 'vencimiento') return `Hola ${nombre}, hoy vence la expensa de ${ed.nombre} (${u.nombre}): ${dinero(s.deuda, moneda)}. Si ya pagaste, ignorá este mensaje. Pagar: ${enlace}`;
  return `Hola ${nombre}, la unidad ${u.nombre} de ${ed.nombre} registra un saldo de ${dinero(s.deuda, moneda)} vencido hace ${s.dias} días. El saldo genera un interés del ${ed.interesMensual}% mensual. Podés pagarlo acá: ${enlace}. Si ya pagaste, respondé con el comprobante.`;
}

/** Marca como enviados los avisos de una liquidación (en la versión real salen por la API oficial de WhatsApp). */
export function registrarAvisos(e: EstadoConsorcio, lista: { unidadId: string; tipo: TipoRecordatorio | 'expensa' | 'comunicado' | 'recibo' | 'reserva'; texto: string }[], ahora: number): EstadoConsorcio {
  const fecha = new Date(ahora).toISOString();
  return { ...e, avisos: [...e.avisos, ...lista.map((a) => ({ id: id('a'), unidadId: a.unidadId, tipo: a.tipo, fecha, texto: a.texto }))] };
}

export const enviadosDe = (e: EstadoConsorcio, liqId: string) => {
  const xs = e.expensas.filter((x) => x.liquidacionId === liqId);
  const liq = e.liquidaciones.find((l) => l.id === liqId);
  return xs.filter((x) => e.avisos.some((a) => a.unidadId === x.unidadId && a.tipo === 'expensa' && liq && a.fecha >= liq.cerrada)).length;
};

/** Cobranza automática: qué mensaje le toca hoy a cada unidad (sin repetir el mismo aviso en el mismo período). */
export function cobranzaDeHoy(e: EstadoConsorcio, ahora: number) {
  const hoy = hoyClave(ahora);
  const out: { unidadId: string; tipo: TipoRecordatorio }[] = [];
  if (!e.cobranza.activa) return out;
  for (const u of e.unidades) {
    const x = ultimaExpensa(e, u.id);
    const s = situacion(e, u.id, ahora);
    if (!x || s.deuda <= 0) continue;
    const vence = new Date(x.vence);
    const dias = Math.round((+new Date(`${hoy}T12:00:00`) - +new Date(`${diaLocal(vence)}T12:00:00`)) / DIA);
    let tipo: TipoRecordatorio | null = null;
    if (dias === -e.cobranza.diasAntes) tipo = 'recordatorio';
    else if (dias === 0) tipo = 'vencimiento';
    else if (s.estado === 'en-mora' && e.cobranza.diasDespues.includes(s.dias)) tipo = 'deuda';
    if (!tipo) continue;
    const ya = e.avisos.some((a) => a.unidadId === u.id && a.tipo === tipo && a.fecha.slice(0, 10) === hoy);
    if (!ya) out.push({ unidadId: u.id, tipo });
  }
  return out;
}

/** Próximos envíos automáticos (7 días), para mostrar en el panel. */
export function proximosEnvios(e: EstadoConsorcio, ahora: number) {
  const lista: { dia: string; tipo: TipoRecordatorio; unidades: number }[] = [];
  for (let k = 1; k <= 7; k++) {
    const t = ahora + k * DIA;
    const n = cobranzaDeHoy({ ...e, avisos: [] }, t);
    for (const tipo of ['recordatorio', 'vencimiento', 'deuda'] as TipoRecordatorio[]) {
      const c = n.filter((x) => x.tipo === tipo).length;
      if (c) lista.push({ dia: hoyClave(t), tipo, unidades: c });
    }
  }
  return lista;
}

// ---------------- Pagos

/**
 * Registra un pago. Mercado Pago se acredita solo (en la versión real lo confirma el aviso de Mercado Pago);
 * la transferencia queda "a confirmar" hasta que el administrador la ve en el banco.
 */
export function registrarPago(e: EstadoConsorcio, uId: string, importe: number, medio: MedioPago, ahora: number, extra: { comprobante?: string } = {}): { error: string } | { estado: EstadoConsorcio; pago: Pago } {
  const u = unidad(e, uId);
  if (!u) return { error: 'No encontramos la unidad.' };
  const monto = Math.round(importe);
  if (!(monto > 0)) return { error: 'Escribí el importe.' };
  if (medio === 'mercadopago' && !edificio(e, u.edificioId).mp.vinculada) return { error: 'Este consorcio todavía no vinculó su cuenta de Mercado Pago.' };
  if (medio === 'transferencia' && extra.comprobante && (!/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(extra.comprobante) || extra.comprobante.length > 700_000)) return { error: 'El comprobante es muy pesado o no es una imagen.' };
  const numero = e.ultimoPago + 1;
  const pago: Pago = {
    id: id('p'), unidadId: uId, importe: monto, medio, fecha: new Date(ahora).toISOString(), numero,
    estado: medio === 'transferencia' ? 'a-confirmar' : 'acreditado',
    ...(medio === 'mercadopago' ? { operacion: `${Math.floor(ahora / 1000)}${numero}` } : {}),
    ...(extra.comprobante ? { comprobante: extra.comprobante } : {}),
  };
  return { estado: { ...e, pagos: [...e.pagos, pago], ultimoPago: numero }, pago };
}

export function confirmarPago(e: EstadoConsorcio, pId: string): EstadoConsorcio {
  return { ...e, pagos: e.pagos.map((p) => (p.id === pId ? { ...p, estado: 'acreditado' } : p)) };
}

export function rechazarPago(e: EstadoConsorcio, pId: string): EstadoConsorcio {
  return { ...e, pagos: e.pagos.filter((p) => !(p.id === pId && p.estado === 'a-confirmar')) };
}

export function textoReciboPago(e: EstadoConsorcio, p: Pago, moneda: string) {
  const u = unidad(e, p.unidadId)!;
  const ed = edificio(e, u.edificioId);
  const resta = deuda(e, u.id);
  return [
    `✅ Recibo de pago N° ${String(p.numero).padStart(6, '0')}`,
    `${ed.nombre} · ${u.nombre}: recibimos ${dinero(p.importe, moneda)} por ${NOMBRE_MEDIO[p.medio]} el ${fechaCorta(p.fecha)}.`,
    resta > 0 ? `Saldo pendiente: ${dinero(resta, moneda)}.` : 'Sin deuda a la fecha. ¡Gracias!',
  ].join('\n');
}

// ---------------- Obras y trabajos especiales

/** Lo que le falta a un presupuesto para cumplir con la ley (Ley 14.701, art. 13). */
export function faltantesPresupuesto(p: Presupuesto) {
  const f: string[] = [];
  if (!p.cuit.trim()) f.push('CUIT del prestador');
  if (!(p.materiales >= 0 && p.manoObra > 0)) f.push('materiales y mano de obra por separado');
  if (!(p.plazoDias > 0)) f.push('plazo de ejecución');
  if (!(p.garantiaMeses > 0)) f.push('garantía');
  if (!(p.validezDias > 0)) f.push('plazo de mantenimiento del precio');
  if (!p.seguros) f.push('seguros (ART y responsabilidad civil)');
  return f;
}

export const totalPresupuesto = (p: Presupuesto) => p.materiales + p.manoObra;

export function agregarPresupuesto(e: EstadoConsorcio, obraId: string, p: Omit<Presupuesto, 'id'>): { error: string } | { estado: EstadoConsorcio } {
  if (p.proveedor.trim().length < 2) return { error: 'Escribí el proveedor.' };
  if (!(totalPresupuesto({ ...p, id: '' }) > 0)) return { error: 'Escribí los importes de materiales y mano de obra.' };
  return { estado: { ...e, obras: e.obras.map((o) => (o.id === obraId ? { ...o, presupuestos: [...o.presupuestos, { ...p, id: id('pr') }] } : o)) } };
}

export function elegirPresupuesto(e: EstadoConsorcio, obraId: string, prId: string, quien: string): { error: string } | { estado: EstadoConsorcio } {
  const o = e.obras.find((x) => x.id === obraId);
  const p = o?.presupuestos.find((x) => x.id === prId);
  if (!o || !p) return { error: 'No encontramos el presupuesto.' };
  const falta = faltantesPresupuesto(p);
  if (falta.length) return { error: `Este presupuesto no se puede contratar: le falta ${falta.join(', ')}.` };
  return { estado: { ...e, obras: e.obras.map((x) => (x.id === obraId ? { ...x, estado: 'aprobada', aprobadaPor: quien, presupuestos: x.presupuestos.map((y) => ({ ...y, elegido: y.id === prId })) } : x)) } };
}

export function agregarEvidencia(e: EstadoConsorcio, obraId: string, ev: Omit<Evidencia, 'id' | 'fecha'>, ahora: number): { error: string } | { estado: EstadoConsorcio } {
  if (ev.foto && (!/^data:image\/(jpeg|png|webp);base64,/.test(ev.foto) || ev.foto.length > 700_000)) return { error: 'La foto es muy pesada o no es una imagen.' };
  if (!ev.foto && ev.nota.trim().length < 3) return { error: 'Subí una foto o escribí qué se hizo.' };
  const nueva: Evidencia = { id: id('ev'), etapa: ev.etapa, nota: ev.nota.trim().slice(0, 200), fecha: new Date(ahora).toISOString(), ...(ev.foto ? { foto: ev.foto } : {}) };
  return {
    estado: {
      ...e,
      obras: e.obras.map((o) => (o.id === obraId ? { ...o, evidencias: [...o.evidencias, nueva], estado: o.estado === 'aprobada' && ev.etapa !== 'antes' ? 'en-curso' : o.estado } : o)),
    },
  };
}

/** Termina la obra y carga la primera cuota como gasto extraordinario del mes abierto. */
export function terminarObra(e: EstadoConsorcio, obraId: string, ahora: number): { error: string } | { estado: EstadoConsorcio } {
  const o = e.obras.find((x) => x.id === obraId);
  if (!o) return { error: 'No encontramos la obra.' };
  const p = o.presupuestos.find((x) => x.elegido);
  if (!p) return { error: 'Primero elegí un presupuesto.' };
  if (!o.evidencias.some((x) => x.etapa === 'despues')) return { error: 'Subí al menos una foto del trabajo terminado.' };
  const periodo = periodoAbierto(e, o.edificioId, ahora);
  const cuota = Math.round(totalPresupuesto(p) / Math.max(1, o.cuotas));
  const r = agregarGasto({ ...e, obras: e.obras.map((x) => (x.id === obraId ? { ...x, estado: 'terminada' } : x)) }, {
    edificioId: o.edificioId, periodo, rubro: 'reparaciones', detalle: `${o.titulo}${o.cuotas > 1 ? ` (cuota 1 de ${o.cuotas})` : ''}`, proveedor: p.proveedor, cuit: p.cuit, importe: cuota, tipo: 'extraordinario', obraId, comprobante: 'ejemplo',
  }, ahora);
  return r;
}

export function nuevaObra(e: EstadoConsorcio, edId: string, titulo: string, descripcion: string, cuotas: number, ahora: number): { error: string } | { estado: EstadoConsorcio; obra: string } {
  if (titulo.trim().length < 4) return { error: 'Poné un título (por ejemplo, "Impermeabilización de terraza").' };
  const o = { id: id('o'), edificioId: edId, titulo: titulo.trim().slice(0, 80), descripcion: descripcion.trim().slice(0, 300), estado: 'presupuestos' as const, presupuestos: [], evidencias: [], cuotas: Math.min(12, Math.max(1, Math.round(cuotas) || 1)), creada: new Date(ahora).toISOString() };
  return { estado: { ...e, obras: [...e.obras, o] }, obra: o.id };
}

// ---------------- Personal

export function agregarPersonal(e: EstadoConsorcio, p: Omit<Personal, 'id'>): { error: string } | { estado: EstadoConsorcio } {
  if (p.nombre.trim().length < 3) return { error: 'Escribí el nombre (o la empresa, si es un servicio).' };
  if (p.rol.trim().length < 3) return { error: 'Escribí la tarea o el puesto.' };
  if (!p.tercerizado && !(p.sueldo > 0)) return { error: 'Escribí el sueldo neto.' };
  return { estado: { ...e, personal: [...e.personal, { ...p, id: id('pe'), nombre: p.nombre.trim(), rol: p.rol.trim() }] } };
}

export const quitarPersonal = (e: EstadoConsorcio, pId: string): EstadoConsorcio => ({ ...e, personal: e.personal.filter((p) => p.id !== pId) });

// ---------------- Espacio común (SUM)

export function ocupado(e: EstadoConsorcio, edId: string, dia: string, turno: string) {
  return e.reservas.some((r) => r.edificioId === edId && r.dia === dia && r.turno === turno && r.estado === 'confirmada');
}

export function reservar(e: EstadoConsorcio, uId: string, dia: string, turno: string, cobro: Reserva['cobro'], ahora: number): { error: string } | { estado: EstadoConsorcio; reserva: Reserva } {
  const u = unidad(e, uId);
  if (!u) return { error: 'No encontramos la unidad.' };
  const ed = edificio(e, u.edificioId);
  if (!ed.espacio) return { error: 'Este edificio no tiene espacio común para reservar.' };
  if (!ed.espacio.turnos.includes(turno)) return { error: 'Elegí un turno.' };
  if (dia < hoyClave(ahora)) return { error: 'Elegí un día que no haya pasado.' };
  if (ocupado(e, ed.id, dia, turno)) return { error: 'Ese turno ya está reservado. Elegí otro.' };
  if (situacion(e, uId, ahora).meses >= 2) return { error: 'La unidad tiene expensas vencidas. Para reservar, regularizá el saldo o hablá con la administración.' };
  if (cobro === 'mercadopago' && !ed.mp.vinculada) return { error: 'El consorcio todavía no vinculó Mercado Pago. Elegí "Sumar a la expensa".' };
  const reserva: Reserva = { id: id('r'), edificioId: ed.id, unidadId: uId, dia, turno, precio: ed.espacio.precio, cobro, estado: 'confirmada', creada: new Date(ahora).toISOString() };
  return { estado: { ...e, reservas: [...e.reservas, reserva] }, reserva };
}

export function cancelarReserva(e: EstadoConsorcio, rId: string): EstadoConsorcio {
  return { ...e, reservas: e.reservas.map((r) => (r.id === rId && !r.cargadaEn ? { ...r, estado: 'cancelada' } : r)) };
}

export function cambiarEspacio(e: EstadoConsorcio, edId: string, cambio: Partial<Edificio['espacio']>): { error: string } | { estado: EstadoConsorcio } {
  const ed = edificio(e, edId);
  if (!ed.espacio) return { error: 'Este edificio no tiene espacio común.' };
  const precio = cambio?.precio !== undefined ? Math.round(cambio.precio) : ed.espacio.precio;
  if (!(precio >= 0)) return { error: 'El precio no es válido.' };
  return { estado: { ...e, edificios: e.edificios.map((x) => (x.id === edId ? { ...x, espacio: { ...x.espacio!, ...cambio, precio } } : x)) } };
}

// ---------------- Comunicados y reclamos

export function nuevoComunicado(e: EstadoConsorcio, edId: string, titulo: string, texto: string, ahora: number): { error: string } | { estado: EstadoConsorcio; comunicado: Comunicado } {
  if (titulo.trim().length < 4) return { error: 'Poné un título.' };
  if (texto.trim().length < 10) return { error: 'Escribí el comunicado.' };
  const c: Comunicado = { id: id('c'), edificioId: edId, titulo: titulo.trim().slice(0, 80), texto: texto.trim().slice(0, 800), fecha: new Date(ahora).toISOString(), leidos: [] };
  return { estado: { ...e, comunicados: [...e.comunicados, c] }, comunicado: c };
}

export function marcarLeido(e: EstadoConsorcio, cId: string, uId: string): EstadoConsorcio {
  return { ...e, comunicados: e.comunicados.map((c) => (c.id === cId && !c.leidos.includes(uId) ? { ...c, leidos: [...c.leidos, uId] } : c)) };
}

export function nuevoReclamo(e: EstadoConsorcio, edId: string, lugar: string, texto: string, ahora: number, uId?: string): { error: string } | { estado: EstadoConsorcio; reclamo: Reclamo } {
  if (lugar.trim().length < 2) return { error: 'Decinos dónde es (por ejemplo, "Pasillo 3er piso").' };
  if (texto.trim().length < 6) return { error: 'Contanos qué pasa.' };
  const r: Reclamo = { id: id('rc'), edificioId: edId, ...(uId ? { unidadId: uId } : {}), lugar: lugar.trim().slice(0, 60), texto: texto.trim().slice(0, 400), fecha: new Date(ahora).toISOString(), estado: 'nuevo' };
  return { estado: { ...e, reclamos: [...e.reclamos, r] }, reclamo: r };
}

export function asignarReclamo(e: EstadoConsorcio, rId: string, a: string): EstadoConsorcio {
  return { ...e, reclamos: e.reclamos.map((r) => (r.id === rId ? { ...r, estado: 'asignado', asignadoA: a.trim().slice(0, 60) } : r)) };
}

export function resolverReclamo(e: EstadoConsorcio, rId: string, resolucion: string, ahora: number): EstadoConsorcio {
  return { ...e, reclamos: e.reclamos.map((r) => (r.id === rId ? { ...r, estado: 'resuelto', resolucion: resolucion.trim().slice(0, 200) || 'Resuelto.', resuelto: new Date(ahora).toISOString() } : r)) };
}

// ---------------- Edificios

export function vincularMp(e: EstadoConsorcio, edId: string, cuenta: string): { error: string } | { estado: EstadoConsorcio } {
  const c = cuenta.trim();
  if (c.length < 4) return { error: 'Escribí el alias o el correo de la cuenta de Mercado Pago del consorcio.' };
  return { estado: { ...e, edificios: e.edificios.map((x) => (x.id === edId ? { ...x, mp: { vinculada: true, cuenta: c.slice(0, 60), titular: `Consorcio de Propietarios ${x.nombre}` } } : x)) } };
}

export const desvincularMp = (e: EstadoConsorcio, edId: string): EstadoConsorcio => ({ ...e, edificios: e.edificios.map((x) => (x.id === edId ? { ...x, mp: { ...x.mp, vinculada: false } } : x)) });

export function guardarEdificio(e: EstadoConsorcio, edId: string, c: Pick<Edificio, 'vencimientoDia' | 'interesMensual' | 'fondoReservaPct' | 'honorarios'>): { error: string } | { estado: EstadoConsorcio } {
  if (!(c.vencimientoDia >= 1 && c.vencimientoDia <= 28)) return { error: 'El vencimiento tiene que ser un día del 1 al 28.' };
  if (!(c.interesMensual >= 0 && c.interesMensual <= 10)) return { error: 'El interés mensual tiene que estar entre 0% y 10%.' };
  if (!(c.fondoReservaPct >= 0 && c.fondoReservaPct <= 30)) return { error: 'El fondo de reserva tiene que estar entre 0% y 30%.' };
  return { estado: { ...e, edificios: e.edificios.map((x) => (x.id === edId ? { ...x, ...c, honorarios: Math.round(c.honorarios) } : x)) } };
}

// ---------------- Tablero

export function resumenEdificio(e: EstadoConsorcio, edId: string, ahora: number) {
  const us = unidadesDe(e, edId);
  const liq = e.liquidaciones.filter((l) => l.edificioId === edId).sort((a, b) => a.periodo.localeCompare(b.periodo)).at(-1);
  const xs = liq ? e.expensas.filter((x) => x.liquidacionId === liq.id) : [];
  const emitido = xs.reduce((s, x) => s + cargos(x), 0);
  const desde = liq?.cerrada ?? '';
  const cobrado = e.pagos.filter((p) => p.estado === 'acreditado' && p.fecha >= desde && us.some((u) => u.id === p.unidadId)).reduce((s, p) => s + p.importe, 0);
  const sit = us.map((u) => situacion(e, u.id, ahora));
  return {
    unidades: us.length,
    liquidacion: liq,
    emitido,
    cobrado,
    alDia: sit.filter((s) => s.estado === 'al-dia').length,
    enMora: sit.filter((s) => s.estado === 'en-mora').length,
    deudaTotal: sit.reduce((s, x) => s + Math.max(0, x.deuda), 0),
    aConfirmar: e.pagos.filter((p) => p.estado === 'a-confirmar' && us.some((u) => u.id === p.unidadId)).length,
    obrasEnCurso: e.obras.filter((o) => o.edificioId === edId && o.estado !== 'terminada').length,
    reclamosAbiertos: e.reclamos.filter((r) => r.edificioId === edId && r.estado !== 'resuelto').length,
    abierto: periodoAbierto(e, edId, ahora),
  };
}

/** Cobrado por mes (todas las unidades o un edificio), para el gráfico. */
export function cobradoPorMes(e: EstadoConsorcio, meses: string[], edId?: string) {
  const ids = new Set(e.unidades.filter((u) => !edId || u.edificioId === edId).map((u) => u.id));
  return meses.map((m) => ({
    mes: m,
    mp: e.pagos.filter((p) => ids.has(p.unidadId) && p.estado === 'acreditado' && p.fecha.slice(0, 7) === m && p.medio === 'mercadopago').reduce((s, p) => s + p.importe, 0),
    otros: e.pagos.filter((p) => ids.has(p.unidadId) && p.estado === 'acreditado' && p.fecha.slice(0, 7) === m && p.medio !== 'mercadopago').reduce((s, p) => s + p.importe, 0),
  }));
}
