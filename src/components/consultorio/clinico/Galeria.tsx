'use client';

import { useState } from 'react';
import { Icono } from '@/components/Icono';
import { fechaCorta, hora } from '@/lib/rubros/barberia/agenda';
import { MSJ, agregarMensaje, registrar } from '@/lib/rubros/consultorio/clinico/logica';
import type { PermisosImagen } from '@/lib/rubros/consultorio/clinico/tipos';
import { Comparador, PedirPin, type PropsClinico } from './comun';

export const NOMBRE_PERMISO: [keyof Omit<PermisosImagen, 'firmado'>, string][] = [
  ['historia', 'Guardar en la historia clínica'],
  ['academico', 'Uso académico'],
  ['publicidadSinRostro', 'Publicidad sin mostrar el rostro'],
  ['publicidadConRostro', 'Publicidad con rostro'],
];

/** Galería clínica protegida (CLI-14 a CLI-17): PIN, marca de agua, sin descarga y cada apertura registrada. */
export function Galeria({ agenda, clinico, actualizarClinico, config, quien }: PropsClinico) {
  const conFotos = [...new Set(clinico.fotos.map((f) => f.pacienteId))];
  const [pac, setPac] = useState(conFotos[0] ?? '');
  const [abierta, setAbierta] = useState(false);
  const [msg, setMsg] = useState('');
  const paciente = agenda.clientes.find((c) => c.id === pac);
  const fotos = clinico.fotos.filter((f) => f.pacienteId === pac).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const antes = fotos.find((f) => f.momento === 'antes');
  const despues = [...fotos].reverse().find((f) => f.momento !== 'antes');
  const permisos = clinico.permisos[pac];
  const accesos = clinico.accesos.filter((a) => paciente && a.que.includes(paciente.nombre) && a.que.includes('galería')).slice(-5).reverse();

  function abrir() {
    setAbierta(true);
    actualizarClinico((c) => registrar(c, quien, `Abrió la galería de ${paciente?.nombre}`));
  }

  return (
    <section className="d-card" aria-labelledby="t-gal">
      <h2 id="t-gal">Galería protegida</h2>
      <p className="sub">Las fotos no quedan en el celular del profesional. En la demo son ilustraciones, nunca fotos de personas.</p>
      <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: 14, maxWidth: 420, marginBottom: 14 }}>Paciente
        <select className="c-inp" value={pac} onChange={(e) => { setPac(e.target.value); setAbierta(false); setMsg(''); }}>
          {conFotos.map((id) => <option key={id} value={id}>{agenda.clientes.find((c) => c.id === id)?.nombre}</option>)}
        </select>
      </label>
      {!abierta ? <PedirPin pin={clinico.pin} onOk={abrir} titulo={`Galería de ${paciente?.nombre ?? ''}`} detalle="Solo el profesional puede abrirla." /> : (
        <div className="cl-dos" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
          <div style={{ display: 'grid', gap: 12 }}>
            {antes && despues ? (
              <Comparador antes={antes.dibujo} despues={despues.dibujo} marca={`${config.negocio} · ${paciente?.nombre} · ${fechaCorta(new Date(despues.fecha))}`} />
            ) : <p className="cl-vacio">Falta una foto para comparar.</p>}
            <p className="cl-gris" style={{ margin: 0 }}>{antes ? `Antes: ${fechaCorta(new Date(antes.fecha))}` : ''}{despues ? ` · Después: ${fechaCorta(new Date(despues.fecha))}` : ''} · {fotos[0]?.zona}. Sin botón de descarga: la marca de agua identifica consultorio, paciente y fecha.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="d-btn prim" onClick={() => { actualizarClinico((c) => registrar(agregarMensaje(c, { pacienteId: pac, texto: MSJ.novedad(config.negocio), boton: { texto: 'Ver en mi portal', destino: 'portal' } }), quien, `Compartió la galería de ${paciente?.nombre} con la paciente`)); setMsg('La paciente puede verla en su portal, con su propio PIN.'); }}>Mostrar a la paciente</button>
              <button type="button" className="d-btn" onClick={() => { actualizarClinico((c) => registrar({ ...c, fotos: [...c.fotos, { id: `f${Date.now().toString(36)}`, pacienteId: pac, fecha: new Date().toISOString(), zona: fotos[0]?.zona ?? 'Zona tratada', momento: 'control', dibujo: 1 }] }, quien, `Tomó una foto de control en la galería de ${paciente?.nombre}`)); setMsg('Foto de control guardada directo en la ficha (ilustración de ejemplo).'); }}><Icono nombre="subir" size={18} /> Tomar foto de control</button>
              <button type="button" className="d-btn" onClick={() => setAbierta(false)}><Icono nombre="candado" size={18} /> Bloquear</button>
            </div>
            {msg && <p role="status" style={{ margin: 0, fontWeight: 600 }}>{msg}</p>}
          </div>
          <aside style={{ display: 'grid', gap: 12 }}>
            <div className="cl-tarea">
              <strong style={{ fontSize: 16 }}>Lo que autorizó la paciente</strong>
              {permisos ? NOMBRE_PERMISO.map(([k, t]) => <span key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{t}</span><span className={`cl-chip ${permisos[k] ? 'ok' : ''}`}>{permisos[k] ? 'Sí' : 'No'}</span></span>) : <span>Sin consentimiento firmado.</span>}
              {permisos && <small className="cl-gris">Firmado el {fechaCorta(new Date(permisos.firmado))}. Lo puede revocar desde su portal.</small>}
            </div>
            <div className="cl-tarea">
              <strong style={{ fontSize: 16 }}>Quién abrió la galería</strong>
              {accesos.map((a, i) => <span key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14 }}><span>{a.quien}</span><span className="cl-gris">{fechaCorta(new Date(a.fecha))} {hora(a.fecha)}</span></span>)}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
