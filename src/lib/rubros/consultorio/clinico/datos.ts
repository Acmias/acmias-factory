import { precioEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';
import { DIA_MS, claveDia } from '@/lib/rubros/barberia/agenda';
import type { EstadoAgenda } from '@/lib/rubros/barberia/tipos';
import type { EstadoClinico, Evolucion, FichaClinica, Foto, ItemPresupuesto, PasoChecklist, PermisosImagen, Presupuesto, Resultado } from './tipos';

export const VERSION_CLINICO = 1;
export const PIN_DEMO = '1234';

/** Combos de indicaciones: un toque arma receta, certificado, orden y control (CLI-07). */
export const COMBOS: { id: string; nombre: string; items: { tipo: 'receta' | 'certificado' | 'orden' | 'indicacion'; texto: string }[]; control?: number }[] = [
  { id: 'gripe', nombre: 'Gripe', items: [{ tipo: 'receta', texto: 'Paracetamol 500 mg, 1 comprimido cada 8 h si hay fiebre, hasta 5 días' }, { tipo: 'certificado', texto: 'Reposo laboral por 72 horas' }, { tipo: 'indicacion', texto: 'Hidratación abundante y descanso. Volver a consultar si la fiebre dura más de 3 días.' }], control: 7 },
  { id: 'faringitis', nombre: 'Faringitis', items: [{ tipo: 'receta', texto: 'Ibuprofeno 400 mg, 1 comprimido cada 8 h con comida, 5 días' }, { tipo: 'certificado', texto: 'Reposo laboral por 48 horas' }], control: 7 },
  { id: 'anual', nombre: 'Control anual', items: [{ tipo: 'orden', texto: 'Hemograma, glucemia, perfil lipídico y orina completa' }, { tipo: 'indicacion', texto: 'Traer los resultados al próximo control.' }], control: 30 },
  { id: 'apto', nombre: 'Apto físico', items: [{ tipo: 'certificado', texto: 'Apto para actividad física recreativa' }] },
  { id: 'nutricion', nombre: 'Plan nutricional', items: [{ tipo: 'indicacion', texto: 'Plan de alimentación con 4 comidas y 2 colaciones. Registro semanal en el portal.' }], control: 30 },
];

/** Plantillas de evolución por especialidad (CLI-02). */
export const PLANTILLAS: Record<string, { campos: string[]; dictado: string }> = {
  'm-mendez': { campos: ['Motivo de consulta', 'Examen y evolución', 'Diagnóstico'], dictado: 'Paciente con fiebre de 38,1 °C desde hace 3 días y dolor de garganta. Faringe eritematosa, sin adenopatías dolorosas. Buen estado general.' },
  'm-castillo': { campos: ['Motivo de consulta', 'Evolución y hábitos', 'Objetivo'], dictado: 'Buena adherencia al plan durante el mes. Bajó 1,2 kg. Se ajustan colaciones de la tarde y se suma una caminata de 30 minutos.' },
  'm-rios': { campos: ['Motivo de consulta', 'Evaluación', 'Plan'], dictado: 'Consulta por líneas de expresión en frente y entrecejo. Piel sin lesiones activas. Se explica el procedimiento y se entrega presupuesto.' },
};

/** Lista corta de diagnósticos de ejemplo (CIE-10). */
export const DIAGNOSTICOS = ['J02.9 Faringitis aguda', 'J11.1 Gripe', 'I10 Hipertensión esencial', 'E11.9 Diabetes tipo 2', 'E66.9 Obesidad', 'Z00.0 Control general de salud', 'L57.4 Envejecimiento de la piel'];

export interface PlantillaProcedimiento {
  id: string;
  nombre: string;
  servicioId: string;
  items: [string, number][];
  incluye: string;
  noIncluye: string;
  controles: number[];
  checklist: string[];
}

export const PLANTILLAS_PROC: PlantillaProcedimiento[] = [
  {
    id: 'toxina', nombre: 'Toxina botulínica, 3 zonas', servicioId: 'q-toxina',
    items: [['Honorarios médicos', 90], ['Producto', 110], ['Control a los 15 días', 0]],
    incluye: 'Consulta previa, procedimiento y un control a los 15 días.', noIncluye: 'Retoques fuera del control incluido.',
    controles: [15], checklist: ['Consentimiento informado firmado', 'Indicaciones previas enviadas', 'Foto de antes tomada'],
  },
  {
    id: 'relleno', nombre: 'Relleno con ácido hialurónico', servicioId: 'q-toxina',
    items: [['Honorarios médicos', 100], ['Producto (1 jeringa)', 140], ['Anestesia tópica', 15], ['Controles a los 7 y 30 días', 0]],
    incluye: 'Procedimiento, anestesia tópica y dos controles.', noIncluye: 'Jeringas adicionales si hicieran falta.',
    controles: [7, 30], checklist: ['Consentimiento informado firmado', 'Indicaciones previas enviadas', 'Foto de antes tomada'],
  },
  {
    id: 'rino', nombre: 'Rinoplastia', servicioId: 'q-toxina',
    items: [['Honorarios del cirujano y ayudante', 1400], ['Anestesia', 350], ['Quirófano y materiales', 700], ['Estudios previos', 120], ['3 controles después', 0]],
    incluye: 'Cirugía, anestesia, internación del día y tres controles.', noIncluye: 'Medicación posterior y estudios fuera de los indicados.',
    controles: [7, 30, 90], checklist: ['Estudios prequirúrgicos cargados', 'Apto cardiológico', 'Consentimiento informado firmado', 'Ayuno de 8 horas confirmado', 'Foto de antes tomada'],
  },
];

const EVOL: Record<string, string[]> = {
  'm-mendez': [
    'Control de presión arterial: 130/85. Se refuerzan pautas de alimentación y actividad física.',
    'Consulta por cansancio. Examen sin hallazgos de alarma. Se pide laboratorio de rutina.',
    'Lectura de resultados dentro de lo esperado. Control en 6 meses.',
    'Apto físico para actividad deportiva recreativa. Sin contraindicaciones.',
    'Cuadro respiratorio leve de 2 días. Se indican medidas generales y control si empeora.',
  ],
  'm-castillo': [
    'Entrevista inicial. Se acuerda un plan de alimentación con objetivos semanales.',
    'Seguimiento: buena adherencia al plan. Se ajustan colaciones.',
    'Registro alimentario completo. Se suma actividad física 3 veces por semana.',
  ],
  'm-rios': [
    'Evaluación estética. Se explica el procedimiento, cuidados previos y posteriores. Se entrega presupuesto.',
    'Control posterior: resultado simétrico, sin efectos adversos. Se toma foto de control.',
  ],
};

function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const codigoDemo = (r: () => number = Math.random) => `DEMO-${Math.floor(r() * 36 ** 6).toString(36).toUpperCase().padStart(6, '0')}`;

export function itemsDe(pl: PlantillaProcedimiento, moneda: string): ItemPresupuesto[] {
  return pl.items.map(([concepto, base]) => ({ concepto, monto: base ? precioEjemplo(base, moneda) : 0 }));
}

export const checklistDe = (pl: PlantillaProcedimiento): PasoChecklist[] => pl.checklist.map((texto, i) => ({ id: `k${i + 1}`, texto, hecho: false }));

/**
 * Datos clínicos ficticios coherentes con la agenda de ejemplo: evoluciones de los turnos atendidos,
 * recetas, resultados con valores, presupuestos de estética en todos los estados, fotos (ilustraciones),
 * permisos de imagen y grupo familiar.
 */
export function crearClinico(agenda: EstadoAgenda, moneda: string, ahora = Date.now()): EstadoClinico {
  const r = azar(4242);
  const cl = agenda.clientes;
  const id = (n: number) => cl[n % cl.length].id;
  const iso = (dias: number) => new Date(ahora + dias * DIA_MS).toISOString();
  const dia = (dias: number) => claveDia(ahora + dias * DIA_MS);

  const fichas: FichaClinica[] = cl.map((c) => ({ pacienteId: c.id, alergias: [], antecedentes: 'Sin antecedentes relevantes.', medicacion: 'Ninguna.' }));
  const ficha = (n: number) => fichas[n % fichas.length];
  Object.assign(ficha(0), { alergias: ['Penicilina'], antecedentes: 'Hipertensión arterial desde 2021.', medicacion: 'Enalapril 10 mg por día.', cronico: 'Hipertensión arterial', proximoControl: dia(9) });
  ['Hipertensión arterial', 'Diabetes tipo 2', 'Hipertensión arterial', 'Hipotiroidismo', 'Diabetes tipo 2', 'Asma', 'Hipertensión arterial', 'Dislipemia', 'Diabetes tipo 2', 'Hipertensión arterial'].forEach((cronico, k) => {
    // Diez pacientes crónicos con el control vencido: la lista de trabajo del reporte.
    Object.assign(ficha(3 + k * 2), { cronico, proximoControl: dia(-10 - k * 9), antecedentes: `${cronico}.` });
  });
  Object.assign(ficha(4), { alergias: ['Ibuprofeno'] });
  Object.assign(ficha(12), { alergias: ['Látex'] });

  // Evoluciones firmadas de los turnos ya atendidos.
  const atendidos = agenda.turnos.filter((t) => t.estado === 'atendido' && +new Date(t.fin) <= ahora);
  const evoluciones: Evolucion[] = atendidos.map((t, i) => {
    const textos = EVOL[t.profId] ?? EVOL['m-mendez'];
    return { id: `ev${i + 1}`, pacienteId: t.clienteId, profId: t.profId, turnoId: t.id, fecha: t.fin, motivo: t.profId === 'm-castillo' ? 'Seguimiento nutricional' : t.profId === 'm-rios' ? 'Evaluación estética' : 'Consulta clínica', texto: textos[Math.floor(r() * textos.length)], agregados: [] };
  });
  const docs = evoluciones.filter((_, i) => i % 4 === 0).map((e, i) => ({
    id: `doc${i + 1}`,
    codigo: codigoDemo(r),
    tipo: (i % 3 === 0 ? 'certificado' : i % 3 === 1 ? 'receta' : 'orden') as 'certificado' | 'receta' | 'orden',
    pacienteId: e.pacienteId,
    profId: e.profId,
    fecha: e.fecha,
    texto: i % 3 === 0 ? 'Apto para actividad física recreativa' : i % 3 === 1 ? 'Enalapril 10 mg, 1 comprimido por día, 30 días' : 'Hemograma, glucemia y perfil lipídico',
    evolucionId: e.id,
  }));

  // Resultados: la paciente habitual con tres análisis para el gráfico de evolución.
  const val = (g: number, c: number) => [
    { nombre: 'Glucemia', valor: g, unidad: 'mg/dl', rango: [70, 110] as [number, number] },
    { nombre: 'Colesterol total', valor: c, unidad: 'mg/dl', rango: [0, 200] as [number, number] },
  ];
  const resultados: Resultado[] = [
    { id: 'r1', pacienteId: id(0), profId: 'm-mendez', fecha: iso(-180), estudio: 'Análisis de sangre', origen: 'laboratorio', estado: 'revisado', comentario: 'Valores dentro de lo esperado. Seguimos igual.', valores: val(98, 214) },
    { id: 'r2', pacienteId: id(0), profId: 'm-mendez', fecha: iso(-90), estudio: 'Análisis de sangre', origen: 'laboratorio', estado: 'revisado', comentario: 'El colesterol bajó. Muy bien con los cambios de alimentación.', valores: val(101, 199) },
    { id: 'r3', pacienteId: id(0), profId: 'm-mendez', fecha: iso(-2), estudio: 'Análisis de sangre', origen: 'laboratorio', estado: 'pendiente', valores: val(104, 186) },
  ];
  const estudios = ['Análisis de sangre', 'Electrocardiograma', 'Ecografía abdominal', 'Análisis de orina'];
  for (let k = 0; k < 9; k++) {
    const g = k % 3 === 0 ? 128 + k : 88 + k * 2;
    resultados.push({ id: `r${4 + k}`, pacienteId: id(5 + k * 2), profId: 'm-mendez', fecha: iso(-1 - k), estudio: estudios[k % 4], origen: k % 2 ? 'paciente' : 'laboratorio', estado: 'pendiente', valores: estudios[k % 4] === 'Análisis de sangre' ? val(g, 170 + k * 6) : [] });
  }

  // Presupuestos de la Dra. Ríos en todos los estados del tablero.
  const pl = (x: string) => PLANTILLAS_PROC.find((p) => p.id === x)!;
  const pres = (n: number, pid: number, plantilla: string, extra: Partial<Presupuesto>, creadoDias: number): Presupuesto => {
    const p = pl(plantilla);
    return {
      id: `pr${n}`, codigo: codigoDemo(r), pacienteId: id(pid), profId: 'm-rios', procedimiento: p.nombre, servicioId: p.servicioId,
      items: itemsDe(p, moneda), incluye: p.incluye, noIncluye: p.noIncluye, creado: iso(creadoDias), validoHasta: iso(creadoDias + 30), version: 1,
      estado: 'enviado', enviado: iso(creadoDias), checklist: checklistDe(p), controles: [], ...extra,
    };
  };
  const presupuestos: Presupuesto[] = [
    pres(1, 14, 'relleno', {}, 0),
    pres(2, 16, 'toxina', {}, -1),
    pres(3, 18, 'rino', { version: 2 }, -2),
    pres(4, 20, 'rino', { estado: 'visto', visto: iso(-4) }, -6),
    pres(5, 22, 'relleno', { estado: 'visto', visto: iso(-5) }, -7),
    pres(6, 24, 'rino', { estado: 'consulta', visto: iso(-2), consulta: '¿Se puede pagar en cuotas?' }, -3),
    pres(7, 0, 'toxina', { estado: 'aceptado', visto: iso(-8), plan: 'sena', firma: { nombre: cl[0].nombre, fecha: iso(-7) }, sena: 'pagada' }, -9),
    pres(8, 26, 'relleno', { estado: 'aceptado', visto: iso(-3), plan: 'contado', firma: { nombre: cl[26 % cl.length].nombre, fecha: iso(-2) }, sena: 'pendiente' }, -4),
    pres(9, 10, 'relleno', { estado: 'rechazado', visto: iso(-20), motivoRechazo: 'Precio' }, -22),
    pres(10, 12, 'rino', { estado: 'rechazado', visto: iso(-30), motivoRechazo: 'Precio' }, -33),
    pres(11, 8, 'toxina', { estado: 'rechazado', visto: iso(-15), motivoRechazo: 'Prefiere esperar' }, -16),
    pres(12, 6, 'toxina', { estado: 'vencido', visto: iso(-40) }, -45),
  ];
  // Procedimientos hechos hace 4 a 6 meses: la lista de "retoques pendientes".
  [2, 4, 9, 11, 13, 15, 17, 19].forEach((pid, k) => {
    const dias = -130 - k * 7;
    presupuestos.push(pres(13 + k, pid, 'toxina', { estado: 'aceptado', visto: iso(dias - 3), plan: 'contado', firma: { nombre: cl[pid % cl.length].nombre, fecha: iso(dias - 2) }, sena: 'pagada', realizado: iso(dias), checklist: checklistDe(pl('toxina')).map((x) => ({ ...x, hecho: true })), controles: [{ dias: 15, fecha: iso(dias + 15), hecho: true }] }, dias - 5));
  });

  // Galería: ilustraciones genéricas, nunca fotos de personas.
  const fotos: Foto[] = [];
  const permisos: Record<string, PermisosImagen> = {};
  [0, 2, 4, 9].forEach((pid, k) => {
    const pac = id(pid);
    const antes = k === 0 ? -9 : -130 - k * 7;
    fotos.push({ id: `f${k}a`, pacienteId: pac, fecha: iso(antes), zona: 'Frente y entrecejo', momento: 'antes', dibujo: 0 });
    fotos.push({ id: `f${k}b`, pacienteId: pac, fecha: iso(k === 0 ? -1 : antes + 15), zona: 'Frente y entrecejo', momento: 'despues', dibujo: 1 });
    permisos[pac] = { historia: true, academico: k !== 2, publicidadSinRostro: k === 1, publicidadConRostro: false, firmado: iso(antes - 1) };
  });

  const tomas = cl.find((c) => c.nombre === 'Tomás Martínez');
  return {
    version: VERSION_CLINICO,
    variante: 'clinica',
    rol: 'medico',
    medicoId: 'm-mendez',
    pin: PIN_DEMO,
    fichas,
    evoluciones,
    documentos: docs,
    resultados,
    presupuestos,
    fotos,
    permisos,
    accesos: [],
    mensajes: [
      { id: 'mj1', pacienteId: id(0), fecha: iso(-3), texto: `Hola ${cl[0].nombre.split(' ')[0]}, te esperamos en el próximo turno. Si no podés venir, avisanos desde este enlace.`, boton: { texto: 'Ver mi turno', destino: 'portal' } },
    ],
    compartidos: [],
    familias: tomas ? { [id(0)]: [tomas.id] } : {},
    invitaciones: [],
  };
}
