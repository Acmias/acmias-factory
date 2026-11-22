import { DIA_MS, claveDia, inicioDia, lunesDe, sumarDias } from '@/lib/rubros/barberia/agenda';
import type { Cliente, EstadoAgenda, Profesional } from '@/lib/rubros/barberia/tipos';
import { PARTICULAR } from '@/lib/rubros/consultorio/datos-ejemplo';
import { COMBOS, codigoDemo } from './datos';
import type { Documento, EstadoClinico, Evolucion, Mensaje, PlanPago, Presupuesto, Resultado, TipoDocumento } from './tipos';

export type ActualizarClinico = (fn: (c: EstadoClinico) => EstadoClinico) => string | null;

const nuevoId = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export const nombreProf = (p?: Profesional) => (p ? `${p.titulo ?? ''} ${p.nombre}`.trim() : '');
export const primerNombre = (c?: Cliente) => c?.nombre.split(' ')[0] ?? '';

export const NOMBRE_DOC: Record<TipoDocumento, string> = { receta: 'Receta', certificado: 'Certificado', orden: 'Orden de estudios', indicacion: 'Indicación' };

/**
 * Mensajes al paciente (CLI-04 / DEMO 15): nunca dicen especialidad, procedimiento, resultado ni motivo.
 * La prueba de palabras prohibidas también avisa en el editor de mensajes.
 */
export const PALABRAS_CLINICAS = /diagn[oó]stic|alergi|evoluci|s[ií]ntoma|medicaci|tratamiento|receta|resultado|an[aá]lisis|estudio|presi[oó]n|glucemia|colesterol|toxina|relleno|rinoplast|cirug|procedimiento|est[eé]tic|nutrici|cl[ií]nic|pedi[aá]tr|psic|ginec/i;
export const esNeutro = (texto: string) => !PALABRAS_CLINICAS.test(texto);

export const MSJ = {
  documento: (negocio: string) => `Tenés un documento nuevo en tu portal de ${negocio}.`,
  novedad: (negocio: string) => `Hay una novedad en tu portal de ${negocio}.`,
  presupuesto: (negocio: string) => `Te enviamos una propuesta desde ${negocio}. La podés ver en tu portal.`,
  recordatorioPropuesta: (nombre: string, negocio: string) => `Hola ${nombre}, ¿pudiste ver la propuesta de ${negocio}? Si tenés dudas, respondé este mensaje.`,
  confirmado: (negocio: string, cuando: string) => `Listo, quedó confirmado tu turno del ${cuando} en ${negocio}.`,
  sena: (negocio: string) => `Recibimos tu pago en ${negocio}. ¡Gracias!`,
  invitacion: (nombre: string, negocio: string) => `Hola ${nombre}, desde ${negocio} te invitamos a reservar tu próximo turno.`,
  codigo: (codigo: string, negocio: string) => `Tu código para entrar al portal de ${negocio} es ${codigo}. No lo compartas con nadie.`,
  compartido: (negocio: string) => `Compartiste tu información de ${negocio}. Podés revocar el acceso desde tu portal.`,
};

export function agregarMensaje(c: EstadoClinico, m: Omit<Mensaje, 'id' | 'fecha'>): EstadoClinico {
  return { ...c, mensajes: [...c.mensajes, { ...m, id: nuevoId('mj'), fecha: new Date().toISOString() }].slice(-150) };
}

export function registrar(c: EstadoClinico, quien: string, que: string): EstadoClinico {
  return { ...c, accesos: [...c.accesos, { fecha: new Date().toISOString(), quien, que }].slice(-300) };
}

export const fichaDe = (c: EstadoClinico, pacienteId: string) => c.fichas.find((f) => f.pacienteId === pacienteId);

// ---------------- Consulta (CLI-06 a CLI-08) ----------------

export interface ItemIndicacion {
  tipo: TipoDocumento;
  texto: string;
}

export function itemsDeCombo(comboId: string): ItemIndicacion[] {
  return (COMBOS.find((x) => x.id === comboId)?.items ?? []).map((x) => ({ ...x }));
}

export interface DatosConsulta {
  pacienteId: string;
  profId: string;
  turnoId?: string;
  motivo: string;
  texto: string;
  diagnostico?: string;
  items: ItemIndicacion[];
  proximoControlDias?: number;
}

/** Firma la evolución: queda inalterable, genera los documentos con código y avisa al paciente con un mensaje neutro. */
export function firmarConsulta(c: EstadoClinico, d: DatosConsulta, negocio: string, quien: string): { estado: EstadoClinico; evolucion: Evolucion; documentos: Documento[] } {
  const fecha = new Date().toISOString();
  const evolucion: Evolucion = { id: nuevoId('ev'), pacienteId: d.pacienteId, profId: d.profId, turnoId: d.turnoId, fecha, motivo: d.motivo.trim(), texto: d.texto.trim(), diagnostico: d.diagnostico || undefined, agregados: [] };
  const documentos: Documento[] = d.items
    .filter((i) => i.texto.trim())
    .map((i) => ({ id: nuevoId('doc'), codigo: codigoDemo(), tipo: i.tipo, pacienteId: d.pacienteId, profId: d.profId, fecha, texto: i.texto.trim(), evolucionId: evolucion.id }));
  let estado: EstadoClinico = { ...c, evoluciones: [...c.evoluciones, evolucion], documentos: [...c.documentos, ...documentos] };
  if (d.proximoControlDias) {
    const prox = claveDia(Date.now() + d.proximoControlDias * DIA_MS);
    estado = { ...estado, fichas: estado.fichas.map((f) => (f.pacienteId === d.pacienteId ? { ...f, proximoControl: prox } : f)) };
  }
  if (documentos.length) estado = agregarMensaje(estado, { pacienteId: d.pacienteId, texto: MSJ.documento(negocio), boton: { texto: 'Ver en mi portal', destino: 'portal' } });
  estado = registrar(estado, quien, 'Firmó una evolución');
  return { estado, evolucion, documentos };
}

export function agregarNota(c: EstadoClinico, evolucionId: string, texto: string, quien: string): EstadoClinico {
  return registrar({ ...c, evoluciones: c.evoluciones.map((e) => (e.id === evolucionId ? { ...e, agregados: [...e.agregados, { fecha: new Date().toISOString(), texto: texto.trim() }] } : e)) }, quien, 'Agregó una nota a una evolución firmada');
}

// ---------------- Resultados (CLI-10) ----------------

export const fueraDeRango = (r: Resultado) => r.valores.some((v) => v.valor < v.rango[0] || v.valor > v.rango[1]);

export function revisarResultado(c: EstadoClinico, id: string, comentario: string, negocio: string, quien: string): EstadoClinico {
  const r = c.resultados.find((x) => x.id === id);
  if (!r) return c;
  const estado = { ...c, resultados: c.resultados.map((x) => (x.id === id ? { ...x, estado: 'revisado' as const, comentario: comentario.trim() || undefined } : x)) };
  return registrar(agregarMensaje(estado, { pacienteId: r.pacienteId, texto: MSJ.novedad(negocio), boton: { texto: 'Ver en mi portal', destino: 'portal' } }), quien, 'Revisó un resultado');
}

/** Serie de un valor a lo largo del tiempo, para el gráfico de evolución. */
export function serie(c: EstadoClinico, pacienteId: string, nombre: string) {
  return c.resultados
    .filter((r) => r.pacienteId === pacienteId)
    .flatMap((r) => r.valores.filter((v) => v.nombre === nombre).map((v) => ({ fecha: r.fecha, valor: v.valor, rango: v.rango, unidad: v.unidad })))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// ---------------- Presupuestos (CLI-18 a CLI-24) ----------------

export const totalDe = (p: Pick<Presupuesto, 'items'>) => p.items.reduce((s, i) => s + i.monto, 0);
export const CUOTAS = 6;
export const PORC_SENA = 30;

export function montosPlan(p: Pick<Presupuesto, 'items'>, plan: PlanPago) {
  const t = totalDe(p);
  if (plan === 'sena') return { ahora: Math.round((t * PORC_SENA) / 100), resto: t - Math.round((t * PORC_SENA) / 100), total: t };
  if (plan === 'cuotas') return { ahora: Math.round(t / CUOTAS), resto: t - Math.round(t / CUOTAS), total: t };
  return { ahora: t, resto: 0, total: t };
}

export const NOMBRE_PLAN: Record<PlanPago, string> = { contado: 'Contado', sena: `Seña del ${PORC_SENA} % y saldo`, cuotas: `${CUOTAS} cuotas` };

export type Columna = 'borrador' | 'enviado' | 'visto' | 'consulta' | 'aceptado' | 'cerrado';
export const COLUMNAS: { id: Columna; nombre: string }[] = [
  { id: 'enviado', nombre: 'Enviado' },
  { id: 'visto', nombre: 'Visto' },
  { id: 'consulta', nombre: 'Con consultas' },
  { id: 'aceptado', nombre: 'Aceptado' },
  { id: 'cerrado', nombre: 'Rechazado o vencido' },
];

/** Estado a mostrar: un presupuesto abierto que pasó su validez se ve como vencido. */
export function estadoActual(p: Presupuesto, ahora = Date.now()): Presupuesto['estado'] {
  if (['enviado', 'visto', 'consulta'].includes(p.estado) && +new Date(p.validoHasta) < ahora) return 'vencido';
  return p.estado;
}

export function columnaDe(p: Presupuesto, ahora = Date.now()): Columna {
  const e = estadoActual(p, ahora);
  return e === 'rechazado' || e === 'vencido' ? 'cerrado' : e;
}

export const diasDesde = (iso?: string, ahora = Date.now()) => (iso ? Math.floor((ahora - +new Date(iso)) / DIA_MS) : 0);
export const vistoSinRespuesta = (p: Presupuesto, ahora = Date.now()) => estadoActual(p, ahora) === 'visto' && diasDesde(p.visto, ahora) >= 3;

export function actualizarPresupuesto(c: EstadoClinico, id: string, cambios: Partial<Presupuesto>): EstadoClinico {
  return { ...c, presupuestos: c.presupuestos.map((p) => (p.id === id ? { ...p, ...cambios } : p)) };
}

export function enviarPresupuesto(c: EstadoClinico, p: Presupuesto, negocio: string, quien: string): EstadoClinico {
  const ya = c.presupuestos.some((x) => x.id === p.id);
  const ahora = new Date().toISOString();
  const env: Presupuesto = { ...p, estado: 'enviado', enviado: ahora, visto: undefined };
  const estado = ya ? actualizarPresupuesto(c, p.id, env) : { ...c, presupuestos: [...c.presupuestos, env] };
  return registrar(agregarMensaje(estado, { pacienteId: p.pacienteId, texto: MSJ.presupuesto(negocio), boton: { texto: 'Ver la propuesta', destino: 'presupuesto', ref: p.id } }), quien, 'Envió un presupuesto');
}

export function nuevaVersion(c: EstadoClinico, id: string): EstadoClinico {
  const p = c.presupuestos.find((x) => x.id === id);
  if (!p) return c;
  const ahora = Date.now();
  return actualizarPresupuesto(c, id, { version: p.version + 1, estado: 'borrador', visto: undefined, consulta: undefined, motivoRechazo: undefined, creado: new Date(ahora).toISOString(), validoHasta: new Date(ahora + 30 * DIA_MS).toISOString() });
}

export function aceptarPresupuesto(c: EstadoClinico, id: string, plan: PlanPago, nombre: string): EstadoClinico {
  return registrar(actualizarPresupuesto(c, id, { estado: 'aceptado', plan, firma: { nombre: nombre.trim(), fecha: new Date().toISOString() }, sena: 'pendiente' }), 'Paciente (portal)', 'Aceptó y firmó un presupuesto');
}

export function pagarSena(c: EstadoClinico, id: string, negocio: string): EstadoClinico {
  const p = c.presupuestos.find((x) => x.id === id);
  if (!p) return c;
  return agregarMensaje(actualizarPresupuesto(c, id, { sena: 'pagada' }), { pacienteId: p.pacienteId, texto: MSJ.sena(negocio) });
}

// ---------------- Reportes (R1 a R7) ----------------

export interface Semana {
  desde: Date;
  etiqueta: string;
  ingresos: number;
  turnos: number;
  ausentes: number;
  ausentismo: number;
}

/** Ingresos y ausentismo por semana con los turnos ya terminados (datos ficticios de la demo). */
export function porSemana(agenda: EstadoAgenda, ahora = Date.now(), semanas = 5): Semana[] {
  const lunes = lunesDe(ahora);
  const precio = new Map(agenda.servicios.map((s) => [s.id, s.precio]));
  return Array.from({ length: semanas }, (_, i) => {
    const desde = sumarDias(lunes, -7 * (semanas - 1 - i));
    const hasta = +sumarDias(desde, 7);
    const ts = agenda.turnos.filter((t) => +new Date(t.inicio) >= +desde && +new Date(t.inicio) < hasta && +new Date(t.fin) <= ahora && t.estado !== 'cancelado');
    const atendidos = ts.filter((t) => t.estado === 'atendido');
    const ausentes = ts.filter((t) => t.estado === 'ausente').length;
    return {
      desde,
      etiqueta: `${desde.getDate()}/${desde.getMonth() + 1}`,
      ingresos: atendidos.reduce((s, t) => s + (precio.get(t.servicioId) ?? 0), 0),
      turnos: ts.length,
      ausentes,
      ausentismo: ts.length ? Math.round((ausentes / ts.length) * 100) : 0,
    };
  });
}

export function mezclaCoberturas(agenda: EstadoAgenda, ahora = Date.now()) {
  const precio = new Map(agenda.servicios.map((s) => [s.id, s.precio]));
  const m = new Map<string, number>();
  for (const t of agenda.turnos) if (t.estado === 'atendido' && +new Date(t.fin) <= ahora) m.set(t.cobertura ?? PARTICULAR, (m.get(t.cobertura ?? PARTICULAR) ?? 0) + (precio.get(t.servicioId) ?? 0));
  const total = [...m.values()].reduce((a, b) => a + b, 0) || 1;
  return [...m.entries()].map(([nombre, monto]) => ({ nombre, monto, porc: Math.round((monto / total) * 100) })).sort((a, b) => b.monto - a.monto);
}

const tieneTurnoFuturo = (agenda: EstadoAgenda, pacienteId: string, ahora: number) => agenda.turnos.some((t) => t.clienteId === pacienteId && +new Date(t.inicio) > ahora && (t.estado === 'reservado' || t.estado === 'confirmado'));

export function listasDeTrabajo(agenda: EstadoAgenda, c: EstadoClinico, ahora = Date.now()) {
  const hoy = claveDia(ahora);
  const controlesVencidos = c.fichas.filter((f) => f.cronico && f.proximoControl && f.proximoControl < hoy && !tieneTurnoFuturo(agenda, f.pacienteId, ahora)).map((f) => f.pacienteId);
  const ultimo = new Map<string, number>();
  for (const t of agenda.turnos) if (t.estado === 'atendido') ultimo.set(t.clienteId, Math.max(ultimo.get(t.clienteId) ?? 0, +new Date(t.inicio)));
  const inactivos = agenda.clientes.filter((x) => (ultimo.get(x.id) ?? 0) < ahora - 21 * DIA_MS && !tieneTurnoFuturo(agenda, x.id, ahora)).map((x) => x.id);
  const realizados = c.presupuestos.filter((p) => p.realizado);
  const retoques = [...new Set(realizados.filter((p) => +new Date(p.realizado!) < ahora - 120 * DIA_MS && !realizados.some((q) => q.pacienteId === p.pacienteId && +new Date(q.realizado!) > +new Date(p.realizado!))).map((p) => p.pacienteId))].filter((pid) => !tieneTurnoFuturo(agenda, pid, ahora));
  return {
    controlesVencidos,
    inactivos,
    retoques,
    resultadosPendientes: c.resultados.filter((r) => r.estado === 'pendiente'),
    fueraDeRango: c.resultados.filter((r) => fueraDeRango(r)),
  };
}

export function statsPresupuestos(c: EstadoClinico, ahora = Date.now()) {
  const ps = c.presupuestos.filter((p) => !p.realizado || +new Date(p.creado) > ahora - 60 * DIA_MS);
  const est = ps.map((p) => estadoActual(p, ahora));
  const aceptados = ps.filter((_, i) => est[i] === 'aceptado');
  const cerrados = est.filter((e) => e === 'aceptado' || e === 'rechazado' || e === 'vencido').length;
  const motivos = new Map<string, number>();
  for (const p of ps) if (p.motivoRechazo) motivos.set(p.motivoRechazo, (motivos.get(p.motivoRechazo) ?? 0) + 1);
  const dias = aceptados.filter((p) => p.firma && p.enviado).map((p) => (+new Date(p.firma!.fecha) - +new Date(p.enviado!)) / DIA_MS);
  return {
    tasa: cerrados ? Math.round((aceptados.length / cerrados) * 100) : 0,
    diasAceptar: dias.length ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : 0,
    abiertos: est.filter((e) => e === 'enviado' || e === 'visto' || e === 'consulta').length,
    montoAbierto: ps.filter((_, i) => ['enviado', 'visto', 'consulta'].includes(est[i])).reduce((s, p) => s + totalDe(p), 0),
    motivos: [...motivos.entries()].sort((a, b) => b[1] - a[1]),
    sinRespuesta: c.presupuestos.filter((p) => vistoSinRespuesta(p, ahora)),
  };
}

export function invitar(c: EstadoClinico, agenda: EstadoAgenda, lista: string, pacientes: string[], negocio: string, quien: string): EstadoClinico {
  let estado = c;
  for (const pid of pacientes) {
    const p = agenda.clientes.find((x) => x.id === pid);
    estado = agregarMensaje(estado, { pacienteId: pid, texto: MSJ.invitacion(primerNombre(p), negocio), boton: { texto: 'Reservar turno', destino: 'reserva' } });
  }
  return registrar({ ...estado, invitaciones: [...estado.invitaciones, { fecha: new Date().toISOString(), lista, pacientes }] }, quien, `Invitó a ${pacientes.length} pacientes (${lista})`);
}

// ---------------- Validación pública (CLI-08) ----------------

export interface DatosValidacion {
  t: TipoDocumento;
  c: string;
  f: string;
  p: string;
  m: string;
  n: string;
}

export function enlaceValidacion(origen: string, slug: string, d: Documento, prof: Profesional | undefined, negocio: string) {
  const datos: DatosValidacion = { t: d.tipo, c: d.codigo, f: d.fecha, p: nombreProf(prof), m: prof?.matricula ?? '', n: negocio };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(datos)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${origen}/d/${slug}/validar#v=${b64}`;
}

export function leerValidacion(hash: string): DatosValidacion | null {
  const m = hash.match(/v=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const json = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))));
    return json && typeof json.c === 'string' && typeof json.t === 'string' ? (json as DatosValidacion) : null;
  } catch {
    return null;
  }
}

// ---------------- Compartir con otro médico (CLI-12) ----------------

export function compartir(c: EstadoClinico, pacienteId: string, alcance: 'todo' | 'anio' | 'resultados', horas: number, negocio: string): EstadoClinico {
  const ahora = Date.now();
  const nuevo = { id: nuevoId('co'), pacienteId, alcance, creado: new Date(ahora).toISOString(), vence: new Date(ahora + horas * 3_600_000).toISOString(), codigo: String(Math.floor(100000 + Math.random() * 899999)) };
  return registrar(agregarMensaje({ ...c, compartidos: [...c.compartidos, nuevo] }, { pacienteId, texto: MSJ.compartido(negocio) }), 'Paciente (portal)', 'Compartió su historia por tiempo limitado');
}

export const inicioHoy = (ahora = Date.now()) => +inicioDia(ahora);
