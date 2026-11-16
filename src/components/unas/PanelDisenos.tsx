'use client';

import { useState } from 'react';
import { Icono } from '@/components/Icono';
import { formatoPrecio } from '@/lib/utiles';
import { abierto, claveDia, deClave, diaCorto, nombreDia, esActivo, hora, sumarDias, inicioDia } from '@/lib/rubros/barberia/agenda';
import type { EstadoAgenda, Turno } from '@/lib/rubros/barberia/tipos';
import { EQUIPO, FORMAS, NOMBRE_FORMA, NOMBRE_PATRON, PATRONES, agregarDiseno, alternarVisible, deQuien, disenoPorId, eligioAlgo, esmaltesPara, formaDe, masElegidos, quitarDiseno, resumenDiseno } from '@/lib/rubros/unas/logica';
import { ESMALTES } from '@/lib/rubros/unas/datos-ejemplo';
import type { Forma, Patron } from '@/lib/rubros/unas/tipos';
import type { ActualizarAgenda } from '@/components/barberia/useBarberia';
import { useAhora } from '@/components/barberia/useBarberia';
import { MuestraUnas } from './MuestraUnas';

const primer = (n?: string) => n?.split(' ')[0] ?? '';

/** Pestaña "Diseños" del panel del salón (BRD 13). */
export function PanelDisenos({ estado, actualizar, moneda, onTurno }: { estado: EstadoAgenda; actualizar: ActualizarAgenda; moneda: string; onTurno: (t: Turno) => void }) {
  return (
    <>
      <ParaPreparar estado={estado} onTurno={onTurno} />
      <Catalogo estado={estado} actualizar={actualizar} moneda={moneda} />
    </>
  );
}

/** Lo que cada manicurista tiene que preparar hoy y mañana, cita por cita. */
function ParaPreparar({ estado, onTurno }: { estado: EstadoAgenda; onTurno: (t: Turno) => void }) {
  const ahora = useAhora();
  const [prof, setProf] = useState<string | null>(null);
  const dias = Array.from({ length: 10 }, (_, i) => sumarDias(inicioDia(ahora), i)).filter((d) => abierto(estado.horario, d)).slice(0, 6);
  const [clave, setClave] = useState(() => claveDia(dias[0] ?? ahora));
  const dia = deClave(clave);
  const esHoy = clave === claveDia(ahora);
  const citas = estado.turnos
    .filter((t) => claveDia(t.inicio) === claveDia(dia) && esActivo(t) && t.estado !== 'ausente' && (!prof || t.profId === prof))
    .filter((t) => !esHoy || +new Date(t.fin) > ahora)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const conDiseno = citas.filter((t) => eligioAlgo(t.diseno)).length;
  // Esmaltes a tener a mano en el día, sin repetir.
  const esm = new Map<string, { nombre: string; color: string; n: number }>();
  for (const t of citas) for (const e of esmaltesPara(estado, t.diseno)) esm.set(e.id, { ...e, n: (esm.get(e.id)?.n ?? 0) + 1 });

  return (
    <section className="d-card" aria-labelledby="t-prep">
      <h2 id="t-prep">Para preparar {esHoy ? 'hoy' : nombreDia(dia, new Date(ahora)) === 'mañana' ? 'mañana' : `el ${nombreDia(dia, new Date(ahora))}`}</h2>
      <p className="sub">{citas.length ? `${citas.length} ${citas.length === 1 ? 'cita' : 'citas'}${esHoy ? ' que faltan' : ''} · ${conDiseno} con diseño elegido. Tocá una para ver la ficha completa.` : 'No hay citas para este día.'}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <div className="ag-profs" role="group" aria-label="Día" style={{ margin: 0 }}>
          {dias.map((d, i) => (
            <button key={claveDia(d)} type="button" aria-pressed={claveDia(d) === clave} onClick={() => setClave(claveDia(d))}>
              {i === 0 && claveDia(d) === claveDia(ahora) ? 'Hoy' : claveDia(d) === claveDia(sumarDias(inicioDia(ahora), 1)) ? 'Mañana' : `${diaCorto(d)} ${d.getDate()}`}
            </button>
          ))}
        </div>
        <div className="ag-profs" role="group" aria-label="Manicurista" style={{ margin: 0 }}>
          <button type="button" aria-pressed={!prof} onClick={() => setProf(null)}>Todas</button>
          {estado.profesionales.map((p) => <button key={p.id} type="button" aria-pressed={prof === p.id} onClick={() => setProf((x) => (x === p.id ? null : p.id))}>{primer(p.nombre)}</button>)}
        </div>
      </div>
      {esm.size > 0 && (
        <div className="un-prep-esm">
          <strong>Esmaltes del día</strong>
          <span className="un-esmaltes">{[...esm.entries()].map(([id, e]) => <span key={id}><i style={{ background: e.color }} aria-hidden="true" />{e.nombre}{e.n > 1 ? ` ×${e.n}` : ''}</span>)}</span>
        </div>
      )}
      <ul className="un-prep">
        {citas.map((t) => {
          const c = estado.clientes.find((x) => x.id === t.clienteId);
          const s = estado.servicios.find((x) => x.id === t.servicioId);
          const d = disenoPorId(estado, t.diseno?.disenoId);
          const forma = formaDe(estado, t.diseno);
          return (
            <li key={t.id}>
              <button type="button" className="un-prep-fila" onClick={() => onTurno(t)}>
                <span className="un-prep-h">{hora(t.inicio)}</span>
                {d ? <MuestraUnas diseno={{ ...d, forma: forma ?? d.forma }} className="un-muestra mini" titulo={d.nombre} /> : <span className="un-sin" aria-hidden="true"><Icono nombre={t.diseno?.pinterest || t.diseno?.captura ? 'enlace' : 'chispa'} size={18} /></span>}
                <span className="un-prep-txt">
                  <strong>{c?.nombre ?? 'Clienta'}</strong>
                  <small>{s?.nombre} · con {primer(estado.profesionales.find((p) => p.id === t.profId)?.nombre)}</small>
                  <small className="un-prep-dis">{s?.diseno ? resumenDiseno(estado, t.diseno) : 'Sin diseño'}{forma ? ` · ${NOMBRE_FORMA[forma].toLowerCase()}` : ''}{t.diseno?.nota ? ' · tiene nota' : ''}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {esHoy && citas.length === 0 && <p className="sub">Elegí otro día para adelantar el trabajo.</p>}
    </section>
  );
}

function Catalogo({ estado, actualizar, moneda }: { estado: EstadoAgenda; actualizar: ActualizarAgenda; moneda: string }) {
  const [msg, setMsg] = useState('');
  const [nuevo, setNuevo] = useState(false);
  const { lista, pinterest } = masElegidos(estado);
  const grupos = [...estado.profesionales.map((p) => ({ id: p.id, titulo: `Trabajos de ${primer(p.nombre)}` })), { id: EQUIPO, titulo: 'Catálogo del equipo' }];
  return (
    <>
      <section className="d-card" aria-labelledby="t-cat">
        <div className="ag-cab">
          <div>
            <h2 id="t-cat">Catálogo de diseños</h2>
            <p className="sub">Esto es lo que ven las clientas al reservar: primero los trabajos de quien las atiende, después los del equipo.</p>
          </div>
          <button type="button" className="d-btn prim" onClick={() => setNuevo((x) => !x)}><Icono nombre="mas" size={18} /> Nuevo diseño</button>
        </div>
        {nuevo && <NuevoDiseno estado={estado} actualizar={actualizar} onListo={(m) => { setMsg(m); setNuevo(false); }} />}
        {msg && <p role="status" style={{ fontSize: 14 }}>{msg}</p>}
        {grupos.map((g) => {
          const ds = (estado.disenos ?? []).filter((d) => d.autora === g.id);
          return (
            <div key={g.id} className="un-cat-grupo">
              <h3>{g.titulo} <small>({ds.filter((d) => d.visible).length} a la vista)</small></h3>
              {ds.length ? (
                <ul className="un-cat">
                  {ds.map((d) => (
                    <li key={d.id} data-oculto={d.visible ? undefined : '1'}>
                      <MuestraUnas diseno={d} titulo={d.nombre} />
                      <strong>{d.nombre}</strong>
                      <small>{NOMBRE_PATRON[d.patron]} · {NOMBRE_FORMA[d.forma]}</small>
                      <small>{d.extra ? `Nail art + ${formatoPrecio(d.extra, moneda)}` : 'Incluido'}</small>
                      <span className="un-cat-acc">
                        <button type="button" className="d-btn" onClick={() => { const err = actualizar((e) => alternarVisible(e, d.id)); setMsg(err ?? (d.visible ? `"${d.nombre}" ya no se muestra al reservar.` : `"${d.nombre}" vuelve a mostrarse.`)); }} aria-label={`${d.visible ? 'Ocultar' : 'Mostrar'} ${d.nombre}`}>
                          <Icono nombre={d.visible ? 'ojoNo' : 'ojo'} size={16} /> {d.visible ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button type="button" className="d-btn peligro" aria-label={`Quitar ${d.nombre}`} onClick={() => { if (!window.confirm(`¿Quitar "${d.nombre}" del catálogo?`)) return; const err = actualizar((e) => quitarDiseno(e, d.id)); setMsg(err ?? `"${d.nombre}" salió del catálogo. Las citas que ya lo eligieron lo conservan.`); }}>
                          <Icono nombre="basura" size={16} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="sub">Todavía no hay diseños acá.</p>}
            </div>
          );
        })}
      </section>
      <section className="d-card" aria-labelledby="t-mas">
        <h2 id="t-mas">Lo más elegido (4 semanas)</h2>
        <p className="sub">{pinterest} {pinterest === 1 ? 'clienta trajo' : 'clientas trajeron'} además una idea de Pinterest.</p>
        <ul className="met-barras">
          {lista.slice(0, 6).map(({ d, n }) => (
            <li key={d.id}><span>{d.nombre} <small className="un-gris">{deQuien(estado, d)}</small></span><span className="ag-barra grande"><span style={{ width: `${(n / Math.max(1, lista[0]?.n ?? 1)) * 100}%` }} /></span><strong>{n}</strong></li>
          ))}
        </ul>
      </section>
    </>
  );
}

function NuevoDiseno({ estado, actualizar, onListo }: { estado: EstadoAgenda; actualizar: ActualizarAgenda; onListo: (msg: string) => void }) {
  const [nombre, setNombre] = useState('');
  const [autora, setAutora] = useState(estado.profesionales[0]?.id ?? EQUIPO);
  const [patron, setPatron] = useState<Patron>('liso');
  const [forma, setForma] = useState<Forma>('almendra');
  const [esm, setEsm] = useState<string[]>(['nude']);
  const [extra, setExtra] = useState('0');
  const [err, setErr] = useState('');
  return (
    <form
      className="un-nuevo"
      onSubmit={(e) => {
        e.preventDefault();
        let fallo = '';
        const error = actualizar((x) => {
          const r = agregarDiseno(x, { nombre, autora, patron, forma, esmaltes: esm, extra: Number(extra.replace(/\D/g, '')) || 0 });
          if ('error' in r) {
            fallo = r.error;
            return x;
          }
          return r.estado;
        });
        if (fallo || error) return setErr(fallo || error!);
        onListo(`"${nombre.trim()}" ya aparece al reservar.`);
      }}
    >
      <div className="un-nuevo-vista"><MuestraUnas diseno={{ patron, forma, esmaltes: esm.length ? esm : ['nude'] }} titulo="Vista previa" className="un-muestra grande" /></div>
      <div className="un-nuevo-campos">
        <label>Nombre<input className="c-inp" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Francesa con brillo" /></label>
        <label>Quién lo hizo
          <select className="c-inp" value={autora} onChange={(e) => setAutora(e.target.value)}>
            {estado.profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            <option value={EQUIPO}>Catálogo del equipo</option>
          </select>
        </label>
        <label>Estilo
          <select className="c-inp" value={patron} onChange={(e) => setPatron(e.target.value as Patron)}>
            {PATRONES.map((p) => <option key={p} value={p}>{NOMBRE_PATRON[p]}</option>)}
          </select>
        </label>
        <label>Forma
          <select className="c-inp" value={forma} onChange={(e) => setForma(e.target.value as Forma)}>
            {FORMAS.map((f) => <option key={f} value={f}>{NOMBRE_FORMA[f]}</option>)}
          </select>
        </label>
        <fieldset className="un-esm-sel">
          <legend>Esmaltes (hasta 3, en orden: base, detalle, acento)</legend>
          {ESMALTES.map((x) => {
            const i = esm.indexOf(x.id);
            return (
              <button key={x.id} type="button" aria-pressed={i >= 0} onClick={() => setEsm((a) => (i >= 0 ? a.filter((y) => y !== x.id) : a.length >= 3 ? a : [...a, x.id]))}>
                <i style={{ background: x.color }} aria-hidden="true" />{x.nombre}{i >= 0 ? ` (${i + 1})` : ''}
              </button>
            );
          })}
        </fieldset>
        <label>Nail art: precio extra (0 si va incluido)<input className="c-inp" value={extra} onChange={(e) => setExtra(e.target.value)} inputMode="numeric" /></label>
        {err && <p className="bar-err" role="alert">{err}</p>}
        <button type="submit" className="d-btn prim">Guardar diseño</button>
      </div>
    </form>
  );
}
