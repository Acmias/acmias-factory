'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { useAhora } from '@/components/barberia/useBarberia';
import { NOMBRE_ESTADO, fechaCorta, hora, turnosDelDia } from '@/lib/rubros/barberia/agenda';
import { cambiarEstado } from '@/lib/rubros/barberia/logica';
import { COMBOS, DIAGNOSTICOS, PLANTILLAS } from '@/lib/rubros/consultorio/clinico/datos';
import { NOMBRE_DOC, agregarNota, fichaDe, firmarConsulta, itemsDeCombo, nombreProf, registrar, type ItemIndicacion } from '@/lib/rubros/consultorio/clinico/logica';
import type { Cliente, Turno } from '@/lib/rubros/barberia/tipos';
import type { Documento, EstadoClinico, TipoDocumento } from '@/lib/rubros/consultorio/clinico/tipos';
import { ListaDocumentos, iniciales, type PropsClinico } from './comun';

/** Consultas del día del profesional (CLI-06 a CLI-08). */
export function Consultas(props: PropsClinico) {
  const { agenda, clinico, actualizarClinico, medico, quien } = props;
  const ahora = useAhora();
  const [abierta, setAbierta] = useState<{ turno?: Turno; paciente: Cliente } | null>(null);
  const [sinTurno, setSinTurno] = useState('');
  if (!medico) return null;
  const hoy = turnosDelDia(agenda.turnos, new Date(ahora)).filter((t) => t.profId === medico.id && t.estado !== 'cancelado');
  const firmada = (t: Turno) => clinico.evoluciones.find((e) => e.turnoId === t.id);

  function abrir(paciente: Cliente, turno?: Turno) {
    actualizarClinico((c) => registrar(c, quien, `Abrió la historia de ${paciente.nombre}`));
    setAbierta({ paciente, turno });
  }

  if (abierta) return <PantallaConsulta {...props} paciente={abierta.paciente} turno={abierta.turno} onCerrar={() => setAbierta(null)} />;

  return (
    <section className="d-card" aria-labelledby="t-cons">
      <h2 id="t-cons">Consultas de hoy · {nombreProf(medico)}</h2>
      <p className="sub">Tocá Atender para abrir la historia, cargar la evolución y armar las indicaciones con un combo.</p>
      <ul className="cl-lista">
        {hoy.map((t) => {
          const p = agenda.clientes.find((c) => c.id === t.clienteId);
          const serv = agenda.servicios.find((s) => s.id === t.servicioId);
          const ev = firmada(t);
          const alergia = p && fichaDe(clinico, p.id)?.alergias.length;
          return (
            <li key={t.id} className="cl-fila">
              <strong style={{ width: 52, fontSize: 16 }}>{hora(t.inicio)}</strong>
              <div>
                <strong>{p?.nombre}{alergia ? <span className="cl-chip mal" style={{ marginLeft: 8 }}>Alergia registrada</span> : null}</strong>
                <small>{serv?.nombre} · {t.cobertura}{t.sobreturno ? ' · Sobreturno' : ''}</small>
              </div>
              <span className={`cl-chip ${ev ? 'ok' : t.estado === 'ausente' ? 'mal' : t.estado === 'confirmado' ? 'info' : ''}`}>{ev ? 'Firmada' : NOMBRE_ESTADO[t.estado]}</span>
              {p && t.estado !== 'ausente' && (
                <button type="button" className={`d-btn${ev ? '' : ' prim'}`} onClick={() => abrir(p, ev ? undefined : t)}>{ev ? 'Ver historia' : 'Atender'}</button>
              )}
            </li>
          );
        })}
      </ul>
      {!hoy.length && <p className="cl-vacio">Hoy no hay turnos con {nombreProf(medico)}. Podés abrir una consulta sin turno.</p>}
      <form className="cl-form" style={{ marginTop: 18, maxWidth: 520 }} onSubmit={(e) => { e.preventDefault(); const p = agenda.clientes.find((c) => c.id === sinTurno); if (p) abrir(p); }}>
        <label>Consulta sin turno
          <select className="c-inp" value={sinTurno} onChange={(e) => setSinTurno(e.target.value)}>
            <option value="">Elegí un paciente</option>
            {[...agenda.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <div><button type="submit" className="d-btn" disabled={!sinTurno}>Abrir historia</button></div>
      </form>
    </section>
  );
}

const TIPOS: TipoDocumento[] = ['receta', 'certificado', 'orden', 'indicacion'];

function PantallaConsulta({ slug, config, agenda, actualizar, clinico, actualizarClinico, quien, medico, paciente, turno, onCerrar }: PropsClinico & { paciente: Cliente; turno?: Turno; onCerrar: () => void }) {
  const prof = medico!;
  const plantilla = PLANTILLAS[prof.id] ?? PLANTILLAS['m-mendez'];
  const ficha = fichaDe(clinico, paciente.id);
  const [motivo, setMotivo] = useState('');
  const [texto, setTexto] = useState('');
  const [dictado, setDictado] = useState(false);
  const [diag, setDiag] = useState('');
  const [combo, setCombo] = useState<string | null>(null);
  const [items, setItems] = useState<ItemIndicacion[]>([]);
  const [control, setControl] = useState<number>(0);
  const [confirmo, setConfirmo] = useState(false);
  const [error, setError] = useState('');
  const [hecho, setHecho] = useState<Documento[] | null>(null);
  const [tab, setTab] = useState<'consulta' | 'historia'>(turno ? 'consulta' : 'historia');

  function elegirCombo(id: string) {
    if (combo === id) { setCombo(null); setItems([]); setControl(0); return; }
    setCombo(id);
    setItems(itemsDeCombo(id));
    setControl(COMBOS.find((x) => x.id === id)?.control ?? 0);
  }

  function firmar() {
    if (!motivo.trim() || !texto.trim()) return setError('Completá el motivo y la evolución antes de firmar.');
    if (!confirmo) return setError(`Confirmá que firmás como ${nombreProf(prof)}.`);
    let docs: Documento[] = [];
    const err = actualizarClinico((c) => {
      const r = firmarConsulta(c, { pacienteId: paciente.id, profId: prof.id, turnoId: turno?.id, motivo, texto, diagnostico: diag, items, proximoControlDias: control || undefined }, config.negocio, quien);
      docs = r.documentos;
      return r.estado;
    });
    if (err) return setError(err);
    if (turno && turno.estado !== 'atendido') actualizar((a) => cambiarEstado(a, turno.id, 'atendido').estado);
    setHecho(docs);
  }

  if (hecho) {
    return (
      <section className="d-card" aria-labelledby="t-firm">
        <h2 id="t-firm"><Icono nombre="check" size={20} /> Consulta firmada</h2>
        <p className="sub">La evolución de {paciente.nombre} quedó guardada y ya no se puede editar. {hecho.length ? 'El paciente recibió un aviso neutro: "Tenés un documento nuevo en tu portal".' : ''}</p>
        <ListaDocumentos slug={slug} docs={hecho} agenda={agenda} negocio={config.negocio} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          <button type="button" className="d-btn prim" onClick={onCerrar}>Volver a las consultas</button>
          <Link className="d-btn" href={`/d/${slug}/portal`}>Ver el portal del paciente</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="d-card" aria-labelledby="t-pc">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" className="d-btn" onClick={onCerrar} aria-label="Volver a las consultas"><Icono nombre="atras" size={18} /></button>
        <span className="bar-avatar" aria-hidden="true">{iniciales(paciente.nombre)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 id="t-pc" style={{ margin: 0 }}>{paciente.nombre}</h2>
          <span className="cl-gris">{paciente.cobertura}{paciente.afiliado ? ` · ${paciente.afiliado}` : ''}{turno ? ` · Turno ${hora(turno.inicio)} h` : ' · Sin turno'}</span>
        </div>
        {tab === 'consulta' && <button type="button" className="d-btn prim" onClick={firmar}>Firmar y cerrar consulta</button>}
      </div>
      <div className="seg" role="group" aria-label="Secciones" style={{ marginBottom: 14 }}>
        <button type="button" aria-pressed={tab === 'consulta'} onClick={() => setTab('consulta')}>Consulta de hoy</button>
        <button type="button" aria-pressed={tab === 'historia'} onClick={() => setTab('historia')}>Historia clínica</button>
      </div>
      {tab === 'historia' ? <HistoriaClinica slug={slug} agenda={agenda} clinico={clinico} actualizarClinico={actualizarClinico} paciente={paciente} negocio={config.negocio} quien={quien} /> : (
        <div className="cl-dos">
          <aside style={{ display: 'grid', gap: 12 }} aria-label="Resumen del paciente">
            {ficha?.alergias.map((a) => <div key={a} className="cl-alerta" role="alert"><Icono nombre="info" size={18} /> Alergia registrada: {a}</div>)}
            <div className="cl-tarea">
              <small className="cl-gris">Antecedentes</small><p>{ficha?.antecedentes}</p>
              <small className="cl-gris">Medicación habitual</small><p>{ficha?.medicacion}</p>
              {ficha?.cronico && <><small className="cl-gris">Control periódico</small><p>{ficha.cronico}{ficha.proximoControl ? ` · próximo ${fechaCorta(new Date(ficha.proximoControl + 'T12:00'))}` : ''}</p></>}
            </div>
            <div className="cl-tarea">
              <small className="cl-gris">Última evolución</small>
              {(() => { const u = clinico.evoluciones.filter((e) => e.pacienteId === paciente.id).at(-1); return u ? <p>{fechaCorta(new Date(u.fecha))} · {nombreProf(agenda.profesionales.find((x) => x.id === u.profId))}: {u.texto}</p> : <p>Primera consulta.</p>; })()}
            </div>
          </aside>
          <div className="cl-form">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>Evolución · plantilla de {prof.especialidad.toLowerCase()}</h3>
              <button type="button" className="d-btn" onClick={() => { setTexto(plantilla.dictado); setDictado(true); }}><Icono nombre="chispa" size={18} /> Dictar (simulación)</button>
            </div>
            <label>{plantilla.campos[0]}<input className="c-inp" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>
            <label>{plantilla.campos[1]}
              <textarea className={`c-inp${dictado ? ' cl-borrador' : ''}`} rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} />
              {dictado && <span className="bar-ayuda" style={{ color: 'var(--sem-amarillo)' }}>Borrador del dictado simulado: no usa el micrófono ni la IA. Revisalo antes de firmar.</span>}
            </label>
            <label>{plantilla.campos[2]}
              {prof.id === 'm-mendez' ? (
                <select className="c-inp" value={diag} onChange={(e) => setDiag(e.target.value)}>
                  <option value="">Elegí un diagnóstico (CIE-10)</option>
                  {DIAGNOSTICOS.map((d) => <option key={d}>{d}</option>)}
                </select>
              ) : <input className="c-inp" value={diag} onChange={(e) => setDiag(e.target.value)} />}
            </label>
            <div style={{ display: 'grid', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>Indicaciones</h3>
              <span className="cl-gris">Elegí un combo y ajustá lo que haga falta.</span>
              <div className="cl-combos" role="group" aria-label="Combos de indicaciones">
                {COMBOS.map((x) => <button key={x.id} type="button" aria-pressed={combo === x.id} onClick={() => elegirCombo(x.id)}>{x.nombre}</button>)}
              </div>
              {items.length ? (
                <ul className="cl-items">
                  {items.map((it, i) => (
                    <li key={i}>
                      <select aria-label="Tipo" className="cl-tipo" value={it.tipo} onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, tipo: e.target.value as TipoDocumento } : x)))}>
                        {TIPOS.map((t) => <option key={t} value={t}>{NOMBRE_DOC[t]}</option>)}
                      </select>
                      <input aria-label={`Texto de ${NOMBRE_DOC[it.tipo]}`} value={it.texto} onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))} />
                      <button type="button" className="d-btn" aria-label="Quitar" onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}><Icono nombre="basura" size={16} /></button>
                    </li>
                  ))}
                </ul>
              ) : <p className="cl-vacio">Todavía no hay indicaciones. Tocá un combo para empezar.</p>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" className="d-btn" onClick={() => setItems((xs) => [...xs, { tipo: 'receta', texto: '' }])}><Icono nombre="mas" size={16} /> Agregar indicación</button>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>Próximo control
                  <select className="c-inp" style={{ width: 'auto' }} value={control} onChange={(e) => setControl(Number(e.target.value))}>
                    <option value={0}>Sin control</option><option value={7}>En 7 días</option><option value={30}>En 30 días</option><option value={90}>En 3 meses</option><option value={180}>En 6 meses</option>
                  </select>
                </label>
              </div>
              {ficha?.alergias.some((a) => items.some((x) => x.texto.toLowerCase().includes(a.toLowerCase().slice(0, 6)))) && (
                <div className="cl-alerta" role="alert"><Icono nombre="info" size={18} /> Una indicación menciona {ficha.alergias.join(', ')}, que figura como alergia.</div>
              )}
            </div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600 }}>
              <input type="checkbox" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} style={{ width: 22, height: 22 }} />
              Firmo como {nombreProf(prof)}, {prof.matricula}. Después de firmar no se puede editar.
            </label>
            {error && <p role="alert" style={{ margin: 0, color: 'var(--sem-rojo)', fontWeight: 700 }}>{error}</p>}
            <div><button type="button" className="d-btn prim" onClick={firmar}>Firmar y cerrar consulta</button></div>
          </div>
        </div>
      )}
    </section>
  );
}

/** Historia clínica del paciente: evoluciones firmadas (no editables, con agregados), documentos y resultados. */
export function HistoriaClinica({ slug, agenda, clinico, actualizarClinico, paciente, negocio, quien }: { slug: string; agenda: PropsClinico['agenda']; clinico: EstadoClinico; actualizarClinico: PropsClinico['actualizarClinico']; paciente: Cliente; negocio: string; quien: string }) {
  const [nota, setNota] = useState<{ id: string; texto: string } | null>(null);
  const ficha = fichaDe(clinico, paciente.id);
  const evol = clinico.evoluciones.filter((e) => e.pacienteId === paciente.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const docs = clinico.documentos.filter((d) => d.pacienteId === paciente.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const prof = (id: string) => nombreProf(agenda.profesionales.find((p) => p.id === id));
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="cl-aviso"><Icono nombre="candado" size={18} /> <span>Datos ficticios de demostración. Solo el profesional ve esta historia; cada apertura queda registrada.</span></div>
      <div className="cl-grid">
        <div className="cl-kpi"><span>Alergias</span><strong style={{ fontSize: 16 }}>{ficha?.alergias.join(', ') || 'No refiere'}</strong></div>
        <div className="cl-kpi"><span>Antecedentes</span><strong style={{ fontSize: 16 }}>{ficha?.antecedentes}</strong></div>
        <div className="cl-kpi"><span>Medicación</span><strong style={{ fontSize: 16 }}>{ficha?.medicacion}</strong></div>
      </div>
      <h3 style={{ margin: 0, fontSize: 17 }}>Evoluciones</h3>
      <ol className="cl-evol">
        {evol.slice(0, 10).map((e) => (
          <li key={e.id}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong>{fechaCorta(new Date(e.fecha))}</strong><span className="cl-gris">{prof(e.profId)} · {e.motivo}</span>
              <span className="cl-chip ok"><Icono nombre="candado" size={12} /> Firmada</span>
              {e.diagnostico && <span className="cl-chip">{e.diagnostico}</span>}
            </div>
            <p>{e.texto}</p>
            {e.agregados.map((a, i) => <div key={i} className="cl-agregado"><strong>Agregado {fechaCorta(new Date(a.fecha))}:</strong> {a.texto}</div>)}
            {nota?.id === e.id ? (
              <form style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }} onSubmit={(ev) => { ev.preventDefault(); if (nota.texto.trim()) { actualizarClinico((c) => agregarNota(c, e.id, nota.texto, quien)); setNota(null); } }}>
                <input className="c-inp" style={{ flex: 1, minWidth: 200 }} aria-label="Texto del agregado" value={nota.texto} onChange={(x) => setNota({ id: e.id, texto: x.target.value })} />
                <button type="submit" className="d-btn prim">Guardar agregado</button>
                <button type="button" className="d-btn" onClick={() => setNota(null)}>Cancelar</button>
              </form>
            ) : <button type="button" className="d-btn" style={{ minHeight: 36, marginTop: 8 }} onClick={() => setNota({ id: e.id, texto: '' })}>Agregar nota</button>}
          </li>
        ))}
        {!evol.length && <li className="cl-vacio">Todavía no hay consultas firmadas.</li>}
      </ol>
      <h3 style={{ margin: 0, fontSize: 17 }}>Recetas, certificados y órdenes</h3>
      <ListaDocumentos slug={slug} docs={docs.slice(0, 6)} agenda={agenda} negocio={negocio} conQr={false} />
    </div>
  );
}
