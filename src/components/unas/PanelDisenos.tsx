'use client';

import { useState } from 'react';
import { Icono } from '@/components/Icono';
import { formatoPrecio } from '@/lib/utiles';
import { abierto, claveDia, deClave, diaCorto, esActivo, hora, inicioDia, nombreDia, sumarDias } from '@/lib/rubros/barberia/agenda';
import type { EstadoAgenda, Turno } from '@/lib/rubros/barberia/tipos';
import {
  AYUDA_CARPETA, CARPETAS, EQUIPO, ESTADO_SENA, FORMAS, NOMBRE_CARPETA, NOMBRE_FORMA, NOMBRE_PATRON, PATRONES,
  agregarAdicional, agregarDiseno, alternarOpinion, alternarVisible, cambiarAdicional, cobroDe, confirmarSena, deQuien, disenoPorId,
  esmaltesPara, formaDe, guardarCobro, masElegidos, precioCita, promedio, quitarAdicional, quitarDiseno, resumenAdicionales,
} from '@/lib/rubros/unas/logica';
import { ESMALTES } from '@/lib/rubros/unas/datos-ejemplo';
import type { Carpeta, Forma, Patron } from '@/lib/rubros/unas/tipos';
import type { ActualizarAgenda } from '@/components/barberia/useBarberia';
import { useAhora } from '@/components/barberia/useBarberia';
import { MuestraUnas } from './MuestraUnas';
import { Estrellas, achicarImagen } from './DisenoCita';

const primer = (n?: string) => n?.split(' ')[0] ?? '';

/** Pestaña "Diseños": lo que hay que preparar por día y el catálogo en tres carpetas. */
export function PanelDisenos({ estado, actualizar, moneda, onTurno }: { estado: EstadoAgenda; actualizar: ActualizarAgenda; moneda: string; onTurno: (t: Turno) => void }) {
  return (
    <>
      <ParaPreparar estado={estado} actualizar={actualizar} moneda={moneda} onTurno={onTurno} />
      <Catalogo estado={estado} actualizar={actualizar} />
    </>
  );
}

/** Lo que cada manicurista tiene que preparar en los próximos días, cita por cita, con la seña. */
function ParaPreparar({ estado, actualizar, moneda, onTurno }: { estado: EstadoAgenda; actualizar: ActualizarAgenda; moneda: string; onTurno: (t: Turno) => void }) {
  const ahora = useAhora();
  const dias = Array.from({ length: 10 }, (_, i) => sumarDias(inicioDia(ahora), i)).filter((d) => abierto(estado.horario, d)).slice(0, 6);
  const [clave, setClave] = useState(() => claveDia(dias[0] ?? ahora));
  const [prof, setProf] = useState<string | null>(null);
  const dia = deClave(clave);
  const esHoy = clave === claveDia(ahora);
  const nd = nombreDia(dia, new Date(ahora));
  const citas = estado.turnos
    .filter((t) => claveDia(t.inicio) === clave && esActivo(t) && t.estado !== 'ausente' && (!prof || t.profId === prof))
    .filter((t) => !esHoy || +new Date(t.fin) > ahora)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const porConfirmar = citas.filter((t) => t.pago?.estadoSena === 'avisada').length;
  const esm = new Map<string, { nombre: string; color: string; n: number }>();
  for (const t of citas) for (const e of esmaltesPara(estado, t.diseno)) esm.set(e.id, { ...e, n: (esm.get(e.id)?.n ?? 0) + 1 });

  return (
    <section className="d-card" aria-labelledby="t-prep">
      <h2 id="t-prep">Para preparar {esHoy ? 'hoy' : nd === 'mañana' ? 'mañana' : `el ${nd}`}</h2>
      <p className="sub">
        {citas.length ? `${citas.length} ${citas.length === 1 ? 'turno' : 'turnos'}${esHoy ? ' que faltan' : ''}.` : 'No hay turnos para este día.'}
        {porConfirmar ? ` ${porConfirmar} ${porConfirmar === 1 ? 'mandó' : 'mandaron'} el comprobante de la seña: revisalo en WhatsApp y confirmalo acá.` : ''}
      </p>
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
            <li key={t.id} className="un-prep-li">
              <button type="button" className="un-prep-fila" onClick={() => onTurno(t)}>
                <span className="un-prep-h">{hora(t.inicio)}</span>
                {d ? <MuestraUnas diseno={{ ...d, forma: forma ?? d.forma }} className="un-muestra mini" titulo={d.nombre} /> : <span className="un-sin" aria-hidden="true"><Icono nombre="chispa" size={18} /></span>}
                <span className="un-prep-txt">
                  <strong>{c?.nombre ?? 'Clienta'}</strong>
                  <small>{s?.nombre} · con {primer(estado.profesionales.find((p) => p.id === t.profId)?.nombre)} · {formatoPrecio(precioCita(estado, t), moneda)}</small>
                  <small className="un-prep-dis">{t.adicionales?.length ? `+ ${resumenAdicionales(estado, t.adicionales)}` : 'Sin adicional'}{d ? ` · foto: ${d.nombre}` : ''}{t.diseno?.nota ? ' · tiene nota' : ''}</small>
                </span>
                {t.pago && t.pago.estadoSena !== 'sin-sena' && <span className={`un-chip-sena ${t.pago.estadoSena}`}>{ESTADO_SENA[t.pago.estadoSena]}</span>}
              </button>
              {t.pago?.estadoSena === 'avisada' && (
                <button type="button" className="d-btn prim un-prep-conf" onClick={() => actualizar((e) => confirmarSena(e, t.id))} aria-label={`Confirmar seña de ${c?.nombre ?? 'la clienta'}`}>
                  <Icono nombre="check" size={16} /> Confirmar seña
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Catalogo({ estado, actualizar }: { estado: EstadoAgenda; actualizar: ActualizarAgenda }) {
  const [msg, setMsg] = useState('');
  const [nuevo, setNuevo] = useState(false);
  const [c, setC] = useState<Carpeta>('salon');
  const fotos = (estado.disenos ?? []).filter((d) => d.carpeta === c).sort((a, b) => b.creado.localeCompare(a.creado));
  const { lista } = masElegidos(estado);
  return (
    <section className="d-card" aria-labelledby="t-cat">
      <div className="ag-cab">
        <div>
          <h2 id="t-cat">Catálogo</h2>
          <p className="sub">Las clientas lo miran en el inicio y, si quieren, marcan una foto como referencia al reservar.</p>
        </div>
        <button type="button" className="d-btn prim" onClick={() => setNuevo((x) => !x)}><Icono nombre="mas" size={18} /> Agregar foto</button>
      </div>
      {nuevo && <NuevaFoto estado={estado} carpetaInicial={c} actualizar={actualizar} onListo={(m, k) => { setMsg(m); setNuevo(false); setC(k); }} />}
      {msg && <p role="status" style={{ fontSize: 14 }}>{msg}</p>}
      <div className="un-carpetas" role="tablist" aria-label="Carpetas">
        {CARPETAS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={c === k} onClick={() => setC(k)}>
            {NOMBRE_CARPETA[k]} <small>{(estado.disenos ?? []).filter((d) => d.carpeta === k && d.visible).length}</small>
          </button>
        ))}
      </div>
      <p className="un-carpeta-ayuda">{AYUDA_CARPETA[c]}</p>
      {fotos.length ? (
        <ul className="un-cat">
          {fotos.map((d) => {
            const n = lista.find((x) => x.d.id === d.id)?.n ?? 0;
            return (
              <li key={d.id} data-oculto={d.visible ? undefined : '1'}>
                <MuestraUnas diseno={d} titulo={d.nombre} />
                <strong>{d.nombre}</strong>
                <small>{d.carpeta === 'salon' ? deQuien(estado, d) : NOMBRE_PATRON[d.patron]}{d.foto ? ' · foto propia' : ''}</small>
                <small>{n ? `Elegida en ${n} ${n === 1 ? 'turno' : 'turnos'} (4 semanas)` : 'Sin elegir todavía'}</small>
                {d.pin && <a href={d.pin} target="_blank" rel="noopener noreferrer nofollow" className="un-pin" style={{ fontSize: 13 }}><Icono nombre="enlace" size={14} /> Pin original</a>}
                <span className="un-cat-acc">
                  <button type="button" className="d-btn" onClick={() => { const err = actualizar((e) => alternarVisible(e, d.id)); setMsg(err ?? (d.visible ? `"${d.nombre}" ya no se muestra.` : `"${d.nombre}" vuelve a mostrarse.`)); }} aria-label={`${d.visible ? 'Ocultar' : 'Mostrar'} ${d.nombre}`}>
                    <Icono nombre={d.visible ? 'ojoNo' : 'ojo'} size={16} /> {d.visible ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button type="button" className="d-btn peligro" aria-label={`Quitar ${d.nombre}`} onClick={() => { if (!window.confirm(`¿Quitar "${d.nombre}" del catálogo?`)) return; const err = actualizar((e) => quitarDiseno(e, d.id)); setMsg(err ?? `"${d.nombre}" salió del catálogo. Los turnos que ya la eligieron la conservan.`); }}>
                    <Icono nombre="basura" size={16} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : <p className="sub">Todavía no hay fotos en esta carpeta.</p>}
    </section>
  );
}

function NuevaFoto({ estado, carpetaInicial, actualizar, onListo }: { estado: EstadoAgenda; carpetaInicial: Carpeta; actualizar: ActualizarAgenda; onListo: (msg: string, c: Carpeta) => void }) {
  const [nombre, setNombre] = useState('');
  const [carp, setCarp] = useState<Carpeta>(carpetaInicial);
  const [autora, setAutora] = useState(estado.profesionales[0]?.id ?? EQUIPO);
  const [foto, setFoto] = useState<string | undefined>();
  const [pin, setPin] = useState('');
  const [patron, setPatron] = useState<Patron>('liso');
  const [forma, setForma] = useState<Forma>('almendra');
  const [esm, setEsm] = useState<string[]>(['nude']);
  const [err, setErr] = useState('');
  const [cargando, setCargando] = useState(false);
  return (
    <form
      className="un-nuevo"
      onSubmit={(e) => {
        e.preventDefault();
        let fallo = '';
        const error = actualizar((x) => {
          const r = agregarDiseno(x, { nombre, carpeta: carp, autora: carp === 'salon' ? autora : undefined, patron, forma, esmaltes: esm, foto, pin });
          if ('error' in r) {
            fallo = r.error;
            return x;
          }
          return r.estado;
        });
        if (fallo || error) return setErr(fallo || error!);
        onListo(`"${nombre.trim()}" ya está en ${NOMBRE_CARPETA[carp]}.`, carp);
      }}
    >
      <div className="un-nuevo-vista">
        <MuestraUnas diseno={{ patron, forma, esmaltes: esm.length ? esm : ['nude'], foto }} titulo="Vista previa" className="un-muestra grande" />
        <label className="d-btn un-subir" style={{ marginTop: 8 }}>
          <Icono nombre="subir" size={16} /> {cargando ? 'Achicando…' : foto ? 'Cambiar foto' : 'Subir foto'}
          <input type="file" accept="image/*" className="sr-only" aria-label="Subir foto del diseño" onChange={async (ev) => {
            const f = ev.target.files?.[0];
            ev.target.value = '';
            if (!f) return;
            setCargando(true);
            try { setFoto(await achicarImagen(f)); setErr(''); } catch (er) { setErr(er instanceof Error ? er.message : 'No pudimos usar esa foto.'); } finally { setCargando(false); }
          }} />
        </label>
        {foto && <button type="button" className="bar-link" onClick={() => setFoto(undefined)}>Quitar foto (usar ilustración)</button>}
      </div>
      <div className="un-nuevo-campos">
        <label>Carpeta
          <select className="c-inp" value={carp} onChange={(e) => setCarp(e.target.value as Carpeta)}>
            {CARPETAS.map((k) => <option key={k} value={k}>{NOMBRE_CARPETA[k]}</option>)}
          </select>
        </label>
        <label>Nombre<input className="c-inp" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Francesa con brillo" /></label>
        {carp === 'salon' && (
          <label>Quién lo hizo
            <select className="c-inp" value={autora} onChange={(e) => setAutora(e.target.value)}>
              {estado.profesionales.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              <option value={EQUIPO}>El salón</option>
            </select>
          </label>
        )}
        {carp === 'inspiracion' && (
          <label>Enlace del pin (opcional)
            <input className="c-inp" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="https://pin.it/…" inputMode="url" />
            <span className="bar-ayuda">Subí solo fotos propias o con permiso; de las ajenas, guardá el enlace al pin.</span>
          </label>
        )}
        {!foto && (
          <>
            <label>Estilo de la ilustración
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
              <legend>Esmaltes (hasta 3: base, detalle, acento)</legend>
              {ESMALTES.map((x) => {
                const i = esm.indexOf(x.id);
                return (
                  <button key={x.id} type="button" aria-pressed={i >= 0} onClick={() => setEsm((a) => (i >= 0 ? a.filter((y) => y !== x.id) : a.length >= 3 ? a : [...a, x.id]))}>
                    <i style={{ background: x.color }} aria-hidden="true" />{x.nombre}{i >= 0 ? ` (${i + 1})` : ''}
                  </button>
                );
              })}
            </fieldset>
          </>
        )}
        {err && <p className="bar-err" role="alert">{err}</p>}
        <button type="submit" className="d-btn prim">Guardar en el catálogo</button>
      </div>
    </form>
  );
}

/** Pestaña "Precios y seña": la lista opcional de diseños adicionales y cómo se cobra la seña. */
export function PanelPrecios({ estado, actualizar, moneda }: { estado: EstadoAgenda; actualizar: ActualizarAgenda; moneda: string }) {
  const cobro = cobroDe(estado);
  const [msg, setMsg] = useState('');
  const [errCobro, setErrCobro] = useState('');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [desc, setDesc] = useState('');
  const [errAd, setErrAd] = useState('');
  const { adicionales: usados } = masElegidos(estado);
  const set = (cambio: Partial<typeof cobro>) => {
    let fallo = '';
    const err = actualizar((e) => {
      const r = guardarCobro(e, { ...cobroDe(e), ...cambio });
      if ('error' in r) {
        fallo = r.error;
        return e;
      }
      return r.estado;
    });
    setErrCobro(fallo || err || '');
    return !(fallo || err);
  };
  return (
    <>
      <section className="d-card" aria-labelledby="t-ad">
        <div className="ag-cab">
          <div>
            <h2 id="t-ad">Diseños adicionales</h2>
            <p className="sub">La lista de precios que aparece al reservar: &quot;¿Querés agregar un diseño?&quot;. Es opcional.</p>
          </div>
          <label className="un-switch">
            <input type="checkbox" checked={cobro.usarAdicionales} onChange={(e) => { if (set({ usarAdicionales: e.target.checked })) setMsg(e.target.checked ? 'Las clientas ven la lista de adicionales al reservar.' : 'La lista de adicionales ya no aparece al reservar.'); }} />
            Mostrar la lista al reservar
          </label>
        </div>
        {msg && <p role="status" style={{ fontSize: 14 }}>{msg}</p>}
        <ul className="un-ad-panel" data-apagada={cobro.usarAdicionales ? undefined : '1'}>
          {(estado.adicionales ?? []).map((a) => {
            const n = usados.find((x) => x.a.id === a.id)?.n ?? 0;
            return (
              <li key={a.id}>
                <span className="un-ad-txt"><strong>{a.nombre}</strong><small>{a.descripcion || '—'} · {n ? `${n} en 4 semanas` : 'sin pedidos todavía'}</small></span>
                <label className="un-ad-precio-in">
                  <span className="sr-only">Precio de {a.nombre}</span>
                  <input className="c-inp" inputMode="numeric" defaultValue={a.precio} onBlur={(e) => { const v = Number(e.target.value.replace(/\D/g, '')); if (v && v !== a.precio) { actualizar((x) => cambiarAdicional(x, a.id, { precio: v })); setMsg(`${a.nombre}: ahora ${formatoPrecio(v, moneda)}.`); } }} />
                </label>
                <label className="un-switch chico"><input type="checkbox" checked={a.activo} onChange={(e) => actualizar((x) => cambiarAdicional(x, a.id, { activo: e.target.checked }))} /> Activo</label>
                <button type="button" className="d-btn peligro" aria-label={`Quitar ${a.nombre}`} onClick={() => { if (window.confirm(`¿Quitar "${a.nombre}" de la lista?`)) actualizar((x) => quitarAdicional(x, a.id)); }}><Icono nombre="basura" size={16} /></button>
              </li>
            );
          })}
        </ul>
        <form
          className="un-ad-nuevo"
          onSubmit={(e) => {
            e.preventDefault();
            let fallo = '';
            const err = actualizar((x) => {
              const r = agregarAdicional(x, nombre, Number(precio.replace(/\D/g, '')), desc);
              if ('error' in r) {
                fallo = r.error;
                return x;
              }
              return r.estado;
            });
            if (fallo || err) return setErrAd(fallo || err!);
            setMsg(`"${nombre.trim()}" está en la lista.`);
            setNombre(''); setPrecio(''); setDesc(''); setErrAd('');
          }}
        >
          <label>Nuevo adicional<input className="c-inp" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Muñequitos" /></label>
          <label>Precio<input className="c-inp" value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="numeric" /></label>
          <label>Descripción (opcional)<input className="c-inp" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Personajes pintados a mano" /></label>
          <button type="submit" className="d-btn prim">Agregar</button>
          {errAd && <p className="bar-err" role="alert">{errAd}</p>}
        </form>
      </section>

      <section className="d-card" aria-labelledby="t-cobro">
        <h2 id="t-cobro">Seña</h2>
        <p className="sub">Sin pasarela: la clienta ve el alias, paga la seña y manda el comprobante por WhatsApp. Vos la confirmás en &quot;Para preparar&quot;.</p>
        <form
          className="un-cobro"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (set({ medio: String(f.get('medio')), alias: String(f.get('alias')), titular: String(f.get('titular')), enlace: String(f.get('enlace')), senaPct: Number(f.get('pct')) })) setMsg('Datos de la seña guardados.');
          }}
        >
          <label>Medio de pago<input name="medio" className="c-inp" defaultValue={cobro.medio} placeholder="Mercado Pago" /></label>
          <label>Alias<input name="alias" className="c-inp" defaultValue={cobro.alias} placeholder="tu.salon.mp" /></label>
          <label>A nombre de<input name="titular" className="c-inp" defaultValue={cobro.titular} /></label>
          <label>Enlace de pago (opcional)<input name="enlace" className="c-inp" defaultValue={cobro.enlace ?? ''} placeholder="https://mpago.la/…" inputMode="url" /></label>
          <label>Seña (% del total, 0 = sin seña)<input name="pct" type="number" min={0} max={100} className="c-inp" defaultValue={cobro.senaPct} /></label>
          {errCobro && <p className="bar-err" role="alert">{errCobro}</p>}
          <button type="submit" className="d-btn prim">Guardar seña</button>
        </form>
      </section>
    </>
  );
}

/** Pestaña "Opiniones": lo que se muestra en el inicio. */
export function PanelOpiniones({ estado, actualizar }: { estado: EstadoAgenda; actualizar: ActualizarAgenda }) {
  const ops = [...(estado.opiniones ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const vis = ops.filter((o) => o.visible);
  return (
    <section className="d-card" aria-labelledby="t-ops">
      <h2 id="t-ops">Opiniones</h2>
      <p className="sub">
        {vis.length ? <>Promedio {promedio(vis).toLocaleString('es-AR')} <Estrellas n={promedio(vis)} tam={14} /> con {vis.length} a la vista. </> : null}
        Las clientas opinan desde el enlace de su turno, después de la cita. Podés ocultar las que no quieras mostrar.
      </p>
      <ul className="un-ops-panel">
        {ops.map((o) => (
          <li key={o.id} data-oculto={o.visible ? undefined : '1'}>
            <div>
              <Estrellas n={o.estrellas} tam={14} /> <strong>{o.nombre}</strong> <small>{new Date(o.fecha).toLocaleDateString('es-AR')}{o.ejemplo ? ' · de ejemplo' : ''}</small>
              {o.texto && <p>“{o.texto}”</p>}
            </div>
            <button type="button" className="d-btn" onClick={() => actualizar((e) => alternarOpinion(e, o.id))} aria-label={`${o.visible ? 'Ocultar' : 'Mostrar'} la opinión de ${o.nombre}`}>
              <Icono nombre={o.visible ? 'ojoNo' : 'ojo'} size={16} /> {o.visible ? 'Ocultar' : 'Mostrar'}
            </button>
          </li>
        ))}
      </ul>
      {!ops.length && <p className="sub">Todavía no hay opiniones.</p>}
    </section>
  );
}
