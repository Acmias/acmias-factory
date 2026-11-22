'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { useAhora } from '@/components/barberia/useBarberia';
import { formatoPrecio, soloDigitos } from '@/lib/utiles';
import { DIA_MS, fechaCorta, hora, nombreDia } from '@/lib/rubros/barberia/agenda';
import {
  CUOTAS, MSJ, NOMBRE_DOC, NOMBRE_PLAN, PORC_SENA, aceptarPresupuesto, actualizarPresupuesto, agregarMensaje, compartir, estadoActual, montosPlan, nombreProf, pagarSena, registrar, serie, totalDe,
} from '@/lib/rubros/consultorio/clinico/logica';
import type { Cliente } from '@/lib/rubros/barberia/tipos';
import type { EstadoClinico, PlanPago, Presupuesto } from '@/lib/rubros/consultorio/clinico/tipos';
import { useClinico } from './useClinico';
import { Simulador } from './Simulador';
import { GraficoLinea } from './Graficos';
import { NOMBRE_PERMISO } from './Galeria';
import { Comparador, ListaDocumentos, PedirPin, iniciales } from './comun';

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

type Seccion = 'inicio' | 'documentos' | 'resultados' | 'presupuestos' | 'mas';

/**
 * Portal del paciente (BRD 15, F8): entra con su WhatsApp y un código de un solo uso (en la demo llega
 * al simulador). Ve turnos, indicaciones, recetas con QR, resultados, presupuestos, sus fotos y su familia.
 */
export function PortalPaciente({ slug }: { slug: string }) {
  const { config, estado: agenda, clinico, actualizarClinico, estilo, listo } = useClinico(slug);
  const [paso, setPaso] = useState<'tel' | 'codigo' | 'dentro'>('tel');
  const [tel, setTel] = useState('');
  const [codigo, setCodigo] = useState('');
  const [esperado, setEsperado] = useState('');
  const [titular, setTitular] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<string | null>(null);
  const [sec, setSec] = useState<Seccion>('inicio');
  const [presAbierto, setPresAbierto] = useState<string | null>(() => (typeof window === 'undefined' ? null : window.location.hash.match(/presupuesto=([A-Za-z0-9_-]+)/)?.[1] ?? null));
  const [error, setError] = useState('');

  if (!config || !agenda || !clinico) return <DemoNoEncontrada listo={listo} />;
  const ana = agenda.clientes[0];

  function pedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    const d = soloDigitos(tel);
    const p = agenda!.clientes.find((c) => d.length >= 8 && (c.whatsapp.endsWith(d.slice(-8)) || d.endsWith(c.whatsapp.slice(-8))));
    if (!p) return setError('No encontramos ese WhatsApp en el consultorio. Revisalo o pedí un turno primero.');
    const cod = String(Math.floor(1000 + Math.random() * 9000));
    actualizarClinico((c) => agregarMensaje(c, { pacienteId: p.id, texto: MSJ.codigo(cod, config!.negocio) }));
    setEsperado(cod);
    setTitular(p.id);
    setPerfil(p.id);
    setError('');
    setPaso('codigo');
  }

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (soloDigitos(codigo) !== esperado) return setError('El código no coincide. Miralo en el simulador de WhatsApp.');
    actualizarClinico((c) => registrar(c, 'Paciente (portal)', `Entró al portal: ${agenda!.clientes.find((x) => x.id === titular)?.nombre}`));
    setError('');
    setPaso('dentro');
    if (presAbierto) setSec('presupuestos');
  }

  const tit = agenda.clientes.find((c) => c.id === titular);
  const pac = agenda.clientes.find((c) => c.id === perfil) ?? tit;
  const familia = titular ? [titular, ...(clinico.familias[titular] ?? [])] : [];

  return (
    <div className="cl-portal cl" style={estilo}>
      <AvisoDemo texto="Demo con datos ficticios" />
      <div className="cl-portal-in">
        <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {config.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logo} alt="" style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', objectFit: 'contain', padding: 4 }} />
          ) : <span className="bar-avatar" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <small className="cl-gris">{config.negocio}</small>
            <h1 style={{ margin: 0, fontSize: 22 }}>{paso === 'dentro' && pac ? `Hola, ${pac.nombre.split(' ')[0]}` : 'Mi portal'}</h1>
          </div>
          {paso === 'dentro' && familia.length > 1 && (
            <label style={{ display: 'grid', fontSize: 12, fontWeight: 700 }}>Perfil
              <select className="c-inp" style={{ minHeight: 40 }} value={perfil ?? ''} onChange={(e) => setPerfil(e.target.value)}>
                {familia.map((id) => <option key={id} value={id}>{agenda.clientes.find((c) => c.id === id)?.nombre}</option>)}
              </select>
            </label>
          )}
        </header>

        {paso === 'tel' && (
          <form className="d-card cl-form" onSubmit={pedirCodigo}>
            <h2 style={{ margin: 0 }}>Entrá con tu WhatsApp</h2>
            <p className="sub" style={{ margin: 0 }}>Te mandamos un código de un solo uso. Nadie entra a tu historia sin ese código.</p>
            <label>WhatsApp<input className="c-inp" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="11 5555 1234" /></label>
            {error && <p role="alert" style={{ margin: 0, color: 'var(--sem-rojo)', fontWeight: 700 }}>{error}</p>}
            <button type="submit" className="d-btn prim">Enviarme el código</button>
            {ana && <button type="button" className="d-btn" onClick={() => setTel(ana.whatsapp)}>Para la demo: usar el WhatsApp de {ana.nombre}</button>}
          </form>
        )}

        {paso === 'codigo' && (
          <form className="d-card cl-form" onSubmit={entrar}>
            <h2 style={{ margin: 0 }}>Escribí el código</h2>
            <p className="sub" style={{ margin: 0 }}>Te lo mandamos por WhatsApp. En la demo, abrí el simulador de abajo a la derecha.</p>
            <label>Código de 4 números<input className="c-inp" inputMode="numeric" autoComplete="one-time-code" value={codigo} onChange={(e) => setCodigo(e.target.value)} /></label>
            {error && <p role="alert" style={{ margin: 0, color: 'var(--sem-rojo)', fontWeight: 700 }}>{error}</p>}
            <button type="submit" className="d-btn prim">Entrar</button>
            <button type="button" className="d-btn" onClick={() => { setPaso('tel'); setCodigo(''); }}>Cambiar el número</button>
          </form>
        )}

        {paso === 'dentro' && pac && (
          <>
            {sec === 'inicio' && <InicioPaciente slug={slug} agenda={agenda} clinico={clinico} pac={pac} irA={setSec} abrirPres={(id) => { setPresAbierto(id); setSec('presupuestos'); }} />}
            {sec === 'documentos' && (
              <section className="d-card" aria-labelledby="t-docs">
                <h2 id="t-docs">Recetas, certificados e indicaciones</h2>
                <p className="sub">Mostrá el QR en la farmacia o donde te lo pidan: así validan que el documento es real.</p>
                <ListaDocumentos slug={slug} docs={clinico.documentos.filter((d) => d.pacienteId === pac.id).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 12)} agenda={agenda} negocio={config.negocio} />
              </section>
            )}
            {sec === 'resultados' && <ResultadosPaciente clinico={clinico} pac={pac} agenda={agenda} />}
            {sec === 'presupuestos' && <PresupuestosPaciente agenda={agenda} clinico={clinico} actualizarClinico={actualizarClinico} pac={pac} negocio={config.negocio} moneda={config.moneda} abierto={presAbierto} setAbierto={setPresAbierto} />}
            {sec === 'mas' && <MasPaciente slug={slug} agenda={agenda} clinico={clinico} actualizarClinico={actualizarClinico} pac={pac} titular={tit!} negocio={config.negocio} setPerfil={setPerfil} familia={familia} />}
          </>
        )}
      </div>

      {paso === 'dentro' && (
        <nav className="cl-nav" aria-label="Secciones del portal">
          {([['inicio', 'Inicio', 'casa'], ['documentos', 'Recetas', 'qr'], ['resultados', 'Resultados', 'grafico'], ['presupuestos', 'Propuestas', 'planilla'], ['mas', 'Más', 'lista']] as const).map(([id, n, ic]) => (
            <button key={id} type="button" aria-current={sec === id ? 'page' : undefined} onClick={() => setSec(id)}><Icono nombre={ic} size={22} />{n}</button>
          ))}
        </nav>
      )}
      {titular && <Simulador slug={slug} agenda={agenda} clinico={clinico} actualizarClinico={actualizarClinico} negocio={config.negocio} pacienteId={titular} abierto={paso === 'codigo'} />}
    </div>
  );
}

function InicioPaciente({ slug, agenda, clinico, pac, irA, abrirPres }: { slug: string; agenda: NonNullable<ReturnType<typeof useClinico>['estado']>; clinico: EstadoClinico; pac: Cliente; irA: (s: Seccion) => void; abrirPres: (id: string) => void }) {
  const ahora = useAhora();
  const prox = agenda.turnos.filter((t) => t.clienteId === pac.id && +new Date(t.inicio) > ahora && (t.estado === 'reservado' || t.estado === 'confirmado')).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const prof = prox && agenda.profesionales.find((p) => p.id === prox.profId);
  const docs = clinico.documentos.filter((d) => d.pacienteId === pac.id && +new Date(d.fecha) > ahora - 14 * DIA_MS);
  const revisados = clinico.resultados.filter((r) => r.pacienteId === pac.id && r.estado === 'revisado' && r.comentario).slice(-1);
  const abiertos = clinico.presupuestos.filter((p) => p.pacienteId === pac.id && ['enviado', 'visto', 'consulta'].includes(estadoActual(p, ahora)));
  const ficha = clinico.fichas.find((f) => f.pacienteId === pac.id);
  const indicaciones = clinico.documentos.filter((d) => d.pacienteId === pac.id && d.tipo === 'indicacion').slice(-2);
  return (
    <>
      <section className="cl-hero" aria-label="Próximo turno">
        {prox ? (
          <>
            <span>Tu próximo turno</span>
            <strong>{mayuscula(nombreDia(prox.inicio, new Date(ahora)))}, {hora(prox.inicio)} h</strong>
            <span>{nombreProf(prof)}</span>
            <Link className="d-btn" href={`/d/${slug}/turno/${prox.token}`}>Ver, confirmar o cambiar</Link>
          </>
        ) : (
          <>
            <span>No tenés turnos próximos</span>
            <strong>Reservá cuando quieras</strong>
            <Link className="d-btn" href={`/d/${slug}`}>Pedir turno</Link>
          </>
        )}
      </section>
      <section className="d-card" aria-labelledby="t-nov">
        <h2 id="t-nov">Novedades</h2>
        <ul className="cl-lista">
          {docs.slice(-3).reverse().map((d) => <li key={d.id}><button type="button" className="cl-fila" style={{ width: '100%', textAlign: 'left' }} onClick={() => irA('documentos')}><div><strong>{NOMBRE_DOC[d.tipo]} nueva</strong><small>{fechaCorta(new Date(d.fecha))} · con QR para validar</small></div></button></li>)}
          {revisados.map((r) => <li key={r.id}><button type="button" className="cl-fila" style={{ width: '100%', textAlign: 'left' }} onClick={() => irA('resultados')}><div><strong>Tu {r.estudio.toLowerCase()} fue revisado</strong><small>{r.comentario}</small></div></button></li>)}
          {abiertos.map((p) => <li key={p.id}><button type="button" className="cl-fila" style={{ width: '100%', textAlign: 'left' }} onClick={() => abrirPres(p.id)}><div><strong>Tenés una propuesta para revisar</strong><small>{p.procedimiento} · vale hasta el {fechaCorta(new Date(p.validoHasta))}</small></div></button></li>)}
          {ficha?.proximoControl && <li className="cl-fila"><div><strong>Control indicado</strong><small>Para el {fechaCorta(new Date(ficha.proximoControl + 'T12:00'))}{prox ? '' : '. Todavía no tenés turno.'}</small></div>{!prox && <Link className="d-btn prim" href={`/d/${slug}`}>Reservar</Link>}</li>}
          {!docs.length && !revisados.length && !abiertos.length && !ficha?.proximoControl && <li className="cl-vacio">No hay novedades.</li>}
        </ul>
      </section>
      {indicaciones.length > 0 && (
        <section className="d-card" aria-labelledby="t-ind">
          <h2 id="t-ind">Tus indicaciones</h2>
          <ul className="cl-lista">{indicaciones.map((d) => <li key={d.id} className="cl-fila"><div><strong>{d.texto}</strong><small>{fechaCorta(new Date(d.fecha))} · {nombreProf(agenda.profesionales.find((p) => p.id === d.profId))}</small></div></li>)}</ul>
        </section>
      )}
    </>
  );
}

function ResultadosPaciente({ clinico, pac, agenda }: { clinico: EstadoClinico; pac: Cliente; agenda: NonNullable<ReturnType<typeof useClinico>['estado']> }) {
  const rs = clinico.resultados.filter((r) => r.pacienteId === pac.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const nombres = [...new Set(rs.flatMap((r) => r.valores.map((v) => v.nombre)))];
  return (
    <section className="d-card" aria-labelledby="t-rp">
      <h2 id="t-rp">Tus resultados</h2>
      <p className="sub">Cuando tu profesional los revisa, te deja un comentario.</p>
      <ul className="cl-lista" style={{ marginBottom: 14 }}>
        {rs.map((r) => (
          <li key={r.id} className="cl-fila">
            <div><strong>{r.estudio}</strong><small>{fechaCorta(new Date(r.fecha))} · {nombreProf(agenda.profesionales.find((p) => p.id === r.profId))}</small>{r.comentario && <span style={{ fontSize: 15 }}>“{r.comentario}”</span>}</div>
            <span className={`cl-chip ${r.estado === 'revisado' ? 'ok' : 'av'}`}>{r.estado === 'revisado' ? 'Revisado' : 'Esperando revisión'}</span>
          </li>
        ))}
        {!rs.length && <li className="cl-vacio">Todavía no tenés resultados cargados.</li>}
      </ul>
      <div style={{ display: 'grid', gap: 12 }}>
        {nombres.map((n) => {
          const s = serie(clinico, pac.id, n);
          return s.length > 1 ? <GraficoLinea key={n} titulo={n} detalle={`${s[0].unidad} · la línea punteada es el máximo que indicó tu profesional`} puntos={s.map((p) => ({ etiqueta: fechaCorta(new Date(p.fecha)), valor: p.valor }))} formato={(v) => String(Math.round(v))} rango={s[0].rango} /> : null;
        })}
      </div>
    </section>
  );
}

function PresupuestosPaciente({ agenda, clinico, actualizarClinico, pac, negocio, moneda, abierto, setAbierto }: { agenda: NonNullable<ReturnType<typeof useClinico>['estado']>; clinico: EstadoClinico; actualizarClinico: ReturnType<typeof useClinico>['actualizarClinico']; pac: Cliente; negocio: string; moneda: string; abierto: string | null; setAbierto: (id: string | null) => void }) {
  const ahora = useAhora();
  const mios = clinico.presupuestos.filter((p) => p.pacienteId === pac.id && p.estado !== 'borrador' && !p.realizado).sort((a, b) => b.creado.localeCompare(a.creado));
  const p = abierto ? mios.find((x) => x.id === abierto) : null;
  // El consultorio ve que el paciente abrió el presupuesto (estado "visto").
  useEffect(() => {
    if (p && p.estado === 'enviado') actualizarClinico((c) => actualizarPresupuesto(c, p.id, { estado: 'visto', visto: new Date().toISOString() }));
  }, [p, actualizarClinico]);

  if (p) return <PresupuestoPaciente p={p} agenda={agenda} actualizarClinico={actualizarClinico} pac={pac} negocio={negocio} moneda={moneda} onVolver={() => setAbierto(null)} />;
  return (
    <section className="d-card" aria-labelledby="t-pp">
      <h2 id="t-pp">Tus propuestas</h2>
      <ul className="cl-lista">
        {mios.map((x) => {
          const e = estadoActual(x, ahora);
          return (
            <li key={x.id}>
              <button type="button" className="cl-fila" style={{ width: '100%', textAlign: 'left' }} onClick={() => setAbierto(x.id)}>
                <div><strong>{x.procedimiento}</strong><small>{formatoPrecio(totalDe(x), moneda)} · {e === 'aceptado' ? 'Aceptada' : e === 'vencido' ? 'Vencida' : e === 'rechazado' ? 'Rechazada' : `Vale hasta el ${fechaCorta(new Date(x.validoHasta))}`}</small></div>
                <span className={`cl-chip ${e === 'aceptado' ? 'ok' : e === 'vencido' || e === 'rechazado' ? '' : 'av'}`}>{e === 'aceptado' ? (x.sena === 'pagada' ? 'Confirmada' : 'Falta el pago') : e === 'vencido' ? 'Vencida' : e === 'rechazado' ? 'Rechazada' : 'Para revisar'}</span>
              </button>
            </li>
          );
        })}
        {!mios.length && <li className="cl-vacio">No tenés propuestas.</li>}
      </ul>
    </section>
  );
}

function PresupuestoPaciente({ p, agenda, actualizarClinico, pac, negocio, moneda, onVolver }: { p: Presupuesto; agenda: NonNullable<ReturnType<typeof useClinico>['estado']>; actualizarClinico: ReturnType<typeof useClinico>['actualizarClinico']; pac: Cliente; negocio: string; moneda: string; onVolver: () => void }) {
  const ahora = useAhora();
  const e = estadoActual(p, ahora);
  const [plan, setPlan] = useState<PlanPago>(p.plan ?? 'sena');
  const [paso, setPaso] = useState<'ver' | 'firmar' | 'pagar' | 'listo'>(e === 'aceptado' ? (p.sena === 'pagada' ? 'listo' : 'pagar') : 'ver');
  const [nombre, setNombre] = useState(pac.nombre);
  const [acepto, setAcepto] = useState(false);
  const [preg, setPreg] = useState('');
  const [msg, setMsg] = useState('');
  const dias = Math.max(0, Math.ceil((+new Date(p.validoHasta) - ahora) / DIA_MS));
  const prof = agenda.profesionales.find((x) => x.id === p.profId);
  const m = montosPlan(p, p.plan ?? plan);
  const fmt = (n: number) => formatoPrecio(n, moneda);
  const DETALLE: Record<PlanPago, string> = { contado: 'Pagás todo antes del turno', sena: `${PORC_SENA} % ahora y el resto el día del turno`, cuotas: `${CUOTAS} pagos mensuales con tarjeta (recargo a confirmar)` };

  return (
    <section className="d-card" aria-labelledby="t-ppd" style={{ display: 'grid', gap: 14 }}>
      <button type="button" className="d-btn" style={{ justifySelf: 'start' }} onClick={onVolver}><Icono nombre="atras" size={16} /> Tus propuestas</button>
      <div>
        <small className="cl-gris">{negocio} · {nombreProf(prof)}</small>
        <h2 id="t-ppd" style={{ margin: '2px 0 6px' }}>{p.procedimiento}</h2>
        {e === 'vencido' ? <span className="cl-chip">Vencida. Pedí una nueva.</span> : e !== 'aceptado' && <span className="cl-chip av">Vale {dias} días más, hasta el {fechaCorta(new Date(p.validoHasta))}</span>}
      </div>
      <ul className="cl-items">
        {p.items.map((it, i) => <li key={i}><span style={{ flex: 1 }}>{it.concepto}</span><span>{it.monto ? fmt(it.monto) : 'Incluido'}</span></li>)}
        <li><strong style={{ flex: 1 }}>Total</strong><strong>{fmt(totalDe(p))}</strong></li>
      </ul>
      <details className="cl-tarea"><summary style={{ fontWeight: 700, cursor: 'pointer' }}>Qué incluye y qué no</summary><p>Incluye: {p.incluye}</p><p>No incluye: {p.noIncluye}</p><p className="cl-gris">La seña se devuelve si cancelás con 7 días de anticipación.</p></details>

      {paso === 'ver' && (e === 'enviado' || e === 'visto' || e === 'consulta') && (
        <>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 10 }} role="radiogroup" aria-label="¿Cómo querés pagar?">
            <legend style={{ fontWeight: 800, fontSize: 17, marginBottom: 10 }}>¿Cómo querés pagar?</legend>
            {(['contado', 'sena', 'cuotas'] as PlanPago[]).map((x) => {
              const mm = montosPlan(p, x);
              return (
                <button key={x} type="button" role="radio" aria-checked={plan === x} className="cl-plan" onClick={() => setPlan(x)}>
                  <span className="dot" aria-hidden="true" />
                  <span><strong>{NOMBRE_PLAN[x]}</strong><small className="cl-gris">{DETALLE[x]}</small></span>
                  <strong>{x === 'contado' ? fmt(mm.total) : x === 'sena' ? `${fmt(mm.ahora)} hoy` : `${fmt(mm.ahora)} por mes`}</strong>
                </button>
              );
            })}
          </fieldset>
          <button type="button" className="d-btn prim" style={{ minHeight: 52, fontSize: 16 }} onClick={() => setPaso('firmar')}>Aceptar y firmar</button>
          <form style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} onSubmit={(ev) => { ev.preventDefault(); if (!preg.trim()) return; actualizarClinico((c) => registrar(actualizarPresupuesto(c, p.id, { estado: 'consulta', consulta: preg.trim() }), 'Paciente (portal)', 'Hizo una consulta sobre un presupuesto')); setPreg(''); setMsg('Le mandamos tu consulta al consultorio.'); }}>
            <input className="c-inp" style={{ flex: 1, minWidth: 200 }} aria-label="Tu consulta sobre la propuesta" placeholder="¿Tenés una duda? Escribila acá" value={preg} onChange={(ev) => setPreg(ev.target.value)} />
            <button type="submit" className="d-btn">Enviar consulta</button>
          </form>
        </>
      )}

      {paso === 'firmar' && (
        <form className="cl-form" onSubmit={(ev) => { ev.preventDefault(); if (nombre.trim().length < 3 || !acepto) return setMsg('Escribí tu nombre y marcá que aceptás.'); actualizarClinico((c) => aceptarPresupuesto(c, p.id, plan, nombre)); setMsg(''); setPaso('pagar'); }}>
          <h3 style={{ margin: 0 }}>Firmá la aceptación</h3>
          <p className="cl-gris" style={{ margin: 0 }}>Forma de pago: {NOMBRE_PLAN[plan]}. Queda registrada la fecha, la hora y el código con el que entraste.</p>
          <label>Nombre y apellido<input className="c-inp" value={nombre} onChange={(ev) => setNombre(ev.target.value)} /></label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600 }}><input type="checkbox" checked={acepto} onChange={(ev) => setAcepto(ev.target.checked)} style={{ width: 22, height: 22 }} /> Leí y acepto la propuesta y sus condiciones.</label>
          {msg && <p role="alert" style={{ margin: 0, color: 'var(--sem-rojo)', fontWeight: 700 }}>{msg}</p>}
          <button type="submit" className="d-btn prim">Firmar</button>
          <button type="button" className="d-btn" onClick={() => setPaso('ver')}>Volver</button>
        </form>
      )}

      {paso === 'pagar' && (
        <div className="cl-tarea" style={{ gap: 12 }}>
          <span className="cl-chip av" style={{ justifySelf: 'start' }}>Pago simulado · no se cobra nada</span>
          <strong style={{ fontSize: 22 }}>{fmt(m.ahora)}</strong>
          <span className="cl-gris">{p.plan ? NOMBRE_PLAN[p.plan] : ''}{m.resto ? ` · después ${fmt(m.resto)}` : ''}</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="d-btn prim" onClick={() => { actualizarClinico((c) => pagarSena(c, p.id, negocio)); setPaso('listo'); }}>Aprobar pago</button>
            <button type="button" className="d-btn" onClick={() => setMsg('El pago no se aprobó. Probá con otro medio o más tarde.')}>Rechazar pago</button>
          </div>
          {msg && <p role="alert" style={{ margin: 0, color: 'var(--sem-rojo)', fontWeight: 700 }}>{msg}</p>}
        </div>
      )}

      {paso === 'listo' && (
        <div className="cl-tarea">
          <strong style={{ fontSize: 20 }}><Icono nombre="check" size={20} /> ¡Listo! Tu propuesta quedó confirmada</strong>
          <p>El consultorio te va a escribir para coordinar el día. Antes del turno te avisamos qué tenés que traer.</p>
        </div>
      )}
    </section>
  );
}

function MasPaciente({ slug, agenda, clinico, actualizarClinico, pac, titular, negocio, setPerfil, familia }: { slug: string; agenda: NonNullable<ReturnType<typeof useClinico>['estado']>; clinico: EstadoClinico; actualizarClinico: ReturnType<typeof useClinico>['actualizarClinico']; pac: Cliente; titular: Cliente; negocio: string; setPerfil: (id: string) => void; familia: string[] }) {
  const ahora = useAhora();
  const [fotos, setFotos] = useState(false);
  const [alcance, setAlcance] = useState<'todo' | 'anio' | 'resultados'>('todo');
  const [horas, setHoras] = useState(24);
  const propias = clinico.fotos.filter((f) => f.pacienteId === pac.id).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const antes = propias.find((f) => f.momento === 'antes');
  const despues = [...propias].reverse().find((f) => f.momento !== 'antes');
  const permisos = clinico.permisos[pac.id];
  const activos = clinico.compartidos.filter((c) => c.pacienteId === pac.id && !c.revocado && +new Date(c.vence) > ahora);

  function descargar() {
    const datos = {
      paciente: { nombre: pac.nombre, cobertura: pac.cobertura, afiliado: pac.afiliado },
      ficha: clinico.fichas.find((f) => f.pacienteId === pac.id),
      evoluciones: clinico.evoluciones.filter((e) => e.pacienteId === pac.id),
      documentos: clinico.documentos.filter((d) => d.pacienteId === pac.id),
      resultados: clinico.resultados.filter((r) => r.pacienteId === pac.id),
      aviso: 'Datos ficticios de demostración.',
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
    a.download = 'mi-informacion-demo.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <section className="d-card" aria-labelledby="t-fotos">
        <h2 id="t-fotos">Mis fotos</h2>
        {!propias.length ? <p className="cl-vacio">No tenés fotos guardadas.</p> : !fotos ? <PedirPin pin={clinico.pin} onOk={() => { setFotos(true); actualizarClinico((c) => registrar(c, 'Paciente (portal)', `Abrió la galería de ${pac.nombre}`)); }} titulo="Tus fotos están protegidas" detalle="Usá tu PIN." /> : (
          <div style={{ display: 'grid', gap: 12 }}>
            {antes && despues && <Comparador antes={antes.dibujo} despues={despues.dibujo} marca={`${negocio} · ${pac.nombre}`} />}
            <h3 style={{ margin: 0, fontSize: 16 }}>Para qué se pueden usar tus fotos</h3>
            {NOMBRE_PERMISO.map(([k, t]) => (
              <label key={k} style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{t}</span>
                <input type="checkbox" role="switch" checked={!!permisos?.[k]} disabled={k === 'historia'} style={{ width: 24, height: 24 }} onChange={() => actualizarClinico((c) => registrar({ ...c, permisos: { ...c.permisos, [pac.id]: { ...(c.permisos[pac.id] ?? { historia: true, academico: false, publicidadSinRostro: false, publicidadConRostro: false, firmado: new Date().toISOString() }), [k]: !c.permisos[pac.id]?.[k] } } }, 'Paciente (portal)', `Cambió el permiso "${t}" de sus fotos`))} />
              </label>
            ))}
            <small className="cl-gris">Guardar en la historia clínica es obligatorio. Lo demás lo podés revocar cuando quieras.</small>
          </div>
        )}
      </section>

      <section className="d-card" aria-labelledby="t-comp">
        <h2 id="t-comp">Compartir con otro médico</h2>
        <p className="sub">Le das acceso de solo lectura por un tiempo. Después vence solo, o lo revocás antes.</p>
        <div className="cl-form">
          <label>Qué compartir<select className="c-inp" value={alcance} onChange={(e) => setAlcance(e.target.value as typeof alcance)}><option value="todo">Toda mi historia</option><option value="anio">Solo el último año</option><option value="resultados">Solo resultados</option></select></label>
          <label>Por cuánto tiempo<select className="c-inp" value={horas} onChange={(e) => setHoras(Number(e.target.value))}><option value={24}>24 horas</option><option value={168}>7 días</option></select></label>
          <button type="button" className="d-btn prim" onClick={() => actualizarClinico((c) => compartir(c, pac.id, alcance, horas, negocio))}>Generar acceso</button>
        </div>
        {activos.length > 0 && (
          <ul className="cl-lista" style={{ marginTop: 12 }}>
            {activos.map((x) => (
              <li key={x.id} className="cl-fila">
                <div><strong>Código {x.codigo}</strong><small>{x.alcance === 'todo' ? 'Toda la historia' : x.alcance === 'anio' ? 'Último año' : 'Solo resultados'} · vence {fechaCorta(new Date(x.vence))} {hora(x.vence)} h</small></div>
                <button type="button" className="d-btn" onClick={() => actualizarClinico((c) => registrar({ ...c, compartidos: c.compartidos.map((y) => (y.id === x.id ? { ...y, revocado: true } : y)) }, 'Paciente (portal)', 'Revocó un acceso compartido'))}>Revocar</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="d-card" aria-labelledby="t-fam">
        <h2 id="t-fam">Mi familia</h2>
        <p className="sub">Manejá los turnos y documentos de tus hijos o de un adulto a cargo con un solo acceso.</p>
        <ul className="cl-lista">
          {familia.map((id) => { const x = agenda.clientes.find((c) => c.id === id); return x ? <li key={id} className="cl-fila"><span className="bar-avatar" aria-hidden="true">{iniciales(x.nombre)}</span><div><strong>{x.nombre}</strong><small>{id === titular.id ? 'Titular' : 'A cargo'}</small></div>{pac.id !== id && <button type="button" className="d-btn" onClick={() => setPerfil(id)}>Ver su perfil</button>}</li> : null; })}
        </ul>
      </section>

      <section className="d-card" aria-labelledby="t-datos">
        <h2 id="t-datos">Mis datos</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="d-btn" onClick={descargar}><Icono nombre="subir" size={18} /> Descargar mi información</button>
          <Link className="d-btn" href={`/d/${slug}`}>Pedir otro turno</Link>
        </div>
      </section>
    </>
  );
}
