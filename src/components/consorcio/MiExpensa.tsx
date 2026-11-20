'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Icono } from '@/components/Icono';
import { useDialogo } from '@/components/useDialogo';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp } from '@/lib/utiles';
import {
  DIA, NOMBRE_ESTADO, NOMBRE_ESTADO_OBRA, NOMBRE_MEDIO, cargos, dinero, diaYMes, edificio, expensasDe, fechaCorta, marcarLeido, mesLargo, nuevoReclamo, ocupado, pagosDe,
  registrarAvisos, registrarPago, reservar, cancelarReserva, situacion, textoReciboPago, totalPresupuesto, totalRecibo, ultimaExpensa, unidadPorCodigo,
} from '@/lib/rubros/consorcio/logica';
import type { EstadoConsorcio, Pago, Unidad } from '@/lib/rubros/consorcio/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { achicarImagen } from '@/components/unas/DisenoCita';
import { BotonImprimir, FotoEvidencia, LiquidacionDoc, ReciboDoc } from './Documentos';
import { intentar, useDemoConsorcio, type ActualizarConsorcio } from './useConsorcio';

const sinSuscripcion = () => () => {};
const leerUf = () => new URLSearchParams(window.location.search).get('uf') ?? '';

type Seccion = 'expensa' | 'liquidacion' | 'espacio' | 'avisos';
const LUZ = { 'al-dia': 'verde', 'por-vencer': 'amarillo', 'en-mora': 'rojo' } as const;
interface P { config: DemoConfig; estado: EstadoConsorcio; actualizar: ActualizarConsorcio; ahora: number; u: Unidad }

/** "Mi expensa": lo que ve cada vecino desde el enlace del WhatsApp (sin cuenta ni contraseña). */
export function MiExpensa({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo, ahora } = useDemoConsorcio(slug);
  const deUrl = useSyncExternalStore(sinSuscripcion, leerUf, () => '');
  const [elegido, setElegido] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [err, setErr] = useState('');
  const [seccion, setSeccion] = useState<Seccion>('expensa');
  const uf = elegido ?? deUrl;
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const u = uf ? unidadPorCodigo(estado, uf) : undefined;
  const entrar = (c: string) => {
    const x = unidadPorCodigo(estado, c);
    if (!x) return setErr('No encontramos ese código. Está en el WhatsApp de tu expensa (por ejemplo, ALA-3B-K2P).');
    setErr('');
    setElegido(x.codigo);
    window.history.replaceState(null, '', `/d/${slug}?uf=${x.codigo}${window.location.hash}`);
  };

  if (!u) {
    const ejemplos = [
      estado.unidades.find((x) => situacion(estado, x.id, ahora).estado === 'en-mora'),
      estado.unidades.find((x) => situacion(estado, x.id, ahora).estado === 'por-vencer'),
      estado.unidades.find((x) => situacion(estado, x.id, ahora).estado === 'al-dia'),
    ].filter((x): x is Unidad => !!x);
    return (
      <div className="cs-vec" style={estilo}>
        <AvisoDemo texto="Edificios, vecinos y montos ficticios · Mercado Pago simulado" />
        <header className="cs-vec-hero">
          <h1>{config.negocio}</h1>
          <p>Tu expensa, el recibo y el pago en un solo lugar.</p>
        </header>
        <main className="cs-vec-main">
          <section className="cs-vec-card" aria-labelledby="t-ent">
            <h2 id="t-ent">Entrá con el código de tu unidad</h2>
            <p className="cs-gris">Viene en el WhatsApp de cada expensa. No hace falta cuenta ni contraseña.</p>
            <form onSubmit={(e) => { e.preventDefault(); entrar(codigo); }} className="cs-form">
              <label>Código de la unidad<input className="c-inp" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="ALA-3B-K2P" autoCapitalize="characters" aria-invalid={!!err} /></label>
              {err && <p className="bar-err" role="alert">{err}</p>}
              <button type="submit" className="d-btn prim grande">Ver mi expensa</button>
            </form>
          </section>
          {ejemplos.length > 0 && (
            <section className="cs-vec-card" aria-labelledby="t-ej">
              <h2 id="t-ej">Para la demo: entrá como un vecino</h2>
              <ul className="cs-ejemplos">
                {ejemplos.map((x) => {
                  const s = situacion(estado, x.id, ahora);
                  return (
                    <li key={x.id}>
                      <button type="button" onClick={() => entrar(x.codigo)}>
                        <strong>{edificio(estado, x.edificioId).nombre} · {x.nombre}</strong>
                        <span className={`sem-luz ${LUZ[s.estado]}`}><span className="sem-punto" aria-hidden="true" />{NOMBRE_ESTADO[s.estado]}{s.deuda > 0 ? ` · ${dinero(s.deuda, config.moneda)}` : ''}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </main>
      </div>
    );
  }

  const ed = edificio(estado, u.edificioId);
  const props: P = { config, estado, actualizar, ahora, u };
  const coms = estado.comunicados.filter((c) => c.edificioId === ed.id && !c.leidos.includes(u.id)).length;
  return (
    <div className="cs-vec" style={estilo}>
      <AvisoDemo texto="Edificios, vecinos y montos ficticios · Mercado Pago simulado" />
      <header className="cs-vec-hero">
        <p className="cs-vec-ed">{ed.nombre} · {ed.direccion}</p>
        <h1>{u.nombre}</h1>
        <p>{u.propietario} · porcentual {u.coef.toLocaleString('es-AR')}%</p>
        <button type="button" className="cs-salir" onClick={() => { setElegido(''); window.history.replaceState(null, '', `/d/${slug}${window.location.hash}`); }}>Cambiar de unidad</button>
      </header>
      <nav className="cs-vec-tabs" role="tablist" aria-label="Secciones">
        {([['expensa', 'Mi expensa'], ['liquidacion', 'Liquidación y obras'], ['espacio', ed.espacio?.nombre ?? 'Espacio común'], ['avisos', `Avisos y reclamos${coms ? ` (${coms})` : ''}`]] as [Seccion, string][]).map(([k, t]) => (
          <button key={k} type="button" role="tab" aria-selected={seccion === k} onClick={() => setSeccion(k)}>{t}</button>
        ))}
      </nav>
      <main className="cs-vec-main">
        {seccion === 'expensa' && <Expensa {...props} />}
        {seccion === 'liquidacion' && <LiqYObras {...props} />}
        {seccion === 'espacio' && <Espacio {...props} />}
        {seccion === 'avisos' && <Avisos {...props} />}
        <p className="c-pie">{config.negocio} · {estado.administracion.matricula}. Hecho con ACMIAS.</p>
      </main>
    </div>
  );
}

function Hoja({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja cs-hoja" role="dialog" aria-modal="true" aria-labelledby="cs-vh-t" ref={ref}>
        <div className="hoja-cab">
          <h2 id="cs-vh-t">{titulo}</h2>
          <button type="button" className="x" onClick={onCerrar} aria-label="Cerrar"><Icono nombre="cerrar" size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Expensa({ config, estado, actualizar, ahora, u }: P) {
  const p = (v: number) => dinero(v, config.moneda);
  const ed = edificio(estado, u.edificioId);
  const s = situacion(estado, u.id, ahora);
  const x = ultimaExpensa(estado, u.id);
  const pagos = pagosDe(estado, u.id);
  const pendiente = pagos.find((y) => y.estado === 'a-confirmar');
  const [pagar, setPagar] = useState(false);
  const [transf, setTransf] = useState(false);
  const [recibo, setRecibo] = useState(false);
  const [hecho, setHecho] = useState<Pago | null>(null);
  return (
    <>
      <section className={`cs-vec-card cs-saldo ${s.estado}`} aria-labelledby="t-saldo">
        <span className={`sem-luz ${LUZ[s.estado]}`}><span className="sem-punto" aria-hidden="true" />{NOMBRE_ESTADO[s.estado]}</span>
        <h2 id="t-saldo">{s.deuda > 0 ? <>Tenés que pagar <strong>{p(s.deuda)}</strong></> : 'Estás al día'}</h2>
        {x && <p className="cs-gris">Expensa de {mesLargo(x.periodo)}: {p(totalRecibo(x))} · vence el {diaYMes(x.vence)}{s.estado === 'en-mora' ? ` · ${s.meses} ${s.meses === 1 ? 'mes vencido' : 'meses vencidos'}, con interés del ${ed.interesMensual}% mensual` : ''}</p>}
        {pendiente && <p className="cs-aviso"><Icono nombre="reloj" size={16} /> Avisaste una transferencia de {p(pendiente.importe)}. La administración la está confirmando.</p>}
        <div className="cs-vec-acc">
          {s.deuda > 0 && ed.mp.vinculada && <button type="button" className="cs-mp-btn" onClick={() => setPagar(true)}>Pagar con Mercado Pago</button>}
          {s.deuda > 0 && <button type="button" className="d-btn" onClick={() => setTransf(true)}>Pagué por transferencia</button>}
          {x && <button type="button" className="d-btn" onClick={() => setRecibo(true)}><Icono nombre="planilla" size={16} /> Ver recibo</button>}
        </div>
        {s.deuda > 0 && !ed.mp.vinculada && <p className="cs-gris">Este consorcio todavía no habilitó Mercado Pago. Podés transferir a la cuenta del consorcio: {ed.banco.entidad}, CBU {ed.banco.cbu}.</p>}
      </section>

      {hecho && (
        <section className="cs-vec-card cs-ok" aria-labelledby="t-ok" role="status">
          <h2 id="t-ok"><Icono nombre="check" size={20} /> {hecho.medio === 'mercadopago' ? '¡Pago aprobado!' : 'Aviso de transferencia enviado'}</h2>
          {hecho.medio === 'mercadopago' ? (
            <>
              <p>Se acreditaron {p(hecho.importe)} en la cuenta de Mercado Pago del consorcio ({ed.mp.cuenta}). Operación {hecho.operacion}.</p>
              <figure className="bar-wa"><figcaption>Te llega este WhatsApp <small>(en la demo lo mostramos acá)</small></figcaption><div className="bar-burbuja">{textoReciboPago(estado, hecho, config.moneda)}</div></figure>
            </>
          ) : <p>Cuando la administración vea la transferencia en el banco, te llega el recibo por WhatsApp.</p>}
        </section>
      )}

      <section className="cs-vec-card" aria-labelledby="t-hist">
        <h2 id="t-hist">Historial</h2>
        <ul className="cs-hist">
          {[
            ...expensasDe(estado, u.id).map((y) => ({ f: estado.liquidaciones.find((l) => l.id === y.liquidacionId)?.cerrada ?? y.vence, el: <li key={y.id}><span><strong>Expensa de {mesLargo(y.periodo)}</strong><small>Recibo N° {String(y.numero).padStart(6, '0')} · vence {fechaCorta(y.vence)}</small></span><strong>{p(cargos(y))}</strong></li> })),
            ...pagos.map((y) => ({ f: y.fecha, el: <li key={y.id} className="pago"><span><strong>Pago con {NOMBRE_MEDIO[y.medio]}{y.estado === 'a-confirmar' ? ' (a confirmar)' : ''}</strong><small>Recibo de pago N° {String(y.numero).padStart(6, '0')} · {fechaCorta(y.fecha)}</small></span><strong>− {p(y.importe)}</strong></li> })),
          ].sort((a, b) => b.f.localeCompare(a.f)).map((x) => x.el)}
        </ul>
      </section>

      {pagar && (
        <CheckoutMp {...{ config, estado, actualizar, ahora, u }} monto={s.deuda} onCerrar={() => setPagar(false)} onPagado={(pg) => { setPagar(false); setHecho(pg); }} />
      )}
      {transf && <Transferencia {...{ config, estado, actualizar, ahora, u }} monto={s.deuda} onCerrar={() => setTransf(false)} onListo={(pg) => { setTransf(false); setHecho(pg); }} />}
      {recibo && x && (
        <Hoja titulo={`Recibo de ${mesLargo(x.periodo)}`} onCerrar={() => setRecibo(false)}>
          <div className="cs-imprimir-acc"><BotonImprimir /></div>
          <div className="cs-imprimible"><ReciboDoc estado={estado} expensa={x} moneda={config.moneda} ahora={ahora} /></div>
        </Hoja>
      )}
    </>
  );
}

/**
 * Pago simulado con la apariencia del checkout de Mercado Pago. En la versión real va Checkout Bricks
 * con la cuenta vinculada del consorcio (Marketplace): el dinero se acredita en la cuenta del consorcio.
 * No se piden datos de tarjeta.
 */
function CheckoutMp({ config, estado, actualizar, ahora, u, monto, onCerrar, onPagado }: P & { monto: number; onCerrar: () => void; onPagado: (p: Pago) => void }) {
  const ed = edificio(estado, u.edificioId);
  const [medio, setMedio] = useState<'cuenta' | 'debito' | 'credito'>('cuenta');
  const [procesando, setProcesando] = useState(false);
  const [err, setErr] = useState('');
  const ref = useDialogo<HTMLDivElement>(onCerrar);
  useEffect(() => {
    if (!procesando) return;
    const t = setTimeout(() => {
      const { error, resultado } = intentar(actualizar, (e) => registrarPago(e, u.id, monto, 'mercadopago', ahora));
      if (error) {
        setErr(error);
        setProcesando(false);
        return;
      }
      if (resultado && 'pago' in resultado) {
        const pg = resultado.pago;
        actualizar((e) => registrarAvisos(e, [{ unidadId: u.id, tipo: 'recibo', texto: textoReciboPago(e, pg, config.moneda) }], ahora));
        onPagado(pg);
      }
    }, 900);
    return () => clearTimeout(t);
  }, [procesando, actualizar, u.id, monto, ahora, config.moneda, onPagado]);
  return (
    <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && !procesando && onCerrar()}>
      <div className="hoja cs-mp" role="dialog" aria-modal="true" aria-labelledby="cs-mp-t" ref={ref}>
        <div className="cs-mp-cab">
          <span className="cs-mp-logo" aria-hidden="true">MP</span>
          <div>
            <h2 id="cs-mp-t">Pagá con Mercado Pago</h2>
            <small>Se acredita en: Consorcio de Propietarios {ed.nombre} ({ed.mp.cuenta})</small>
          </div>
          <button type="button" className="x" onClick={onCerrar} aria-label="Cerrar" disabled={procesando}><Icono nombre="cerrar" size={20} /></button>
        </div>
        <p className="cs-mp-monto">{dinero(monto, config.moneda)}<small>Expensas {u.nombre}</small></p>
        <fieldset className="cs-mp-medios">
          <legend>¿Cómo querés pagar?</legend>
          {([['cuenta', 'Dinero en cuenta de Mercado Pago'], ['debito', 'Tarjeta de débito'], ['credito', 'Tarjeta de crédito']] as const).map(([k, t]) => (
            <label key={k} className="cs-mp-medio">
              <input type="radio" name="medio" checked={medio === k} onChange={() => setMedio(k)} />
              {t}
            </label>
          ))}
        </fieldset>
        <p className="cs-mp-demo"><Icono nombre="info" size={16} /> Demo: no se cobra nada ni se piden datos de tarjeta. En la versión real acá aparece el formulario oficial de Mercado Pago y el pago se acredita en la cuenta del consorcio.</p>
        {err && <p className="bar-err" role="alert">{err}</p>}
        <button type="button" className="cs-mp-btn grande" disabled={procesando} onClick={() => setProcesando(true)}>{procesando ? 'Procesando…' : `Pagar ${dinero(monto, config.moneda)}`}</button>
      </div>
    </div>
  );
}

function Transferencia({ estado, actualizar, ahora, u, monto, onCerrar, onListo }: P & { monto: number; onCerrar: () => void; onListo: (p: Pago) => void }) {
  const ed = edificio(estado, u.edificioId);
  const [importe, setImporte] = useState(String(monto));
  const [foto, setFoto] = useState<string>();
  const [err, setErr] = useState('');
  return (
    <Hoja titulo="Avisar una transferencia" onCerrar={onCerrar}>
      <p className="cs-gris">Cuenta del consorcio: {ed.banco.entidad}, CBU {ed.banco.cbu}, a nombre de Consorcio de Propietarios {ed.nombre} (CUIT {ed.cuit}).</p>
      <form className="cs-form" onSubmit={(e) => {
        e.preventDefault();
        const { error, resultado } = intentar(actualizar, (x) => registrarPago(x, u.id, Number(importe.replace(/\./g, '').replace(',', '.')), 'transferencia', ahora, { comprobante: foto }));
        if (error) return setErr(error);
        if (resultado && 'pago' in resultado) onListo(resultado.pago);
      }}>
        <label>Importe transferido<input className="c-inp" inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} /></label>
        <label className="d-btn cs-subir"><Icono nombre="subir" size={16} /> {foto ? 'Cambiar comprobante' : 'Subir comprobante (captura)'}
          <input type="file" accept="image/*" className="sr-only" aria-label="Comprobante de la transferencia" onChange={async (ev) => { const f = ev.target.files?.[0]; ev.target.value = ''; if (!f) return; try { setFoto(await achicarImagen(f, 1000)); } catch (er) { setErr(er instanceof Error ? er.message : 'No pudimos usar esa imagen.'); } }} />
        </label>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {foto && <img src={foto} alt="Comprobante" className="cs-foto chica" />}
        {err && <p className="bar-err" role="alert">{err}</p>}
        <button type="submit" className="d-btn prim">Avisar a la administración</button>
      </form>
    </Hoja>
  );
}

function LiqYObras({ config, estado, ahora, u }: P) {
  const ed = edificio(estado, u.edificioId);
  const liqs = estado.liquidaciones.filter((l) => l.edificioId === ed.id).sort((a, b) => b.periodo.localeCompare(a.periodo));
  const [liqId, setLiqId] = useState(liqs[0]?.id ?? '');
  const liq = liqs.find((l) => l.id === liqId) ?? liqs[0];
  const obras = estado.obras.filter((o) => o.edificioId === ed.id).sort((a, b) => b.creada.localeCompare(a.creada));
  void ahora;
  return (
    <>
      <section className="cs-vec-card" aria-labelledby="t-obras-v">
        <h2 id="t-obras-v">Obras del edificio</h2>
        <p className="cs-gris">Con los presupuestos y las fotos de antes, durante y después.</p>
        {obras.map((o) => {
          const el = o.presupuestos.find((x) => x.elegido);
          return (
            <article key={o.id} className="cs-obra-v">
              <header><span className={`cs-chip ${o.estado}`}>{NOMBRE_ESTADO_OBRA[o.estado]}</span><h3>{o.titulo}</h3></header>
              <p>{o.descripcion}</p>
              <p className="cs-gris">{el ? `Contratada: ${el.proveedor} · ${dinero(totalPresupuesto(el), config.moneda)} · garantía ${el.garantiaMeses} meses${o.cuotas > 1 ? ` · en ${o.cuotas} cuotas` : ''}` : `${o.presupuestos.length} presupuestos para elegir en asamblea`}</p>
              <div className="cs-galeria">
                {o.evidencias.map((ev) => <figure key={ev.id}><FotoEvidencia ev={ev} /><figcaption>{ev.nota}</figcaption></figure>)}
              </div>
            </article>
          );
        })}
        {!obras.length && <p className="cs-gris">No hay obras en curso.</p>}
      </section>
      {liq && (
        <section className="cs-vec-card" aria-labelledby="t-liq-v">
          <div className="cs-liq-cab">
            <h2 id="t-liq-v">Liquidación del edificio</h2>
            <select className="c-inp" aria-label="Mes" value={liq.id} onChange={(e) => setLiqId(e.target.value)}>
              {liqs.map((l) => <option key={l.id} value={l.id}>{mesLargo(l.periodo)} {l.periodo.slice(0, 4)}</option>)}
            </select>
          </div>
          <div className="cs-imprimir-acc"><BotonImprimir /></div>
          <div className="cs-imprimible"><LiquidacionDoc estado={estado} liq={liq} moneda={config.moneda} privado /></div>
        </section>
      )}
    </>
  );
}

function Espacio({ config, estado, actualizar, ahora, u }: P) {
  const ed = edificio(estado, u.edificioId);
  const dias = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const d = new Date(ahora + (i + 1) * DIA);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }), [ahora]);
  const [dia, setDia] = useState(dias[0]);
  const [turno, setTurno] = useState('');
  const [cobro, setCobro] = useState<'expensa' | 'mercadopago'>('expensa');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const mias = estado.reservas.filter((r) => r.unidadId === u.id && r.estado === 'confirmada' && r.dia >= dias[0]).sort((a, b) => a.dia.localeCompare(b.dia));
  if (!ed.espacio) return <section className="cs-vec-card"><p>Este edificio no tiene espacio común para reservar.</p></section>;
  const esp = ed.espacio;
  return (
    <>
      <section className="cs-vec-card" aria-labelledby="t-esp">
        <h2 id="t-esp">Reservar el {esp.nombre.toLowerCase()}</h2>
        <p className="cs-gris">{esp.reglas} Precio por turno: <strong>{dinero(esp.precio, config.moneda)}</strong>.</p>
        <h3 className="cs-h3">Día</h3>
        <div className="cs-dias" role="group" aria-label="Día">
          {dias.map((d) => {
            const f = new Date(`${d}T12:00:00`);
            const lleno = esp.turnos.every((t) => ocupado(estado, ed.id, d, t));
            return (
              <button key={d} type="button" aria-pressed={dia === d} onClick={() => { setDia(d); setTurno(''); }} disabled={lleno}>
                <small>{f.toLocaleDateString('es-AR', { weekday: 'short' })}</small><strong>{f.getDate()}</strong><small>{lleno ? 'Lleno' : f.toLocaleDateString('es-AR', { month: 'short' })}</small>
              </button>
            );
          })}
        </div>
        <h3 className="cs-h3">Turno</h3>
        <div className="cs-turnos" role="group" aria-label="Turno">
          {esp.turnos.map((t) => {
            const oc = ocupado(estado, ed.id, dia, t);
            return <button key={t} type="button" aria-pressed={turno === t} disabled={oc} onClick={() => setTurno(t)}>{t}{oc ? ' · reservado' : ''}</button>;
          })}
        </div>
        <h3 className="cs-h3">¿Cómo lo pagás?</h3>
        <div className="seg" role="group" aria-label="Cómo lo pagás">
          <button type="button" aria-pressed={cobro === 'expensa'} onClick={() => setCobro('expensa')}>Sumar a mi expensa</button>
          {ed.mp.vinculada && <button type="button" aria-pressed={cobro === 'mercadopago'} onClick={() => setCobro('mercadopago')}>Mercado Pago ahora</button>}
        </div>
        {err && <p className="bar-err" role="alert">{err}</p>}
        {ok && <p className="cs-aviso ok" role="status"><Icono nombre="check" size={16} /> {ok}</p>}
        <button type="button" className="d-btn prim grande" disabled={!turno} onClick={() => {
          const { error } = intentar(actualizar, (e) => reservar(e, u.id, dia, turno, cobro, ahora));
          if (error) return setErr(error);
          setErr('');
          setOk(`Reservado: ${diaYMes(`${dia}T12:00:00`)}, ${turno}. ${cobro === 'expensa' ? 'Se suma a tu próxima expensa.' : 'Pagado con Mercado Pago (simulado).'}`);
          setTurno('');
        }}>Reservar</button>
      </section>
      {mias.length > 0 && (
        <section className="cs-vec-card" aria-labelledby="t-mias">
          <h2 id="t-mias">Tus reservas</h2>
          <ul className="cs-hist">
            {mias.map((r) => (
              <li key={r.id}><span><strong>{diaYMes(`${r.dia}T12:00:00`)} · {r.turno}</strong><small>{r.cobro === 'expensa' ? 'Se suma a la expensa' : 'Pagado con Mercado Pago'}</small></span>
                {!r.cargadaEn && <button type="button" className="d-btn" onClick={() => actualizar((e) => cancelarReserva(e, r.id))}>Cancelar</button>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Avisos({ config, estado, actualizar, ahora, u }: P) {
  const ed = edificio(estado, u.edificioId);
  const coms = estado.comunicados.filter((c) => c.edificioId === ed.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const mios = estado.reclamos.filter((r) => r.unidadId === u.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const [abierto, setAbierto] = useState<string | null>(null);
  const [lugar, setLugar] = useState('');
  const [texto, setTexto] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  return (
    <>
      <section className="cs-vec-card" aria-labelledby="t-coms">
        <h2 id="t-coms">Comunicados</h2>
        <ul className="cs-coms">
          {coms.map((c) => {
            const leido = c.leidos.includes(u.id);
            return (
              <li key={c.id}>
                <button type="button" aria-expanded={abierto === c.id} onClick={() => { setAbierto(abierto === c.id ? null : c.id); if (!leido) actualizar((e) => marcarLeido(e, c.id, u.id)); }}>
                  {!leido && <span className="cs-nuevo">Nuevo</span>}<strong>{c.titulo}</strong><small>{fechaCorta(c.fecha)}</small>
                </button>
                {abierto === c.id && <p>{c.texto}</p>}
              </li>
            );
          })}
          {!coms.length && <li className="cs-gris">No hay comunicados.</li>}
        </ul>
      </section>
      <section className="cs-vec-card" aria-labelledby="t-recl">
        <h2 id="t-recl">Hacer un reclamo</h2>
        <form className="cs-form" onSubmit={(e) => {
          e.preventDefault();
          const { error } = intentar(actualizar, (x) => nuevoReclamo(x, ed.id, lugar, texto, ahora, u.id));
          if (error) return setErr(error);
          setErr(''); setLugar(''); setTexto(''); setOk(true);
        }}>
          <label>¿Dónde?<input className="c-inp" value={lugar} onChange={(e) => { setLugar(e.target.value); setOk(false); }} placeholder="Pasillo 3er piso, ascensor, cochera…" /></label>
          <label>¿Qué pasa?<textarea className="c-inp" rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} /></label>
          {err && <p className="bar-err" role="alert">{err}</p>}
          {ok && <p className="cs-aviso ok" role="status"><Icono nombre="check" size={16} /> Reclamo enviado. Te avisamos cuando esté resuelto.</p>}
          <button type="submit" className="d-btn prim">Enviar reclamo</button>
        </form>
        {mios.length > 0 && (
          <ul className="cs-hist" style={{ marginTop: 12 }}>
            {mios.map((r) => <li key={r.id}><span><strong>{r.lugar}</strong><small>{r.texto}{r.resolucion ? ` · ${r.resolucion}` : ''}</small></span><span className={`cs-chip ${r.estado === 'resuelto' ? 'verde' : ''}`}>{r.estado === 'nuevo' ? 'Recibido' : r.estado === 'asignado' ? 'En curso' : 'Resuelto'}</span></li>)}
          </ul>
        )}
      </section>
      <p className="cs-gris" style={{ textAlign: 'center' }}>
        ¿Consultas? <a href={enlaceWhatsApp(config.whatsapp, `Hola, soy ${u.propietario} (${ed.nombre}, ${u.nombre}).`)} target="_blank" rel="noopener noreferrer">Escribile a la administración por WhatsApp</a>
      </p>
    </>
  );
}
