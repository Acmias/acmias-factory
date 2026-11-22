'use client';

import { useState } from 'react';
import { Icono } from '@/components/Icono';
import { useAhora } from '@/components/barberia/useBarberia';
import { formatoPrecio } from '@/lib/utiles';
import { DIA_MS, claveDia, fechaCorta, hora, lunesDe, nombreDia } from '@/lib/rubros/barberia/agenda';
import { luz } from '@/lib/semaforo';
import {
  NOMBRE_MEDIO, agregarAlquiler, cerrarCaja, cobrarAlquiler, cobrarTurno, cobroManual, cobrosDelDia, consultasDelDia, honorarios, nombreProf, porMedio, registrar, registrarEntrada,
} from '@/lib/rubros/consultorio/clinico/logica';
import type { MedioPago } from '@/lib/rubros/consultorio/clinico/tipos';
import type { PropsClinico } from './comun';

type Seccion = 'caja' | 'honorarios' | 'consultorios' | 'insumos';
const MEDIOS: MedioPago[] = ['efectivo', 'transferencia', 'tarjeta', 'link'];

/** Administración del consultorio (F11): caja del día, honorarios, alquiler de consultorios e insumos. */
export function Administracion(props: PropsClinico) {
  const secretaria = props.clinico.rol === 'secretaria';
  const [sec, setSec] = useState<Seccion>('caja');
  const SECC: [Seccion, string][] = [['caja', 'Caja del día'], ...(secretaria ? [] : [['honorarios', 'Honorarios'] as [Seccion, string]]), ['consultorios', 'Alquiler de consultorios'], ['insumos', 'Insumos']];
  return (
    <section className="d-card" aria-labelledby="t-adm">
      <h2 id="t-adm">Administración</h2>
      <p className="sub">Cobros, cierre de caja, honorarios, consultorios compartidos e insumos. Montos de demostración.</p>
      <div className="seg" role="group" aria-label="Secciones de administración" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        {SECC.map(([id, n]) => <button key={id} type="button" aria-pressed={sec === id} onClick={() => setSec(id)}>{n}</button>)}
      </div>
      {sec === 'caja' && <Caja {...props} />}
      {sec === 'honorarios' && <Honorarios {...props} />}
      {sec === 'consultorios' && <Consultorios {...props} />}
      {sec === 'insumos' && <Insumos {...props} />}
    </section>
  );
}

function Caja({ agenda, clinico, actualizarClinico, config, quien }: PropsClinico) {
  const ahora = useAhora();
  const dia = claveDia(ahora);
  const [medio, setMedio] = useState<MedioPago>('efectivo');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [error, setError] = useState('');
  const cobros = cobrosDelDia(clinico, dia);
  const tot = porMedio(cobros);
  const total = cobros.reduce((a, x) => a + x.monto, 0);
  const { sinCobrar, coberturas } = consultasDelDia(agenda, clinico, dia);
  const cierre = clinico.cierres.find((x) => x.dia === dia);
  const fmt = (n: number) => formatoPrecio(n, config.moneda);
  const pac = (id?: string) => agenda.clientes.find((c) => c.id === id)?.nombre ?? '';
  const aLiquidar = new Map<string, number>();
  for (const x of coberturas) aLiquidar.set(x.turno.cobertura ?? '', (aLiquidar.get(x.turno.cobertura ?? '') ?? 0) + x.monto);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="cl-grid">
        <div className="cl-kpi"><strong>{fmt(total)}</strong><span>cobrado hoy</span></div>
        {MEDIOS.map((m) => <div key={m} className="cl-kpi"><strong>{fmt(tot[m])}</strong><span>{NOMBRE_MEDIO[m]}</span></div>)}
      </div>
      {cierre ? (
        <div className="cl-aviso" role="status"><Icono nombre="candado" size={18} /> <span>Caja cerrada a las {hora(cierre.fecha)} h por {cierre.quien} con {fmt(cierre.total)}. Lo que se cobre después queda para revisar.</span></div>
      ) : null}

      <div className="cl-tarea">
        <strong style={{ fontSize: 17 }}>Consultas atendidas que faltan cobrar</strong>
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 14 }}>Medio de pago
          <select className="c-inp" style={{ width: 'auto', minHeight: 40 }} value={medio} onChange={(e) => setMedio(e.target.value as MedioPago)}>
            {MEDIOS.map((m) => <option key={m} value={m}>{NOMBRE_MEDIO[m]}</option>)}
          </select>
        </label>
        <ul className="cl-lista">
          {sinCobrar.map(({ turno, monto: m }) => (
            <li key={turno.id} className="cl-fila">
              <strong style={{ width: 52 }}>{hora(turno.inicio)}</strong>
              <div><strong>{pac(turno.clienteId)}</strong><small>{nombreProf(agenda.profesionales.find((p) => p.id === turno.profId))} · Particular</small></div>
              <strong>{fmt(m)}</strong>
              <button type="button" className="d-btn prim" onClick={() => actualizarClinico((c) => cobrarTurno(c, agenda, turno.id, medio, quien))}>Cobrar</button>
            </li>
          ))}
          {!sinCobrar.length && <li className="cl-vacio">No hay consultas particulares pendientes de cobro.</li>}
        </ul>
      </div>

      {aLiquidar.size > 0 && (
        <div className="cl-tarea">
          <strong style={{ fontSize: 17 }}>Para liquidar con las coberturas</strong>
          <span className="cl-gris">Consultas de hoy con obra social o prepaga. La liquidación ante cada cobertura es un módulo próximamente.</span>
          {[...aLiquidar.entries()].map(([n, m]) => <span key={n} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{n}</span><strong>{fmt(m)}</strong></span>)}
        </div>
      )}

      <form className="cl-tarea" onSubmit={(e) => {
        e.preventDefault();
        const n = Number(monto.replace(/\D/g, ''));
        if (concepto.trim().length < 3 || !n) return setError('Escribí el concepto y el monto.');
        actualizarClinico((c) => cobroManual(c, concepto, n, medio, quien));
        setConcepto(''); setMonto(''); setError('');
      }}>
        <strong style={{ fontSize: 17 }}>Otro cobro</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 8 }}>
          <input className="c-inp" aria-label="Concepto del cobro" placeholder="Ej.: certificado sin turno" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
          <input className="c-inp" aria-label="Monto del cobro" inputMode="numeric" placeholder="Monto" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </div>
        {error && <p role="alert" style={{ margin: 0, color: 'var(--sem-rojo)', fontWeight: 700 }}>{error}</p>}
        <button type="submit" className="d-btn">Registrar cobro ({NOMBRE_MEDIO[medio].toLowerCase()})</button>
      </form>

      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>Movimientos de hoy</h3>
        <ul className="cl-lista">
          {cobros.map((x) => (
            <li key={x.id} className="cl-fila">
              <strong style={{ width: 52 }}>{hora(x.fecha)}</strong>
              <div><strong>{x.concepto}</strong><small>{pac(x.pacienteId) || 'Sin paciente'} · {NOMBRE_MEDIO[x.medio]}</small></div>
              <strong>{fmt(x.monto)}</strong>
            </li>
          ))}
          {!cobros.length && <li className="cl-vacio">Todavía no hay cobros hoy.</li>}
        </ul>
      </div>
      {!cierre && <button type="button" className="d-btn prim" style={{ justifySelf: 'start' }} onClick={() => actualizarClinico((c) => cerrarCaja(c, dia, quien))}>Cerrar la caja de hoy</button>}
    </div>
  );
}

function Honorarios({ agenda, clinico, actualizarClinico, config, quien }: PropsClinico) {
  const ahora = useAhora();
  const [periodo, setPeriodo] = useState<'semana' | 'mes'>('mes');
  const desde = periodo === 'semana' ? +lunesDe(ahora) : ahora - 30 * DIA_MS;
  const filas = honorarios(agenda, clinico, desde).filter((x) => x.cobrado > 0);
  const fmt = (n: number) => formatoPrecio(n, config.moneda);
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <div className="seg" role="group" aria-label="Período">
          <button type="button" aria-pressed={periodo === 'semana'} onClick={() => setPeriodo('semana')}>Esta semana</button>
          <button type="button" aria-pressed={periodo === 'mes'} onClick={() => setPeriodo('mes')}>Últimos 30 días</button>
        </div>
        <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: 14 }}>Se queda el consultorio (%)
          <input className="c-inp" type="number" min={0} max={80} style={{ width: 120 }} value={clinico.porcConsultorio} onChange={(e) => actualizarClinico((c) => registrar({ ...c, porcConsultorio: Math.min(80, Math.max(0, Number(e.target.value) || 0)) }, quien, 'Cambió el porcentaje del consultorio'))} />
        </label>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth: 520 }}>
          <thead><tr><th style={{ textAlign: 'left', padding: 8 }}>Profesional</th><th style={{ textAlign: 'right', padding: 8 }}>Cobrado</th><th style={{ textAlign: 'right', padding: 8 }}>Consultorio</th><th style={{ textAlign: 'right', padding: 8 }}>A liquidar al profesional</th></tr></thead>
          <tbody>
            {filas.map((x) => <tr key={x.prof.id}><td style={{ padding: 8, borderTop: '1px solid #eee' }}>{nombreProf(x.prof)}</td><td style={{ padding: 8, borderTop: '1px solid #eee', textAlign: 'right' }}>{fmt(x.cobrado)}</td><td style={{ padding: 8, borderTop: '1px solid #eee', textAlign: 'right' }}>{fmt(x.consultorio)}</td><td style={{ padding: 8, borderTop: '1px solid #eee', textAlign: 'right', fontWeight: 800 }}>{fmt(x.profesional)}</td></tr>)}
            {!filas.length && <tr><td colSpan={4} className="cl-vacio">No hay cobros en el período.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="cl-gris" style={{ margin: 0 }}>Se calcula con los cobros registrados en la caja. Las coberturas se suman cuando se liquidan.</p>
    </div>
  );
}

const toLocal = (d: Date) => { const z = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };

function Consultorios({ clinico, actualizarClinico, config, quien }: PropsClinico) {
  const ahora = useAhora();
  const [espacio, setEspacio] = useState(clinico.espacios[1]?.id ?? clinico.espacios[0]?.id);
  const [colega, setColega] = useState('');
  const [esp, setEsp] = useState('');
  const [fecha, setFecha] = useState(() => toLocal(new Date(ahora + DIA_MS)));
  const [desde, setDesde] = useState('09:00');
  const [hasta, setHasta] = useState('13:00');
  const [msg, setMsg] = useState('');
  const e = clinico.espacios.find((x) => x.id === espacio);
  const lista = clinico.alquileres.filter((a) => a.espacioId === espacio && +new Date(a.fin) > ahora - 7 * DIA_MS).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const fmt = (n: number) => formatoPrecio(n, config.moneda);
  const horas = Math.max(0, (Number(hasta.slice(0, 2)) * 60 + Number(hasta.slice(3)) - Number(desde.slice(0, 2)) * 60 - Number(desde.slice(3))) / 60);
  const mes = clinico.alquileres.filter((a) => +new Date(a.inicio) > ahora - 30 * DIA_MS);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="cl-grid">
        <div className="cl-kpi"><strong>{mes.length}</strong><span>alquileres en 30 días</span></div>
        <div className="cl-kpi"><strong>{fmt(mes.reduce((a, x) => a + x.monto, 0))}</strong><span>facturado por alquileres</span></div>
        <div className="cl-kpi"><strong>{fmt(mes.filter((x) => !x.cobrado).reduce((a, x) => a + x.monto, 0))}</strong><span>falta cobrar</span></div>
      </div>
      <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: 14, maxWidth: 320 }}>Consultorio
        <select className="c-inp" value={espacio} onChange={(x) => setEspacio(x.target.value)}>{clinico.espacios.map((x) => <option key={x.id} value={x.id}>{x.nombre} · {fmt(x.precioHora)} por hora</option>)}</select>
      </label>
      <ul className="cl-lista" aria-label={`Alquileres de ${e?.nombre}`}>
        {lista.map((a) => (
          <li key={a.id} className="cl-fila">
            <div><strong>{a.colega} · {a.especialidad}</strong><small>{nombreDia(a.inicio, new Date(ahora))} · {hora(a.inicio)} a {hora(a.fin)} h · {fmt(a.monto)}</small></div>
            {a.cobrado ? <span className="cl-chip ok">Cobrado</span> : <button type="button" className="d-btn" onClick={() => actualizarClinico((c) => cobrarAlquiler(c, a.id, 'transferencia', quien))}>Marcar cobrado</button>}
          </li>
        ))}
        {!lista.length && <li className="cl-vacio">Este consultorio no tiene alquileres. Cargá el primero abajo.</li>}
      </ul>
      <form className="cl-tarea" onSubmit={(x) => {
        x.preventDefault();
        if (colega.trim().length < 3) return setMsg('Escribí el nombre del colega.');
        const r = agregarAlquiler(clinico, { espacioId: espacio, colega: colega.trim(), especialidad: esp.trim() || 'Sin especialidad', inicio: new Date(`${fecha}T${desde}`).toISOString(), fin: new Date(`${fecha}T${hasta}`).toISOString(), monto: Math.round(horas * (e?.precioHora ?? 0)) }, quien);
        if ('error' in r) return setMsg(r.error);
        actualizarClinico(() => r.estado);
        setColega(''); setEsp(''); setMsg(`Listo: ${e?.nombre} reservado ${fechaCorta(new Date(`${fecha}T12:00`))} de ${desde} a ${hasta} h.`);
      }}>
        <strong style={{ fontSize: 17 }}>Alquilar a un colega</strong>
        <div className="fila-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: 14 }}>Colega<input className="c-inp" value={colega} onChange={(x) => setColega(x.target.value)} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: 14 }}>Especialidad<input className="c-inp" value={esp} onChange={(x) => setEsp(x.target.value)} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: 14 }}>Día<input className="c-inp" type="date" value={fecha} onChange={(x) => setFecha(x.target.value)} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: 14 }}>Desde<input className="c-inp" type="time" step={1800} value={desde} onChange={(x) => setDesde(x.target.value)} /></label>
          <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: 14 }}>Hasta<input className="c-inp" type="time" step={1800} value={hasta} onChange={(x) => setHasta(x.target.value)} /></label>
        </div>
        <span className="cl-gris">{horas} horas · {fmt(Math.round(horas * (e?.precioHora ?? 0)))}</span>
        <button type="submit" className="d-btn prim" style={{ justifySelf: 'start' }}>Reservar consultorio</button>
        {msg && <p role="status" style={{ margin: 0, fontWeight: 600 }}>{msg}</p>}
      </form>
    </div>
  );
}

function Insumos({ clinico, actualizarClinico, config, quien }: PropsClinico) {
  const [cant, setCant] = useState<Record<string, string>>({});
  const fmt = (n: number) => formatoPrecio(n, config.moneda);
  const NOMBRE = { rojo: 'Reponer ya', amarillo: 'Pedir pronto', verde: 'Bien' } as const;
  const CLASE = { rojo: 'mal', amarillo: 'av', verde: 'ok' } as const;
  const bajos = clinico.insumos.filter((i) => luz(i.stock, { rojo: i.minimo, amarillo: i.minimo * 2 }) !== 'verde').length;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <p className="cl-gris" style={{ margin: 0 }}>Cada procedimiento registrado como realizado descuenta sus insumos. {bajos ? `${bajos} insumos para reponer.` : 'Todo con stock.'}</p>
      <ul className="cl-lista">
        {clinico.insumos.map((i) => {
          const l = luz(i.stock, { rojo: i.minimo, amarillo: i.minimo * 2 });
          return (
            <li key={i.id} className="cl-fila" style={{ flexWrap: 'wrap' }}>
              <div style={{ minWidth: 180 }}><strong>{i.nombre}</strong><small>{i.stock} {i.unidad} · mínimo {i.minimo} · costo {fmt(i.costo)} c/u</small></div>
              <span className={`cl-chip ${CLASE[l]}`}>{NOMBRE[l]}</span>
              <form style={{ display: 'flex', gap: 6 }} onSubmit={(e) => { e.preventDefault(); const n = Number(cant[i.id]); if (n > 0) { actualizarClinico((c) => registrarEntrada(c, i.id, n, quien)); setCant((x) => ({ ...x, [i.id]: '' })); } }}>
                <input className="c-inp" style={{ width: 80, minHeight: 40 }} inputMode="numeric" aria-label={`Cantidad que entra de ${i.nombre}`} placeholder="Cant." value={cant[i.id] ?? ''} onChange={(e) => setCant((x) => ({ ...x, [i.id]: e.target.value.replace(/\D/g, '') }))} />
                <button type="submit" className="d-btn" style={{ minHeight: 40 }}>Entrada</button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
