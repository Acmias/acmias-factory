'use client';

import { useState } from 'react';

/**
 * Gráficos de una sola serie (skill dataviz): marcas finas, punta redondeada sobre la base,
 * grilla recesiva, la cifra clave rotulada y una tabla equivalente a un toque.
 */

const W = 560;
const H = 220;

/** Eje con cifras cortas para que no se corten: 1,2 M, 800 mil. */
function corto(n: number, formato: (n: number) => string) {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`;
  if (Math.abs(n) >= 1e4) return `${Math.round(n / 1e3).toLocaleString('es-AR')} mil`;
  return formato(n);
}
const X0 = 48;
const X1 = 540;
const Y0 = 20;
const Y1 = 186;

function escala(max: number) {
  const pasos = [1, 2, 2.5, 5, 10];
  const mag = 10 ** Math.floor(Math.log10(Math.max(1, max)));
  const paso = (pasos.find((p) => (p * mag * 4) >= max) ?? 10) * mag;
  return { tope: paso * 4, marcas: [0, paso, paso * 2, paso * 3, paso * 4] };
}

export interface Punto {
  etiqueta: string;
  valor: number;
}

function Tabla({ titulo, puntos, formato }: { titulo: string; puntos: Punto[]; formato: (n: number) => string }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
      <caption className="sr-only">{titulo}</caption>
      <thead><tr><th style={{ textAlign: 'left', padding: '6px 4px' }}>Período</th><th style={{ textAlign: 'right', padding: '6px 4px' }}>Valor</th></tr></thead>
      <tbody>{puntos.map((p) => <tr key={p.etiqueta}><td style={{ padding: '6px 4px', borderTop: '1px solid #eee' }}>{p.etiqueta}</td><td style={{ textAlign: 'right', padding: '6px 4px', borderTop: '1px solid #eee' }}>{formato(p.valor)}</td></tr>)}</tbody>
    </table>
  );
}

export function GraficoBarras({ titulo, detalle, puntos, formato }: { titulo: string; detalle: string; puntos: Punto[]; formato: (n: number) => string }) {
  const [tabla, setTabla] = useState(false);
  const { tope, marcas } = escala(Math.max(...puntos.map((p) => p.valor), 1));
  const ancho = (X1 - X0) / Math.max(1, puntos.length);
  const barra = Math.min(40, ancho * 0.5);
  const y = (v: number) => Y1 - (v / tope) * (Y1 - Y0);
  const ult = puntos[puntos.length - 1];
  return (
    <figure className="d-card" style={{ margin: 0 }}>
      <figcaption><strong style={{ fontSize: 17 }}>{titulo}</strong><br /><span className="cl-gris">{detalle}</span></figcaption>
      {tabla ? <Tabla titulo={titulo} puntos={puntos} formato={formato} /> : (
        <svg viewBox={`0 0 ${W} ${H}`} className="cl-grafico" role="img" aria-label={`${titulo}: ${puntos.map((p) => `${p.etiqueta} ${formato(p.valor)}`).join(', ')}`}>
          {marcas.map((m) => <g key={m}><line x1={X0} x2={X1} y1={y(m)} y2={y(m)} stroke={m ? '#eef0f3' : '#c5cfdb'} /><text x={X0 - 8} y={y(m) + 4} fontSize="11" fill="#55555f" textAnchor="end">{corto(m, formato)}</text></g>)}
          {puntos.map((p, i) => {
            const cx = X0 + ancho * (i + 0.5);
            const top = y(p.valor);
            const h = Math.max(0, Y1 - top);
            const r = Math.min(4, h);
            return (
              <g key={p.etiqueta}>
                <path d={`M${cx - barra / 2} ${Y1}V${top + r}Q${cx - barra / 2} ${top} ${cx - barra / 2 + r} ${top}H${cx + barra / 2 - r}Q${cx + barra / 2} ${top} ${cx + barra / 2} ${top + r}V${Y1}Z`} fill="var(--c-marca)"><title>{`${p.etiqueta}: ${formato(p.valor)}`}</title></path>
                <text x={cx} y={H - 14} fontSize="11" fill="#55555f" textAnchor="middle">{p.etiqueta}</text>
              </g>
            );
          })}
          {ult && <text x={X0 + ancho * (puntos.length - 0.5)} y={y(ult.valor) - 8} fontSize="12" fontWeight="700" fill="#16161d" textAnchor="middle">{formato(ult.valor)}</text>}
        </svg>
      )}
      <button type="button" className="d-btn" style={{ minHeight: 36, marginTop: 6 }} onClick={() => setTabla((x) => !x)}>{tabla ? 'Ver como gráfico' : 'Ver como tabla'}</button>
    </figure>
  );
}

export function GraficoLinea({ titulo, detalle, puntos, formato, rango }: { titulo: string; detalle: string; puntos: Punto[]; formato: (n: number) => string; rango?: [number, number] }) {
  const [tabla, setTabla] = useState(false);
  const maxV = Math.max(...puntos.map((p) => p.valor), rango?.[1] && rango[1] < 1e6 ? rango[1] : 0, 1);
  const { tope, marcas } = escala(maxV * 1.1);
  const y = (v: number) => Y1 - (v / tope) * (Y1 - Y0);
  const x = (i: number) => (puntos.length < 2 ? (X0 + X1) / 2 : X0 + ((X1 - X0) * i) / (puntos.length - 1));
  const ult = puntos[puntos.length - 1];
  return (
    <figure className="d-card" style={{ margin: 0 }}>
      <figcaption><strong style={{ fontSize: 17 }}>{titulo}</strong><br /><span className="cl-gris">{detalle}</span></figcaption>
      {tabla ? <Tabla titulo={titulo} puntos={puntos} formato={formato} /> : (
        <svg viewBox={`0 0 ${W} ${H}`} className="cl-grafico" role="img" aria-label={`${titulo}: ${puntos.map((p) => `${p.etiqueta} ${formato(p.valor)}`).join(', ')}`}>
          {marcas.map((m) => <g key={m}><line x1={X0} x2={X1} y1={y(m)} y2={y(m)} stroke={m ? '#eef0f3' : '#c5cfdb'} /><text x={X0 - 8} y={y(m) + 4} fontSize="11" fill="#55555f" textAnchor="end">{corto(m, formato)}</text></g>)}
          {rango && rango[1] < tope && <><line x1={X0} x2={X1} y1={y(rango[1])} y2={y(rango[1])} stroke="#55555f" strokeDasharray="4 4" /><text x={X1} y={y(rango[1]) - 6} fontSize="11" fill="#55555f" textAnchor="end">Máximo indicado {formato(rango[1])}</text></>}
          <polyline points={puntos.map((p, i) => `${x(i)},${y(p.valor)}`).join(' ')} fill="none" stroke="var(--c-marca)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {puntos.map((p, i) => <circle key={p.etiqueta + i} cx={x(i)} cy={y(p.valor)} r="5" fill="var(--c-marca)" stroke="#fff" strokeWidth="2"><title>{`${p.etiqueta}: ${formato(p.valor)}`}</title></circle>)}
          {puntos.map((p, i) => <text key={'e' + i} x={x(i)} y={H - 14} fontSize="11" fill="#55555f" textAnchor="middle">{p.etiqueta}</text>)}
          {ult && <text x={x(puntos.length - 1)} y={y(ult.valor) - 10} fontSize="12" fontWeight="700" fill="#16161d" textAnchor="end">{formato(ult.valor)}</text>}
        </svg>
      )}
      <button type="button" className="d-btn" style={{ minHeight: 36, marginTop: 6 }} onClick={() => setTabla((x) => !x)}>{tabla ? 'Ver como gráfico' : 'Ver como tabla'}</button>
    </figure>
  );
}
