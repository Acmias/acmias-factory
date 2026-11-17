'use client';

import { useState } from 'react';
import { Icono } from '@/components/Icono';
import { formatoPrecio } from '@/lib/utiles';
import { AYUDA_CARPETA, CARPETAS, ESTADO_SENA, NOMBRE_CARPETA, NOMBRE_FORMA, adicionalesDe, carpeta, cobroDe, deQuien, disenoPorId, esmaltesPara, formaDe, precioCita } from '@/lib/rubros/unas/logica';
import type { EstadoAgenda, Turno } from '@/lib/rubros/barberia/tipos';
import type { Carpeta, Diseno, Opinion } from '@/lib/rubros/unas/tipos';
import { MuestraUnas } from './MuestraUnas';

/** Foto del catálogo. Si `onElegir` existe, se puede marcar como referencia. */
export function TarjetaFoto({ estado, d, elegido, onElegir }: { estado: EstadoAgenda; d: Diseno; elegido?: boolean; onElegir?: () => void }) {
  const cuerpo = (
    <>
      <MuestraUnas diseno={d} titulo={d.nombre} />
      <span className="un-tarjeta-txt">
        <strong>{d.nombre}</strong>
        <small>{d.carpeta === 'salon' ? deQuien(estado, d) : NOMBRE_FORMA[d.forma]}</small>
      </span>
      {elegido && <span className="un-tilde" aria-hidden="true"><Icono nombre="check" size={14} /></span>}
    </>
  );
  if (!onElegir) return <figure className="un-tarjeta solo">{cuerpo}</figure>;
  return (
    <button type="button" className="un-tarjeta" aria-pressed={!!elegido} onClick={onElegir} aria-label={`${d.nombre}, ${deQuien(estado, d)}`}>
      {cuerpo}
    </button>
  );
}

/** Las tres carpetas del catálogo, con pestañas. Para mirar o, en la reserva, para marcar una foto. */
export function Galeria({ estado, elegido, onElegir, inicial = 'salon', max }: { estado: EstadoAgenda; elegido?: string; onElegir?: (id: string) => void; inicial?: Carpeta; max?: number }) {
  const [c, setC] = useState<Carpeta>(() => (elegido ? disenoPorId(estado, elegido)?.carpeta ?? inicial : inicial));
  const [todas, setTodas] = useState(false);
  const fotos = carpeta(estado, c);
  const vista = max && !todas ? fotos.slice(0, max) : fotos;
  return (
    <div className="un-galeria">
      <div className="un-carpetas" role="tablist" aria-label="Carpetas del catálogo">
        {CARPETAS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={c === k} onClick={() => { setC(k); setTodas(false); }}>
            {NOMBRE_CARPETA[k]} <small>{carpeta(estado, k).length}</small>
          </button>
        ))}
      </div>
      <p className="un-carpeta-ayuda">{AYUDA_CARPETA[c]}</p>
      <div className="un-grilla" role={onElegir ? 'group' : undefined} aria-label={NOMBRE_CARPETA[c]}>
        {vista.map((d) => <TarjetaFoto key={d.id} estado={estado} d={d} elegido={elegido === d.id} onElegir={onElegir ? () => onElegir(d.id) : undefined} />)}
      </div>
      {vista.length < fotos.length && <button type="button" className="bar-link" style={{ marginTop: 8 }} onClick={() => setTodas(true)}>Ver las {fotos.length} fotos</button>}
      {!fotos.length && <p className="bar-ayuda">Todavía no hay fotos en esta carpeta.</p>}
    </div>
  );
}

export function Estrellas({ n, tam = 16 }: { n: number; tam?: number }) {
  return (
    <span className="un-estrellas" role="img" aria-label={`${n} de 5 estrellas`} style={{ fontSize: tam }}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} aria-hidden="true" data-llena={i <= Math.round(n) ? '1' : undefined}>★</span>)}
    </span>
  );
}

export function TarjetaOpinion({ o }: { o: Opinion }) {
  return (
    <figure className="un-opinion">
      <Estrellas n={o.estrellas} />
      <blockquote>“{o.texto}”</blockquote>
      <figcaption>{o.nombre}</figcaption>
    </figure>
  );
}

type Cita = Pick<Turno, 'servicioId' | 'adicionales' | 'diseno' | 'pago'>;

/**
 * Resumen de la cita: servicio, diseño adicional, foto de referencia, total y seña.
 * Lo mismo ve la clienta al confirmar y la manicurista antes de atender.
 */
export function DetalleCita({ estado, cita, moneda, para = 'clienta' }: { estado: EstadoAgenda; cita: Cita; moneda: string; para?: 'clienta' | 'salon' }) {
  const p = (v: number) => formatoPrecio(v, moneda);
  const s = estado.servicios.find((x) => x.id === cita.servicioId);
  const ads = adicionalesDe(estado, cita.adicionales);
  const d = disenoPorId(estado, cita.diseno?.disenoId);
  const forma = formaDe(estado, cita.diseno);
  const esm = para === 'salon' ? esmaltesPara(estado, cita.diseno) : [];
  const c = cobroDe(estado);
  const x = cita.diseno;
  return (
    <div className="un-cita">
      <dl className="un-precios">
        <div><dt>{s?.nombre ?? 'Servicio'}</dt><dd>{p(s?.precio ?? 0)}</dd></div>
        {ads.map((a) => <div key={a.id}><dt>+ {a.nombre}</dt><dd>{p(a.precio)}</dd></div>)}
        <div className="total"><dt>Total</dt><dd>{p(precioCita(estado, cita))}</dd></div>
        {cita.pago && cita.pago.sena > 0 && (
          <div className="sena"><dt>Seña por {c.medio}</dt><dd>{p(cita.pago.sena)} <span className={`un-chip-sena ${cita.pago.estadoSena}`}>{ESTADO_SENA[cita.pago.estadoSena]}</span></dd></div>
        )}
        {cita.pago && <div className="pago"><dt>{cita.pago.sena ? 'El resto' : 'Paga'}</dt><dd>{cita.pago.forma === 'efectivo' ? 'En efectivo, en el local' : `Por ${c.medio}`}</dd></div>}
      </dl>
      {d ? (
        <div className="un-cita-dis">
          <MuestraUnas diseno={{ ...d, forma: forma ?? d.forma }} titulo={d.nombre} className="un-muestra grande" />
          <div>
            <small>Foto de referencia</small>
            <strong>{d.nombre}</strong>
            <span>{deQuien(estado, d)}{forma ? ` · ${NOMBRE_FORMA[forma]}` : ''}</span>
            {d.pin && para === 'salon' && <a href={d.pin} target="_blank" rel="noopener noreferrer nofollow" className="un-pin"><Icono nombre="enlace" size={16} /> Ver en Pinterest</a>}
          </div>
        </div>
      ) : (
        <p className="un-cita vacia"><Icono nombre="info" size={18} /> {para === 'salon' ? 'Sin foto de referencia: lo charlan en el local.' : 'Sin foto de referencia: lo charlás en el local.'}</p>
      )}
      {(esm.length > 0 || x?.pinterest || x?.captura || x?.nota) && (
        <dl className="un-datos">
          {esm.length > 0 && (
            <div>
              <dt>Esmaltes a preparar</dt>
              <dd className="un-esmaltes">{esm.map((e) => <span key={e.id}><i style={{ background: e.color }} aria-hidden="true" />{e.nombre}</span>)}</dd>
            </div>
          )}
          {(x?.pinterest || x?.captura) && (
            <div>
              <dt>Idea de Pinterest</dt>
              <dd>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {x.captura && <img src={x.captura} alt="Captura que mandó la clienta" className="un-captura" />}
                {x.pinterest && <a href={x.pinterest} target="_blank" rel="noopener noreferrer nofollow" className="un-pin"><Icono nombre="enlace" size={16} /> Abrir el pin</a>}
              </dd>
            </div>
          )}
          {x?.nota && <div><dt>{para === 'salon' ? 'Nota de la clienta' : 'Tu nota'}</dt><dd className="un-nota">“{x.nota}”</dd></div>}
        </dl>
      )}
    </div>
  );
}

/** Achica una foto o captura en el teléfono antes de guardarla (máx. 640 px, JPEG). */
export async function achicarImagen(archivo: File, max = 640): Promise<string> {
  if (!archivo.type.startsWith('image/')) throw new Error('Elegí una imagen (foto o captura).');
  if (archivo.size > 15_000_000) throw new Error('La imagen es muy pesada. Probá con otra.');
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => mal(new Error('No pudimos abrir esa imagen.'));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}
