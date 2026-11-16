import { precioEjemplo } from '@/lib/rubros/restaurante/datos-ejemplo';
import { DIA_MS, claveDia, conMinutos, esActivo, libre, lunesDe, siguienteAbierto, sumarDias } from '@/lib/rubros/barberia/agenda';
import type { Cliente, EstadoAgenda, Horario, Profesional, Servicio, Turno } from '@/lib/rubros/barberia/tipos';
import type { Diseno, EleccionDiseno, Esmalte } from './tipos';

export const VERSION_UNAS = 1;

/**
 * Esmaltes del salón de ejemplo. Son colores de producto (como la foto de un plato),
 * no colores de la interfaz: la interfaz sigue usando el motor de marca.
 */
export const ESMALTES: Esmalte[] = [
  { id: 'nude', nombre: 'Nude rosado', color: '#e8c4b8' },
  { id: 'leche', nombre: 'Blanco leche', color: '#f6f1ea' },
  { id: 'cereza', nombre: 'Rojo cereza', color: '#b3122e' },
  { id: 'borgona', nombre: 'Borgoña', color: '#5c1a2b' },
  { id: 'chicle', nombre: 'Rosa chicle', color: '#f28cb1' },
  { id: 'lila', nombre: 'Lila', color: '#b9a3d9' },
  { id: 'celeste', nombre: 'Celeste', color: '#a7d3eb' },
  { id: 'salvia', nombre: 'Verde salvia', color: '#9cb59a' },
  { id: 'negro', nombre: 'Negro', color: '#1d1a1f' },
  { id: 'dorado', nombre: 'Dorado', color: '#d4af37' },
  { id: 'plata', nombre: 'Plateado', color: '#c0c4cc' },
  { id: 'coral', nombre: 'Coral', color: '#ff7f6a' },
  { id: 'terracota', nombre: 'Terracota', color: '#c0603f' },
  { id: 'noche', nombre: 'Azul noche', color: '#1f2a55' },
  { id: 'chocolate', nombre: 'Chocolate', color: '#5a3a2e' },
];

const SERVICIOS: (Omit<Servicio, 'precio'> & { base: number })[] = [
  { id: 's-semi', nombre: 'Esmaltado semipermanente', descripcion: 'Limado, cutículas y semi que dura 3 semanas.', duracion: 60, base: 12, diseno: true },
  { id: 's-kapping', nombre: 'Kapping gel', descripcion: 'Capa de gel sobre tu uña natural para que crezca fuerte.', duracion: 90, base: 16, diseno: true },
  { id: 's-esculpidas', nombre: 'Uñas esculpidas', descripcion: 'Acrílico o gel con el largo y la forma que quieras.', duracion: 120, base: 24, sena: 30, diseno: true },
  { id: 's-softgel', nombre: 'Soft gel (tips)', descripcion: 'Tips de gel blando, livianas y naturales.', duracion: 90, base: 20, diseno: true },
  { id: 's-service', nombre: 'Service de esculpidas', descripcion: 'Relleno del crecimiento y diseño nuevo.', duracion: 75, base: 14, diseno: true },
  { id: 's-pedi', nombre: 'Pedicura spa con semi', descripcion: 'Baño, exfoliación, cutículas y semi.', duracion: 75, base: 15, diseno: true },
  { id: 's-retiro', nombre: 'Retiro + manicura', descripcion: 'Retiramos el material sin dañar la uña.', duracion: 45, base: 8 },
];

export const PROFESIONALES_UNAS: Profesional[] = [
  { id: 'p-sofia', nombre: 'Sofía Paz', especialidad: 'Nail art a mano alzada', servicios: ['s-semi', 's-kapping', 's-softgel', 's-service', 's-retiro'] },
  { id: 'p-carla', nombre: 'Carla Medina', especialidad: 'Esculpidas y kapping', servicios: ['s-esculpidas', 's-service', 's-kapping', 's-softgel', 's-retiro'] },
  { id: 'p-lucia', nombre: 'Lucía Ferro', especialidad: 'Semipermanente y pedicura spa', servicios: ['s-semi', 's-pedi', 's-kapping', 's-retiro'] },
];

/** Lunes a sábado de 10 a 20 h. */
export const HORARIO_UNAS: Horario = { 0: null, 1: [600, 1200], 2: [600, 1200], 3: [600, 1200], 4: [600, 1200], 5: [600, 1200], 6: [600, 1200] };

type DisenoBase = Omit<Diseno, 'extra' | 'visible' | 'creado'> & { extra: number; dias: number };
const DISENOS: DisenoBase[] = [
  { id: 'd-flores-lila', nombre: 'Flores lilas', autora: 'p-sofia', patron: 'flores', forma: 'almendra', esmaltes: ['nude', 'lila', 'dorado'], extra: 4, dias: 3 },
  { id: 'd-lunares', nombre: 'Lunares retro', autora: 'p-sofia', patron: 'puntos', forma: 'redonda', esmaltes: ['cereza', 'leche'], extra: 3, dias: 9 },
  { id: 'd-lineas-oro', nombre: 'Líneas doradas', autora: 'p-sofia', patron: 'lineas', forma: 'coffin', esmaltes: ['negro', 'dorado'], extra: 3, dias: 15 },
  { id: 'd-marmol-salvia', nombre: 'Mármol salvia', autora: 'p-sofia', patron: 'marmol', forma: 'almendra', esmaltes: ['leche', 'salvia'], extra: 4, dias: 22 },
  { id: 'd-francesa-alm', nombre: 'Francesa almendra', autora: 'p-carla', patron: 'francesa', forma: 'almendra', esmaltes: ['nude', 'leche'], extra: 0, dias: 5 },
  { id: 'd-baby-boomer', nombre: 'Baby boomer', autora: 'p-carla', patron: 'degrade', forma: 'coffin', esmaltes: ['nude', 'leche'], extra: 2, dias: 11 },
  { id: 'd-stiletto-noche', nombre: 'Stiletto noche', autora: 'p-carla', patron: 'glitter', forma: 'stiletto', esmaltes: ['noche', 'plata'], extra: 3, dias: 18 },
  { id: 'd-animal', nombre: 'Animal print', autora: 'p-carla', patron: 'animal', forma: 'cuadrada', esmaltes: ['terracota', 'chocolate'], extra: 4, dias: 26 },
  { id: 'd-cereza', nombre: 'Rojo clásico', autora: 'p-lucia', patron: 'liso', forma: 'redonda', esmaltes: ['cereza'], extra: 0, dias: 4 },
  { id: 'd-degrade-coral', nombre: 'Degradé coral', autora: 'p-lucia', patron: 'degrade', forma: 'cuadrada', esmaltes: ['coral', 'chicle'], extra: 2, dias: 13 },
  { id: 'd-cromado', nombre: 'Cromado perla', autora: 'p-lucia', patron: 'cromado', forma: 'almendra', esmaltes: ['leche', 'plata'], extra: 3, dias: 20 },
  { id: 'd-eq-nude', nombre: 'Nude natural', autora: 'equipo', patron: 'liso', forma: 'almendra', esmaltes: ['nude'], extra: 0, dias: 40 },
  { id: 'd-eq-borgona', nombre: 'Borgoña glitter', autora: 'equipo', patron: 'glitter', forma: 'cuadrada', esmaltes: ['borgona', 'dorado'], extra: 2, dias: 35 },
  { id: 'd-eq-francesa-color', nombre: 'Francesa de colores', autora: 'equipo', patron: 'francesa', forma: 'coffin', esmaltes: ['leche', 'celeste', 'chicle'], extra: 2, dias: 30 },
  { id: 'd-eq-verano', nombre: 'Flores de verano', autora: 'equipo', patron: 'flores', forma: 'redonda', esmaltes: ['celeste', 'leche', 'dorado'], extra: 4, dias: 45 },
];

const NOMBRES = [
  'Valentina Gómez', 'Camila Herrera', 'Martina Benítez', 'Julieta Acosta', 'Florencia Medina', 'Agustina Rojas', 'Micaela Molina',
  'Rocío Castro', 'Lucía Ortiz', 'Antonella Silva', 'Paula Romero', 'Milagros Torres', 'Belén Díaz', 'Carolina Sosa',
  'Daniela Ruiz', 'Sol Vega', 'Abril Luna', 'Brenda Ríos', 'Natalia Navarro', 'Pilar Ibáñez', 'Guadalupe Paz',
  'Ailén Cabrera', 'Mora Blanco', 'Jazmín Ferreyra',
];

/** Búsquedas reales de Pinterest (no pins concretos) para las citas de ejemplo. */
const PINES = [
  'https://www.pinterest.com/search/pins/?q=u%C3%B1as%20francesas%20almendra',
  'https://www.pinterest.com/search/pins/?q=u%C3%B1as%20flores%20minimalistas',
  'https://www.pinterest.com/search/pins/?q=u%C3%B1as%20cromadas%20perla',
];

const NOTAS = ['Las quiero cortitas, trabajo con las manos.', 'Un poco más largas que la última vez.', 'Que el dorado sea solo en el anular.', 'Me gusta brillante, nada mate.', ''];

function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const tok = (r: () => number) => Math.floor(r() * 36 ** 8).toString(36).padStart(8, '0');

/**
 * Salón de ejemplo: 3 manicuristas, 15 diseños (11 propios y 4 del equipo), 4 semanas de historia
 * y 2 por delante. Casi todas las citas traen el diseño elegido; algunas, una idea de Pinterest.
 */
export function crearEstadoUnas(moneda: string, ahora = Date.now()): EstadoAgenda {
  const r = azar(1313);
  const servicios: Servicio[] = SERVICIOS.map(({ base, ...s }) => ({ ...s, precio: precioEjemplo(base, moneda) }));
  const disenos: Diseno[] = DISENOS.map(({ dias, extra, ...d }) => ({ ...d, extra: extra ? precioEjemplo(extra, moneda) : 0, visible: true, creado: new Date(ahora - dias * DIA_MS).toISOString() }));
  const creado = new Date(ahora - 150 * DIA_MS).toISOString();
  const clientes: Cliente[] = NOMBRES.map((nombre, i) => ({
    id: `c${i + 1}`,
    nombre,
    whatsapp: `54911556${String(20100 + i * 41).padStart(5, '0')}`,
    notas: '',
    sellos: 0,
    ausencias: 0,
    creado,
    ejemplo: true,
  }));
  clientes.slice(-5).forEach((c, i) => (c.creado = new Date(ahora - (25 - i * 4) * DIA_MS).toISOString()));
  clientes[0].notas = 'Viene cada 3 semanas con Sofía. Le gustan los diseños delicados.';
  clientes[1].notas = 'Piel sensible en cutículas: trabajar suave.';

  const estado: EstadoAgenda = {
    version: VERSION_UNAS,
    rubro: 'unas',
    servicios,
    profesionales: PROFESIONALES_UNAS,
    turnos: [],
    clientes,
    bloqueos: [],
    espera: [],
    horario: HORARIO_UNAS,
    metaSellos: 8,
    beneficio: 'Esmaltado semipermanente sin cargo',
    semilla: claveDia(lunesDe(ahora)),
    disenos,
  };

  const lunes = lunesDe(ahora);
  const hoy = claveDia(ahora);
  const sabado = sumarDias(lunes, 12);
  estado.bloqueos.push({ id: 'b1', profId: 'p-carla', desde: conMinutos(sabado, 0).toISOString(), hasta: conMinutos(sabado, 1440).toISOString(), motivo: 'Curso de nail art' });

  const eleccion = (profId: string, servicioId: string): EleccionDiseno | undefined => {
    const s = servicios.find((x) => x.id === servicioId);
    if (!s?.diseno) return undefined;
    const x = r();
    if (x < 0.12) return undefined;
    const propios = disenos.filter((d) => d.autora === profId);
    const otros = disenos.filter((d) => d.autora !== profId);
    const lista = x < 0.6 ? propios : otros;
    const d = lista[Math.floor(r() * lista.length)];
    const out: EleccionDiseno = { disenoId: d.id };
    if (r() < 0.25) out.pinterest = PINES[Math.floor(r() * PINES.length)];
    const nota = NOTAS[Math.floor(r() * NOTAS.length)];
    if (nota) out.nota = nota;
    return out;
  };

  // Una clienta no puede estar en dos sillas a la vez.
  const elegirCliente = (ini: number, fin: number) => {
    for (let k = 0; k < 8; k++) {
      const c = clientes[2 + Math.floor(r() ** 1.5 * (clientes.length - 2))];
      if (!estado.turnos.some((t) => t.clienteId === c.id && +new Date(t.inicio) < fin && +new Date(t.fin) > ini)) return c;
    }
    return clientes[2 + Math.floor(r() * (clientes.length - 2))];
  };
  for (let d = -28; d < 14; d++) {
    const dia = sumarDias(lunes, d);
    const h = HORARIO_UNAS[dia.getDay()];
    if (!h) continue;
    const pasado = claveDia(dia) < hoy;
    const relleno = pasado ? 0.7 : claveDia(dia) === hoy ? 0.6 : Math.max(0.15, 0.55 - (d - 7) * 0.035);
    for (const p of PROFESIONALES_UNAS) {
      let m = h[0];
      while (m < h[1]) {
        const sid = p.servicios[Math.floor(r() * p.servicios.length)];
        const s = servicios.find((x) => x.id === sid)!;
        if (m + s.duracion > h[1]) break;
        const ini = conMinutos(dia, m);
        const fin = new Date(+ini + s.duracion * 60_000);
        if (r() < relleno && libre(estado, p.id, +ini, +fin)) {
          const terminado = +fin <= ahora;
          const x = r();
          const est: Turno['estado'] = terminado ? (x < 0.06 ? 'ausente' : x < 0.11 ? 'cancelado' : 'atendido') : x < 0.55 ? 'confirmado' : 'reservado';
          const diseno = eleccion(p.id, sid);
          estado.turnos.push({
            id: `t${estado.turnos.length + 1}`,
            token: tok(r),
            clienteId: elegirCliente(+ini, +fin).id,
            profId: p.id,
            servicioId: sid,
            inicio: ini.toISOString(),
            fin: fin.toISOString(),
            estado: est,
            origen: r() < 0.8 ? 'online' : 'manual',
            creado: new Date(+ini - (2 + Math.floor(r() * 6)) * DIA_MS).toISOString(),
            ...(diseno ? { diseno } : {}),
            ejemplo: true,
          });
          m += s.duracion;
          m = Math.ceil(m / 15) * 15;
        } else m += 15 * (1 + Math.floor(r() * 3));
      }
    }
  }

  // Valentina (la primera clienta) viene cada 3 semanas con Sofía; su próxima cita ya tiene diseño y una idea de Pinterest.
  const deSofia = estado.turnos.filter((t) => t.profId === 'p-sofia' && esActivo(t));
  const pasadas = deSofia.filter((t) => +new Date(t.fin) <= ahora);
  const futura = deSofia.find((t) => +new Date(t.inicio) > ahora + 2 * 3_600_000 && t.servicioId !== 's-retiro');
  const anterior = pasadas.filter((t) => +new Date(t.inicio) < ahora - 18 * DIA_MS && t.servicioId !== 's-retiro').at(-1);
  if (anterior) Object.assign(anterior, { clienteId: clientes[0].id, estado: 'atendido', servicioId: 's-semi', diseno: { disenoId: 'd-marmol-salvia' } });
  if (futura) {
    futura.clienteId = clientes[0].id;
    futura.estado = 'confirmado';
    futura.origen = 'online';
    futura.diseno = { disenoId: 'd-flores-lila', pinterest: PINES[1], forma: 'almendra', nota: 'Que el dorado sea solo en el anular.' };
  }
  for (const c of clientes) {
    const suyos = estado.turnos.filter((t) => t.clienteId === c.id);
    c.sellos = Math.min(estado.metaSellos - 1, suyos.filter((t) => t.estado === 'atendido').length % estado.metaSellos);
    c.ausencias = suyos.filter((t) => t.estado === 'ausente').length;
  }

  const manana = siguienteAbierto(HORARIO_UNAS, ahora);
  estado.espera.push({ id: 'e1', nombre: 'Lara Quiroga', whatsapp: '5491155523344', servicioId: 's-semi', profId: 'p-sofia', dia: claveDia(manana), creado: new Date(ahora - 2 * 3_600_000).toISOString() });
  return estado;
}
