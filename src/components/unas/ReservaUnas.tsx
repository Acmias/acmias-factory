'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp, formatoPrecio, soloDigitos } from '@/lib/utiles';
import { abierto, claveDia, deClave, diaCorto, fechaCorta, hora, huecos, inicioDia, nombreDia, proximoConLugar, sumarDias, type Hueco } from '@/lib/rubros/barberia/agenda';
import { mensajeAlLocal, mensajeConfirmacion, reservar } from '@/lib/rubros/barberia/logica';
import type { EstadoAgenda, Servicio, Turno } from '@/lib/rubros/barberia/tipos';
import { adicionalesVisibles, avisarComprobante, cobroDe, limpiarEleccion, montoSena, pagoInicial, precioCita, resumenDiseno } from '@/lib/rubros/unas/logica';
import type { EleccionDiseno, FormaPago } from '@/lib/rubros/unas/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { Horarios, ListaEspera } from '@/components/barberia/Reserva';
import { useAhora, useDemoBarberia, type ActualizarAgenda } from '@/components/barberia/useBarberia';
import { DetalleCita, Galeria } from './DisenoCita';
import { CatalogoYOpiniones } from './InicioSalon';

type Paso = 0 | 1 | 2 | 3 | 4 | 5;
const PASOS = ['Servicio', 'Diseño', 'Foto', 'Día y hora', 'Confirmar'];
const primer = (n?: string) => n?.split(' ')[0] ?? '';

/**
 * Salón de uñas (BRD 13). Inicio con el catálogo y las opiniones; después la reserva:
 * servicio (con precio) → diseño adicional (opcional) → foto de referencia (opcional) → día y hora → seña y WhatsApp.
 */
export function ReservaUnas({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoBarberia(slug);
  const ahora = useAhora();
  const [paso, setPaso] = useState<Paso>(0);
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [adicionales, setAdicionales] = useState<string[]>([]);
  const [eleccion, setEleccion] = useState<EleccionDiseno>({});
  const [profId, setProfId] = useState<string | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [hueco, setHueco] = useState<Hueco | null>(null);
  const [hecho, setHecho] = useState<Turno | null>(null);
  const [espera, setEspera] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const arriba = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const servicio = estado?.servicios.find((s) => s.id === servicioId) ?? null;
  const dias = useMemo(() => Array.from({ length: 14 }, (_, i) => sumarDias(inicioDia(ahora), i)), [ahora]);
  const diaElegido = useMemo(() => {
    if (!estado || !servicio) return null;
    if (dia) return deClave(dia);
    return proximoConLugar(estado, servicio, profId, new Date(ahora), ahora) ?? dias.find((d) => abierto(estado.horario, d)) ?? dias[0];
  }, [estado, servicio, dia, profId, ahora, dias]);
  const libres = useMemo(() => (estado && servicio && diaElegido ? huecos(estado, servicio, profId, diaElegido, ahora) : []), [estado, servicio, profId, diaElegido, ahora]);

  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const extras = adicionalesVisibles(estado);

  /** Pasos que se saltean: sin lista de adicionales, o servicios sin diseño (retiro). */
  const salta = (n: Paso, s: Servicio | null = servicio) => (n === 2 && (!s?.diseno || !extras.length)) || (n === 3 && !s?.diseno);

  function ir(n: Paso, s: Servicio | null = servicio, atras = false) {
    let k = n;
    while (k > 0 && k < 5 && salta(k, s)) k = (k + (atras ? -1 : 1)) as Paso;
    setPaso(k);
    requestAnimationFrame(() => arriba.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function reiniciar() {
    setHecho(null); setHueco(null); setDia(null); setServicioId(null); setProfId(null); setAdicionales([]); setEleccion({});
    setPaso(0);
    requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  }

  if (hecho) return <Lista config={config} estado={estado} turno={hecho} slug={slug} estilo={estilo} actualizar={actualizar} otra={reiniciar} />;

  const manana = libres.filter((h) => new Date(h.inicio).getHours() < 13);
  const tarde = libres.filter((h) => new Date(h.inicio).getHours() >= 13);
  const proximo = servicio && diaElegido && !libres.length ? proximoConLugar(estado, servicio, profId, sumarDias(diaElegido, 1), ahora) : null;
  const profs = servicio ? estado.profesionales.filter((x) => x.servicios.includes(servicio.id)) : [];
  const total = servicio ? precioCita(estado, { servicioId: servicio.id, adicionales }) : 0;
  const visibles = PASOS.map((t, i) => ({ t, n: (i + 1) as Paso })).filter((x) => !salta(x.n));

  return (
    <div className="bar un" style={estilo}>
      <AvisoDemo texto="Manicuristas, diseños, opiniones y precios de ejemplo" />
      <header className="bar-hero un-hero">
        <div className="bar-hero-in">
          {config.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logo} alt="" className="bar-logo" />
          ) : (
            <span className="bar-logo bar-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
          )}
          <h1>{config.negocio}</h1>
          <p>{paso === 0 ? 'Mirá nuestros diseños y reservá tu turno en un minuto.' : 'Elegí el servicio, tu diseño y el horario.'}</p>
          <Horarios estado={estado} />
          {paso === 0 && <button type="button" className="bar-btn prim grande un-hero-btn" onClick={() => ir(1)}><Icono nombre="calendario" size={18} /> Reservar turno</button>}
        </div>
      </header>

      {paso > 0 && (
        <div ref={arriba} className="bar-pasos un-pasos" aria-label="Pasos de la reserva">
          {visibles.map(({ t, n }, i) => (
            <button key={t} type="button" className="bar-paso" aria-current={paso === n ? 'step' : undefined} data-hecho={paso > n ? '1' : undefined} disabled={n > paso} onClick={() => ir(n, servicio, true)}>
              <span className="bar-paso-n">{paso > n ? <Icono nombre="check" size={14} /> : i + 1}</span>
              {t}
            </button>
          ))}
        </div>
      )}

      <main className="bar-main">
        {paso === 0 && (
          <>
            <CatalogoYOpiniones estado={estado} />
            <div className="un-seguir"><button type="button" className="bar-btn prim grande" onClick={() => ir(1)}>Reservar turno</button></div>
          </>
        )}

        {paso === 1 && (
          <section aria-labelledby="t-serv" className="bar-anim">
            <h2 id="t-serv" className="bar-h2">¿Qué te hacés?</h2>
            <ul className="bar-servicios">
              {estado.servicios.map((s, i) => (
                <li key={s.id} style={{ '--i': i } as React.CSSProperties}>
                  <button
                    type="button"
                    className="bar-serv"
                    aria-pressed={s.id === servicioId}
                    aria-label={`${s.nombre}, ${s.duracion} minutos, ${p(s.precio)}`}
                    onClick={() => {
                      setServicioId(s.id);
                      setDia(null);
                      setHueco(null);
                      if (!s.diseno) {
                        setAdicionales([]);
                        setEleccion({});
                      }
                      setProfId((x) => (x && estado.profesionales.find((pr) => pr.id === x)?.servicios.includes(s.id) ? x : null));
                      ir(2, s);
                    }}
                  >
                    <span className="bar-serv-dur"><strong>{s.duracion}</strong>min</span>
                    <span className="bar-serv-txt">
                      <span className="bar-serv-nom">{s.nombre}</span>
                      <span className="bar-serv-desc">{s.descripcion}</span>
                    </span>
                    <span className="bar-serv-precio">{p(s.precio)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {paso === 2 && servicio && (
          <section aria-labelledby="t-ad" className="bar-anim">
            <h2 id="t-ad" className="bar-h2">¿Querés agregar un diseño?</h2>
            <p className="bar-ayuda" style={{ marginTop: -6 }}>Es opcional. Se suma al precio de {servicio.nombre.toLowerCase()} ({p(servicio.precio)}).</p>
            <ul className="un-adicionales" role="group" aria-label="Diseños adicionales">
              {extras.map((a) => {
                const sel = adicionales.includes(a.id);
                return (
                  <li key={a.id}>
                    <button type="button" className="un-adicional" aria-pressed={sel} onClick={() => setAdicionales((x) => (sel ? x.filter((y) => y !== a.id) : [...x, a.id]))}>
                      <span className="un-check" aria-hidden="true">{sel && <Icono nombre="check" size={14} />}</span>
                      <span className="un-ad-txt"><strong>{a.nombre}</strong>{a.descripcion && <small>{a.descripcion}</small>}</span>
                      <span className="un-ad-precio">+ {p(a.precio)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="un-seguir">
              <p aria-live="polite">Total: <strong>{p(total)}</strong>{adicionales.length ? ` · ${adicionales.length} ${adicionales.length === 1 ? 'adicional' : 'adicionales'}` : ''}</p>
              <button type="button" className="bar-btn prim grande" onClick={() => ir(3)}>{adicionales.length ? 'Seguir' : 'No, sin diseño adicional'}</button>
            </div>
          </section>
        )}

        {paso === 3 && servicio && (
          <section aria-labelledby="t-foto" className="bar-anim">
            <h2 id="t-foto" className="bar-h2">¿Querés usar alguna de nuestras ideas?</h2>
            <p className="bar-ayuda" style={{ marginTop: -6 }}>Es opcional. Marcá una foto como referencia y la manicurista la ve en tu turno.</p>
            <Galeria estado={estado} elegido={eleccion.disenoId} onElegir={(id) => setEleccion((x) => ({ ...x, disenoId: x.disenoId === id ? undefined : id }))} />
            <label className="un-nota-in">¿Algo más que tengamos que saber? (opcional)
              <textarea className="c-inp" rows={2} maxLength={280} value={eleccion.nota ?? ''} onChange={(e) => setEleccion((x) => ({ ...x, nota: e.target.value }))} placeholder="Largo, colores, si es para un evento…" />
            </label>
            <div className="un-seguir">
              <p aria-live="polite">{eleccion.disenoId ? <><strong>Foto:</strong> {resumenDiseno(estado, eleccion)}</> : 'Si no marcás ninguna, lo charlan en el local.'}</p>
              <div className="un-seguir-btns">
                {eleccion.disenoId && <button type="button" className="bar-btn" onClick={() => setEleccion((x) => ({ ...x, disenoId: undefined }))}>Quitar foto</button>}
                <button type="button" className="bar-btn prim grande" onClick={() => ir(4)}>{eleccion.disenoId ? 'Seguir' : 'No, otro / sin foto'}</button>
              </div>
            </div>
          </section>
        )}

        {paso === 4 && servicio && diaElegido && (
          <section aria-labelledby="t-hora" className="bar-anim">
            <h2 id="t-hora" className="bar-h2">{servicio.nombre} <span>{servicio.duracion} min · {p(total)}</span></h2>
            {profs.length > 1 && (
              <>
                <h3 className="bar-h3">¿Con quién?</h3>
                <div className="ag-profs un-con" role="group" aria-label="Con quién">
                  <button type="button" aria-pressed={!profId} onClick={() => { setProfId(null); setDia(null); setHueco(null); }}>Cualquiera</button>
                  {profs.map((x) => <button key={x.id} type="button" aria-pressed={profId === x.id} onClick={() => { setProfId(x.id); setDia(null); setHueco(null); }}>{primer(x.nombre)}</button>)}
                </div>
              </>
            )}
            <h3 className="bar-h3">¿Qué día?</h3>
            <div className="bar-dias" role="group" aria-label="Día">
              {dias.map((d) => {
                const cerrado = !abierto(estado.horario, d);
                const n = cerrado ? 0 : huecos(estado, servicio, profId, d, ahora).length;
                const sel = claveDia(d) === claveDia(diaElegido);
                return (
                  <button key={claveDia(d)} type="button" className="bar-dia" aria-pressed={sel} disabled={cerrado} onClick={() => { setDia(claveDia(d)); setHueco(null); }} aria-label={`${nombreDia(d, new Date(ahora))}${cerrado ? ', cerrado' : n ? `, ${n} horarios` : ', sin lugar'}`}>
                    <span className="bar-dia-s">{claveDia(d) === claveDia(ahora) ? 'Hoy' : diaCorto(d)}</span>
                    <strong>{d.getDate()}</strong>
                    <span className={`bar-dia-lugar${cerrado ? ' cerrado' : n === 0 ? ' lleno' : n < 5 ? ' pocos' : ''}`}>{cerrado ? 'Cerrado' : n === 0 ? 'Lleno' : n < 5 ? 'Pocos' : 'Libre'}</span>
                  </button>
                );
              })}
            </div>
            <h3 className="bar-h3">¿A qué hora? · {nombreDia(diaElegido, new Date(ahora))}</h3>
            {libres.length === 0 ? (
              <div className="bar-sinlugar">
                <p><strong>No quedan horarios este día.</strong> Anotate y te avisamos por WhatsApp si alguien cancela.</p>
                <div className="bar-acciones">
                  <button type="button" className="bar-btn prim" onClick={() => setEspera(true)}>Anotarme en la lista de espera</button>
                  {proximo && <button type="button" className="bar-btn" onClick={() => setDia(claveDia(proximo))}>Ver el {nombreDia(proximo, new Date(ahora))}</button>}
                </div>
              </div>
            ) : (
              <>
                {([['Mañana', manana], ['Tarde', tarde]] as const).map(([t, l]) =>
                  l.length ? (
                    <div key={t} className="bar-franja">
                      <span className="bar-franja-t">{t}</span>
                      <div className="bar-horas" role="group" aria-label={`Horarios de la ${t.toLowerCase()}`}>
                        {l.map((h) => (
                          <button key={`${h.inicio}-${h.profId}`} type="button" className="bar-hora" aria-pressed={hueco?.inicio === h.inicio} onClick={() => { setHueco(h); ir(5); }}>
                            {hora(new Date(h.inicio))}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
                <button type="button" className="bar-link" onClick={() => setEspera(true)}>¿No te sirve ningún horario? Anotate en la lista de espera</button>
              </>
            )}
          </section>
        )}

        {paso === 5 && servicio && hueco && (
          <Confirmar
            config={config}
            estado={estado}
            servicio={servicio}
            hueco={hueco}
            adicionales={servicio.diseno ? adicionales : []}
            eleccion={servicio.diseno ? eleccion : {}}
            actualizar={actualizar}
            onListo={(t) => setHecho(t)}
            onOcupado={(msg) => { setToast(msg); setHueco(null); ir(4, servicio, true); }}
          />
        )}
        <p className="c-pie">{config.direccion ? `${config.direccion}. ` : ''}Hecho con ACMIAS.</p>
      </main>

      {espera && servicio && diaElegido && (
        <ListaEspera
          estado={estado}
          servicio={servicio}
          profId={profId}
          dia={diaElegido}
          actualizar={actualizar}
          onCerrar={() => setEspera(false)}
          onListo={() => { setEspera(false); setToast('Listo, te avisamos por WhatsApp si se libera un lugar.'); }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check"><Icono nombre="check" size={16} /></span>
          {toast}
        </div>
      )}
    </div>
  );
}

/** Datos de la seña: monto, alias para copiar y enlace de pago si la dueña lo cargó. */
export function DatosSena({ estado, monto, moneda }: { estado: EstadoAgenda; monto: number; moneda: string }) {
  const c = cobroDe(estado);
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="un-sena">
      <p className="un-sena-monto">Seña: <strong>{formatoPrecio(monto, moneda)}</strong> <small>por {c.medio}</small></p>
      {c.alias && (
        <div className="un-alias">
          <span>Alias <strong>{c.alias}</strong>{c.titular ? <small> · a nombre de {c.titular}</small> : null}</span>
          <button
            type="button"
            className="bar-btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(c.alias);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              } catch {
                setCopiado(false);
              }
            }}
          >
            <Icono nombre={copiado ? 'check' : 'texto'} size={16} /> {copiado ? 'Copiado' : 'Copiar alias'}
          </button>
        </div>
      )}
      {c.enlace && <a className="bar-btn" href={c.enlace} target="_blank" rel="noopener noreferrer"><Icono nombre="enlace" size={16} /> Pagar con {c.medio}</a>}
    </div>
  );
}

function Confirmar({ config, estado, servicio, hueco, adicionales, eleccion, actualizar, onListo, onOcupado }: {
  config: DemoConfig;
  estado: EstadoAgenda;
  servicio: Servicio;
  hueco: Hueco;
  adicionales: string[];
  eleccion: EleccionDiseno;
  actualizar: ActualizarAgenda;
  onListo: (t: Turno) => void;
  onOcupado: (msg: string) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [wa, setWa] = useState('');
  const [forma, setForma] = useState<FormaPago | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const c = cobroDe(estado);
  const prof = estado.profesionales.find((x) => x.id === hueco.profId)!;
  const total = precioCita(estado, { servicioId: servicio.id, adicionales });
  const sena = montoSena(estado, total);
  const conocida = soloDigitos(wa).length >= 8 ? estado.clientes.find((x) => x.whatsapp === soloDigitos(wa)) : undefined;

  function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (nombre.trim().length < 2) e.nombre = 'Escribí tu nombre.';
    if (soloDigitos(wa).length < 8) e.wa = 'Escribí tu WhatsApp con código de área (ej.: 11 5555 1234).';
    if (!forma) e.forma = 'Elegí cómo vas a pagar.';
    const limpia = limpiarEleccion(estado, eleccion);
    if ('error' in limpia) e.general = limpia.error;
    setErr(e);
    if (Object.keys(e).length || 'error' in limpia || !forma) return;
    let turno: Turno | null = null;
    let ocupado = '';
    const error = actualizar((x) => {
      const r = reservar(x, { servicioId: servicio.id, profId: hueco.profId, inicio: hueco.inicio, nombre, whatsapp: wa, origen: 'online', diseno: limpia.eleccion, adicionales, pago: pagoInicial(x, total, forma) });
      if ('error' in r) {
        ocupado = r.error;
        return x;
      }
      turno = r.turno;
      return r.estado;
    });
    if (ocupado) return onOcupado(ocupado);
    if (error) return setErr({ general: error });
    if (turno) onListo(turno);
  }

  return (
    <section aria-labelledby="t-datos" className="bar-anim">
      <h2 id="t-datos" className="bar-h2">Confirmá tu turno</h2>
      <div className="bar-resumen">
        <div className="bar-resumen-fecha">
          <span>{diaCorto(new Date(hueco.inicio))}</span>
          <strong>{new Date(hueco.inicio).getDate()}</strong>
          <span>{fechaCorta(new Date(hueco.inicio)).split(' ')[1]}</span>
        </div>
        <div>
          <strong>{servicio.nombre}</strong>
          <span>{hora(new Date(hueco.inicio))} h · {servicio.duracion} min · con {prof.nombre}</span>
        </div>
      </div>
      <div className="un-conf-dis">
        <DetalleCita estado={estado} cita={{ servicioId: servicio.id, adicionales, diseno: eleccion }} moneda={config.moneda} />
      </div>
      <form onSubmit={enviar} noValidate className="bar-form">
        <label>Tu nombre
          <input className="c-inp" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" aria-invalid={!!err.nombre} aria-describedby={err.nombre ? 'e-nom' : undefined} />
          {err.nombre && <span id="e-nom" className="bar-err">{err.nombre}</span>}
        </label>
        <label>Tu WhatsApp
          <input className="c-inp" value={wa} onChange={(e) => setWa(e.target.value)} inputMode="tel" autoComplete="tel" aria-invalid={!!err.wa} aria-describedby={err.wa ? 'e-wa' : 'a-wa'} />
          {err.wa ? <span id="e-wa" className="bar-err">{err.wa}</span> : <span id="a-wa" className="bar-ayuda">Ahí te llega la confirmación y el recordatorio.</span>}
        </label>
        {conocida && <p className="bar-hola">¡Hola de nuevo, {primer(conocida.nombre)}! Llevás {conocida.sellos} de {estado.metaSellos} sellos.</p>}
        <fieldset className="un-forma-pago">
          <legend>¿Cómo pagás {sena ? 'el resto ' : ''}en el local?</legend>
          <div className="seg" role="group" aria-label="Forma de pago">
            <button type="button" aria-pressed={forma === 'efectivo'} onClick={() => setForma('efectivo')}>Efectivo</button>
            <button type="button" aria-pressed={forma === 'medio'} onClick={() => setForma('medio')}>{c.medio}</button>
          </div>
          {err.forma && <span id="e-forma" className="bar-err">{err.forma}</span>}
        </fieldset>
        {sena > 0 && (
          <div className="un-sena-aviso">
            <Icono nombre="info" size={18} />
            <p>Para guardar tu lugar se paga una <strong>seña de {formatoPrecio(sena, config.moneda)}</strong> por {c.medio}, pagues como pagues el resto. Al reservar te mostramos el alias y mandás el comprobante por WhatsApp.</p>
          </div>
        )}
        {err.general && <p className="bar-err" role="alert">{err.general}</p>}
        <button type="submit" className="bar-btn prim grande">Reservar turno</button>
      </form>
    </section>
  );
}

function Lista({ config, estado, turno, slug, estilo, actualizar, otra }: { config: DemoConfig; estado: EstadoAgenda; turno: Turno; slug: string; estilo?: React.CSSProperties; actualizar: ActualizarAgenda; otra: () => void }) {
  const actual = estado.turnos.find((t) => t.id === turno.id) ?? turno;
  const c = estado.clientes.find((x) => x.id === actual.clienteId)!;
  const s = estado.servicios.find((x) => x.id === actual.servicioId)!;
  const pr = estado.profesionales.find((x) => x.id === actual.profId)!;
  const enlace = typeof window !== 'undefined' ? `${window.location.origin}/d/${slug}/turno/${actual.token}` : '';
  const ctx = { negocio: config.negocio, moneda: config.moneda, direccion: config.direccion, enlaceTurno: enlace };
  const sena = actual.pago?.sena ?? 0;
  const avisada = actual.pago?.estadoSena === 'avisada' || actual.pago?.estadoSena === 'confirmada';
  const wa = enlaceWhatsApp(config.whatsapp, mensajeAlLocal(estado, actual, c, ctx));
  return (
    <div className="bar un" style={estilo}>
      <AvisoDemo texto="Manicuristas, diseños, opiniones y precios de ejemplo" />
      <main className="bar-main bar-listo">
        <div className="bar-sello" aria-hidden="true"><Icono nombre="check" size={40} /></div>
        <h1>{sena && !avisada ? '¡Turno reservado! Falta la seña' : '¡Turno reservado!'}</h1>
        <p className="bar-listo-sub">{s.nombre} con {pr.nombre}, {nombreDia(actual.inicio)} a las {hora(actual.inicio)} h.</p>

        {sena > 0 && (
          <section className="un-conf-dis izq un-paso-final" aria-labelledby="t-sena">
            <h2 id="t-sena" className="bar-h3" style={{ marginTop: 0 }}>{avisada ? 'Comprobante enviado' : 'Último paso: pagá la seña y mandá el comprobante'}</h2>
            {!avisada && <DatosSena estado={estado} monto={sena} moneda={config.moneda} />}
            <a className="bar-btn prim grande" href={wa} target="_blank" rel="noopener noreferrer" onClick={() => actualizar((e) => avisarComprobante(e, actual.id))}>
              <Icono nombre="whatsapp" size={18} /> {avisada ? 'Volver a mandar el comprobante' : 'Mandar comprobante por WhatsApp'}
            </a>
            <p className="bar-ayuda" style={{ margin: '8px 0 0' }}>Adjuntá la captura del pago en el chat. Cuando el salón la vea, tu turno queda confirmado.</p>
          </section>
        )}

        <section className="un-conf-dis izq" aria-labelledby="t-tudis">
          <h2 id="t-tudis" className="bar-h3" style={{ marginTop: 0 }}>Tu turno</h2>
          <DetalleCita estado={estado} cita={actual} moneda={config.moneda} />
        </section>
        <figure className="bar-wa">
          <figcaption>Te llega este WhatsApp <small>(en la demo lo mostramos acá)</small></figcaption>
          <div className="bar-burbuja">{mensajeConfirmacion(estado, actual, c, ctx)}</div>
        </figure>
        <div className="bar-acciones col">
          <Link className="bar-btn" href={`/d/${slug}/turno/${actual.token}`}><Icono nombre="calendario" size={18} /> Ver, cambiar o cancelar</Link>
          {!sena && <a className="bar-btn prim" href={wa} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={18} /> Avisar al salón</a>}
          <button type="button" className="bar-link" onClick={otra}>Reservar otro turno</button>
        </div>
      </main>
    </div>
  );
}
