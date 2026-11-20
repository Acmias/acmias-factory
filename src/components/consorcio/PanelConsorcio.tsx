'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp } from '@/lib/utiles';
import { mesCorto, sumarMeses } from '@/lib/rubros/contador/periodos';
import {
  NOMBRE_ESTADO, NOMBRE_ESTADO_OBRA, NOMBRE_ETAPA, NOMBRE_MEDIO, NOMBRE_RUBRO, RUBROS,
  agregarEvidencia, agregarGasto, agregarPersonal, agregarPresupuesto, asignarReclamo, cambiarEspacio, cancelarReserva, cargarSueldos, cerrarMes, cobradoPorMes, cobranzaDeHoy,
  confirmarPago, desvincularMp, dinero, diaYMes, edificio, enlaceExpensa, enviadosDe, faltantesPresupuesto, fechaCorta, guardarEdificio, mesLargo, morosos, nuevaObra, nuevoComunicado,
  periodoAbierto, proximosEnvios, quitarGasto, quitarPersonal, rechazarPago, registrarAvisos, registrarPago, resolverReclamo, resumenEdificio, resumenGastos, situacion, terminarObra,
  textoExpensa, textoRecordatorio, totalPresupuesto, totalRecibo, unidad, unidadesDe, vincularMp, elegirPresupuesto,
} from '@/lib/rubros/consorcio/logica';
import type { EstadoConsorcio, Evidencia, Obra, Rubro, TipoGasto } from '@/lib/rubros/consorcio/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { achicarImagen } from '@/components/unas/DisenoCita';
import { BotonImprimir, FotoEvidencia, LiquidacionDoc, ReciboDoc } from './Documentos';
import { intentar, useDemoConsorcio, type ActualizarConsorcio } from './useConsorcio';

type Pestana = 'tablero' | 'gastos' | 'obras' | 'personal' | 'expensas' | 'cobranza' | 'espacios' | 'vecinos' | 'edificios';
interface Props { slug: string; config: DemoConfig; estado: EstadoConsorcio; actualizar: ActualizarConsorcio; ahora: number; edId: string; setEdId: (id: string) => void; aviso: (t: string) => void; ir: (p: Pestana, ed?: string) => void }

const mayus = (s: string) => s[0].toUpperCase() + s.slice(1);
const LUZ = { 'al-dia': 'verde', 'por-vencer': 'amarillo', 'en-mora': 'rojo' } as const;
const origen = () => (typeof window === 'undefined' ? '' : window.location.origin);

export function PanelConsorcio({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo, ahora } = useDemoConsorcio(slug);
  const [pestana, setPestana] = useState<Pestana>('tablero');
  const [edId, setEdId] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const ed = edId || estado.edificios[0]?.id;
  const aviso = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 3200);
  };
  const ir = (p: Pestana, e?: string) => {
    if (e) setEdId(e);
    setPestana(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const mora = morosos(estado, ahora).length;
  const aConfirmar = estado.pagos.filter((p) => p.estado === 'a-confirmar').length;
  const reclamos = estado.reclamos.filter((r) => r.estado === 'nuevo').length;
  const PESTANAS: { id: Pestana; nombre: string }[] = [
    { id: 'tablero', nombre: 'Tablero' },
    { id: 'gastos', nombre: 'Gastos' },
    { id: 'obras', nombre: 'Obras' },
    { id: 'personal', nombre: 'Personal' },
    { id: 'expensas', nombre: 'Expensas' },
    { id: 'cobranza', nombre: `Cobranza${mora + aConfirmar ? ` (${mora + aConfirmar})` : ''}` },
    { id: 'espacios', nombre: 'Espacios comunes' },
    { id: 'vecinos', nombre: `Comunicados y reclamos${reclamos ? ` (${reclamos})` : ''}` },
    { id: 'edificios', nombre: 'Edificios' },
  ];
  const props: Props = { slug, config, estado, actualizar, ahora, edId: ed, setEdId, aviso, ir };
  const conSelector = pestana !== 'tablero' && pestana !== 'cobranza';
  return (
    <div className="duenio cs" style={estilo}>
      <AvisoDemo texto="Edificios, vecinos y montos ficticios · Mercado Pago y WhatsApp simulados" />
      <header className="duenio-top">
        <div className="duenio-top-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            {config.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logo} alt="" style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', objectFit: 'contain', padding: 4 }} />
            ) : (
              <span style={{ width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--c-acento)', color: 'var(--c-sobre-acento)', fontWeight: 800 }}>{config.negocio[0]?.toUpperCase()}</span>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{config.negocio}</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>{estado.edificios.length} edificios · {estado.unidades.length} unidades · Provincia de Buenos Aires</div>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-label="Accesos">
            <Link className="d-btn" href={`/d/${slug}`}><Icono nombre="usuario" size={18} /> Mi expensa (vecinos)</Link>
            <Link className="d-btn" href={`/d/${slug}/sitio`}><Icono nombre="tienda" size={18} /> Sitio</Link>
          </nav>
        </div>
      </header>
      <div className="d-tabs" role="tablist" aria-label="Secciones del panel">
        {PESTANAS.map((t) => <button key={t.id} role="tab" id={`tab-${t.id}`} aria-controls={`pan-${t.id}`} aria-selected={pestana === t.id} className="d-tab" onClick={() => setPestana(t.id)}>{t.nombre}</button>)}
      </div>
      <main className="d-main" role="tabpanel" id={`pan-${pestana}`} aria-labelledby={`tab-${pestana}`}>
        {conSelector && (
          <div className="cs-eds" role="group" aria-label="Edificio">
            {estado.edificios.map((x) => <button key={x.id} type="button" aria-pressed={x.id === ed} onClick={() => setEdId(x.id)}>{x.nombre}</button>)}
          </div>
        )}
        {pestana === 'tablero' && <Tablero {...props} />}
        {pestana === 'gastos' && <Gastos {...props} />}
        {pestana === 'obras' && <Obras {...props} />}
        {pestana === 'personal' && <PersonalTab {...props} />}
        {pestana === 'expensas' && <Expensas {...props} />}
        {pestana === 'cobranza' && <Cobranza {...props} />}
        {pestana === 'espacios' && <Espacios {...props} />}
        {pestana === 'vecinos' && <Vecinos {...props} />}
        {pestana === 'edificios' && <Edificios {...props} />}
      </main>
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check"><Icono nombre="check" size={16} /></span>
          {toast}
        </div>
      )}
    </div>
  );
}

function Hoja({ titulo, sub, onCerrar, children, ancha }: { titulo: string; sub?: string; onCerrar: () => void; children: React.ReactNode; ancha?: boolean }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className={`hoja cs-hoja${ancha ? ' ancha' : ''}`} role="dialog" aria-modal="true" aria-labelledby="cs-hoja-t" ref={ref}>
        <div className="hoja-cab">
          <div><h2 id="cs-hoja-t">{titulo}</h2>{sub && <p className="sub" style={{ margin: 0 }}>{sub}</p>}</div>
          <button type="button" className="x" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Luz({ estado }: { estado: keyof typeof LUZ }) {
  return <span className={`sem-luz ${LUZ[estado]}`}><span className="sem-punto" aria-hidden="true" />{NOMBRE_ESTADO[estado]}</span>;
}

// ---------------- Tablero

function Tablero({ config, estado, actualizar, ahora, aviso, ir }: Props) {
  const p = (v: number) => dinero(v, config.moneda);
  const rs = estado.edificios.map((ed) => ({ ed, r: resumenEdificio(estado, ed.id, ahora) }));
  const emitido = rs.reduce((s, x) => s + x.r.emitido, 0);
  const cobrado = rs.reduce((s, x) => s + x.r.cobrado, 0);
  const deudaTotal = rs.reduce((s, x) => s + x.r.deudaTotal, 0);
  const enMora = rs.reduce((s, x) => s + x.r.enMora, 0);
  const aConfirmar = estado.pagos.filter((x) => x.estado === 'a-confirmar');
  const hoy = cobranzaDeHoy(estado, ahora);
  const hoyMes = new Date(ahora).toISOString().slice(0, 7);
  const meses = Array.from({ length: 3 }, (_, i) => sumarMeses(hoyMes, i - 2));
  const serie = cobradoPorMes(estado, meses);
  const max = Math.max(1, ...serie.map((x) => x.mp + x.otros));
  const nuevos = estado.reclamos.filter((r) => r.estado === 'nuevo');
  const obrasPend = estado.obras.filter((o) => o.estado === 'presupuestos');
  const liqMes = rs[0]?.r.liquidacion?.periodo;
  return (
    <>
      <section className="d-card" aria-labelledby="t-res">
        <h2 id="t-res">Resumen{liqMes ? ` · expensas de ${mesLargo(liqMes)}` : ''}</h2>
        <div className="met-grid">
          <div className="met"><strong>{p(emitido)}</strong><span>Emitido</span></div>
          <div className="met"><strong>{p(cobrado)}</strong><span>Cobrado ({emitido ? Math.round((cobrado / emitido) * 100) : 0}%)</span></div>
          <div className="met"><strong>{enMora}</strong><span>Unidades en mora</span></div>
          <div className="met"><strong>{p(deudaTotal)}</strong><span>Deuda total</span></div>
        </div>
      </section>

      <div className="cs-grid-eds">
        {rs.map(({ ed, r }) => {
          const pct = r.emitido ? Math.min(100, Math.round((r.cobrado / r.emitido) * 100)) : 0;
          const ab = resumenGastos(estado, ed.id, r.abierto);
          return (
            <section key={ed.id} className="d-card cs-edif" aria-labelledby={`t-${ed.id}`}>
              <h3 id={`t-${ed.id}`}>{ed.nombre}</h3>
              <p className="sub">{ed.direccion} · {r.unidades} unidades</p>
              <div className="cs-barra" aria-label={`Cobrado ${pct}%`}><span style={{ width: `${pct}%` }} /></div>
              <p className="cs-edif-num"><strong>{pct}% cobrado</strong> · {r.alDia} al día · <span className={r.enMora ? 'cs-rojo' : ''}>{r.enMora} en mora</span></p>
              <ul className="cs-edif-lista">
                <li><Icono nombre="planilla" size={16} /> {mayus(mesLargo(r.abierto))} abierto: {ab.gastos.length} gastos · {p(ab.total)}</li>
                <li><Icono nombre={ed.mp.vinculada ? 'check' : 'info'} size={16} /> Mercado Pago {ed.mp.vinculada ? 'vinculado' : 'sin vincular'}</li>
                {r.obrasEnCurso > 0 && <li><Icono nombre="llave" size={16} /> {r.obrasEnCurso} {r.obrasEnCurso === 1 ? 'obra' : 'obras'} en marcha</li>}
                {r.reclamosAbiertos > 0 && <li><Icono nombre="info" size={16} /> {r.reclamosAbiertos} {r.reclamosAbiertos === 1 ? 'reclamo abierto' : 'reclamos abiertos'}</li>}
              </ul>
              <div className="cs-acc">
                <button type="button" className="d-btn" onClick={() => ir('gastos', ed.id)}>Gastos</button>
                <button type="button" className="d-btn prim" onClick={() => ir('expensas', ed.id)}>Liquidar {mesLargo(r.abierto)}</button>
              </div>
            </section>
          );
        })}
      </div>

      <div className="cs-dos">
        <section className="d-card" aria-labelledby="t-hoy">
          <h2 id="t-hoy">Para hoy</h2>
          <ul className="cs-hoy">
            {aConfirmar.length > 0 && <li><button type="button" onClick={() => ir('cobranza')}><strong>{aConfirmar.length}</strong> {aConfirmar.length === 1 ? 'transferencia' : 'transferencias'} para confirmar</button></li>}
            {nuevos.length > 0 && <li><button type="button" onClick={() => ir('vecinos')}><strong>{nuevos.length}</strong> {nuevos.length === 1 ? 'reclamo nuevo' : 'reclamos nuevos'}: {nuevos[0].lugar.toLowerCase()}</button></li>}
            {obrasPend.length > 0 && <li><button type="button" onClick={() => ir('obras', obrasPend[0].edificioId)}><strong>{obrasPend.length}</strong> {obrasPend.length === 1 ? 'obra' : 'obras'} esperando elegir presupuesto</button></li>}
            <li>
              {hoy.length ? (
                <button type="button" onClick={() => { actualizar((e) => registrarAvisos(e, hoy.map((h) => ({ unidadId: h.unidadId, tipo: h.tipo, texto: textoRecordatorio(e, h.unidadId, h.tipo, ahora, config.moneda, '') })), ahora)); aviso(`Se enviaron ${hoy.length} avisos de cobranza.`); }}><strong>{hoy.length}</strong> avisos de cobranza para enviar hoy</button>
              ) : (
                <span>Cobranza automática al día: no hay avisos para hoy.</span>
              )}
            </li>
          </ul>
        </section>
        <section className="d-card" aria-labelledby="t-cob">
          <h2 id="t-cob">Cobrado por mes</h2>
          <div className="cs-graf" role="img" aria-label={serie.map((x) => `${mesCorto(x.mes)}: ${p(x.mp + x.otros)}`).join(', ')}>
            {serie.map((x) => (
              <div key={x.mes} className="cs-graf-col">
                <div className="cs-graf-barras" style={{ height: 140 }}>
                  <span className="otros" style={{ height: `${(x.otros / max) * 100}%` }} />
                  <span className="mp" style={{ height: `${(x.mp / max) * 100}%` }} />
                </div>
                <small>{mesCorto(x.mes)}</small>
              </div>
            ))}
          </div>
          <p className="cs-leyenda"><span className="mp" /> Mercado Pago <span className="otros" /> Transferencia y efectivo</p>
        </section>
      </div>
    </>
  );
}

// ---------------- Gastos

function Gastos({ config, estado, actualizar, ahora, edId, aviso }: Props) {
  const abierto = periodoAbierto(estado, edId, ahora);
  const periodos = [abierto, ...estado.liquidaciones.filter((l) => l.edificioId === edId).map((l) => l.periodo).sort().reverse()];
  const [periodo, setPeriodo] = useState(abierto);
  const per = periodos.includes(periodo) ? periodo : abierto;
  const [nuevo, setNuevo] = useState(false);
  const [ver, setVer] = useState<string | null>(null);
  const r = resumenGastos(estado, edId, per);
  const ed = edificio(estado, edId);
  const p = (v: number) => dinero(v, config.moneda);
  const cerrado = per !== abierto;
  const us = unidadesDe(estado, edId);
  const min = Math.min(...us.map((u) => u.coef));
  const max = Math.max(...us.map((u) => u.coef));
  const foto = ver ? estado.gastos.find((g) => g.id === ver) : null;
  return (
    <section className="d-card" aria-labelledby="t-gas">
      <div className="ag-cab">
        <div>
          <h2 id="t-gas">Gastos de {mesLargo(per)} · {ed.nombre}</h2>
          <p className="sub">{cerrado ? 'Mes liquidado: solo lectura.' : 'Mes abierto. Cargá cada factura con su foto; al cerrar el mes se reparte entre las unidades.'}</p>
        </div>
        <div className="cs-acc">
          <select className="c-inp" aria-label="Mes" value={per} onChange={(e) => setPeriodo(e.target.value)} style={{ width: 'auto' }}>
            {periodos.map((x) => <option key={x} value={x}>{mayus(mesLargo(x))} {x.slice(0, 4)}{x === abierto ? ' (abierto)' : ''}</option>)}
          </select>
          {!cerrado && (
            <>
              <button type="button" className="d-btn" onClick={() => { const res = cargarSueldos(estado, edId, per, ahora); if (!res.cargados) return aviso('Los sueldos de este mes ya están cargados.'); actualizar((e) => cargarSueldos(e, edId, per, ahora).estado); aviso(`Se cargaron ${res.cargados} sueldos con sus cargas.`); }}>Cargar sueldos del mes</button>
              <button type="button" className="d-btn prim" onClick={() => setNuevo(true)}><Icono nombre="mas" size={18} /> Cargar gasto</button>
            </>
          )}
        </div>
      </div>
      <div className="met-grid" style={{ marginBottom: 14 }}>
        <div className="met"><strong>{p(r.ordinarias)}</strong><span>Ordinarias</span></div>
        <div className="met"><strong>{p(r.extraordinarias)}</strong><span>Extraordinarias</span></div>
        <div className="met"><strong>{p(r.fondo)}</strong><span>Fondo de reserva ({ed.fondoReservaPct}%)</span></div>
        <div className="met"><strong>{p(Math.round((r.total * min) / 100))} a {p(Math.round((r.total * max) / 100))}</strong><span>{cerrado ? 'Expensa por unidad' : 'Expensa estimada por unidad'}</span></div>
      </div>
      <div className="d-scroll">
        <table className="d-tabla cs-gastos">
          <thead><tr><th>Fecha</th><th>Rubro</th><th>Detalle</th><th>Proveedor</th><th>Importe</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {RUBROS.flatMap((rb) => r.gastos.filter((g) => g.rubro === rb.id)).map((g) => (
              <tr key={g.id}>
                <td>{fechaCorta(g.fecha)}</td>
                <td>{NOMBRE_RUBRO[g.rubro]}</td>
                <td>{g.detalle}{g.tipo === 'extraordinario' && <span className="cs-chip">Extraordinario</span>}</td>
                <td>{g.proveedor}{g.cuit && <small className="cs-gris"> · {g.cuit}</small>}</td>
                <td className="num">{p(g.importe)}</td>
                <td className="cs-celda-acc">
                  {g.comprobante && <button type="button" className="d-btn" onClick={() => setVer(g.id)} aria-label={`Ver comprobante de ${g.detalle}`}><Icono nombre="ojo" size={16} /></button>}
                  {!cerrado && <button type="button" className="d-btn peligro" onClick={() => { actualizar((e) => quitarGasto(e, g.id)); aviso('Gasto quitado.'); }} aria-label={`Quitar ${g.detalle}`}><Icono nombre="basura" size={16} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!r.gastos.length && <p className="sub">Todavía no hay gastos en este mes.</p>}
      {nuevo && <NuevoGastoHoja {...{ estado, actualizar, ahora, edId, aviso }} periodo={per} onCerrar={() => setNuevo(false)} />}
      {foto && (
        <Hoja titulo="Comprobante" sub={`${foto.detalle} · ${foto.proveedor} · ${p(foto.importe)}`} onCerrar={() => setVer(null)}>
          {foto.comprobante === 'ejemplo' ? (
            <div className="cs-factura" aria-label="Factura de ejemplo">
              <strong>FACTURA B · ejemplo</strong>
              <span>{foto.proveedor}{foto.cuit ? ` · CUIT ${foto.cuit}` : ''}</span>
              <span>Cliente: Consorcio de Propietarios {ed.nombre} · CUIT {ed.cuit}</span>
              <span>Concepto: {foto.detalle}</span>
              <strong>Total {p(foto.importe)}</strong>
              <small>En la versión real se ve la foto o el PDF de la factura.</small>
            </div>
          ) : foto.comprobante?.startsWith('data:application/pdf') ? (
            <p>Comprobante en PDF adjunto.</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto.comprobante} alt={`Comprobante de ${foto.detalle}`} style={{ maxWidth: '100%', borderRadius: 12 }} />
          )}
        </Hoja>
      )}
    </section>
  );
}

function NuevoGastoHoja({ estado, actualizar, ahora, edId, aviso, periodo, onCerrar }: Pick<Props, 'estado' | 'actualizar' | 'ahora' | 'edId' | 'aviso'> & { periodo: string; onCerrar: () => void }) {
  const [rubro, setRubro] = useState<Rubro>('reparaciones');
  const [detalle, setDetalle] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [cuit, setCuit] = useState('');
  const [importe, setImporte] = useState('');
  const [tipo, setTipo] = useState<TipoGasto>('ordinario');
  const [foto, setFoto] = useState<string>();
  const [err, setErr] = useState('');
  return (
    <Hoja titulo="Cargar gasto" sub={`${edificio(estado, edId).nombre} · ${mesLargo(periodo)}`} onCerrar={onCerrar}>
      <form
        className="cs-form"
        onSubmit={(e) => {
          e.preventDefault();
          const { error } = intentar(actualizar, (x) => agregarGasto(x, { edificioId: edId, periodo, rubro, detalle, proveedor, cuit, importe: Number(importe.replace(/\./g, '').replace(',', '.')), tipo, comprobante: foto }, ahora));
          if (error) return setErr(error);
          aviso('Gasto cargado.');
          onCerrar();
        }}
      >
        <label>Rubro<select className="c-inp" value={rubro} onChange={(e) => setRubro(e.target.value as Rubro)}>{RUBROS.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></label>
        <label>Detalle<input className="c-inp" value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Cambio de cerradura de la entrada" /></label>
        <div className="cs-fila2">
          <label>Proveedor<input className="c-inp" value={proveedor} onChange={(e) => setProveedor(e.target.value)} /></label>
          <label>CUIT (opcional)<input className="c-inp" value={cuit} onChange={(e) => setCuit(e.target.value)} inputMode="numeric" /></label>
        </div>
        <div className="cs-fila2">
          <label>Importe<input className="c-inp" value={importe} onChange={(e) => setImporte(e.target.value)} inputMode="decimal" /></label>
          <fieldset className="cs-seg"><legend>Tipo</legend>
            <div className="seg">
              <button type="button" aria-pressed={tipo === 'ordinario'} onClick={() => setTipo('ordinario')}>Ordinario</button>
              <button type="button" aria-pressed={tipo === 'extraordinario'} onClick={() => setTipo('extraordinario')}>Extraordinario</button>
            </div>
          </fieldset>
        </div>
        <label className="d-btn cs-subir">
          <Icono nombre="subir" size={16} /> {foto ? 'Cambiar foto de la factura' : 'Sacar o subir foto de la factura'}
          <input type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Foto de la factura" onChange={async (ev) => { const f = ev.target.files?.[0]; ev.target.value = ''; if (!f) return; try { setFoto(await achicarImagen(f, 1000)); } catch (er) { setErr(er instanceof Error ? er.message : 'No pudimos usar esa foto.'); } }} />
        </label>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {foto && <img src={foto} alt="Vista de la factura" className="cs-foto chica" />}
        {err && <p className="bar-err" role="alert">{err}</p>}
        <button type="submit" className="d-btn prim">Guardar gasto</button>
      </form>
    </Hoja>
  );
}

// ---------------- Obras

function Obras({ config, estado, actualizar, ahora, edId, aviso }: Props) {
  const obras = estado.obras.filter((o) => o.edificioId === edId).sort((a, b) => b.creada.localeCompare(a.creada));
  const [abierta, setAbierta] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const o = abierta ? estado.obras.find((x) => x.id === abierta) : null;
  return (
    <section className="d-card" aria-labelledby="t-obras">
      <div className="ag-cab">
        <div>
          <h2 id="t-obras">Obras y trabajos especiales · {edificio(estado, edId).nombre}</h2>
          <p className="sub">Presupuestos comparados (con lo que pide la ley), aprobación y fotos de antes, durante y después. Los vecinos las ven desde su expensa.</p>
        </div>
        <button type="button" className="d-btn prim" onClick={() => setNueva(true)}><Icono nombre="mas" size={18} /> Nueva obra</button>
      </div>
      <ul className="cs-obras">
        {obras.map((x) => {
          const elegido = x.presupuestos.find((y) => y.elegido);
          return (
            <li key={x.id}>
              <button type="button" className="cs-obra" onClick={() => setAbierta(x.id)}>
                <span className={`cs-chip ${x.estado}`}>{NOMBRE_ESTADO_OBRA[x.estado]}</span>
                <strong>{x.titulo}</strong>
                <small>{x.presupuestos.length} presupuestos{elegido ? ` · elegido: ${elegido.proveedor} (${dinero(totalPresupuesto(elegido), config.moneda)})` : ''} · {x.evidencias.length} fotos</small>
                {x.evidencias.length > 0 && <span className="cs-obra-fotos">{x.evidencias.slice(-3).map((ev) => <FotoEvidencia key={ev.id} ev={ev} className="cs-foto mini" />)}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {!obras.length && <p className="sub">No hay obras en este edificio.</p>}
      {o && <ObraHoja obra={o} {...{ config, estado, actualizar, ahora, aviso }} onCerrar={() => setAbierta(null)} />}
      {nueva && <NuevaObraHoja {...{ estado, actualizar, ahora, edId, aviso }} onCerrar={(id) => { setNueva(false); if (id) setAbierta(id); }} />}
    </section>
  );
}

function NuevaObraHoja({ estado, actualizar, ahora, edId, aviso, onCerrar }: Pick<Props, 'estado' | 'actualizar' | 'ahora' | 'edId' | 'aviso'> & { onCerrar: (id?: string) => void }) {
  const [titulo, setTitulo] = useState('');
  const [desc, setDesc] = useState('');
  const [cuotas, setCuotas] = useState('1');
  const [err, setErr] = useState('');
  return (
    <Hoja titulo="Nueva obra" sub={edificio(estado, edId).nombre} onCerrar={() => onCerrar()}>
      <form className="cs-form" onSubmit={(e) => {
        e.preventDefault();
        const { error, resultado } = intentar(actualizar, (x) => nuevaObra(x, edId, titulo, desc, Number(cuotas), ahora));
        if (error) return setErr(error);
        aviso('Obra creada. Cargá los presupuestos.');
        onCerrar(resultado && 'obra' in resultado ? resultado.obra : undefined);
      }}>
        <label>Título<input className="c-inp" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Impermeabilización de terraza" /></label>
        <label>Descripción<textarea className="c-inp" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
        <label>Se cobra en (cuotas de expensa extraordinaria)<input className="c-inp" type="number" min={1} max={12} value={cuotas} onChange={(e) => setCuotas(e.target.value)} /></label>
        {err && <p className="bar-err" role="alert">{err}</p>}
        <button type="submit" className="d-btn prim">Crear obra</button>
      </form>
    </Hoja>
  );
}

function ObraHoja({ obra, config, actualizar, ahora, aviso, onCerrar }: Pick<Props, 'config' | 'estado' | 'actualizar' | 'ahora' | 'aviso'> & { obra: Obra; onCerrar: () => void }) {
  const p = (v: number) => dinero(v, config.moneda);
  const [err, setErr] = useState('');
  const [etapa, setEtapa] = useState<Evidencia['etapa']>(obra.estado === 'presupuestos' ? 'antes' : obra.estado === 'aprobada' ? 'antes' : 'durante');
  const [nota, setNota] = useState('');
  const [foto, setFoto] = useState<string>();
  const [pres, setPres] = useState(false);
  const cerrada = obra.estado === 'terminada';
  return (
    <Hoja titulo={obra.titulo} sub={`${NOMBRE_ESTADO_OBRA[obra.estado]}${obra.aprobadaPor ? ` · aprobada por ${obra.aprobadaPor}` : ''} · ${obra.cuotas} ${obra.cuotas === 1 ? 'cuota' : 'cuotas'}`} onCerrar={onCerrar} ancha>
      <p>{obra.descripcion}</p>
      <h3 className="cs-h3">Presupuestos</h3>
      <div className="d-scroll">
        <table className="d-tabla">
          <thead><tr><th>Proveedor</th><th>Materiales</th><th>Mano de obra</th><th>Total</th><th>Plazo</th><th>Garantía</th><th>Requisitos (art. 13)</th><th><span className="sr-only">Elegir</span></th></tr></thead>
          <tbody>
            {obra.presupuestos.map((x) => {
              const falta = faltantesPresupuesto(x);
              return (
                <tr key={x.id} className={x.elegido ? 'cs-elegido' : undefined}>
                  <td>{x.proveedor}<small className="cs-gris">{x.cuit ? ` · ${x.cuit}` : ' · sin CUIT'}</small></td>
                  <td className="num">{p(x.materiales)}</td>
                  <td className="num">{p(x.manoObra)}</td>
                  <td className="num"><strong>{p(totalPresupuesto(x))}</strong></td>
                  <td>{x.plazoDias ? `${x.plazoDias} días` : '—'}</td>
                  <td>{x.garantiaMeses ? `${x.garantiaMeses} meses` : '—'}</td>
                  <td>{falta.length ? <span className="cs-chip rojo">Falta: {falta.join(', ')}</span> : <span className="cs-chip verde">Completo</span>}</td>
                  <td>{x.elegido ? <span className="cs-chip verde">Elegido</span> : obra.estado === 'presupuestos' && <button type="button" className="d-btn" onClick={() => { const { error } = intentar(actualizar, (e) => elegirPresupuesto(e, obra.id, x.id, 'Asamblea / consejo')); if (error) return setErr(error); setErr(''); aviso(`Elegiste a ${x.proveedor}. La obra quedó aprobada.`); }}>Elegir</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {obra.estado === 'presupuestos' && (pres ? <NuevoPresupuesto obraId={obra.id} actualizar={actualizar} onListo={(m) => { setPres(false); aviso(m); }} /> : <button type="button" className="d-btn" onClick={() => setPres(true)}><Icono nombre="mas" size={16} /> Agregar presupuesto</button>)}

      <h3 className="cs-h3">Evidencias</h3>
      <div className="cs-evid">
        {(['antes', 'durante', 'despues'] as const).map((k) => (
          <div key={k}>
            <h4>{NOMBRE_ETAPA[k]}</h4>
            {obra.evidencias.filter((x) => x.etapa === k).map((ev) => (
              <figure key={ev.id} className="cs-ev">
                <FotoEvidencia ev={ev} />
                <figcaption>{ev.nota}<small>{fechaCorta(ev.fecha)}</small></figcaption>
              </figure>
            ))}
            {!obra.evidencias.some((x) => x.etapa === k) && <p className="sub">Sin fotos.</p>}
          </div>
        ))}
      </div>
      {!cerrada && (
        <form className="cs-form cs-ev-form" onSubmit={(e) => {
          e.preventDefault();
          const { error } = intentar(actualizar, (x) => agregarEvidencia(x, obra.id, { etapa, nota, foto }, ahora));
          if (error) return setErr(error);
          setNota(''); setFoto(undefined); setErr('');
          aviso('Evidencia agregada.');
        }}>
          <div className="seg" role="group" aria-label="Etapa">
            {(['antes', 'durante', 'despues'] as const).map((k) => <button key={k} type="button" aria-pressed={etapa === k} onClick={() => setEtapa(k)}>{NOMBRE_ETAPA[k]}</button>)}
          </div>
          <label>Qué se ve o qué se hizo<input className="c-inp" value={nota} onChange={(e) => setNota(e.target.value)} /></label>
          <label className="d-btn cs-subir"><Icono nombre="subir" size={16} /> {foto ? 'Cambiar foto' : 'Subir foto'}
            <input type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Foto de la obra" onChange={async (ev) => { const f = ev.target.files?.[0]; ev.target.value = ''; if (!f) return; try { setFoto(await achicarImagen(f, 900)); } catch (er) { setErr(er instanceof Error ? er.message : 'No pudimos usar esa foto.'); } }} />
          </label>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {foto && <img src={foto} alt="Vista previa" className="cs-foto chica" />}
          <button type="submit" className="d-btn">Agregar evidencia</button>
        </form>
      )}
      {err && <p className="bar-err" role="alert">{err}</p>}
      {!cerrada && obra.estado !== 'presupuestos' && (
        <button type="button" className="d-btn prim" style={{ marginTop: 12 }} onClick={() => { const { error } = intentar(actualizar, (e) => terminarObra(e, obra.id, ahora)); if (error) return setErr(error); aviso('Obra terminada: la cuota se cargó como gasto extraordinario del mes abierto.'); }}>
          <Icono nombre="check" size={16} /> Terminar obra y cargar como extraordinaria
        </button>
      )}
    </Hoja>
  );
}

function NuevoPresupuesto({ obraId, actualizar, onListo }: { obraId: string; actualizar: ActualizarConsorcio; onListo: (m: string) => void }) {
  const [f, setF] = useState({ proveedor: '', cuit: '', materiales: '', manoObra: '', plazoDias: '', garantiaMeses: '', validezDias: '30', seguros: true });
  const [err, setErr] = useState('');
  const n = (v: string) => Number(v.replace(/\./g, '').replace(',', '.')) || 0;
  return (
    <form className="cs-form cs-pres" onSubmit={(e) => {
      e.preventDefault();
      const { error } = intentar(actualizar, (x) => agregarPresupuesto(x, obraId, { proveedor: f.proveedor, cuit: f.cuit, materiales: n(f.materiales), manoObra: n(f.manoObra), plazoDias: n(f.plazoDias), garantiaMeses: n(f.garantiaMeses), validezDias: n(f.validezDias), seguros: f.seguros }));
      if (error) return setErr(error);
      onListo(`Presupuesto de ${f.proveedor} agregado.`);
    }}>
      <label>Proveedor<input className="c-inp" value={f.proveedor} onChange={(e) => setF({ ...f, proveedor: e.target.value })} /></label>
      <label>CUIT<input className="c-inp" value={f.cuit} onChange={(e) => setF({ ...f, cuit: e.target.value })} /></label>
      <label>Materiales<input className="c-inp" inputMode="decimal" value={f.materiales} onChange={(e) => setF({ ...f, materiales: e.target.value })} /></label>
      <label>Mano de obra<input className="c-inp" inputMode="decimal" value={f.manoObra} onChange={(e) => setF({ ...f, manoObra: e.target.value })} /></label>
      <label>Plazo (días)<input className="c-inp" inputMode="numeric" value={f.plazoDias} onChange={(e) => setF({ ...f, plazoDias: e.target.value })} /></label>
      <label>Garantía (meses)<input className="c-inp" inputMode="numeric" value={f.garantiaMeses} onChange={(e) => setF({ ...f, garantiaMeses: e.target.value })} /></label>
      <label>Precio válido (días)<input className="c-inp" inputMode="numeric" value={f.validezDias} onChange={(e) => setF({ ...f, validezDias: e.target.value })} /></label>
      <label className="un-switch"><input type="checkbox" checked={f.seguros} onChange={(e) => setF({ ...f, seguros: e.target.checked })} /> Tiene ART y responsabilidad civil</label>
      {err && <p className="bar-err" role="alert">{err}</p>}
      <button type="submit" className="d-btn prim">Guardar presupuesto</button>
    </form>
  );
}

// ---------------- Personal

function PersonalTab({ config, estado, actualizar, edId, aviso }: Props) {
  const p = (v: number) => dinero(v, config.moneda);
  const lista = estado.personal.filter((x) => x.edificioId === edId);
  const propios = lista.filter((x) => !x.tercerizado);
  const terce = lista.filter((x) => x.tercerizado);
  const [f, setF] = useState({ nombre: '', rol: '', categoria: '', horario: '', sueldo: '', cargas: '', tercerizado: false });
  const [err, setErr] = useState('');
  const n = (v: string) => Number(v.replace(/\./g, '').replace(',', '.')) || 0;
  return (
    <>
      <section className="d-card" aria-labelledby="t-per">
        <h2 id="t-per">Personal de {edificio(estado, edId).nombre}</h2>
        <p className="sub">Costo mensual del personal propio: <strong>{p(propios.reduce((s, x) => s + x.sueldo + x.cargas, 0))}</strong> (sueldos más aportes, contribuciones y cuota sindical). La liquidación de sueldos la hace el contador; acá se refleja en las expensas.</p>
        <div className="d-scroll">
          <table className="d-tabla">
            <thead><tr><th>Nombre</th><th>Puesto</th><th>Categoría</th><th>Horario</th><th>Sueldo neto</th><th>Cargas</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {propios.map((x) => (
                <tr key={x.id}>
                  <td><strong>{x.nombre}</strong></td><td>{x.rol}</td><td>{x.categoria ?? '—'}</td><td>{x.horario}</td><td className="num">{p(x.sueldo)}</td><td className="num">{p(x.cargas)}</td>
                  <td className="cs-celda-acc">
                    {x.whatsapp && <a className="d-btn" href={enlaceWhatsApp(x.whatsapp, `Hola ${x.nombre.split(' ')[0]}, te escribo de la administración.`)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp a ${x.nombre}`}><Icono nombre="whatsapp" size={16} /></a>}
                    <button type="button" className="d-btn peligro" aria-label={`Quitar a ${x.nombre}`} onClick={() => { if (window.confirm(`¿Quitar a ${x.nombre} del listado?`)) actualizar((e) => quitarPersonal(e, x.id)); }}><Icono nombre="basura" size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="cs-h3">Servicios tercerizados (con factura)</h3>
        <ul className="cs-lista">
          {terce.map((x) => <li key={x.id}><strong>{x.nombre}</strong> · {x.rol} · {x.horario} <button type="button" className="d-btn peligro" aria-label={`Quitar ${x.nombre}`} onClick={() => actualizar((e) => quitarPersonal(e, x.id))}><Icono nombre="basura" size={14} /></button></li>)}
          {!terce.length && <li className="sub">Sin servicios tercerizados.</li>}
        </ul>
      </section>
      <section className="d-card" aria-labelledby="t-per-n">
        <h2 id="t-per-n">Agregar personal o servicio</h2>
        <form className="cs-form cs-pres" onSubmit={(e) => {
          e.preventDefault();
          const { error } = intentar(actualizar, (x) => agregarPersonal(x, { edificioId: edId, nombre: f.nombre, rol: f.rol, categoria: f.categoria || undefined, horario: f.horario || '—', sueldo: n(f.sueldo), cargas: n(f.cargas), tercerizado: f.tercerizado }));
          if (error) return setErr(error);
          aviso(`${f.nombre} quedó en el listado.`);
          setF({ nombre: '', rol: '', categoria: '', horario: '', sueldo: '', cargas: '', tercerizado: false });
          setErr('');
        }}>
          <label className="un-switch"><input type="checkbox" checked={f.tercerizado} onChange={(e) => setF({ ...f, tercerizado: e.target.checked })} /> Es un servicio tercerizado (empresa con factura)</label>
          <label>{f.tercerizado ? 'Empresa' : 'Nombre y apellido'}<input className="c-inp" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></label>
          <label>Puesto o tarea<input className="c-inp" value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })} placeholder={f.tercerizado ? 'Limpieza de espacios comunes' : 'Encargado permanente'} /></label>
          {!f.tercerizado && <label>Categoría<input className="c-inp" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} /></label>}
          <label>Horario<input className="c-inp" value={f.horario} onChange={(e) => setF({ ...f, horario: e.target.value })} /></label>
          {!f.tercerizado && <label>Sueldo neto<input className="c-inp" inputMode="decimal" value={f.sueldo} onChange={(e) => setF({ ...f, sueldo: e.target.value })} /></label>}
          {!f.tercerizado && <label>Cargas sociales<input className="c-inp" inputMode="decimal" value={f.cargas} onChange={(e) => setF({ ...f, cargas: e.target.value })} /></label>}
          {err && <p className="bar-err" role="alert">{err}</p>}
          <button type="submit" className="d-btn prim">Agregar</button>
        </form>
      </section>
    </>
  );
}

// ---------------- Expensas: cierre, envío y recibos

function Expensas({ slug, config, estado, actualizar, ahora, edId, aviso }: Props) {
  const p = (v: number) => dinero(v, config.moneda);
  const ed = edificio(estado, edId);
  const abierto = periodoAbierto(estado, edId, ahora);
  const r = resumenGastos(estado, edId, abierto);
  const liqs = estado.liquidaciones.filter((l) => l.edificioId === edId).sort((a, b) => b.periodo.localeCompare(a.periodo));
  const [liqId, setLiqId] = useState<string | null>(null);
  const liq = liqs.find((l) => l.id === liqId) ?? liqs[0];
  const [verLiq, setVerLiq] = useState(false);
  const [recibo, setRecibo] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const xs = liq ? estado.expensas.filter((x) => x.liquidacionId === liq.id) : [];
  const enviados = liq ? enviadosDe(estado, liq.id) : 0;
  const x = recibo ? estado.expensas.find((y) => y.id === recibo) : null;
  const enlace = (uId: string) => enlaceExpensa(origen(), slug, unidad(estado, uId)!);
  return (
    <>
      <section className="d-card cs-cierre" aria-labelledby="t-cierre">
        <h2 id="t-cierre">{mayus(mesLargo(abierto))} abierto · {ed.nombre}</h2>
        <p className="sub">{r.gastos.length} gastos cargados. Al cerrar, se reparte entre las {unidadesDe(estado, edId).length} unidades según su porcentual, se suma el saldo anterior con el interés del {ed.interesMensual}% y vence el {ed.vencimientoDia} del mes siguiente.</p>
        <div className="met-grid" style={{ marginBottom: 12 }}>
          <div className="met"><strong>{p(r.ordinarias)}</strong><span>Ordinarias</span></div>
          <div className="met"><strong>{p(r.extraordinarias)}</strong><span>Extraordinarias</span></div>
          <div className="met"><strong>{p(r.fondo)}</strong><span>Fondo de reserva</span></div>
          <div className="met"><strong>{p(r.total)}</strong><span>Total a liquidar</span></div>
        </div>
        {err && <p className="bar-err" role="alert">{err}</p>}
        <button type="button" className="d-btn prim grande" onClick={() => {
          if (!window.confirm(`¿Cerrar ${mesLargo(abierto)} de ${ed.nombre} y emitir las expensas? Después no se pueden agregar gastos a ese mes.`)) return;
          const { error, resultado } = intentar(actualizar, (e) => cerrarMes(e, edId, abierto, ahora));
          if (error) return setErr(error);
          setErr('');
          if (resultado && 'liquidacion' in resultado) setLiqId(resultado.liquidacion.id);
          aviso(`Liquidación de ${mesLargo(abierto)} emitida: ${unidadesDe(estado, edId).length} expensas listas para enviar.`);
        }}>
          <Icono nombre="check" size={18} /> Cerrar {mesLargo(abierto)} y emitir expensas
        </button>
      </section>

      {liq && (
        <section className="d-card" aria-labelledby="t-liq">
          <div className="ag-cab">
            <div>
              <h2 id="t-liq">Expensas de {mesLargo(liq.periodo)} · liquidación N° {liq.numero}</h2>
              <p className="sub">Emitida el {fechaCorta(liq.cerrada)} · vence el {xs[0] ? diaYMes(xs[0].vence) : '—'} · enviadas por WhatsApp: <strong>{enviados} de {xs.length}</strong></p>
            </div>
            <div className="cs-acc">
              <select className="c-inp" aria-label="Liquidación" value={liq.id} onChange={(e) => setLiqId(e.target.value)} style={{ width: 'auto' }}>
                {liqs.map((l) => <option key={l.id} value={l.id}>{mayus(mesLargo(l.periodo))} {l.periodo.slice(0, 4)} (N° {l.numero})</option>)}
              </select>
              <button type="button" className="d-btn" onClick={() => setVerLiq(true)}><Icono nombre="planilla" size={16} /> Ver liquidación</button>
              <button type="button" className="d-btn prim" disabled={enviados >= xs.length} onClick={() => {
                const faltan = xs.filter((y) => !estado.avisos.some((a) => a.unidadId === y.unidadId && a.tipo === 'expensa' && a.fecha >= liq.cerrada));
                actualizar((e) => registrarAvisos(e, faltan.map((y) => ({ unidadId: y.unidadId, tipo: 'expensa' as const, texto: textoExpensa(e, y, config.moneda, enlace(y.unidadId)) })), ahora));
                aviso(`Se enviaron ${faltan.length} expensas por WhatsApp (en la demo, simulado).`);
              }}>
                <Icono nombre="whatsapp" size={16} /> {enviados >= xs.length ? 'Todas enviadas' : `Enviar ${xs.length - enviados} por WhatsApp`}
              </button>
            </div>
          </div>
          <div className="d-scroll">
            <table className="d-tabla">
              <thead><tr><th>Unidad</th><th>Propietario/a</th><th>%</th><th>Saldo anterior</th><th>Del mes</th><th>Total</th><th>Hoy</th><th><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {xs.map((y) => {
                  const u = unidad(estado, y.unidadId)!;
                  const s = situacion(estado, u.id, ahora);
                  return (
                    <tr key={y.id}>
                      <td><strong>{u.nombre}</strong></td>
                      <td>{u.propietario}</td>
                      <td>{u.coef.toLocaleString('es-AR')}</td>
                      <td className="num">{y.saldoAnterior ? p(y.saldoAnterior) : '—'}</td>
                      <td className="num">{p(totalRecibo(y) - y.saldoAnterior)}</td>
                      <td className="num"><strong>{p(totalRecibo(y))}</strong></td>
                      <td><Luz estado={s.estado} /></td>
                      <td className="cs-celda-acc">
                        <button type="button" className="d-btn" onClick={() => setRecibo(y.id)} aria-label={`Recibo de ${u.nombre}`}><Icono nombre="planilla" size={16} /></button>
                        <a className="d-btn" href={enlaceWhatsApp(u.whatsapp, textoExpensa(estado, y, config.moneda, enlace(u.id)))} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp a ${u.nombre}`}><Icono nombre="whatsapp" size={16} /></a>
                        <a className="d-btn" href={enlace(u.id)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir Mi expensa de ${u.nombre}`}><Icono nombre="enlace" size={16} /></a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {verLiq && liq && (
        <Hoja titulo={`Liquidación de ${mesLargo(liq.periodo)}`} sub={ed.nombre} onCerrar={() => setVerLiq(false)} ancha>
          <div className="cs-imprimir-acc"><BotonImprimir /></div>
          <div className="cs-imprimible"><LiquidacionDoc estado={estado} liq={liq} moneda={config.moneda} /></div>
        </Hoja>
      )}
      {x && (
        <Hoja titulo={`Recibo de ${unidad(estado, x.unidadId)?.nombre}`} sub={ed.nombre} onCerrar={() => setRecibo(null)} ancha>
          <div className="cs-imprimir-acc"><BotonImprimir /></div>
          <div className="cs-imprimible"><ReciboDoc estado={estado} expensa={x} moneda={config.moneda} ahora={ahora} /></div>
        </Hoja>
      )}
    </>
  );
}

// ---------------- Cobranza

function Cobranza({ slug, config, estado, actualizar, ahora, aviso }: Props) {
  const p = (v: number) => dinero(v, config.moneda);
  const [ed, setEd] = useState('');
  const lista = morosos(estado, ahora, ed || undefined);
  const aConf = estado.pagos.filter((x) => x.estado === 'a-confirmar' && (!ed || unidad(estado, x.unidadId)?.edificioId === ed));
  const ultimos = estado.pagos.filter((x) => x.estado === 'acreditado' && (!ed || unidad(estado, x.unidadId)?.edificioId === ed)).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8);
  const hoy = cobranzaDeHoy(estado, ahora);
  const prox = proximosEnvios(estado, ahora);
  const [efectivo, setEfectivo] = useState<string | null>(null);
  const enlace = (uId: string) => enlaceExpensa(origen(), slug, unidad(estado, uId)!);
  const nombreTipo = { recordatorio: `Recordatorio (${estado.cobranza.diasAntes} días antes)`, vencimiento: 'Aviso el día del vencimiento', deuda: 'Aviso de deuda con interés' };
  return (
    <>
      <div className="cs-eds" role="group" aria-label="Edificio">
        <button type="button" aria-pressed={!ed} onClick={() => setEd('')}>Todos</button>
        {estado.edificios.map((x) => <button key={x.id} type="button" aria-pressed={ed === x.id} onClick={() => setEd(x.id)}>{x.nombre}</button>)}
      </div>
      <section className="d-card" aria-labelledby="t-auto">
        <div className="ag-cab">
          <div>
            <h2 id="t-auto">Cobranza automática por WhatsApp</h2>
            <p className="sub">Recordatorio {estado.cobranza.diasAntes} días antes, aviso el día del vencimiento y avisos de deuda a los {estado.cobranza.diasDespues.join(', ')} días. Cada aviso trae el enlace para pagar.</p>
          </div>
          <label className="un-switch"><input type="checkbox" checked={estado.cobranza.activa} onChange={(e) => actualizar((x) => ({ ...x, cobranza: { ...x.cobranza, activa: e.target.checked } }))} /> Activa</label>
        </div>
        <ul className="cs-lista">
          {prox.map((x) => <li key={`${x.dia}-${x.tipo}`}><strong>{diaYMes(`${x.dia}T12:00:00`)}</strong> · {nombreTipo[x.tipo]} · {x.unidades} {x.unidades === 1 ? 'unidad' : 'unidades'}</li>)}
          {!prox.length && <li className="sub">No hay envíos programados en los próximos 7 días.</li>}
        </ul>
        <button type="button" className="d-btn" disabled={!hoy.length} onClick={() => { actualizar((e) => registrarAvisos(e, hoy.map((h) => ({ unidadId: h.unidadId, tipo: h.tipo, texto: textoRecordatorio(e, h.unidadId, h.tipo, ahora, config.moneda, enlace(h.unidadId)) })), ahora)); aviso(`Se enviaron ${hoy.length} avisos.`); }}>
          {hoy.length ? `Enviar los ${hoy.length} avisos de hoy` : 'No hay avisos para hoy'}
        </button>
      </section>

      {aConf.length > 0 && (
        <section className="d-card" aria-labelledby="t-conf">
          <h2 id="t-conf">Transferencias para confirmar</h2>
          <p className="sub">El vecino avisó que transfirió. Fijate en el banco y confirmalo: se emite el recibo de pago.</p>
          <ul className="cs-pagos">
            {aConf.map((x) => {
              const u = unidad(estado, x.unidadId)!;
              return (
                <li key={x.id}>
                  <span><strong>{edificio(estado, u.edificioId).nombre} · {u.nombre}</strong><small>{u.propietario} · {fechaCorta(x.fecha)}{x.comprobante ? ' · con comprobante' : ''}</small></span>
                  <strong>{p(x.importe)}</strong>
                  <span className="cs-acc">
                    <button type="button" className="d-btn prim" onClick={() => { actualizar((e) => confirmarPago(e, x.id)); aviso(`Pago de ${u.nombre} confirmado. Recibo N° ${x.numero}.`); }} aria-label={`Confirmar pago de ${u.nombre}`}>Confirmar</button>
                    <button type="button" className="d-btn" onClick={() => { if (window.confirm('¿No llegó la transferencia? Se quita el aviso de pago.')) actualizar((e) => rechazarPago(e, x.id)); }}>No llegó</button>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="d-card" aria-labelledby="t-mor">
        <h2 id="t-mor">Unidades en mora ({lista.length})</h2>
        <div className="d-scroll">
          <table className="d-tabla">
            <thead><tr><th>Edificio y unidad</th><th>Propietario/a</th><th>Deuda</th><th>Meses</th><th>Atraso</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {lista.map(({ u, s }) => (
                <tr key={u.id}>
                  <td><strong>{u.nombre}</strong><small className="cs-gris"> · {edificio(estado, u.edificioId).nombre}</small></td>
                  <td>{u.propietario}</td>
                  <td className="num"><strong>{p(s.deuda)}</strong></td>
                  <td>{s.meses}</td>
                  <td className={s.dias > 30 ? 'cs-rojo' : undefined}>{s.dias} días</td>
                  <td className="cs-celda-acc">
                    <a className="d-btn" href={enlaceWhatsApp(u.whatsapp, textoRecordatorio(estado, u.id, 'deuda', ahora, config.moneda, enlace(u.id)))} target="_blank" rel="noopener noreferrer" aria-label={`Reclamar deuda a ${u.nombre}`} onClick={() => actualizar((e) => registrarAvisos(e, [{ unidadId: u.id, tipo: 'deuda', texto: textoRecordatorio(e, u.id, 'deuda', ahora, config.moneda, enlace(u.id)) }], ahora))}><Icono nombre="whatsapp" size={16} /> Reclamar</a>
                    <button type="button" className="d-btn" onClick={() => setEfectivo(u.id)}>Registrar pago</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!lista.length && <p className="sub">No hay unidades en mora.</p>}
      </section>

      <section className="d-card" aria-labelledby="t-ult">
        <h2 id="t-ult">Últimos pagos</h2>
        <ul className="cs-pagos">
          {ultimos.map((x) => {
            const u = unidad(estado, x.unidadId)!;
            return <li key={x.id}><span><strong>{edificio(estado, u.edificioId).nombre} · {u.nombre}</strong><small>Recibo N° {String(x.numero).padStart(6, '0')} · {fechaCorta(x.fecha)}</small></span><span className={`cs-chip ${x.medio}`}>{NOMBRE_MEDIO[x.medio]}</span><strong>{p(x.importe)}</strong></li>;
          })}
        </ul>
      </section>
      {efectivo && <PagoManual uId={efectivo} {...{ config, estado, actualizar, ahora, aviso }} onCerrar={() => setEfectivo(null)} />}
    </>
  );
}

function PagoManual({ uId, config, estado, actualizar, ahora, aviso, onCerrar }: Pick<Props, 'config' | 'estado' | 'actualizar' | 'ahora' | 'aviso'> & { uId: string; onCerrar: () => void }) {
  const u = unidad(estado, uId)!;
  const s = situacion(estado, uId, ahora);
  const [importe, setImporte] = useState(String(s.deuda));
  const [medio, setMedio] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [err, setErr] = useState('');
  return (
    <Hoja titulo={`Registrar pago · ${u.nombre}`} sub={`${edificio(estado, u.edificioId).nombre} · debe ${dinero(s.deuda, config.moneda)}`} onCerrar={onCerrar}>
      <form className="cs-form" onSubmit={(e) => {
        e.preventDefault();
        const { error, resultado } = intentar(actualizar, (x) => registrarPago(x, uId, Number(importe.replace(/\./g, '')), medio, ahora));
        if (error) return setErr(error);
        if (resultado && 'pago' in resultado && medio === 'transferencia') actualizar((x) => confirmarPago(x, resultado.pago.id));
        aviso(`Pago registrado. Recibo N° ${resultado && 'pago' in resultado ? resultado.pago.numero : ''}.`);
        onCerrar();
      }}>
        <div className="seg" role="group" aria-label="Medio">
          <button type="button" aria-pressed={medio === 'efectivo'} onClick={() => setMedio('efectivo')}>Efectivo</button>
          <button type="button" aria-pressed={medio === 'transferencia'} onClick={() => setMedio('transferencia')}>Transferencia (ya vista en el banco)</button>
        </div>
        <label>Importe<input className="c-inp" inputMode="numeric" value={importe} onChange={(e) => setImporte(e.target.value)} /></label>
        {err && <p className="bar-err" role="alert">{err}</p>}
        <button type="submit" className="d-btn prim">Registrar y emitir recibo</button>
      </form>
    </Hoja>
  );
}

// ---------------- Espacios comunes

function Espacios({ config, estado, actualizar, ahora, edId, aviso }: Props) {
  const ed = edificio(estado, edId);
  const p = (v: number) => dinero(v, config.moneda);
  const [precio, setPrecio] = useState('');
  const [err, setErr] = useState('');
  const reservas = estado.reservas.filter((r) => r.edificioId === edId && r.estado === 'confirmada' && r.dia >= new Date(ahora).toISOString().slice(0, 10)).sort((a, b) => a.dia.localeCompare(b.dia));
  if (!ed.espacio) return <section className="d-card"><p className="sub">Este edificio no tiene espacio común para reservar.</p></section>;
  return (
    <section className="d-card" aria-labelledby="t-sum">
      <h2 id="t-sum">{ed.espacio.nombre} · {ed.nombre}</h2>
      <p className="sub">{ed.espacio.reglas} Los vecinos reservan desde su enlace y el costo se suma a la expensa o se paga con Mercado Pago.</p>
      <form className="cs-precio" onSubmit={(e) => {
        e.preventDefault();
        const { error } = intentar(actualizar, (x) => cambiarEspacio(x, edId, { precio: Number(precio.replace(/\./g, '')) }));
        if (error) return setErr(error);
        setErr('');
        setPrecio('');
        aviso(`Nuevo precio del ${ed.espacio!.nombre.toLowerCase()}: ${p(Number(precio.replace(/\./g, '')))}.`);
      }}>
        <span>Precio por turno: <strong>{p(ed.espacio.precio)}</strong></span>
        <label><span className="sr-only">Nuevo precio</span><input className="c-inp" inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Nuevo precio" /></label>
        <button type="submit" className="d-btn" disabled={!precio}>Cambiar precio</button>
      </form>
      {err && <p className="bar-err" role="alert">{err}</p>}
      <p className="sub">Turnos: {ed.espacio.turnos.join(' · ')}</p>
      <h3 className="cs-h3">Próximas reservas</h3>
      <ul className="cs-pagos">
        {reservas.map((r) => {
          const u = unidad(estado, r.unidadId)!;
          return (
            <li key={r.id}>
              <span><strong>{diaYMes(`${r.dia}T12:00:00`)} · {r.turno}</strong><small>{u.nombre} · {u.propietario}</small></span>
              <span className={`cs-chip ${r.cobro === 'mercadopago' ? 'mercadopago' : ''}`}>{r.cobro === 'mercadopago' ? 'Pagado con Mercado Pago' : r.cargadaEn ? `En la expensa de ${mesLargo(r.cargadaEn)}` : 'Se suma a la próxima expensa'}</span>
              <strong>{p(r.precio)}</strong>
              {!r.cargadaEn && <button type="button" className="d-btn" onClick={() => { if (window.confirm('¿Cancelar la reserva?')) actualizar((e) => cancelarReserva(e, r.id)); }}>Cancelar</button>}
            </li>
          );
        })}
        {!reservas.length && <li className="sub">No hay reservas próximas.</li>}
      </ul>
    </section>
  );
}

// ---------------- Comunicados y reclamos

function Vecinos({ slug, estado, actualizar, ahora, edId, aviso }: Props) {
  const ed = edificio(estado, edId);
  const us = unidadesDe(estado, edId);
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [err, setErr] = useState('');
  const coms = estado.comunicados.filter((c) => c.edificioId === edId).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const recs = estado.reclamos.filter((r) => r.edificioId === edId).sort((a, b) => (a.estado === 'resuelto' ? 1 : 0) - (b.estado === 'resuelto' ? 1 : 0) || b.fecha.localeCompare(a.fecha));
  const quienes = useMemo(() => [...new Set([...estado.personal.filter((p) => p.edificioId === edId).map((p) => p.nombre), 'Electricidad Caseros', 'Plomería Hnos. Vega', 'Cerrajería San Martín'])], [estado.personal, edId]);
  return (
    <>
      <section className="d-card" aria-labelledby="t-com">
        <h2 id="t-com">Comunicado a {ed.nombre}</h2>
        <form className="cs-form" onSubmit={(e) => {
          e.preventDefault();
          const { error, resultado } = intentar(actualizar, (x) => nuevoComunicado(x, edId, titulo, texto, ahora));
          if (error) return setErr(error);
          if (resultado && 'comunicado' in resultado) {
            const c = resultado.comunicado;
            actualizar((x) => registrarAvisos(x, us.map((u) => ({ unidadId: u.id, tipo: 'comunicado' as const, texto: `📢 ${ed.nombre}: ${c.titulo}. Leelo acá: ${enlaceExpensa(origen(), slug, u)}` })), ahora));
          }
          setTitulo(''); setTexto(''); setErr('');
          aviso(`Comunicado enviado por WhatsApp a ${us.length} unidades (simulado).`);
        }}>
          <label>Título<input className="c-inp" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Corte de agua el jueves" /></label>
          <label>Texto<textarea className="c-inp" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} /></label>
          {err && <p className="bar-err" role="alert">{err}</p>}
          <button type="submit" className="d-btn prim"><Icono nombre="whatsapp" size={16} /> Enviar a las {us.length} unidades</button>
        </form>
        <ul className="cs-lista" style={{ marginTop: 14 }}>
          {coms.map((c) => <li key={c.id}><strong>{c.titulo}</strong> · {fechaCorta(c.fecha)} · <span className="cs-chip">{c.leidos.length} de {us.length} lo leyeron</span></li>)}
        </ul>
      </section>
      <section className="d-card" aria-labelledby="t-rec">
        <h2 id="t-rec">Reclamos de {ed.nombre}</h2>
        <p className="sub">Llegan desde el enlace de cada unidad. Asignalo a alguien y, al resolverlo, el vecino recibe el aviso.</p>
        <ul className="cs-reclamos">
          {recs.map((r) => (
            <li key={r.id} data-estado={r.estado}>
              <div>
                <span className={`cs-chip ${r.estado === 'resuelto' ? 'verde' : r.estado === 'nuevo' ? 'rojo' : ''}`}>{r.estado === 'nuevo' ? 'Nuevo' : r.estado === 'asignado' ? `Asignado a ${r.asignadoA}` : 'Resuelto'}</span>
                <strong>{r.lugar}</strong>
                <p>{r.texto}</p>
                <small>{r.unidadId ? `${unidad(estado, r.unidadId)?.nombre} · ` : ''}{fechaCorta(r.fecha)}{r.resolucion ? ` · ${r.resolucion}` : ''}</small>
              </div>
              {r.estado !== 'resuelto' && (
                <div className="cs-acc">
                  {r.estado === 'nuevo' && (
                    <select className="c-inp" aria-label={`Asignar reclamo de ${r.lugar}`} defaultValue="" onChange={(e) => { if (e.target.value) { actualizar((x) => asignarReclamo(x, r.id, e.target.value)); aviso(`Reclamo asignado a ${e.target.value}.`); } }}>
                      <option value="" disabled>Asignar a…</option>
                      {quienes.map((q) => <option key={q} value={q}>{q}</option>)}
                    </select>
                  )}
                  <button type="button" className="d-btn" onClick={() => { const t = window.prompt('¿Qué se hizo?', 'Se reparó.'); if (t !== null) { actualizar((x) => resolverReclamo(x, r.id, t, ahora)); aviso('Reclamo resuelto. El vecino recibe el aviso.'); } }}>Marcar resuelto</button>
                </div>
              )}
            </li>
          ))}
          {!recs.length && <li className="sub">No hay reclamos.</li>}
        </ul>
      </section>
    </>
  );
}

// ---------------- Edificios

function Edificios({ config, estado, actualizar, edId, aviso }: Props) {
  const ed = edificio(estado, edId);
  const [err, setErr] = useState('');
  const [vincular, setVincular] = useState(false);
  const [cuenta, setCuenta] = useState('');
  const [ver, setVer] = useState(false);
  const us = unidadesDe(estado, edId);
  const a = estado.administracion;
  return (
    <>
      <section className="d-card" aria-labelledby="t-ed">
        <h2 id="t-ed">{ed.nombre}</h2>
        <p className="sub">{ed.direccion}, {ed.localidad} · CUIT {ed.cuit} · Clave sindical {ed.claveSindical} · {us.length} unidades</p>
        <form className="cs-form cs-pres" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const { error } = intentar(actualizar, (x) => guardarEdificio(x, edId, { vencimientoDia: Number(f.get('vence')), interesMensual: Number(String(f.get('interes')).replace(',', '.')), fondoReservaPct: Number(f.get('fondo')), honorarios: Number(String(f.get('hon')).replace(/\./g, '')) }));
          if (error) return setErr(error);
          setErr('');
          aviso('Datos del edificio guardados. Se aplican desde la próxima liquidación.');
        }}>
          <label>Vencimiento (día del mes)<input name="vence" className="c-inp" type="number" min={1} max={28} defaultValue={ed.vencimientoDia} /></label>
          <label>Interés por mora (% mensual)<input name="interes" className="c-inp" inputMode="decimal" defaultValue={ed.interesMensual} /></label>
          <label>Fondo de reserva (% de ordinarias)<input name="fondo" className="c-inp" type="number" min={0} max={30} defaultValue={ed.fondoReservaPct} /></label>
          <label>Honorarios de administración<input name="hon" className="c-inp" inputMode="numeric" defaultValue={ed.honorarios} /></label>
          {err && <p className="bar-err" role="alert">{err}</p>}
          <button type="submit" className="d-btn prim">Guardar</button>
        </form>
      </section>
      <section className="d-card" aria-labelledby="t-mp">
        <h2 id="t-mp">Cobro con Mercado Pago</h2>
        {ed.mp.vinculada ? (
          <>
            <p><span className="cs-chip verde">Vinculada</span> Los pagos de los vecinos se acreditan en <strong>{ed.mp.cuenta}</strong> ({ed.mp.titular}). ACMIAS no toca el dinero.</p>
            <button type="button" className="d-btn" onClick={() => { if (window.confirm('¿Desvincular la cuenta? Los vecinos no van a poder pagar con Mercado Pago.')) actualizar((x) => desvincularMp(x, edId)); }}>Desvincular</button>
          </>
        ) : vincular ? (
          <form className="cs-form" onSubmit={(e) => {
            e.preventDefault();
            const { error } = intentar(actualizar, (x) => vincularMp(x, edId, cuenta));
            if (error) return setErr(error);
            setVincular(false);
            setErr('');
            aviso('Cuenta de Mercado Pago vinculada (simulado). Los vecinos ya pueden pagar.');
          }}>
            <p className="sub">En la versión real, este botón abre Mercado Pago: el administrador entra con la cuenta <strong>a nombre del consorcio</strong> y autoriza a ACMIAS a cobrar en su nombre. En la demo, escribí un alias de ejemplo.</p>
            <label>Alias o correo de la cuenta del consorcio<input className="c-inp" value={cuenta} onChange={(e) => setCuenta(e.target.value)} placeholder="consorcio.plaza.mp" /></label>
            {err && <p className="bar-err" role="alert">{err}</p>}
            <button type="submit" className="d-btn prim">Autorizar (simulado)</button>
          </form>
        ) : (
          <>
            <p><span className="cs-chip rojo">Sin vincular</span> Los vecinos de este edificio todavía no pueden pagar con Mercado Pago.</p>
            <button type="button" className="d-btn prim" onClick={() => setVincular(true)}>Vincular cuenta de Mercado Pago</button>
          </>
        )}
        <p className="sub" style={{ marginTop: 10 }}>También se puede pagar por transferencia a la cuenta del consorcio: {ed.banco.entidad}, CBU {ed.banco.cbu}.</p>
      </section>
      <section className="d-card" aria-labelledby="t-uf">
        <div className="ag-cab">
          <h2 id="t-uf">Unidades y porcentuales</h2>
          <button type="button" className="d-btn" onClick={() => setVer((x) => !x)}>{ver ? 'Ocultar' : `Ver las ${us.length}`}</button>
        </div>
        <p className="sub">Suman {Math.round(us.reduce((s, u) => s + u.coef, 0) * 100) / 100}%. Cada unidad tiene un código propio para entrar a &quot;Mi expensa&quot;.</p>
        {ver && (
          <div className="d-scroll">
            <table className="d-tabla">
              <thead><tr><th>Unidad</th><th>%</th><th>Propietario/a</th><th>WhatsApp</th><th>Código</th></tr></thead>
              <tbody>{us.map((u) => <tr key={u.id}><td>{u.nombre}</td><td>{u.coef.toLocaleString('es-AR')}</td><td>{u.propietario}</td><td>+{u.whatsapp}</td><td><code>{u.codigo}</code></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
      <section className="d-card" aria-labelledby="t-adm">
        <h2 id="t-adm">Administración</h2>
        <p className="sub">{a.nombre} · {a.responsable} · CUIT {a.cuit} · {a.matricula} · {a.domicilio} · Tel. {a.telefono}. Estos datos van en cada liquidación y recibo (Ley 14.701, arts. 11 y 12). Moneda: {config.moneda}.</p>
      </section>
    </>
  );
}
