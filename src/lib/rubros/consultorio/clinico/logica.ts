import { DIA_MS, claveDia, inicioDia, lunesDe, sumarDias } from '@/lib/rubros/barberia/agenda';
import type { Cliente, EstadoAgenda, Profesional } from '@/lib/rubros/barberia/tipos';
import { PARTICULAR } from '@/lib/rubros/consultorio/datos-ejemplo';
import { COMBOS, PLANTILLAS_PROC, codigoDemo } from './datos';
import type { Alquiler, Cobro, Documento, EstadoClinico, Evolucion, MedioPago, Mensaje, PlanPago, Preconsulta, Presupuesto, Resultado, TipoDocumento } from './tipos';

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
  let estado: EstadoClinico = {
    ...c,
    evoluciones: [...c.evoluciones, evolucion],
    documentos: [...c.documentos, ...documentos],
    llegadas: d.turnoId ? c.llegadas.map((l) => (l.turnoId === d.turnoId && !l.atendido ? { ...l, atendido: fecha } : l)) : c.llegadas,
  };
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

export function pagarSena(c: EstadoClinico, id: string, negocio: string, medio: MedioPago = 'link'): EstadoClinico {
  const p = c.presupuestos.find((x) => x.id === id);
  if (!p) return c;
  const m = montosPlan(p, p.plan ?? 'contado');
  const cobro: Cobro = { id: nuevoId('cb'), fecha: new Date().toISOString(), concepto: `${p.plan === 'contado' ? 'Pago' : 'Seña'} · ${p.procedimiento}`, monto: m.ahora, medio, origen: 'presupuesto', profId: p.profId, pacienteId: p.pacienteId };
  return agregarMensaje({ ...actualizarPresupuesto(c, id, { sena: 'pagada' }), cobros: [...c.cobros, cobro] }, { pacienteId: p.pacienteId, texto: MSJ.sena(negocio) });
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

// ---------------- Preconsulta (F3) ----------------

export function guardarPreconsulta(c: EstadoClinico, d: Omit<Preconsulta, 'id' | 'fecha'>, profId: string): EstadoClinico {
  const fecha = new Date().toISOString();
  const pre: Preconsulta = { ...d, id: nuevoId('pc'), fecha };
  const estudios: Resultado[] = d.archivos.map((nombre, i) => ({ id: nuevoId(`rp${i}`), pacienteId: d.pacienteId, profId, fecha, estudio: nombre, origen: 'paciente', estado: 'pendiente', valores: [] }));
  return registrar({ ...c, preconsultas: [...c.preconsultas.filter((x) => x.turnoId !== d.turnoId), pre], resultados: [...c.resultados, ...estudios] }, 'Paciente (portal)', 'Completó la preconsulta');
}

export const preconsultaDe = (c: EstadoClinico, turnoId?: string) => (turnoId ? c.preconsultas.find((p) => p.turnoId === turnoId) : undefined);

// ---------------- Check-in y cola (F4) ----------------

export function registrarLlegada(c: EstadoClinico, turnoId: string): EstadoClinico {
  if (c.llegadas.some((l) => l.turnoId === turnoId)) return c;
  return { ...c, llegadas: [...c.llegadas, { turnoId, fecha: new Date().toISOString() }] };
}

/** Sala de espera de un profesional: los que llegaron y no pasaron, en el orden de sus turnos. */
export function salaDeEspera(agenda: EstadoAgenda, c: EstadoClinico, profId?: string) {
  return c.llegadas
    .filter((l) => !l.atendido)
    .map((l) => ({ llegada: l, turno: agenda.turnos.find((t) => t.id === l.turnoId) }))
    .filter((x): x is { llegada: typeof x.llegada; turno: NonNullable<typeof x.turno> } => !!x.turno && x.turno.estado !== 'atendido' && x.turno.estado !== 'cancelado' && (!profId || x.turno.profId === profId))
    .sort((a, b) => a.turno.inicio.localeCompare(b.turno.inicio));
}

export const marcarPasado = (c: EstadoClinico, turnoId: string): EstadoClinico => ({ ...c, llegadas: c.llegadas.map((l) => (l.turnoId === turnoId && !l.atendido ? { ...l, atendido: new Date().toISOString() } : l)) });

// ---------------- Caja y honorarios (F11) ----------------

export const NOMBRE_MEDIO: Record<MedioPago, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', link: 'Link de pago' };

export function cobrosDelDia(c: EstadoClinico, dia: string) {
  return c.cobros.filter((x) => claveDia(x.fecha) === dia).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function porMedio(cobros: Cobro[]) {
  const m: Record<MedioPago, number> = { efectivo: 0, transferencia: 0, tarjeta: 0, link: 0 };
  for (const x of cobros) m[x.medio] += x.monto;
  return m;
}

/** Consultas atendidas hoy: las particulares que faltan cobrar y las de cobertura (se liquidan aparte). */
export function consultasDelDia(agenda: EstadoAgenda, c: EstadoClinico, dia: string) {
  const precio = new Map(agenda.servicios.map((s) => [s.id, s.precio]));
  const at = agenda.turnos.filter((t) => t.estado === 'atendido' && claveDia(t.inicio) === dia && (precio.get(t.servicioId) ?? 0) > 0);
  const cobrado = new Set(c.cobros.map((x) => x.turnoId).filter(Boolean));
  return {
    sinCobrar: at.filter((t) => (t.cobertura ?? PARTICULAR) === PARTICULAR && !cobrado.has(t.id)).map((t) => ({ turno: t, monto: precio.get(t.servicioId) ?? 0 })),
    coberturas: at.filter((t) => (t.cobertura ?? PARTICULAR) !== PARTICULAR).map((t) => ({ turno: t, monto: precio.get(t.servicioId) ?? 0 })),
  };
}

export function cobrarTurno(c: EstadoClinico, agenda: EstadoAgenda, turnoId: string, medio: MedioPago, quien: string): EstadoClinico {
  const t = agenda.turnos.find((x) => x.id === turnoId);
  if (!t) return c;
  const s = agenda.servicios.find((x) => x.id === t.servicioId);
  const cobro: Cobro = { id: nuevoId('cb'), fecha: new Date().toISOString(), concepto: s?.nombre ?? 'Consulta', monto: s?.precio ?? 0, medio, origen: 'consulta', profId: t.profId, pacienteId: t.clienteId, turnoId };
  return registrar({ ...c, cobros: [...c.cobros, cobro] }, quien, `Cobró una consulta (${NOMBRE_MEDIO[medio]})`);
}

export function cobroManual(c: EstadoClinico, concepto: string, monto: number, medio: MedioPago, quien: string): EstadoClinico {
  return registrar({ ...c, cobros: [...c.cobros, { id: nuevoId('cb'), fecha: new Date().toISOString(), concepto: concepto.trim(), monto, medio, origen: 'manual' }] }, quien, 'Registró un cobro manual');
}

export function cerrarCaja(c: EstadoClinico, dia: string, quien: string): EstadoClinico {
  const total = cobrosDelDia(c, dia).reduce((a, x) => a + x.monto, 0);
  return registrar({ ...c, cierres: [...c.cierres.filter((x) => x.dia !== dia), { dia, fecha: new Date().toISOString(), total, quien }] }, quien, 'Cerró la caja del día');
}

/** Honorarios por profesional: lo cobrado de sus consultas y procedimientos, menos el porcentaje del consultorio. */
export function honorarios(agenda: EstadoAgenda, c: EstadoClinico, desde: number) {
  return agenda.profesionales.map((p) => {
    const cobrado = c.cobros.filter((x) => x.profId === p.id && +new Date(x.fecha) >= desde && x.origen !== 'alquiler').reduce((a, x) => a + x.monto, 0);
    const consultorio = Math.round((cobrado * c.porcConsultorio) / 100);
    return { prof: p, cobrado, consultorio, profesional: cobrado - consultorio };
  });
}

// ---------------- Alquiler de consultorios (F11) ----------------

export function solapaAlquiler(c: EstadoClinico, espacioId: string, inicio: number, fin: number, ignorar?: string) {
  return c.alquileres.some((a) => a.id !== ignorar && a.espacioId === espacioId && inicio < +new Date(a.fin) && fin > +new Date(a.inicio));
}

export function agregarAlquiler(c: EstadoClinico, a: Omit<Alquiler, 'id' | 'cobrado'>, quien: string): { error: string } | { estado: EstadoClinico } {
  const ini = +new Date(a.inicio);
  const fin = +new Date(a.fin);
  if (!(fin > ini)) return { error: 'La hora de fin tiene que ser después de la de inicio.' };
  if (solapaAlquiler(c, a.espacioId, ini, fin)) return { error: 'Ese consultorio ya está alquilado en ese horario.' };
  return { estado: registrar({ ...c, alquileres: [...c.alquileres, { ...a, id: nuevoId('al'), cobrado: false }] }, quien, `Alquiló un consultorio a ${a.colega}`) };
}

export function cobrarAlquiler(c: EstadoClinico, id: string, medio: MedioPago, quien: string): EstadoClinico {
  const a = c.alquileres.find((x) => x.id === id);
  if (!a) return c;
  const esp = c.espacios.find((e) => e.id === a.espacioId);
  const cobro: Cobro = { id: nuevoId('cb'), fecha: new Date().toISOString(), concepto: `Alquiler ${esp?.nombre ?? ''} · ${a.colega}`, monto: a.monto, medio, origen: 'alquiler' };
  return registrar({ ...c, alquileres: c.alquileres.map((x) => (x.id === id ? { ...x, cobrado: true } : x)), cobros: [...c.cobros, cobro] }, quien, 'Cobró un alquiler');
}

// ---------------- Insumos y margen ----------------

export const plantillaDe = (p: Pick<Presupuesto, 'procedimiento'>) => PLANTILLAS_PROC.find((x) => x.nombre === p.procedimiento);

/** Descuenta del stock los insumos del procedimiento y los deja registrados en el presupuesto. */
export function consumirInsumos(c: EstadoClinico, presupuestoId: string): EstadoClinico {
  const p = c.presupuestos.find((x) => x.id === presupuestoId);
  const pl = p && plantillaDe(p);
  if (!p || !pl) return c;
  const usados = pl.consumos.map(([insumoId, cantidad]) => ({ insumoId, cantidad }));
  return {
    ...actualizarPresupuesto(c, presupuestoId, { insumosUsados: usados }),
    insumos: c.insumos.map((i) => {
      const u = usados.find((x) => x.insumoId === i.id);
      return u ? { ...i, stock: Math.max(0, i.stock - u.cantidad) } : i;
    }),
  };
}

export function costoInsumos(c: EstadoClinico, p: Pick<Presupuesto, 'procedimiento'> & { insumosUsados?: Presupuesto['insumosUsados'] }) {
  const usados = p.insumosUsados ?? (plantillaDe(p)?.consumos ?? []).map(([insumoId, cantidad]) => ({ insumoId, cantidad }));
  return usados.reduce((a, u) => a + (c.insumos.find((i) => i.id === u.insumoId)?.costo ?? 0) * u.cantidad, 0);
}

/** Margen por procedimiento: lo cobrado menos los insumos (los honorarios de terceros van aparte). */
export function margenPorProcedimiento(c: EstadoClinico) {
  const m = new Map<string, { cantidad: number; ingreso: number; costo: number }>();
  for (const p of c.presupuestos.filter((x) => x.estado === 'aceptado')) {
    const x = m.get(p.procedimiento) ?? { cantidad: 0, ingreso: 0, costo: 0 };
    x.cantidad++;
    x.ingreso += totalDe(p);
    x.costo += costoInsumos(c, p);
    m.set(p.procedimiento, x);
  }
  return [...m.entries()].map(([nombre, x]) => ({ nombre, ...x, margen: x.ingreso - x.costo, porc: x.ingreso ? Math.round(((x.ingreso - x.costo) / x.ingreso) * 100) : 0 })).sort((a, b) => b.ingreso - a.ingreso);
}

export function registrarEntrada(c: EstadoClinico, insumoId: string, cantidad: number, quien: string): EstadoClinico {
  return registrar({ ...c, insumos: c.insumos.map((i) => (i.id === insumoId ? { ...i, stock: i.stock + cantidad } : i)) }, quien, 'Registró una entrada de insumos');
}

// ---------------- Paquetes por especialidad (R7) ----------------

export function edad(nacimiento: string, ahora = Date.now()) {
  const n = new Date(nacimiento + 'T12:00');
  const d = new Date(ahora);
  let a = d.getFullYear() - n.getFullYear();
  if (d.getMonth() < n.getMonth() || (d.getMonth() === n.getMonth() && d.getDate() < n.getDate())) a--;
  return a;
}

export function pediatria(agenda: EstadoAgenda, c: EstadoClinico, ahora = Date.now()) {
  const hoy = claveDia(ahora);
  const ninos = c.fichas.filter((f) => f.nacimiento);
  return {
    ninos: ninos.length,
    controlVencido: ninos.filter((f) => f.proximoControl && f.proximoControl < hoy && !tieneTurnoFuturo(agenda, f.pacienteId, ahora)).map((f) => f.pacienteId),
    vacunas: ninos.filter((f) => f.vacunasPendientes?.length).map((f) => f.pacienteId),
  };
}

export function nutricion(agenda: EstadoAgenda, c: EstadoClinico, ahora = Date.now()) {
  const ids = [...new Set(c.resultados.filter((r) => r.valores.some((v) => v.nombre === 'Peso')).map((r) => r.pacienteId))];
  const series = ids.map((id) => ({ id, s: serie(c, id, 'Peso') })).filter((x) => x.s.length > 1);
  const bajas = series.map((x) => x.s[0].valor - x.s[x.s.length - 1].valor);
  const ultimoNutri = (id: string) => Math.max(0, ...agenda.turnos.filter((t) => t.clienteId === id && t.profId === 'm-castillo' && t.estado === 'atendido').map((t) => +new Date(t.inicio)));
  return {
    pacientes: series.length,
    bajaPromedio: bajas.length ? Math.round((bajas.reduce((a, b) => a + b, 0) / bajas.length) * 10) / 10 : 0,
    objetivo: series.filter((x) => x.s[x.s.length - 1].valor <= x.s[0].rango[1]).length,
    sinSeguimiento: series.filter((x) => ultimoNutri(x.id) < ahora - 30 * DIA_MS && !tieneTurnoFuturo(agenda, x.id, ahora)).map((x) => x.id),
    ejemplo: series[0],
  };
}
