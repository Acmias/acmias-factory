import { precioEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';
import { sumarMeses, vencimiento } from '@/lib/rubros/contador/periodos';
import { DIA, agregarGasto, cargarSueldos, cerrarMes, registrarAvisos, registrarPago, situacion, textoExpensa } from './logica';
import type { Edificio, EstadoConsorcio, Obra, Personal, Rubro, TipoGasto, Unidad } from './tipos';

export const VERSION_CONSORCIO = 1;

function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const APELLIDOS = ['Gómez', 'Fernández', 'López', 'Martínez', 'Rodríguez', 'Pérez', 'García', 'Sánchez', 'Romero', 'Sosa', 'Álvarez', 'Torres', 'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Benítez', 'Medina', 'Herrera', 'Suárez', 'Aguirre', 'Giménez', 'Molina', 'Silva', 'Castro', 'Rojas', 'Ortiz', 'Núñez', 'Luna', 'Juárez', 'Cabrera', 'Ríos', 'Ferreyra', 'Godoy', 'Morales', 'Domínguez'];
const NOMBRES = ['María', 'Juan', 'Ana', 'Carlos', 'Laura', 'Jorge', 'Silvia', 'Roberto', 'Claudia', 'Diego', 'Patricia', 'Martín', 'Graciela', 'Pablo', 'Mónica', 'Sergio', 'Valeria', 'Hernán', 'Gabriela', 'Luis', 'Natalia', 'Ricardo', 'Lucía', 'Fernando', 'Carolina', 'Gustavo', 'Florencia', 'Alejandro', 'Daniela', 'Marcelo'];

/** Tres edificios ficticios en Caseros (Tres de Febrero, Provincia de Buenos Aires). */
const EDIFICIOS: (Omit<Edificio, 'honorarios' | 'seguro' | 'espacio'> & { pisos: number; deptos: string[]; honorarios: number; seguro: number; espacio?: { nombre: string; base: number; turnos: string[]; reglas: string } })[] = [
  {
    id: 'ed-alamos', nombre: 'Edificio Los Álamos', direccion: 'Calle de los Álamos 1250', localidad: 'Caseros, Tres de Febrero', cuit: '30-71234567-1', claveSindical: '4021-7', vencimientoDia: 10, interesMensual: 3, fondoReservaPct: 5,
    banco: { entidad: 'Banco de ejemplo', cbu: '0000000000000012500001' }, mp: { vinculada: true, cuenta: 'consorcio.alamos.mp', titular: 'Consorcio de Propietarios Edificio Los Álamos' },
    pisos: 6, deptos: ['A', 'B', 'C', 'D'], honorarios: 190, seguro: 95,
    espacio: { nombre: 'Salón de fiestas', base: 25, turnos: ['Mediodía (12 a 17 h)', 'Noche (20 a 2 h)'], reglas: 'Hasta 40 personas. Se entrega limpio. Música hasta la 1 h.' },
  },
  {
    id: 'ed-jacaranda', nombre: 'Torre Jacarandá', direccion: 'Pasaje Jacarandá 780', localidad: 'Caseros, Tres de Febrero', cuit: '30-71345678-2', claveSindical: '4188-3', vencimientoDia: 10, interesMensual: 3, fondoReservaPct: 5,
    banco: { entidad: 'Banco de ejemplo', cbu: '0000000000000078000002' }, mp: { vinculada: true, cuenta: 'consorcio.jacaranda.mp', titular: 'Consorcio de Propietarios Torre Jacarandá' },
    pisos: 7, deptos: ['A', 'B', 'C', 'D'], honorarios: 220, seguro: 110,
    espacio: { nombre: 'SUM con parrilla', base: 35, turnos: ['Mediodía (12 a 18 h)', 'Noche (20 a 2 h)'], reglas: 'Hasta 30 personas. Carbón y limpieza a cargo de quien reserva.' },
  },
  {
    id: 'ed-plaza', nombre: 'Edificio Plaza', direccion: 'Calle del Parque 455', localidad: 'Caseros, Tres de Febrero', cuit: '30-71456789-3', claveSindical: '—', vencimientoDia: 10, interesMensual: 3, fondoReservaPct: 4,
    banco: { entidad: 'Banco de ejemplo', cbu: '0000000000000045500003' }, mp: { vinculada: false, cuenta: '', titular: '' },
    pisos: 6, deptos: ['A', 'B'], honorarios: 130, seguro: 60,
    espacio: { nombre: 'Quincho', base: 18, turnos: ['Mediodía (12 a 17 h)', 'Noche (20 a 1 h)'], reglas: 'Hasta 20 personas.' },
  },
];

const PERSONAL: (Omit<Personal, 'id' | 'sueldo' | 'cargas'> & { sueldo: number; cargas: number })[] = [
  { edificioId: 'ed-alamos', nombre: 'Ramón Ortiz', rol: 'Encargado permanente con vivienda', categoria: '1ª categoría', horario: 'Lunes a viernes 7 a 15 h · sábados 7 a 12 h', sueldo: 640, cargas: 290, tercerizado: false, whatsapp: '5491155520011' },
  { edificioId: 'ed-alamos', nombre: 'Elsa Duarte', rol: 'Suplente', categoria: 'Jornalizada', horario: 'Francos y vacaciones', sueldo: 180, cargas: 80, tercerizado: false },
  { edificioId: 'ed-alamos', nombre: 'Ascensores del Oeste', rol: 'Mantenimiento de ascensores (abono)', horario: 'Visita mensual', sueldo: 0, cargas: 0, tercerizado: true },
  { edificioId: 'ed-jacaranda', nombre: 'Walter Benítez', rol: 'Encargado permanente sin vivienda', categoria: '2ª categoría', horario: 'Lunes a viernes 8 a 16 h', sueldo: 600, cargas: 270, tercerizado: false, whatsapp: '5491155520022' },
  { edificioId: 'ed-jacaranda', nombre: 'Lucas Ferreyra', rol: 'Ayudante media jornada', categoria: 'Ayudante', horario: 'Lunes a viernes 14 a 18 h', sueldo: 320, cargas: 145, tercerizado: false },
  { edificioId: 'ed-jacaranda', nombre: 'Ascensores del Oeste', rol: 'Mantenimiento de ascensores (abono)', horario: 'Visita mensual', sueldo: 0, cargas: 0, tercerizado: true },
  { edificioId: 'ed-plaza', nombre: 'Limpiezas Brillo', rol: 'Limpieza de espacios comunes (empresa)', horario: 'Martes y viernes 9 a 13 h', sueldo: 0, cargas: 0, tercerizado: true },
];

/** Gastos fijos del mes por edificio (en unidades base; se escalan a la moneda). */
const FIJOS: { rubro: Rubro; detalle: string; proveedor: string; cuit: string; base: number; tipo?: TipoGasto; solo?: string[] }[] = [
  { rubro: 'servicios', detalle: 'Luz de espacios comunes', proveedor: 'Distribuidora eléctrica', cuit: '30-50000001-1', base: 120 },
  { rubro: 'servicios', detalle: 'Agua y cloacas', proveedor: 'Servicio de agua', cuit: '30-50000002-2', base: 80 },
  { rubro: 'abonos', detalle: 'Abono mensual de ascensores', proveedor: 'Ascensores del Oeste', cuit: '30-60000011-4', base: 140, solo: ['ed-alamos', 'ed-jacaranda'] },
  { rubro: 'abonos', detalle: 'Control de matafuegos', proveedor: 'Matafuegos Caseros', cuit: '20-28000012-5', base: 25 },
  { rubro: 'limpieza', detalle: 'Artículos de limpieza', proveedor: 'Distribuidora de limpieza', cuit: '30-60000013-6', base: 45, solo: ['ed-alamos', 'ed-jacaranda'] },
  { rubro: 'limpieza', detalle: 'Servicio de limpieza (factura mensual)', proveedor: 'Limpiezas Brillo', cuit: '30-60000014-7', base: 420, solo: ['ed-plaza'] },
  { rubro: 'bancarios', detalle: 'Mantenimiento de cuenta y comisiones', proveedor: 'Banco de ejemplo', cuit: '30-50000003-3', base: 12 },
  { rubro: 'administracion', detalle: 'Fotocopias, librería y correo', proveedor: 'Librería del Centro', cuit: '20-30000015-8', base: 10 },
];

const VARIABLES: { rubro: Rubro; detalle: string; proveedor: string; cuit: string; base: number }[] = [
  { rubro: 'reparaciones', detalle: 'Cambio de cerradura de la puerta de entrada', proveedor: 'Cerrajería San Martín', cuit: '20-31000021-1', base: 60 },
  { rubro: 'reparaciones', detalle: 'Reparación de pérdida en cañería de palier', proveedor: 'Plomería Hnos. Vega', cuit: '20-32000022-2', base: 85 },
  { rubro: 'reparaciones', detalle: 'Reemplazo de luminarias LED en escaleras', proveedor: 'Electricidad Caseros', cuit: '20-33000023-3', base: 55 },
  { rubro: 'otros', detalle: 'Fumigación y desratización', proveedor: 'Control de Plagas Oeste', cuit: '30-60000024-4', base: 40 },
  { rubro: 'abonos', detalle: 'Limpieza de tanque de agua (semestral)', proveedor: 'Tanques Limpios', cuit: '30-60000025-5', base: 70 },
];

const OBRAS: Obra[] = [
  {
    id: 'o-terraza', edificioId: 'ed-alamos', titulo: 'Impermeabilización de terraza', descripcion: 'Filtraciones en los departamentos del 6° piso. Se impermeabiliza toda la terraza con membrana líquida y se cambian las babetas.',
    estado: 'terminada', cuotas: 3, aprobadaPor: 'Consejo de propietarios', creada: '',
    presupuestos: [
      { id: 'pr1', proveedor: 'Techos Sur', cuit: '30-61000031-1', materiales: 1300, manoObra: 1500, plazoDias: 12, garantiaMeses: 60, validezDias: 30, seguros: true, elegido: true },
      { id: 'pr2', proveedor: 'Impermeabilizaciones Ramos', cuit: '20-34000032-2', materiales: 1500, manoObra: 1700, plazoDias: 15, garantiaMeses: 36, validezDias: 15, seguros: true },
    ],
    evidencias: [
      { id: 'ev1', etapa: 'antes', fecha: '', nota: 'Membrana vieja con fisuras sobre el 6° A y el 6° B.' },
      { id: 'ev2', etapa: 'durante', fecha: '', nota: 'Limpieza, sellado de fisuras y primera mano de membrana.' },
      { id: 'ev3', etapa: 'despues', fecha: '', nota: 'Terraza terminada con tres manos y babetas nuevas. Garantía de 5 años.' },
    ],
  },
  {
    id: 'o-pintura', edificioId: 'ed-jacaranda', titulo: 'Pintura de hall y escaleras', descripcion: 'Pintura completa de hall de entrada, palieres y escaleras (7 pisos). Se piden tres presupuestos para la asamblea.',
    estado: 'presupuestos', cuotas: 2, creada: '',
    presupuestos: [
      { id: 'pr3', proveedor: 'Pinturas Lomas', cuit: '20-35000033-3', materiales: 900, manoObra: 1600, plazoDias: 20, garantiaMeses: 12, validezDias: 30, seguros: true },
      { id: 'pr4', proveedor: 'Color Oeste', cuit: '30-62000034-4', materiales: 1100, manoObra: 1400, plazoDias: 18, garantiaMeses: 12, validezDias: 20, seguros: true },
      { id: 'pr5', proveedor: 'Pintor independiente', cuit: '', materiales: 0, manoObra: 1900, plazoDias: 0, garantiaMeses: 0, validezDias: 10, seguros: false },
    ],
    evidencias: [{ id: 'ev4', etapa: 'antes', fecha: '', nota: 'Paredes del hall con humedad y pintura descascarada.' }],
  },
  {
    id: 'o-bomba', edificioId: 'ed-plaza', titulo: 'Cambio de bomba de agua', descripcion: 'La bomba elevadora quedó sin presión. Se reemplaza por una nueva con tablero de alternancia.',
    estado: 'en-curso', cuotas: 1, aprobadaPor: 'Urgencia (Ley 14.701, art. 13)', creada: '',
    presupuestos: [{ id: 'pr6', proveedor: 'Bombas y Tanques Oeste', cuit: '30-63000035-5', materiales: 520, manoObra: 230, plazoDias: 3, garantiaMeses: 12, validezDias: 7, seguros: true, elegido: true }],
    evidencias: [
      { id: 'ev5', etapa: 'antes', fecha: '', nota: 'Bomba vieja con pérdida y motor recalentado.' },
      { id: 'ev6', etapa: 'durante', fecha: '', nota: 'Bomba nueva instalada; falta conectar el tablero de alternancia.' },
    ],
  },
];

const codigo = (r: () => number, pref: string, uf: string) => `${pref}-${uf.replace(/[^0-9A-Z]/gi, '')}-${Math.floor(r() * 36 ** 3).toString(36).toUpperCase().padStart(3, '0')}`;

/**
 * Administración de ejemplo: 3 edificios, 64 unidades, agosto a octubre liquidados con sus pagos,
 * noviembre abierto con gastos cargados, morosos, obras con evidencias, SUM, comunicados y reclamos.
 */
export function crearEstadoConsorcio(moneda: string, negocio = 'Administración de ejemplo', ahora = Date.now()): EstadoConsorcio {
  const r = azar(1414);
  const P = (base: number) => precioEjemplo(base, moneda);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const edificios: Edificio[] = EDIFICIOS.map(({ pisos, deptos, honorarios, seguro, espacio, ...ed }) => ({
    ...ed,
    honorarios: P(honorarios),
    seguro: { compania: 'Aseguradora de ejemplo', poliza: `IC-${ed.cuit.slice(3, 8)}`, vence: '2027-06-30', cuota: P(seguro) },
    ...(espacio ? { espacio: { nombre: espacio.nombre, precio: P(espacio.base), turnos: espacio.turnos, reglas: espacio.reglas } } : {}),
  }));

  let n = 0;
  const unidades: Unidad[] = [];
  for (const ed of EDIFICIOS) {
    const pref = ed.id === 'ed-alamos' ? 'ALA' : ed.id === 'ed-jacaranda' ? 'JAC' : 'PLZ';
    const lista: Omit<Unidad, 'coef'>[] = [];
    const pesos: number[] = [];
    for (let piso = 1; piso <= ed.pisos; piso++) {
      for (const d of ed.deptos) {
        const nombre = `${piso}° ${d}`;
        lista.push({ id: `u-${pref}-${piso}${d}`, edificioId: ed.id, nombre, propietario: `${NOMBRES[n % NOMBRES.length]} ${APELLIDOS[(n * 7) % APELLIDOS.length]}`, whatsapp: `5491155${String(300000 + n * 137).padStart(6, '0')}`, codigo: codigo(r, pref, `${piso}${d}`) });
        pesos.push(d === 'A' || d === 'D' ? 1.25 : 1);
        n++;
      }
    }
    const suma = pesos.reduce((s, x) => s + x, 0);
    let acum = 0;
    lista.forEach((u, i) => {
      const coef = i === lista.length - 1 ? Math.round((100 - acum) * 100) / 100 : Math.round((pesos[i] / suma) * 10000) / 100;
      acum += coef;
      unidades.push({ ...u, coef });
    });
  }

  const personal: Personal[] = PERSONAL.map((p, i) => ({ ...p, id: `pe${i + 1}`, sueldo: P(p.sueldo), cargas: P(p.cargas) }));

  let e: EstadoConsorcio = {
    version: VERSION_CONSORCIO,
    rubro: 'consorcio',
    administracion: { nombre: negocio, responsable: 'Administrador/a de ejemplo', cuit: '20-25000000-9', matricula: 'RPAC PBA N° 0000 (ejemplo)', domicilio: 'Av. Ejemplo 100, Caseros', telefono: '11 5555 0000' },
    edificios,
    unidades,
    personal,
    gastos: [],
    obras: [],
    liquidaciones: [],
    expensas: [],
    pagos: [],
    avisos: [],
    comunicados: [],
    reclamos: [],
    reservas: [],
    cobranza: { activa: true, diasAntes: 3, diasDespues: [5, 15, 30] },
    ultimoRecibo: 4100,
    ultimoPago: 8800,
  };

  const hoy = new Date(ahora);
  const actual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const periodos = [sumarMeses(actual, -3), sumarMeses(actual, -2), sumarMeses(actual, -1)];
  const t = (periodo: string, dia: number, hora = 10) => {
    const [a, m] = periodo.split('-').map(Number);
    return +new Date(a, m - 1, dia, hora, Math.floor(r() * 59));
  };

  // Unidades que no pagan (siempre las mismas): 2 a 4 meses de deuda.
  const morosas = new Set(['u-ALA-5C', 'u-ALA-2B', 'u-JAC-6A', 'u-JAC-3D', 'u-JAC-1C', 'u-PLZ-4B']);
  const deudaVieja = new Set(['u-ALA-5C', 'u-JAC-6A']);

  const cargarMes = (periodo: string, hasta: number) => {
    for (const ed of e.edificios) {
      e = cargarSueldos(e, ed.id, periodo, t(periodo, 2)).estado;
      for (const f of FIJOS) {
        if (f.solo && !f.solo.includes(ed.id)) continue;
        const factor = ed.id === 'ed-plaza' ? 0.55 : ed.id === 'ed-jacaranda' ? 1.15 : 1;
        const dia = 3 + Math.floor(r() * Math.min(20, hasta - 3));
        if (dia > hasta) continue;
        const res = agregarGasto(e, { edificioId: ed.id, periodo, rubro: f.rubro, detalle: f.detalle, proveedor: f.proveedor, cuit: f.cuit, importe: P(f.base * factor * (0.9 + r() * 0.2)), tipo: f.tipo ?? 'ordinario', comprobante: 'ejemplo' }, t(periodo, dia));
        if ('estado' in res) e = res.estado;
      }
      if (hasta >= 5) {
        const s = agregarGasto(e, { edificioId: ed.id, periodo, rubro: 'seguros', detalle: `Seguro integral de consorcio · póliza ${ed.seguro.poliza} (cuota)`, proveedor: ed.seguro.compania, cuit: '30-50000004-4', importe: ed.seguro.cuota, tipo: 'ordinario', comprobante: 'ejemplo' }, t(periodo, 5));
        if ('estado' in s) e = s.estado;
      }
      const v = VARIABLES[Math.floor(r() * VARIABLES.length)];
      const dv = 8 + Math.floor(r() * 12);
      if (dv <= hasta) {
        const s = agregarGasto(e, { edificioId: ed.id, periodo, rubro: v.rubro, detalle: v.detalle, proveedor: v.proveedor, cuit: v.cuit, importe: P(v.base * (0.8 + r() * 0.5)), tipo: 'ordinario', comprobante: 'ejemplo' }, t(periodo, dv));
        if ('estado' in s) e = s.estado;
      }
      if (hasta >= 28) {
        const s = agregarGasto(e, { edificioId: ed.id, periodo, rubro: 'administracion', detalle: `Honorarios de administración de ${periodo.slice(5)}/${periodo.slice(0, 4)}`, proveedor: e.administracion.nombre, cuit: e.administracion.cuit, importe: ed.honorarios, tipo: 'ordinario', comprobante: 'ejemplo' }, t(periodo, 28));
        if ('estado' in s) e = s.estado;
      }
    }
  };

  // Obra de la terraza: terminada en el segundo mes, se cobra en 3 cuotas extraordinarias.
  const obras = OBRAS.map((o) => ({ ...o, presupuestos: o.presupuestos.map((p) => ({ ...p, materiales: P(p.materiales), manoObra: P(p.manoObra) })), evidencias: o.evidencias.map((x) => ({ ...x })) }));
  const terraza = obras[0];
  terraza.creada = new Date(t(periodos[0], 18)).toISOString();
  terraza.evidencias[0].fecha = new Date(t(periodos[0], 20)).toISOString();
  terraza.evidencias[1].fecha = new Date(t(periodos[1], 6)).toISOString();
  terraza.evidencias[2].fecha = new Date(t(periodos[1], 17)).toISOString();
  const pintura = obras[1];
  pintura.creada = new Date(ahora - 12 * DIA).toISOString();
  pintura.evidencias[0].fecha = new Date(ahora - 12 * DIA).toISOString();
  const bomba = obras[2];
  bomba.creada = new Date(ahora - 4 * DIA).toISOString();
  bomba.evidencias[0].fecha = new Date(ahora - 4 * DIA).toISOString();
  bomba.evidencias[1].fecha = new Date(ahora - 1 * DIA).toISOString();
  e = { ...e, obras };
  const cuotaTerraza = Math.round((terraza.presupuestos[0].materiales + terraza.presupuestos[0].manoObra) / 3);

  for (const [k, periodo] of periodos.entries()) {
    cargarMes(periodo, 30);
    if (k >= 1) {
      const s = agregarGasto(e, { edificioId: 'ed-alamos', periodo, rubro: 'reparaciones', detalle: `Impermeabilización de terraza (cuota ${k} de 3)`, proveedor: 'Techos Sur', cuit: '30-61000031-1', importe: cuotaTerraza, tipo: 'extraordinario', obraId: 'o-terraza', comprobante: 'ejemplo' }, t(periodo, 18));
      if ('estado' in s) e = s.estado;
    }
    const siguiente = sumarMeses(periodo, 1);
    for (const ed of e.edificios) {
      const c = cerrarMes(e, ed.id, periodo, t(siguiente, 1, 9));
      if ('estado' in c) e = c.estado;
    }
    // Pagos: casi todos pagan entre el día 2 y unos días después del vencimiento.
    const vence = +vencimiento(siguiente, 10);
    const esUltimo = k === periodos.length - 1;
    for (const u of e.unidades) {
      if (morosas.has(u.id) && (deudaVieja.has(u.id) || k >= 1)) continue;
      if (esUltimo && r() < 0.12) continue;
      const deuda = e.expensas.filter((x) => x.unidadId === u.id).reduce((s, x) => s + x.interes + x.ordinaria + x.extraordinaria + x.fondo + x.otros, 0) - e.pagos.filter((p) => p.unidadId === u.id && p.estado === 'acreditado').reduce((s, p) => s + p.importe, 0);
      if (deuda <= 0) continue;
      let cuando = +new Date(t(siguiente, 2)) + Math.floor(r() * 12) * DIA;
      if (r() < 0.15) cuando = vence + (2 + Math.floor(r() * 8)) * DIA;
      if (cuando > ahora - 3_600_000) continue;
      const x = r();
      const medio = edificio2(e, u.edificioId).mp.vinculada && x < 0.58 ? 'mercadopago' : x < 0.95 ? 'transferencia' : 'efectivo';
      const p = registrarPago(e, u.id, deuda, medio, cuando);
      if ('estado' in p) e = { ...p.estado, pagos: p.estado.pagos.map((y) => (y.id === p.pago.id ? { ...y, estado: 'acreditado' } : y)) };
    }
  }

  // Avisos de la última liquidación (ya enviados por WhatsApp).
  const ultimas = e.liquidaciones.filter((l) => l.periodo === periodos[2]);
  for (const l of ultimas) {
    const xs = e.expensas.filter((x) => x.liquidacionId === l.id);
    e = registrarAvisos(e, xs.map((x) => ({ unidadId: x.unidadId, tipo: 'expensa' as const, texto: textoExpensa(e, x, moneda, '(enlace)') })), +new Date(l.cerrada) + 2 * 3_600_000);
  }

  // Mes abierto: gastos cargados hasta ayer.
  cargarMes(actual, Math.max(1, hoy.getDate() - 1));
  const s3 = agregarGasto(e, { edificioId: 'ed-alamos', periodo: actual, rubro: 'reparaciones', detalle: 'Impermeabilización de terraza (cuota 3 de 3)', proveedor: 'Techos Sur', cuit: '30-61000031-1', importe: cuotaTerraza, tipo: 'extraordinario', obraId: 'o-terraza', comprobante: 'ejemplo' }, ahora - 5 * DIA);
  if ('estado' in s3) e = s3.estado;

  // Dos transferencias recientes esperando confirmación.
  for (const uid of ['u-JAC-1C', 'u-PLZ-4B']) {
    const s = situacion(e, uid, ahora);
    const p = registrarPago(e, uid, s.deuda > 0 ? Math.round(s.deuda / Math.max(1, s.meses)) : 0, 'transferencia', ahora - (uid === 'u-JAC-1C' ? 5 : 20) * 3_600_000, { comprobante: undefined });
    if ('estado' in p) e = p.estado;
  }

  // Espacio común: reservas próximas.
  const dia = (d: number) => {
    const f = new Date(ahora + d * DIA);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  };
  const reservas: [string, number, number, 'expensa' | 'mercadopago'][] = [['u-ALA-3B', 2, 1, 'expensa'], ['u-ALA-6D', 9, 0, 'mercadopago'], ['u-JAC-4C', 3, 0, 'expensa'], ['u-JAC-2A', 10, 1, 'mercadopago'], ['u-PLZ-2A', 6, 1, 'expensa']];
  e = {
    ...e,
    reservas: reservas.map(([uid, d, turno, cobro], i) => {
      const u = e.unidades.find((x) => x.id === uid)!;
      const ed = e.edificios.find((x) => x.id === u.edificioId)!;
      return { id: `r${i + 1}`, edificioId: ed.id, unidadId: uid, dia: dia(d), turno: ed.espacio!.turnos[turno], precio: ed.espacio!.precio, cobro, estado: 'confirmada' as const, creada: new Date(ahora - (5 - i) * DIA).toISOString() };
    }),
  };

  // Comunicados y reclamos.
  const alamos = e.unidades.filter((u) => u.edificioId === 'ed-alamos').map((u) => u.id);
  const jac = e.unidades.filter((u) => u.edificioId === 'ed-jacaranda').map((u) => u.id);
  e = {
    ...e,
    comunicados: [
      { id: 'c1', edificioId: 'ed-alamos', titulo: 'Corte de agua el jueves de 9 a 13 h', texto: 'Por la limpieza semestral del tanque, el jueves de 9 a 13 h no habrá agua. Les pedimos juntar agua el día anterior. ¡Gracias!', fecha: new Date(ahora - 2 * DIA).toISOString(), leidos: alamos.filter((_, i) => i % 3 !== 0) },
      { id: 'c2', edificioId: 'ed-jacaranda', titulo: 'Asamblea ordinaria: presupuestos de pintura', texto: 'Convocamos a asamblea ordinaria el martes a las 19 h en el SUM (segundo llamado 19:30). Orden del día: 1) Rendición de cuentas. 2) Elección de presupuesto para pintura de hall y escaleras. 3) Honorarios de administración.', fecha: new Date(ahora - 4 * DIA).toISOString(), leidos: jac.filter((_, i) => i % 2 === 0) },
    ],
    reclamos: [
      { id: 'rc1', edificioId: 'ed-alamos', unidadId: 'u-ALA-4A', lugar: 'Pasillo 4° piso', texto: 'La luz del pasillo no prende desde ayer.', fecha: new Date(ahora - 20 * 3_600_000).toISOString(), estado: 'nuevo' },
      { id: 'rc2', edificioId: 'ed-jacaranda', unidadId: 'u-JAC-7B', lugar: 'Ascensor', texto: 'El ascensor hace ruido al llegar al 7° piso.', fecha: new Date(ahora - 2 * DIA).toISOString(), estado: 'asignado', asignadoA: 'Ascensores del Oeste' },
      { id: 'rc3', edificioId: 'ed-plaza', lugar: 'Portón de cocheras', texto: 'El portón no cierra solo.', fecha: new Date(ahora - 6 * DIA).toISOString(), estado: 'resuelto', asignadoA: 'Cerrajería San Martín', resolucion: 'Se cambió el resorte y se reguló el cierre.', resuelto: new Date(ahora - 4 * DIA).toISOString() },
    ],
  };
  return e;
}

const edificio2 = (e: EstadoConsorcio, id: string) => e.edificios.find((x) => x.id === id)!;
