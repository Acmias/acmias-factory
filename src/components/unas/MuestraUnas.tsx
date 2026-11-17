'use client';

import { useId } from 'react';
import { esmalte } from '@/lib/rubros/unas/logica';
import type { Diseno, Forma, Patron } from '@/lib/rubros/unas/tipos';

/** Cinco uñas (de meñique a pulgar) con la forma, el estilo y los esmaltes del diseño. Ilustración, no foto. */
const DEDOS = [
  { x: 14, alto: 46, ancho: 22 },
  { x: 44, alto: 58, ancho: 25 },
  { x: 77, alto: 64, ancho: 26 },
  { x: 111, alto: 58, ancho: 25 },
  { x: 144, alto: 50, ancho: 28 },
];
const BASE = 104;

function contorno(x: number, w: number, h: number, forma: Forma) {
  const x1 = x + w;
  const xm = x + w / 2;
  const yb = BASE;
  const yt = BASE - h;
  const punta = forma === 'stiletto' ? h * 0.45 : forma === 'almendra' ? h * 0.35 : forma === 'coffin' ? h * 0.22 : forma === 'redonda' ? w / 2 : 4;
  const ys = yt + punta;
  // Cutícula curva abajo y laterales hasta el arranque de la punta.
  let d = `M ${x} ${yb - 6} Q ${xm} ${yb + 6} ${x1} ${yb - 6} L ${x1} ${ys} `;
  if (forma === 'redonda') d += `A ${w / 2} ${w / 2} 0 0 0 ${x} ${ys} `;
  else if (forma === 'cuadrada') d += `Q ${x1} ${yt} ${x1 - 4} ${yt} L ${x + 4} ${yt} Q ${x} ${yt} ${x} ${ys} `;
  else if (forma === 'almendra') d += `C ${x1} ${yt + punta * 0.35} ${xm + w * 0.22} ${yt} ${xm} ${yt} C ${xm - w * 0.22} ${yt} ${x} ${yt + punta * 0.35} ${x} ${ys} `;
  else if (forma === 'stiletto') d += `Q ${x1 - 1} ${yt + punta * 0.35} ${xm} ${yt} Q ${x + 1} ${yt + punta * 0.35} ${x} ${ys} `;
  else d += `L ${x1 - w * 0.2} ${yt} L ${x + w * 0.2} ${yt} L ${x} ${ys} `;
  return `${d}Z`;
}

function Detalle({ patron, i, x, w, h, c1, c2, gid }: { patron: Patron; i: number; x: number; w: number; h: number; c1: string; c2: string; gid: string }) {
  const yt = BASE - h;
  const xm = x + w / 2;
  switch (patron) {
    case 'francesa':
      return <path d={`M ${x - 2} ${yt + h * 0.3} Q ${xm} ${yt + h * 0.42} ${x + w + 2} ${yt + h * 0.3} L ${x + w + 2} ${yt - 2} L ${x - 2} ${yt - 2} Z`} fill={c1} />;
    case 'degrade':
      return <rect x={x - 2} y={yt - 2} width={w + 4} height={h + 10} fill={`url(#${gid}-g)`} />;
    case 'cromado':
      return (
        <>
          <rect x={x - 2} y={yt - 2} width={w + 4} height={h + 10} fill={`url(#${gid}-g)`} />
          <path d={`M ${x + w * 0.28} ${yt + h * 0.25} Q ${x + w * 0.22} ${yt + h * 0.55} ${x + w * 0.32} ${BASE - 10}`} stroke="#fff" strokeOpacity={0.75} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      );
    case 'glitter':
      return (
        <g fill={c1}>
          {Array.from({ length: 16 }, (_, k) => {
            const px = x + ((k * 37 + i * 11) % 100) / 100 * w;
            const py = yt + ((k * 53 + i * 29) % 100) / 100 * h * (k % 3 === 0 ? 0.45 : 1);
            return <circle key={k} cx={px} cy={py} r={k % 4 === 0 ? 1.8 : 1.1} />;
          })}
        </g>
      );
    case 'marmol':
      return (
        <g stroke={c1} fill="none" strokeLinecap="round">
          <path d={`M ${x - 2} ${yt + h * 0.35} C ${x + w * 0.4} ${yt + h * (0.2 + i * 0.05)} ${x + w * 0.5} ${yt + h * 0.7} ${x + w + 2} ${yt + h * 0.55}`} strokeWidth={1.8} />
          <path d={`M ${x + w * 0.2} ${yt + h * 0.6} C ${x + w * 0.4} ${yt + h * 0.75} ${x + w * 0.6} ${yt + h * 0.55} ${x + w * 0.7} ${BASE}`} strokeWidth={1} />
        </g>
      );
    case 'flores': {
      if (i !== 1 && i !== 3) return <circle cx={xm} cy={yt + h * 0.62} r={1.8} fill={c2} />;
      const cy = yt + h * 0.55;
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={xm} cy={cy - 4.2} rx={2.6} ry={4.2} fill={c1} transform={`rotate(${a} ${xm} ${cy})`} />)}
          <circle cx={xm} cy={cy} r={2.2} fill={c2} />
        </g>
      );
    }
    case 'puntos':
      return (
        <g fill={c1}>
          {[[0.3, 0.3], [0.7, 0.45], [0.35, 0.65], [0.72, 0.82], [0.25, 0.92]].map(([a, b], k) => <circle key={k} cx={x + w * a} cy={yt + h * b} r={2.4} />)}
        </g>
      );
    case 'lineas':
      return (
        <g stroke={c1} strokeWidth={1.4} strokeLinecap="round">
          <line x1={x + w * 0.15} y1={BASE - 6} x2={x + w * 0.85} y2={yt + h * 0.2} />
          {i % 2 === 0 && <line x1={x + w * 0.5} y1={BASE - 4} x2={x + w * 0.95} y2={yt + h * 0.5} />}
        </g>
      );
    case 'animal':
      return (
        <g fill={c1}>
          {[[0.3, 0.3, 3.2], [0.7, 0.5, 2.6], [0.35, 0.72, 3], [0.75, 0.88, 2.2], [0.6, 0.18, 2]].map(([a, b, r], k) => (
            <path key={k} d={`M ${x + w * a - r} ${yt + h * b} q ${r * 0.4} ${-r * 1.2} ${r * 1.5} ${-r * 0.4} q ${r} ${r * 0.9} ${-r * 0.2} ${r * 1.4} q ${-r * 1.4} ${r * 0.1} ${-r * 1.3} ${-r}`} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

export function MuestraUnas({ diseno, titulo, className }: { diseno: Pick<Diseno, 'patron' | 'forma' | 'esmaltes'> & { foto?: string }; titulo?: string; className?: string }) {
  const gid = useId().replace(/:/g, '');
  if (diseno.foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={diseno.foto} alt={titulo ?? 'Foto del diseño'} className={`${className ?? 'un-muestra'} un-foto`} />;
  }
  const colores = diseno.esmaltes.map((id) => esmalte(id)?.color ?? '#ccc');
  const [c0, c1 = c0, c2 = c1] = colores;
  return (
    <svg viewBox="0 0 186 112" className={className ?? 'un-muestra'} role="img" aria-label={titulo ?? 'Ilustración del diseño'}>
      <defs>
        <linearGradient id={`${gid}-g`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={c0} />
          <stop offset="1" stopColor={c1} />
        </linearGradient>
        {DEDOS.map((f, i) => (
          <clipPath key={i} id={`${gid}-c${i}`}>
            <path d={contorno(f.x, f.ancho, f.alto, diseno.forma)} />
          </clipPath>
        ))}
      </defs>
      {DEDOS.map((f, i) => (
        <g key={i}>
          <rect x={f.x - 5} y={BASE - f.alto * 0.42} width={f.ancho + 10} height={f.alto} rx={(f.ancho + 10) / 2} className="un-dedo" />
          <g clipPath={`url(#${gid}-c${i})`}>
            <rect x={f.x - 2} y={BASE - f.alto - 2} width={f.ancho + 4} height={f.alto + 12} fill={c0} />
            <Detalle patron={diseno.patron} i={i} x={f.x} w={f.ancho} h={f.alto} c1={diseno.patron === 'francesa' && colores.length > 2 ? colores[1 + (i % 2)] : c1} c2={c2} gid={gid} />
            <path d={`M ${f.x + f.ancho * 0.22} ${BASE - f.alto * 0.8} Q ${f.x + f.ancho * 0.16} ${BASE - f.alto * 0.5} ${f.x + f.ancho * 0.24} ${BASE - 12}`} stroke="#fff" strokeOpacity={0.35} strokeWidth={2} fill="none" strokeLinecap="round" />
          </g>
          <path d={contorno(f.x, f.ancho, f.alto, diseno.forma)} fill="none" className="un-borde" />
        </g>
      ))}
    </svg>
  );
}
