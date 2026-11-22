'use client';

import { useMemo, useState } from 'react';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { useAhora } from '@/components/barberia/useBarberia';
import { formatoPrecio } from '@/lib/utiles';
import { DIA_MS, fechaCorta, hora } from '@/lib/rubros/barberia/agenda';
import { reservar } from '@/lib/rubros/barberia/logica';
import { PLANTILLAS_PROC, checklistDe, codigoDemo, itemsDe } from '@/lib/rubros/consultorio/clinico/datos';
import {
  COLUMNAS, MSJ, NOMBRE_PLAN, actualizarPresupuesto, agregarMensaje, columnaDe, diasDesde, enviarPresupuesto, estadoActual, montosPlan,
  nombreProf, nuevaVersion, pagarSena, primerNombre, registrar, statsPresupuestos, totalDe, vistoSinRespuesta,
} from '@/lib/rubros/consultorio/clinico/logica';
import type { Presupuesto } from '@/lib/rubros/consultorio/clinico/tipos';
import type { PropsClinico } from './comun';

const NOMBRE_ESTADO_P: Record<Presupuesto['estado'], string> = { borrador: 'Borrador', enviado: 'Enviado', visto: 'Visto', consulta: 'Con consultas', aceptado: 'Aceptado', rechazado: 'Rechazado', vencido: 'Vencido' };

function etiqueta(p: Presupuesto, ahora: number) {
  const e = estadoActual(p, ahora);
  if (e === 'aceptado') return p.realizado ? { t: `Realizado ${fechaCorta(new Date(p.realizado))}`, c: 'ok' } : p.turnoId ? { t: 'Seña pagada · turno agendado', c: 'ok' } : p.sena === 'pagada' ? { t: 'Seña pagada · falta agendar', c: 'av' } : { t: 'Falta la seña', c: 'av' };
  if (e === 'visto') return { t: `Visto hace ${diasDesde(p.visto, ahora)} días`, c: vistoSinRespuesta(p, ahora) ? 'av' : '' };
  if (e === 'consulta') return { t: 'Preguntó algo', c: 'info' };
  if (e === 'enviado') { const d = diasDesde(p.enviado, ahora); return { t: d ? `Enviado hace ${d} días` : 'Enviado hoy', c: '' }; }
  if (e === 'rechazado') return { t: `Rechazado · ${p.motivoRechazo ?? 'sin motivo'}`, c: '' };
  return { t: NOMBRE_ESTADO_P[e], c: '' };
}

/** Presupuestos de procedimientos (CLI-18 a CLI-24): tablero por estado, seguimiento y del "sí" al turno. */
export function Presupuestos(props: PropsClinico) {
  const { agenda, clinico, actualizarClinico, config, quien } = props;
  const ahora = useAhora();
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [msg, setMsg] = useState('');
  const visibles = clinico.presupuestos.filter((p) => !p.realizado || +new Date(p.realizado) > ahora - 30 * DIA_MS);
  const st = statsPresupuestos(clinico, ahora);
  const pac = (id: string) => agenda.clientes.find((c) => c.id === id);
  const p = abierto ? clinico.presupuestos.find((x) => x.id === abierto) : null;

  function recordarTodos() {
    actualizarClinico((c) => {
      let e = c;
      for (const x of st.sinRespuesta) e = agregarMensaje(e, { pacienteId: x.pacienteId, texto: MSJ.recordatorioPropuesta(primerNombre(pac(x.pacienteId)), config.negocio), boton: { texto: 'Ver la propuesta', destino: 'presupuesto', ref: x.id } });
      return registrar(e, quien, `Recordó ${st.sinRespuesta.length} presupuestos sin respuesta`);
    });
    setMsg(`Les escribimos a ${st.sinRespuesta.length} pacientes. Miralo en el simulador de WhatsApp.`);
  }

  return (
    <section className="d-card" aria-labelledby="t-pres">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div><h2 id="t-pres">Presupuestos</h2><p className="sub">Del presupuesto al procedimiento, sin llamar.</p></div>
        <button type="button" className="d-btn prim" onClick={() => setNuevo(true)}><Icono nombre="mas" size={18} /> Nuevo presupuesto</button>
      </div>
      {st.sinRespuesta.length > 0 && (
        <div className="cl-aviso" role="status" style={{ marginBottom: 14, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span><strong>{st.sinRespuesta.length} presupuestos vistos hace más de 3 días sin respuesta.</strong> Un mensaje a tiempo suele destrabarlos.</span>
          <button type="button" className="d-btn" onClick={recordarTodos}>Escribirles</button>
        </div>
      )}
      {msg && <p role="status" className="cl-chip ok" style={{ marginBottom: 12 }}>{msg}</p>}
      <div className="cl-grid" style={{ marginBottom: 16 }}>
        <div className="cl-kpi"><strong>{st.tasa} %</strong><span>se aceptan</span></div>
        <div className="cl-kpi"><strong>{st.diasAceptar} días</strong><span>en promedio hasta aceptar</span></div>
        <div className="cl-kpi"><strong>{st.abiertos}</strong><span>abiertos · {formatoPrecio(st.montoAbierto, config.moneda)}</span></div>
        <div className="cl-kpi"><strong style={{ fontSize: 20 }}>{st.motivos[0]?.[0] ?? '—'}</strong><span>motivo de rechazo más común</span></div>
      </div>
      <div className="cl-tablero">
        {COLUMNAS.map((col) => {
          const xs = visibles.filter((x) => columnaDe(x, ahora) === col.id || (col.id === 'enviado' && x.estado === 'borrador'));
          return (
            <section key={col.id} className="cl-col" aria-label={col.nombre}>
              <h3>{col.nombre}<span className="cl-chip">{xs.length}</span></h3>
              {xs.map((x) => {
                const et = x.estado === 'borrador' ? { t: 'Borrador sin enviar', c: 'av' } : etiqueta(x, ahora);
                return (
                  <button key={x.id} type="button" className="cl-tarjeta" onClick={() => setAbierto(x.id)}>
                    <strong>{pac(x.pacienteId)?.nombre}</strong>
                    <span className="cl-gris">{x.procedimiento}{x.version > 1 ? ` · versión ${x.version}` : ''}</span>
                    <span className="cl-gris">{formatoPrecio(totalDe(x), config.moneda)}</span>
                    <span className={`cl-chip ${et.c}`} style={{ justifySelf: 'start' }}>{et.t}</span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>
      {nuevo && <NuevoPresupuesto {...props} onCerrar={() => setNuevo(false)} onCreado={(id) => { setNuevo(false); setAbierto(id); }} />}
      {p && <DetallePresupuesto {...props} p={p} onCerrar={() => setAbierto(null)} />}
    </section>
  );
}

function NuevoPresupuesto({ agenda, clinico, actualizarClinico, config, quien, onCerrar, onCreado }: PropsClinico & { onCerrar: () => void; onCreado: (id: string) => void }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const [pac, setPac] = useState('');
  const [pl, setPl] = useState(PLANTILLAS_PROC[0].id);
  const plantilla = PLANTILLAS_PROC.find((x) => x.id === pl)!;
  const [items, setItems] = useState(() => itemsDe(plantilla, config.moneda));
  const [desc, setDesc] = useState(0);
  const [error, setError] = useState('');
  const prof = agenda.profesionales.find((p) => p.id === 'm-rios') ?? agenda.profesionales[0];
  const total = items.reduce((s, i) => s + i.monto, 0);

  function crear(enviar: boolean) {
    if (!pac) return setError('Elegí el paciente.');
    const ahora = Date.now();
    const conDesc = desc > 0 ? [...items, { concepto: `Descuento ${desc} %`, monto: -Math.round((total * desc) / 100) }] : items;
    const p: Presupuesto = {
      id: `pr${ahora.toString(36)}`, codigo: codigoDemo(), pacienteId: pac, profId: prof.id, procedimiento: plantilla.nombre, servicioId: plantilla.servicioId,
      items: conDesc, incluye: plantilla.incluye, noIncluye: plantilla.noIncluye, creado: new Date(ahora).toISOString(), validoHasta: new Date(ahora + 30 * DIA_MS).toISOString(),
      version: 1, estado: 'borrador', checklist: checklistDe(plantilla), controles: [],
    };
    const err = actualizarClinico((c) => (enviar ? enviarPresupuesto(c, p, config.negocio, quien) : registrar({ ...c, presupuestos: [...c.presupuestos, p] }, quien, 'Creó un presupuesto')));
    if (err) return setError(err);
    onCreado(p.id);
  }

  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja hoja-ancha" role="dialog" aria-modal="true" aria-labelledby="t-np" ref={ref}>
        <div className="hoja-cab"><h3 id="t-np">Nuevo presupuesto</h3><button type="button" className="x" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" /></button></div>
        <div className="cl-form">
          <label>Paciente
            <select className="c-inp" value={pac} onChange={(e) => setPac(e.target.value)}>
              <option value="">Elegí un paciente</option>
              {[...agenda.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <label>Procedimiento (plantilla)
            <select className="c-inp" value={pl} onChange={(e) => { const n = PLANTILLAS_PROC.find((x) => x.id === e.target.value)!; setPl(n.id); setItems(itemsDe(n, config.moneda)); }}>
              {PLANTILLAS_PROC.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </select>
          </label>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            <legend style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Ítems</legend>
            {items.map((it, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 140px', gap: 8 }}>
                <input className="c-inp" aria-label={`Concepto ${i + 1}`} value={it.concepto} onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, concepto: e.target.value } : x)))} />
                <input className="c-inp" aria-label={`Monto de ${it.concepto}`} inputMode="numeric" value={it.monto} onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, monto: Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0) } : x)))} />
              </div>
            ))}
            <button type="button" className="d-btn" style={{ justifySelf: 'start' }} onClick={() => setItems((xs) => [...xs, { concepto: 'Otro ítem', monto: 0 }])}><Icono nombre="mas" size={16} /> Agregar ítem</button>
          </fieldset>
          <label>Descuento (%)<input className="c-inp" type="number" min={0} max={50} value={desc} onChange={(e) => setDesc(Math.min(50, Math.max(0, Number(e.target.value) || 0)))} /></label>
          <p style={{ margin: 0, fontSize: 18 }}>Total: <strong>{formatoPrecio(total - Math.round((total * desc) / 100), config.moneda)}</strong></p>
          <p className="cl-gris" style={{ margin: 0 }}>Incluye: {plantilla.incluye} No incluye: {plantilla.noIncluye} Vale 30 días. Se ofrece contado, seña y saldo o cuotas.</p>
          {error && <p role="alert" style={{ margin: 0, color: 'var(--sem-rojo)', fontWeight: 700 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="d-btn prim" onClick={() => crear(true)}>Enviar al paciente</button>
            <button type="button" className="d-btn" onClick={() => crear(false)}>Guardar borrador</button>
          </div>
          <p className="cl-gris" style={{ margin: 0 }}>{nombreProf(prof)} · {clinico.presupuestos.length} presupuestos en total</p>
        </div>
      </div>
    </div>
  );
}

function DetallePresupuesto({ agenda, actualizar, clinico, actualizarClinico, config, quien, p, onCerrar }: PropsClinico & { p: Presupuesto; onCerrar: () => void }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  const ahora = useAhora();
  const paciente = agenda.clientes.find((c) => c.id === p.pacienteId);
  const [motivo, setMotivo] = useState('Precio');
  const [fecha, setFecha] = useState(() => { const d = new Date(ahora + 7 * DIA_MS); d.setHours(10, 0, 0, 0); return toLocal(d); });
  const [msg, setMsg] = useState('');
  const e = estadoActual(p, ahora);
  const turno = p.turnoId ? agenda.turnos.find((t) => t.id === p.turnoId) : null;
  const listos = p.checklist.filter((x) => x.hecho).length;
  const plan = p.plan ? montosPlan(p, p.plan) : null;
  const cambiar = (c: Partial<Presupuesto>, que: string) => actualizarClinico((x) => registrar(actualizarPresupuesto(x, p.id, c), quien, que));
  const otrosDelPaciente = useMemo(() => clinico.presupuestos.filter((x) => x.pacienteId === p.pacienteId && x.id !== p.id).length, [clinico.presupuestos, p]);

  function agendar() {
    if (!paciente) return;
    const ini = new Date(fecha);
    if (Number.isNaN(+ini) || +ini < Date.now()) return setMsg('Elegí una fecha y hora futuras.');
    const r = reservar(agenda, { servicioId: p.servicioId, profId: p.profId, inicio: +ini, nombre: paciente.nombre, whatsapp: paciente.whatsapp, origen: 'manual', cobertura: paciente.cobertura });
    if ('error' in r) return setMsg(r.error);
    const err = actualizar(() => r.estado);
    if (err) return setMsg(err);
    actualizarClinico((x) => agregarMensaje(registrar(actualizarPresupuesto(x, p.id, { turnoId: r.turno.id }), quien, 'Agendó un procedimiento'), { pacienteId: p.pacienteId, texto: MSJ.confirmado(config.negocio, `${fechaCorta(ini)} a las ${hora(ini.toISOString())} h`), boton: { texto: 'Ver mi turno', destino: 'portal' } }));
    setMsg('Turno agendado. El paciente recibió la confirmación.');
  }

  function realizado() {
    const base = turno ? +new Date(turno.inicio) : ahora;
    const pl = PLANTILLAS_PROC.find((x) => x.nombre === p.procedimiento);
    cambiar({ realizado: new Date(base).toISOString(), controles: (pl?.controles ?? [15]).map((d) => ({ dias: d, fecha: new Date(base + d * DIA_MS).toISOString(), hecho: false })) }, 'Registró un procedimiento realizado');
  }

  return (
    <div className="hoja-fondo" onClick={(ev) => ev.target === ev.currentTarget && onCerrar()}>
      <div className="hoja hoja-ancha" role="dialog" aria-modal="true" aria-labelledby="t-dp" ref={ref}>
        <div className="hoja-cab">
          <div>
            <h3 id="t-dp">{p.procedimiento}</h3>
            <p style={{ margin: '4px 0 0' }} className="cl-gris">{paciente?.nombre} · {p.codigo} · versión {p.version} · {NOMBRE_ESTADO_P[e]}{otrosDelPaciente ? ` · ${otrosDelPaciente} presupuestos anteriores` : ''}</p>
          </div>
          <button type="button" className="x" aria-label="Cerrar" onClick={onCerrar}><Icono nombre="cerrar" /></button>
        </div>
        <ul className="cl-items" style={{ marginBottom: 12 }}>
          {p.items.map((it, i) => <li key={i}><span style={{ flex: 1 }}>{it.concepto}</span><strong>{it.monto ? formatoPrecio(it.monto, config.moneda) : 'Incluido'}</strong></li>)}
          <li><span style={{ flex: 1, fontWeight: 800 }}>Total</span><strong>{formatoPrecio(totalDe(p), config.moneda)}</strong></li>
        </ul>
        <p className="cl-gris" style={{ margin: '0 0 12px' }}>Vale hasta el {fechaCorta(new Date(p.validoHasta))}. {p.consulta ? `Consulta del paciente: "${p.consulta}"` : ''}</p>

        {(e === 'borrador') && <button type="button" className="d-btn prim" onClick={() => actualizarClinico((x) => enviarPresupuesto(x, p, config.negocio, quien))}>Enviar al paciente</button>}

        {(e === 'enviado' || e === 'visto' || e === 'consulta') && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="d-btn prim" onClick={() => { actualizarClinico((x) => agregarMensaje(x, { pacienteId: p.pacienteId, texto: MSJ.recordatorioPropuesta(primerNombre(paciente), config.negocio), boton: { texto: 'Ver la propuesta', destino: 'presupuesto', ref: p.id } })); setMsg('Le escribimos. Miralo en el simulador de WhatsApp.'); }}>Recordar por mensaje</button>
              <button type="button" className="d-btn" onClick={() => { actualizarClinico((x) => nuevaVersion(x, p.id)); setMsg('Quedó la versión nueva como borrador. Ajustala y enviala.'); }}>Hacer versión {p.version + 1}</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: 14 }}>Motivo del rechazo
                <select className="c-inp" value={motivo} onChange={(ev) => setMotivo(ev.target.value)}>{['Precio', 'Prefiere esperar', 'Pidió otra opinión', 'Sin respuesta'].map((m) => <option key={m}>{m}</option>)}</select>
              </label>
              <button type="button" className="d-btn" onClick={() => cambiar({ estado: 'rechazado', motivoRechazo: motivo }, 'Marcó un presupuesto como rechazado')}>Marcar como rechazado</button>
            </div>
          </div>
        )}

        {e === 'aceptado' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="cl-tarea">
              <strong style={{ fontSize: 16 }}>Aceptado y firmado</strong>
              <span>{p.firma?.nombre} · {p.firma ? fechaCorta(new Date(p.firma.fecha)) : ''} · {p.plan ? NOMBRE_PLAN[p.plan] : ''}</span>
              {plan && <span className="cl-gris">Ahora {formatoPrecio(plan.ahora, config.moneda)}{plan.resto ? ` · resto ${formatoPrecio(plan.resto, config.moneda)}` : ''}</span>}
              <span className={`cl-chip ${p.sena === 'pagada' ? 'ok' : 'av'}`} style={{ justifySelf: 'start' }}>{p.sena === 'pagada' ? 'Pago recibido' : 'Pago pendiente'}</span>
              {p.sena !== 'pagada' && <button type="button" className="d-btn" onClick={() => actualizarClinico((x) => pagarSena(x, p.id, config.negocio))}>Registrar pago recibido</button>}
            </div>
            {!p.realizado && (
              turno ? <p className="cl-chip ok" style={{ justifySelf: 'start' }}>Turno: {fechaCorta(new Date(turno.inicio))} a las {hora(turno.inicio)} h</p> : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
                  <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: 14 }}>Fecha y hora del procedimiento<input className="c-inp" type="datetime-local" value={fecha} onChange={(ev) => setFecha(ev.target.value)} /></label>
                  <button type="button" className="d-btn prim" disabled={p.sena !== 'pagada'} onClick={agendar}>Agendar procedimiento</button>
                  {p.sena !== 'pagada' && <span className="cl-gris">Se agenda cuando llega el pago.</span>}
                </div>
              )
            )}
            <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
              <legend style={{ fontWeight: 800, marginBottom: 6 }}>Antes del procedimiento · {listos} de {p.checklist.length} listos</legend>
              {p.checklist.map((k) => (
                <label key={k.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="checkbox" checked={k.hecho} style={{ width: 22, height: 22 }} onChange={() => cambiar({ checklist: p.checklist.map((x) => (x.id === k.id ? { ...x, hecho: !x.hecho } : x)) }, `Marcó "${k.texto}"`)} />
                  <span>{k.texto}</span>
                  <span className={`cl-chip ${k.hecho ? 'ok' : 'mal'}`}>{k.hecho ? 'Listo' : 'Falta'}</span>
                </label>
              ))}
            </fieldset>
            {p.realizado ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <strong>Controles después</strong>
                {p.controles.map((k, i) => (
                  <label key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="checkbox" checked={k.hecho} style={{ width: 22, height: 22 }} onChange={() => cambiar({ controles: p.controles.map((x, j) => (j === i ? { ...x, hecho: !x.hecho } : x)) }, 'Registró un control')} />
                    <span>Control a los {k.dias} días · {fechaCorta(new Date(k.fecha))}</span>
                  </label>
                ))}
              </div>
            ) : <button type="button" className="d-btn" disabled={listos < p.checklist.length} onClick={realizado}>Registrar procedimiento realizado{listos < p.checklist.length ? ' (completá la lista)' : ''}</button>}
          </div>
        )}
        {(e === 'rechazado' || e === 'vencido') && <button type="button" className="d-btn" onClick={() => actualizarClinico((x) => nuevaVersion(x, p.id))}>Reabrir con una versión nueva</button>}
        {msg && <p role="status" style={{ margin: '12px 0 0', fontWeight: 600 }}>{msg}</p>}
      </div>
    </div>
  );
}

function toLocal(d: Date) {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
}
