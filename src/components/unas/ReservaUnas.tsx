'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp, formatoPrecio, soloDigitos } from '@/lib/utiles';
import { abierto, claveDia, deClave, diaCorto, fechaCorta, hora, huecos, inicioDia, nombreDia, proximoConLugar, sumarDias, type Hueco } from '@/lib/rubros/barberia/agenda';
import { mensajeAlLocal, mensajeConfirmacion, montoSena, reservar } from '@/lib/rubros/barberia/logica';
import type { EstadoAgenda, Servicio, Turno } from '@/lib/rubros/barberia/tipos';
import { FORMAS, NOMBRE_FORMA, delEquipo, disenoPorId, eligioAlgo, enlacePinterest, limpiarEleccion, precioCita, resumenDiseno, trabajosDe } from '@/lib/rubros/unas/logica';
import type { EleccionDiseno, Forma } from '@/lib/rubros/unas/tipos';
import type { DemoConfig } from '@/lib/tipos';
import { Horarios, ListaEspera } from '@/components/barberia/Reserva';
import { useAhora, useDemoBarberia, type ActualizarAgenda } from '@/components/barberia/useBarberia';
import { MuestraUnas } from './MuestraUnas';
import { DisenoDeLaCita, TarjetaDiseno, achicarImagen } from './DisenoCita';

type Paso = 1 | 2 | 3 | 4 | 5;
const PASOS = ['Con quién', 'Servicio', 'Día y hora', 'Diseño', 'Confirmar'];
const iniciales = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
const primer = (n?: string) => n?.split(' ')[0] ?? '';

/** Reserva del salón de uñas (BRD 13): con quién → servicio → día y hora → diseño → confirmar. */
export function ReservaUnas({ slug }: { slug: string }) {
  const { config, estado, actualizar, estilo, listo } = useDemoBarberia(slug);
  const ahora = useAhora();
  const [paso, setPaso] = useState<Paso>(1);
  const [profId, setProfId] = useState<string | null>(null);
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [hueco, setHueco] = useState<Hueco | null>(null);
  const [eleccion, setEleccion] = useState<EleccionDiseno>({});
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

  function ir(n: Paso) {
    setPaso(n);
    requestAnimationFrame(() => arriba.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  if (hecho) {
    return (
      <Lista
        config={config}
        estado={estado}
        turno={hecho}
        slug={slug}
        estilo={estilo}
        otra={() => { setHecho(null); setHueco(null); setDia(null); setServicioId(null); setProfId(null); setEleccion({}); ir(1); }}
      />
    );
  }

  const servicios = profId ? estado.servicios.filter((s) => estado.profesionales.find((x) => x.id === profId)?.servicios.includes(s.id)) : estado.servicios;
  const manana = libres.filter((h) => new Date(h.inicio).getHours() < 13);
  const tarde = libres.filter((h) => new Date(h.inicio).getHours() >= 13);
  const proximo = servicio && diaElegido && !libres.length ? proximoConLugar(estado, servicio, profId, sumarDias(diaElegido, 1), ahora) : null;
  const atiende = hueco ? estado.profesionales.find((x) => x.id === hueco.profId) : null;
  const nombreProf = profId ? primer(estado.profesionales.find((x) => x.id === profId)?.nombre) : null;

  return (
    <div className="bar un" style={estilo}>
      <AvisoDemo texto="Manicuristas, diseños y turnos de ejemplo" />
      <header className="bar-hero un-hero">
        <div className="bar-hero-in">
          {config.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logo} alt="" className="bar-logo" />
          ) : (
            <span className="bar-logo bar-inicial" aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
          )}
          <h1>{config.negocio}</h1>
          <p>Elegí con quién, cuándo y tu diseño. Tu manicurista lo recibe con la cita.</p>
          <Horarios estado={estado} />
        </div>
      </header>

      <div ref={arriba} className="bar-pasos un-pasos" aria-label="Pasos de la reserva">
        {PASOS.map((t, i) => (
          <button key={t} type="button" className="bar-paso" aria-current={paso === i + 1 ? 'step' : undefined} data-hecho={paso > i + 1 ? '1' : undefined} disabled={i + 1 > paso} onClick={() => ir((i + 1) as Paso)}>
            <span className="bar-paso-n">{paso > i + 1 ? <Icono nombre="check" size={14} /> : i + 1}</span>
            {t}
          </button>
        ))}
      </div>

      <main className="bar-main">
        {paso === 1 && (
          <section aria-labelledby="t-quien" className="bar-anim">
            <h2 id="t-quien" className="bar-h2">¿Con quién te las hacés?</h2>
            <ul className="un-profs">
              {estado.profesionales.map((pr) => {
                const suyos = trabajosDe(estado, pr.id).slice(0, 3);
                return (
                  <li key={pr.id}>
                    <button type="button" className="un-prof" aria-pressed={profId === pr.id} onClick={() => { setProfId(pr.id); setServicioId(null); setDia(null); setHueco(null); setEleccion({}); ir(2); }}>
                      <span className="un-prof-cab">
                        <span className="bar-avatar" aria-hidden="true">{iniciales(pr.nombre)}</span>
                        <span><strong>{pr.nombre}</strong><small>{pr.especialidad}</small></span>
                      </span>
                      {suyos.length > 0 && (
                        <span className="un-prof-trab" aria-hidden="true">
                          {suyos.map((d) => <MuestraUnas key={d.id} diseno={d} className="un-muestra mini" />)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              <li>
                <button type="button" className="un-prof cualquiera" aria-pressed={false} onClick={() => { setProfId(null); setServicioId(null); setDia(null); setHueco(null); setEleccion({}); ir(2); }}>
                  <span className="un-prof-cab">
                    <span className="bar-avatar cual" aria-hidden="true"><Icono nombre="chispa" size={18} /></span>
                    <span><strong>Con la primera libre</strong><small>Más horarios para elegir</small></span>
                  </span>
                </button>
              </li>
            </ul>
          </section>
        )}

        {paso === 2 && (
          <section aria-labelledby="t-serv" className="bar-anim">
            <h2 id="t-serv" className="bar-h2">¿Qué te hacés{nombreProf ? ` con ${nombreProf}` : ''}?</h2>
            <ul className="bar-servicios">
              {servicios.map((s, i) => (
                <li key={s.id} style={{ '--i': i } as React.CSSProperties}>
                  <button type="button" className="bar-serv" aria-pressed={s.id === servicioId} aria-label={`${s.nombre}, ${s.duracion} minutos, ${p(s.precio)}${s.sena ? `, con seña del ${s.sena}%` : ''}`} onClick={() => { setServicioId(s.id); setDia(null); setHueco(null); ir(3); }}>
                    <span className="bar-serv-dur"><strong>{s.duracion}</strong>min</span>
                    <span className="bar-serv-txt">
                      <span className="bar-serv-nom">{s.nombre}</span>
                      <span className="bar-serv-desc">{s.descripcion}</span>
                      {s.sena ? <span className="bar-sena">Seña {s.sena}% · {p(montoSena(s))}</span> : null}
                    </span>
                    <span className="bar-serv-precio">{p(s.precio)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {paso === 3 && servicio && diaElegido && (
          <section aria-labelledby="t-hora" className="bar-anim">
            <h2 id="t-hora" className="bar-h2">{servicio.nombre} <span>{servicio.duracion} min · {nombreProf ? `con ${nombreProf}` : 'con la primera libre'}</span></h2>
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
                <p><strong>No quedan horarios este día{nombreProf ? ` con ${nombreProf}` : ''}.</strong> Anotate y te avisamos por WhatsApp si alguien cancela.</p>
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
                          <button
                            key={`${h.inicio}-${h.profId}`}
                            type="button"
                            className="bar-hora"
                            aria-pressed={hueco?.inicio === h.inicio}
                            onClick={() => {
                              setHueco(h);
                              // Si cambió quién atiende, el diseño propio de la otra ya no corresponde.
                              const d = disenoPorId(estado, eleccion.disenoId);
                              if (d && d.autora === hueco?.profId && d.autora !== h.profId) setEleccion((x) => ({ ...x, disenoId: undefined }));
                              ir(servicio.diseno ? 4 : 5);
                            }}
                          >
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

        {paso === 4 && servicio && hueco && atiende && (
          <ElegirDiseno estado={estado} config={config} profId={atiende.id} eleccion={eleccion} onCambio={setEleccion} onSeguir={() => ir(5)} />
        )}

        {paso === 5 && servicio && hueco && (
          <Datos
            config={config}
            estado={estado}
            servicio={servicio}
            hueco={hueco}
            eleccion={servicio.diseno ? eleccion : {}}
            actualizar={actualizar}
            onDiseno={() => ir(4)}
            onListo={(t) => setHecho(t)}
            onOcupado={(msg) => { setToast(msg); setHueco(null); ir(3); }}
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

/** Paso 4: un trabajo de quien te atiende, uno del equipo o tu idea de Pinterest. */
export function ElegirDiseno({ estado, config, profId, eleccion, onCambio, onSeguir, textoBoton }: {
  estado: EstadoAgenda;
  config: DemoConfig;
  profId: string;
  eleccion: EleccionDiseno;
  onCambio: (x: EleccionDiseno) => void;
  onSeguir: (final: EleccionDiseno) => void;
  textoBoton?: string;
}) {
  const [pin, setPin] = useState(eleccion.pinterest ?? '');
  const [errPin, setErrPin] = useState('');
  const [cargando, setCargando] = useState(false);
  const [todos, setTodos] = useState(() => delEquipo(estado, profId).findIndex((d) => d.id === eleccion.disenoId) >= 6);
  const prof = estado.profesionales.find((x) => x.id === profId)!;
  const suyos = trabajosDe(estado, profId);
  const equipo = delEquipo(estado, profId);
  const elegido = disenoPorId(estado, eleccion.disenoId);
  const set = (x: Partial<EleccionDiseno>) => onCambio({ ...eleccion, ...x });
  const elegir = (id: string) => set({ disenoId: eleccion.disenoId === id ? undefined : id });

  function seguir() {
    if (pin.trim() && !enlacePinterest(pin)) return setErrPin('Ese enlace no es de Pinterest. En el pin tocá "Compartir", después "Copiar enlace", y pegalo acá.');
    setErrPin('');
    const final = { ...eleccion, pinterest: pin.trim() ? enlacePinterest(pin)! : undefined };
    onCambio(final);
    onSeguir(final);
  }

  return (
    <section aria-labelledby="t-dis" className="bar-anim un-elegir">
      <h2 id="t-dis" className="bar-h2">Elegí tu diseño</h2>
      <p className="bar-ayuda" style={{ marginTop: -6 }}>Queda guardado en tu cita: {primer(prof.nombre)} lo ve antes de atenderte y prepara los esmaltes.</p>

      <h3 className="bar-h3 un-h3"><span className="bar-avatar mini" aria-hidden="true">{iniciales(prof.nombre)}</span> Trabajos de {primer(prof.nombre)}</h3>
      {suyos.length ? (
        <div className="un-grilla" role="group" aria-label={`Trabajos de ${primer(prof.nombre)}`}>
          {suyos.map((d) => <TarjetaDiseno key={d.id} estado={estado} d={d} moneda={config.moneda} elegido={eleccion.disenoId === d.id} onElegir={() => elegir(d.id)} autora={false} />)}
        </div>
      ) : (
        <p className="bar-ayuda">{primer(prof.nombre)} todavía no cargó trabajos. Mirá los del equipo o traé tu idea.</p>
      )}

      <h3 className="bar-h3 un-h3">Lo que se hace en el equipo</h3>
      <div className="un-grilla" role="group" aria-label="Diseños del equipo">
        {(todos ? equipo : equipo.slice(0, 6)).map((d) => <TarjetaDiseno key={d.id} estado={estado} d={d} moneda={config.moneda} elegido={eleccion.disenoId === d.id} onElegir={() => elegir(d.id)} />)}
      </div>

      {!todos && equipo.length > 6 && <button type="button" className="bar-link" style={{ marginTop: 8 }} onClick={() => setTodos(true)}>Ver todos los diseños del equipo ({equipo.length})</button>}

      <h3 className="bar-h3 un-h3">Tu idea de Pinterest</h3>
      <div className="un-pinterest">
        <label>Enlace del pin
          <input className="c-inp" value={pin} onChange={(e) => { setPin(e.target.value); setErrPin(''); }} placeholder="https://pin.it/…" inputMode="url" autoComplete="off" aria-invalid={!!errPin} aria-describedby={errPin ? 'e-pin' : 'a-pin'} />
          {errPin ? <span id="e-pin" className="bar-err">{errPin}</span> : <span id="a-pin" className="bar-ayuda">En Pinterest: Compartir → Copiar enlace. Podés sumarlo aunque hayas elegido un diseño de arriba.</span>}
        </label>
        <div className="un-captura-fila">
          {eleccion.captura ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={eleccion.captura} alt="Tu captura del pin" className="un-captura mini" />
              <button type="button" className="bar-link" onClick={() => set({ captura: undefined })}>Quitar captura</button>
            </>
          ) : (
            <label className="bar-btn un-subir">
              <Icono nombre="subir" size={18} /> {cargando ? 'Achicando…' : 'Subir una captura (opcional)'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Subir captura del pin"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  setCargando(true);
                  try {
                    set({ captura: await achicarImagen(f) });
                  } catch (er) {
                    setErrPin(er instanceof Error ? er.message : 'No pudimos usar esa imagen.');
                  } finally {
                    setCargando(false);
                  }
                }}
              />
            </label>
          )}
        </div>
      </div>

      <h3 className="bar-h3 un-h3">¿Qué forma?</h3>
      <div className="un-formas" role="group" aria-label="Forma de las uñas">
        {FORMAS.map((f) => {
          const sel = (eleccion.forma ?? elegido?.forma) === f;
          return (
            <button key={f} type="button" className="un-forma" aria-pressed={sel} onClick={() => set({ forma: eleccion.forma === f ? undefined : f as Forma })}>
              <MuestraUnas diseno={{ patron: 'liso', forma: f, esmaltes: elegido?.esmaltes.slice(0, 1) ?? ['nude'] }} className="un-muestra forma" titulo={NOMBRE_FORMA[f]} />
              {NOMBRE_FORMA[f].split(' ')[0]}
            </button>
          );
        })}
      </div>

      <label className="un-nota-in">¿Algo más que tenga que saber {primer(prof.nombre)}?
        <textarea className="c-inp" rows={3} maxLength={280} value={eleccion.nota ?? ''} onChange={(e) => set({ nota: e.target.value })} placeholder="Largo, colores, si es para un evento…" />
      </label>

      <div className="un-seguir">
        <p aria-live="polite">{elegido || pin.trim() || eleccion.captura ? <><strong>Elegiste:</strong> {resumenDiseno(estado, { ...eleccion, pinterest: pin.trim() || undefined })}</> : 'Si no elegís nada, lo charlan en el local.'}</p>
        <button type="button" className="bar-btn prim grande" onClick={seguir}>{textoBoton ?? (elegido || pin.trim() || eleccion.captura || eleccion.nota?.trim() || eleccion.forma ? 'Seguir' : 'Lo decido en el local')}</button>
      </div>
    </section>
  );
}

function Datos({ config, estado, servicio, hueco, eleccion, actualizar, onDiseno, onListo, onOcupado }: {
  config: DemoConfig;
  estado: EstadoAgenda;
  servicio: Servicio;
  hueco: Hueco;
  eleccion: EleccionDiseno;
  actualizar: ActualizarAgenda;
  onDiseno: () => void;
  onListo: (t: Turno) => void;
  onOcupado: (msg: string) => void;
}) {
  const [nombre, setNombre] = useState('');
  const [wa, setWa] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const prof = estado.profesionales.find((x) => x.id === hueco.profId)!;
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const conocida = soloDigitos(wa).length >= 8 ? estado.clientes.find((c) => c.whatsapp === soloDigitos(wa)) : undefined;
  const total = precioCita(estado, { servicioId: servicio.id, diseno: eleccion });

  function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (nombre.trim().length < 2) e.nombre = 'Escribí tu nombre.';
    if (soloDigitos(wa).length < 8) e.wa = 'Escribí tu WhatsApp con código de área (ej.: 11 5555 1234).';
    const limpia = limpiarEleccion(estado, eleccion);
    if ('error' in limpia) e.general = limpia.error;
    setErr(e);
    if (Object.keys(e).length || 'error' in limpia) return;
    let turno: Turno | null = null;
    let ocupado = '';
    const error = actualizar((x) => {
      const r = reservar(x, { servicioId: servicio.id, profId: hueco.profId, inicio: hueco.inicio, nombre, whatsapp: wa, origen: 'online', diseno: limpia.eleccion });
      if ('error' in r) {
        ocupado = r.error;
        return x;
      }
      turno = r.turno;
      return r.estado;
    });
    if (ocupado) return onOcupado(ocupado);
    if (error) return setErr({ general: error.includes('espacio') && eleccion.captura ? 'El teléfono no tiene lugar para guardar la captura. Quitala y probá de nuevo.' : error });
    if (turno) onListo(turno);
  }

  return (
    <section aria-labelledby="t-datos" className="bar-anim">
      <h2 id="t-datos" className="bar-h2">Confirmá tu cita</h2>
      <div className="bar-resumen">
        <div className="bar-resumen-fecha">
          <span>{diaCorto(new Date(hueco.inicio))}</span>
          <strong>{new Date(hueco.inicio).getDate()}</strong>
          <span>{fechaCorta(new Date(hueco.inicio)).split(' ')[1]}</span>
        </div>
        <div>
          <strong>{servicio.nombre}</strong>
          <span>{hora(new Date(hueco.inicio))} h · {servicio.duracion} min · con {prof.nombre}</span>
          <span>{p(total)}{total !== servicio.precio ? ` (servicio ${p(servicio.precio)} + nail art ${p(total - servicio.precio)})` : ''}</span>
        </div>
      </div>
      {servicio.diseno && (
        <div className="un-conf-dis">
          <div className="un-conf-cab">
            <h3 className="bar-h3" style={{ margin: 0 }}>Tu diseño</h3>
            <button type="button" className="bar-link" onClick={onDiseno}>Cambiar</button>
          </div>
          <DisenoDeLaCita estado={estado} eleccion={eleccion} moneda={config.moneda} />
        </div>
      )}
      {servicio.sena ? <p className="bar-nota-sena"><Icono nombre="info" size={18} /> Este servicio lleva una seña del {servicio.sena}% ({p(montoSena(servicio))}) para reservar el lugar. En la demo no se cobra nada.</p> : null}
      <form onSubmit={enviar} noValidate className="bar-form">
        <label>Tu nombre
          <input className="c-inp" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" aria-invalid={!!err.nombre} aria-describedby={err.nombre ? 'e-nom' : undefined} />
          {err.nombre && <span id="e-nom" className="bar-err">{err.nombre}</span>}
        </label>
        <label>Tu WhatsApp
          <input className="c-inp" value={wa} onChange={(e) => setWa(e.target.value)} inputMode="tel" autoComplete="tel" aria-invalid={!!err.wa} aria-describedby={err.wa ? 'e-wa' : 'a-wa'} />
          {err.wa ? <span id="e-wa" className="bar-err">{err.wa}</span> : <span id="a-wa" className="bar-ayuda">Ahí te llega la confirmación y el recordatorio. Sin cuenta ni contraseña.</span>}
        </label>
        {conocida && <p className="bar-hola">¡Hola de nuevo, {primer(conocida.nombre)}! Llevás {conocida.sellos} de {estado.metaSellos} sellos.</p>}
        {err.general && <p className="bar-err" role="alert">{err.general}</p>}
        <button type="submit" className="bar-btn prim grande">Reservar cita</button>
      </form>
    </section>
  );
}

function Lista({ config, estado, turno, slug, estilo, otra }: { config: DemoConfig; estado: EstadoAgenda; turno: Turno; slug: string; estilo?: React.CSSProperties; otra: () => void }) {
  const c = estado.clientes.find((x) => x.id === turno.clienteId)!;
  const s = estado.servicios.find((x) => x.id === turno.servicioId)!;
  const pr = estado.profesionales.find((x) => x.id === turno.profId)!;
  const enlace = typeof window !== 'undefined' ? `${window.location.origin}/d/${slug}/turno/${turno.token}` : '';
  const ctx = { negocio: config.negocio, moneda: config.moneda, direccion: config.direccion, enlaceTurno: enlace };
  return (
    <div className="bar un" style={estilo}>
      <AvisoDemo texto="Manicuristas, diseños y turnos de ejemplo" />
      <main className="bar-main bar-listo">
        <div className="bar-sello" aria-hidden="true"><Icono nombre="check" size={40} /></div>
        <h1>¡Cita reservada!</h1>
        <p className="bar-listo-sub">{s.nombre} con {pr.nombre}, {nombreDia(turno.inicio)} a las {hora(turno.inicio)} h.</p>
        {s.diseno && (
          <section className="un-conf-dis izq" aria-labelledby="t-tudis">
            <h2 id="t-tudis" className="bar-h3" style={{ marginTop: 0 }}>Lo que {primer(pr.nombre)} ya tiene en tu cita</h2>
            <DisenoDeLaCita estado={estado} eleccion={turno.diseno} moneda={config.moneda} />
            {eligioAlgo(turno.diseno) && <p className="bar-ayuda" style={{ margin: '10px 0 0' }}>Total estimado: {formatoPrecio(precioCita(estado, turno), config.moneda)}</p>}
          </section>
        )}
        <figure className="bar-wa">
          <figcaption>Te llega este WhatsApp <small>(en la demo lo mostramos acá)</small></figcaption>
          <div className="bar-burbuja">{mensajeConfirmacion(estado, turno, c, ctx)}</div>
        </figure>
        <div className="bar-acciones col">
          <Link className="bar-btn prim grande" href={`/d/${slug}/turno/${turno.token}`}><Icono nombre="calendario" size={18} /> Ver, cambiar o cancelar</Link>
          <a className="bar-btn" href={enlaceWhatsApp(config.whatsapp, mensajeAlLocal(estado, turno, c, ctx))} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" size={18} /> Avisar al salón</a>
          <button type="button" className="bar-link" onClick={otra}>Reservar otra cita</button>
        </div>
      </main>
    </div>
  );
}
