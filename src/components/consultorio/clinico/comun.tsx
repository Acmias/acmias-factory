'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Icono } from '@/components/Icono';
import { fechaCorta } from '@/lib/rubros/barberia/agenda';
import { NOMBRE_DOC, enlaceValidacion } from '@/lib/rubros/consultorio/clinico/logica';
import type { ActualizarAgenda } from '@/components/barberia/useBarberia';
import type { ActualizarClinico } from '@/lib/rubros/consultorio/clinico/logica';
import type { EstadoAgenda, Profesional } from '@/lib/rubros/barberia/tipos';
import type { Documento, EstadoClinico } from '@/lib/rubros/consultorio/clinico/tipos';
import type { DemoConfig } from '@/lib/tipos';

export interface PropsClinico {
  slug: string;
  config: DemoConfig;
  agenda: EstadoAgenda;
  actualizar: ActualizarAgenda;
  clinico: EstadoClinico;
  actualizarClinico: ActualizarClinico;
  quien: string;
  medico?: Profesional;
  irA: (pestana: string) => void;
}

export const origen = () => (typeof window !== 'undefined' ? window.location.origin : '');
export const iniciales = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

/** QR que lleva a la validación pública: solo dice que el documento existe, de quién y de cuándo. */
export function QrDocumento({ slug, doc, prof, negocio, size = 132 }: { slug: string; doc: Documento; prof?: Profesional; negocio: string; size?: number }) {
  const [qr, setQr] = useState('');
  const url = enlaceValidacion(origen(), slug, doc, prof, negocio);
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: size * 2, errorCorrectionLevel: 'L' }).then(setQr, () => setQr(''));
  }, [url, size]);
  return qr ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={qr} alt={`Código QR para validar el documento ${doc.codigo}`} className="cl-qr" style={{ width: size, height: size }} />
  ) : <span className="cl-qr" style={{ width: size, height: size, display: 'inline-block' }} aria-hidden="true" />;
}

export function ListaDocumentos({ slug, docs, agenda, negocio, conQr = true }: { slug: string; docs: Documento[]; agenda: EstadoAgenda; negocio: string; conQr?: boolean }) {
  if (!docs.length) return <p className="cl-vacio">Todavía no hay recetas ni certificados.</p>;
  return (
    <ul className="cl-lista">
      {docs.map((d) => {
        const prof = agenda.profesionales.find((p) => p.id === d.profId);
        return (
          <li key={d.id} className="cl-doc">
            {conQr && <QrDocumento slug={slug} doc={d} prof={prof} negocio={negocio} size={84} />}
            <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
              <strong>{NOMBRE_DOC[d.tipo]}</strong>
              <span style={{ fontSize: 15 }}>{d.texto}</span>
              <small className="cl-gris">{fechaCorta(new Date(d.fecha))} · {prof ? `${prof.titulo ?? ''} ${prof.nombre}`.trim() : ''} · {d.codigo}</small>
              <small className="cl-chip av" style={{ justifySelf: 'start' }}>Demo — sin validez legal</small>
            </div>
            <a className="d-btn" href={enlaceValidacion(origen(), slug, d, prof, negocio)} target="_blank" rel="noreferrer" aria-label={`Validar ${NOMBRE_DOC[d.tipo]} ${d.codigo}`}><Icono nombre="qr" size={18} /> Validar</a>
          </li>
        );
      })}
    </ul>
  );
}

/** Teclado de PIN (galería protegida). El PIN de demo se muestra en pantalla. */
export function PedirPin({ pin, onOk, titulo = 'Ingresá tu PIN', detalle = 'Cada apertura queda registrada.' }: { pin: string; onOk: () => void; titulo?: string; detalle?: string }) {
  const [v, setV] = useState('');
  const [error, setError] = useState(false);
  function tecla(d: string) {
    if (d === 'borrar') return (setV((x) => x.slice(0, -1)), setError(false));
    const n = (v + d).slice(0, 4);
    if (n.length < 4) return (setV(n), setError(false));
    setV('');
    if (n === pin) onOk();
    else setError(true);
  }
  return (
    <div className="cl-pin">
      <span className="bar-avatar" aria-hidden="true" style={{ width: 56, height: 56 }}><Icono nombre="candado" size={26} /></span>
      <div>
        <h3 style={{ margin: 0, fontSize: 20 }}>{titulo}</h3>
        <p className="cl-gris" style={{ margin: '4px 0 0' }}>{detalle} PIN de demo: {pin}</p>
      </div>
      <div className="cl-puntos" aria-live="polite" aria-label={`${v.length} de 4 dígitos`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={i < v.length ? 'lleno' : ''} />)}
      </div>
      {error && <p role="alert" style={{ margin: 0, color: 'var(--sem-rojo)', fontWeight: 700 }}>PIN incorrecto. Probá de nuevo.</p>}
      <div className="cl-teclado">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'borrar'].map((d, i) =>
          d ? <button key={i} type="button" className={d === 'borrar' ? 'chico' : ''} aria-label={d === 'borrar' ? 'Borrar un dígito' : `Número ${d}`} onClick={() => tecla(d)}>{d === 'borrar' ? 'Borrar' : d}</button> : <span key={i} />,
        )}
      </div>
    </div>
  );
}

/** Ilustración genérica para la galería (nunca fotos de personas en la demo). */
export function Dibujo({ variante }: { variante: number }) {
  const despues = variante % 2 === 1;
  return (
    <svg viewBox="0 0 800 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="800" height="340" fill={despues ? '#efe7df' : '#e6dace'} />
      <ellipse cx="400" cy="330" rx="330" ry="260" fill={despues ? '#f2ebe4' : '#eadfd4'} />
      {despues ? (
        <>
          <path d="M150 140 Q400 128 650 140" stroke="#cdbcab" strokeWidth="3" fill="none" />
          <path d="M190 182 Q400 174 610 182" stroke="#d6c7b8" strokeWidth="2" fill="none" />
        </>
      ) : (
        <>
          <path d="M140 130 Q270 98 400 130 T660 130" stroke="#a88e78" strokeWidth="4" fill="none" />
          <path d="M160 166 Q280 140 400 168 T640 166" stroke="#b49c87" strokeWidth="3" fill="none" />
          <path d="M190 202 Q300 182 400 204 T610 202" stroke="#bfa994" strokeWidth="2" fill="none" />
          <path d="M385 230 L392 270 M415 230 L408 270" stroke="#a88e78" strokeWidth="3" />
        </>
      )}
    </svg>
  );
}

export function Comparador({ antes, despues, marca }: { antes: number; despues: number; marca: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div className="cl-comp">
        <Dibujo variante={despues} />
        <div className="cl-comp-antes" style={{ width: `${pos}%` }}>
          <div style={{ position: 'absolute', inset: 0, width: `${(100 / Math.max(pos, 1)) * 100}%` }}><Dibujo variante={antes} /></div>
        </div>
        <div className="cl-comp-linea" style={{ left: `calc(${pos}% - 1px)` }} />
        <span className="cl-comp-et" style={{ left: 12, background: '#16161d', color: '#fff' }}>Antes</span>
        <span className="cl-comp-et" style={{ right: 12, background: '#fff', color: '#16161d' }}>Después</span>
        <span className="cl-marca-agua" aria-hidden="true">{marca}</span>
      </div>
      <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: 14 }}>Mover el divisor
        <input type="range" min={5} max={95} value={pos} onChange={(e) => setPos(Number(e.target.value))} style={{ accentColor: 'var(--c-marca)' }} />
      </label>
    </div>
  );
}

export const textoPlano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
