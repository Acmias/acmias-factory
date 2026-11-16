'use client';

import { Icono } from '@/components/Icono';
import { formatoPrecio } from '@/lib/utiles';
import { NOMBRE_FORMA, NOMBRE_PATRON, deQuien, disenoPorId, eligioAlgo, esmaltesPara, formaDe } from '@/lib/rubros/unas/logica';
import type { EstadoAgenda } from '@/lib/rubros/barberia/tipos';
import type { Diseno, EleccionDiseno } from '@/lib/rubros/unas/tipos';
import { MuestraUnas } from './MuestraUnas';

/** Tarjeta elegible de un diseño del catálogo. */
export function TarjetaDiseno({ estado, d, moneda, elegido, onElegir, autora = true }: { estado: EstadoAgenda; d: Diseno; moneda: string; elegido: boolean; onElegir: () => void; autora?: boolean }) {
  const extra = d.extra ? `+ ${formatoPrecio(d.extra, moneda)}` : 'Incluido';
  return (
    <button type="button" className="un-tarjeta" aria-pressed={elegido} onClick={onElegir} aria-label={`${d.nombre}, ${NOMBRE_FORMA[d.forma].toLowerCase()}, ${deQuien(estado, d)}, ${d.extra ? `nail art ${extra}` : 'sin costo extra'}`}>
      <MuestraUnas diseno={d} titulo={d.nombre} />
      <span className="un-tarjeta-txt">
        <strong>{d.nombre}</strong>
        <small>{NOMBRE_FORMA[d.forma]}{autora ? ` · ${deQuien(estado, d)}` : ''}</small>
        <span className={d.extra ? 'un-extra' : 'un-extra incl'}>{extra}</span>
      </span>
      {elegido && <span className="un-tilde" aria-hidden="true"><Icono nombre="check" size={14} /></span>}
    </button>
  );
}

/**
 * Lo que la clienta dejó en la cita: diseño, forma, esmaltes a preparar, idea de Pinterest y nota.
 * Es lo mismo que ve la manicurista antes de atender.
 */
export function DisenoDeLaCita({ estado, eleccion, moneda, para = 'clienta' }: { estado: EstadoAgenda; eleccion?: EleccionDiseno; moneda: string; para?: 'clienta' | 'salon' }) {
  if (!eligioAlgo(eleccion)) {
    return (
      <div className="un-cita vacia">
        <Icono nombre="info" size={18} />
        <p>{para === 'salon' ? 'La clienta no eligió diseño: lo deciden juntas en el local.' : 'No elegiste diseño: lo charlás en el local.'}</p>
      </div>
    );
  }
  const x = eleccion!;
  const d = disenoPorId(estado, x.disenoId);
  const forma = formaDe(estado, x);
  const esm = esmaltesPara(estado, x);
  return (
    <div className="un-cita">
      {d && (
        <div className="un-cita-dis">
          <MuestraUnas diseno={{ ...d, forma: forma ?? d.forma }} titulo={d.nombre} className="un-muestra grande" />
          <div>
            <strong>{d.nombre}</strong>
            <span>{NOMBRE_PATRON[d.patron]} · {deQuien(estado, d)}</span>
            <span>{d.extra ? `Nail art + ${formatoPrecio(d.extra, moneda)}` : 'Sin costo extra'}</span>
          </div>
        </div>
      )}
      <dl className="un-datos">
        {forma && (
          <div><dt>Forma</dt><dd>{NOMBRE_FORMA[forma]}{d && x.forma && x.forma !== d.forma ? ` (el diseño original es ${NOMBRE_FORMA[d.forma].toLowerCase()})` : ''}</dd></div>
        )}
        {esm.length > 0 && (
          <div>
            <dt>{para === 'salon' ? 'Esmaltes a preparar' : 'Esmaltes'}</dt>
            <dd className="un-esmaltes">{esm.map((e) => <span key={e.id}><i style={{ background: e.color }} aria-hidden="true" />{e.nombre}</span>)}</dd>
          </div>
        )}
        {(x.pinterest || x.captura) && (
          <div>
            <dt>Idea de Pinterest</dt>
            <dd>
              {x.captura && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={x.captura} alt="Captura del pin que eligió la clienta" className="un-captura" />
              )}
              {x.pinterest && <a href={x.pinterest} target="_blank" rel="noopener noreferrer nofollow" className="un-pin"><Icono nombre="enlace" size={16} /> Abrir el pin</a>}
            </dd>
          </div>
        )}
        {x.nota && <div><dt>{para === 'salon' ? 'Nota de la clienta' : 'Tu nota'}</dt><dd className="un-nota">“{x.nota}”</dd></div>}
      </dl>
    </div>
  );
}

/** Achica una foto o captura en el teléfono antes de guardarla (máx. 640 px, JPEG). */
export async function achicarImagen(archivo: File, max = 640): Promise<string> {
  if (!archivo.type.startsWith('image/')) throw new Error('Elegí una imagen (captura o foto).');
  if (archivo.size > 15_000_000) throw new Error('La imagen es muy pesada. Probá con una captura de pantalla.');
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
