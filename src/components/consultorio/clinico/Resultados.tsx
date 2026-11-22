'use client';

import { useState } from 'react';
import { Icono } from '@/components/Icono';
import { fechaCorta } from '@/lib/rubros/barberia/agenda';
import { fueraDeRango, revisarResultado, serie } from '@/lib/rubros/consultorio/clinico/logica';
import { GraficoLinea } from './Graficos';
import type { PropsClinico } from './comun';

/** Bandeja de resultados por revisar (CLI-10): marcar revisado, comentar y ver la evolución. */
export function Resultados({ agenda, clinico, actualizarClinico, config, quien }: PropsClinico) {
  const [filtro, setFiltro] = useState<'pendiente' | 'revisado'>('pendiente');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [coment, setComent] = useState('');
  const lista = clinico.resultados.filter((r) => r.estado === filtro).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const r = abierto ? clinico.resultados.find((x) => x.id === abierto) : null;
  const pac = (id: string) => agenda.clientes.find((c) => c.id === id)?.nombre ?? '';
  const nombres = r ? [...new Set(r.valores.map((v) => v.nombre))] : [];
  return (
    <section className="d-card" aria-labelledby="t-res">
      <h2 id="t-res">Resultados de estudios</h2>
      <p className="sub">Los suben el paciente o el laboratorio. Al revisarlos, el paciente recibe un aviso neutro.</p>
      <div className="seg" role="group" aria-label="Filtrar resultados" style={{ marginBottom: 12 }}>
        <button type="button" aria-pressed={filtro === 'pendiente'} onClick={() => setFiltro('pendiente')}>Por revisar ({clinico.resultados.filter((x) => x.estado === 'pendiente').length})</button>
        <button type="button" aria-pressed={filtro === 'revisado'} onClick={() => setFiltro('revisado')}>Revisados</button>
      </div>
      <div className="cl-dos">
        <ul className="cl-lista" aria-label="Resultados">
          {lista.map((x) => (
            <li key={x.id}>
              <button type="button" className="cl-fila" style={{ width: '100%', textAlign: 'left', outline: abierto === x.id ? '2px solid var(--c-marca-texto)' : undefined }} onClick={() => { setAbierto(x.id); setComent(x.comentario ?? ''); }}>
                <div><strong>{pac(x.pacienteId)}</strong><small>{x.estudio} · {fechaCorta(new Date(x.fecha))} · lo subió {x.origen === 'paciente' ? 'el paciente' : 'el laboratorio'}</small></div>
                {fueraDeRango(x) && <span className="cl-chip av">Fuera de rango</span>}
              </button>
            </li>
          ))}
          {!lista.length && <li className="cl-vacio">{filtro === 'pendiente' ? 'No hay resultados por revisar.' : 'Todavía no revisaste resultados.'}</li>}
        </ul>
        {r ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="cl-tarea">
              <strong style={{ fontSize: 18 }}>{pac(r.pacienteId)} · {r.estudio}</strong>
              <span className="cl-gris">Archivo de ejemplo · {fechaCorta(new Date(r.fecha))}</span>
              {r.valores.length ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                  <thead><tr><th style={{ textAlign: 'left' }}>Valor</th><th style={{ textAlign: 'right' }}>Resultado</th><th style={{ textAlign: 'right' }}>Rango indicado</th></tr></thead>
                  <tbody>{r.valores.map((v) => { const fuera = v.valor < v.rango[0] || v.valor > v.rango[1]; return <tr key={v.nombre}><td style={{ padding: '6px 0', borderTop: '1px solid #eee' }}>{v.nombre}</td><td style={{ textAlign: 'right', borderTop: '1px solid #eee', fontWeight: fuera ? 800 : 400 }}>{v.valor} {v.unidad}{fuera ? ' · fuera de rango' : ''}</td><td style={{ textAlign: 'right', borderTop: '1px solid #eee' }} className="cl-gris">{v.rango[0]} a {v.rango[1]}</td></tr>; })}</tbody>
                </table>
              ) : <p className="cl-gris">Informe en PDF de ejemplo (sin valores para graficar).</p>}
            </div>
            {nombres.map((n) => {
              const s = serie(clinico, r.pacienteId, n);
              return s.length > 1 ? <GraficoLinea key={n} titulo={`${n}: evolución`} detalle={s[0].unidad} puntos={s.map((p) => ({ etiqueta: fechaCorta(new Date(p.fecha)), valor: p.valor }))} formato={(v) => String(Math.round(v))} rango={s[0].rango} /> : null;
            })}
            {r.estado === 'pendiente' ? (
              <form className="cl-form" onSubmit={(e) => { e.preventDefault(); actualizarClinico((c) => revisarResultado(c, r.id, coment, config.negocio, quien)); setAbierto(null); }}>
                <label>Comentario para el paciente<textarea className="c-inp" rows={2} value={coment} onChange={(e) => setComent(e.target.value)} placeholder="Ej.: Valores bien. Seguimos con el mismo plan." /></label>
                <div><button type="submit" className="d-btn prim"><Icono nombre="check" size={18} /> Marcar como revisado</button></div>
              </form>
            ) : <p className="cl-chip ok" style={{ justifySelf: 'start' }}>Revisado{r.comentario ? `: ${r.comentario}` : ''}</p>}
          </div>
        ) : <p className="cl-vacio">Elegí un resultado para verlo.</p>}
      </div>
    </section>
  );
}
