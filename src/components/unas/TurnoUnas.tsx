'use client';

import { useState } from 'react';
import { Icono } from '@/components/Icono';
import { enlaceWhatsApp } from '@/lib/utiles';
import { mensajeAlLocal } from '@/lib/rubros/barberia/logica';
import type { EstadoAgenda, Turno } from '@/lib/rubros/barberia/tipos';
import { avisarComprobante, dejarOpinion } from '@/lib/rubros/unas/logica';
import type { DemoConfig } from '@/lib/tipos';
import type { ActualizarAgenda } from '@/components/barberia/useBarberia';
import { DetalleCita } from './DisenoCita';
import { DatosSena } from './ReservaUnas';

/** En el enlace de la clienta: su turno, la seña pendiente y, después de la cita, su opinión. */
export function TurnoUnas({ config, estado, turno, actualizar, enlace }: { config: DemoConfig; estado: EstadoAgenda; turno: Turno; actualizar: ActualizarAgenda; enlace: string }) {
  const c = estado.clientes.find((x) => x.id === turno.clienteId);
  const pendiente = turno.pago?.estadoSena === 'pendiente' && turno.estado !== 'cancelado';
  const ctx = { negocio: config.negocio, moneda: config.moneda, direccion: config.direccion, enlaceTurno: enlace };
  return (
    <>
      {pendiente && c && (
        <section className="un-conf-dis un-paso-final" aria-labelledby="t-sena">
          <h2 id="t-sena" className="bar-h3" style={{ marginTop: 0 }}>Falta la seña para guardar tu lugar</h2>
          <DatosSena estado={estado} monto={turno.pago!.sena} moneda={config.moneda} />
          <a className="bar-btn prim grande" href={enlaceWhatsApp(config.whatsapp, mensajeAlLocal(estado, turno, c, ctx))} target="_blank" rel="noopener noreferrer" onClick={() => actualizar((e) => avisarComprobante(e, turno.id))}>
            <Icono nombre="whatsapp" size={18} /> Mandar comprobante por WhatsApp
          </a>
        </section>
      )}
      <section className="un-conf-dis" aria-labelledby="t-tudis">
        <h2 id="t-tudis" className="bar-h3" style={{ marginTop: 0 }}>Tu turno</h2>
        <DetalleCita estado={estado} cita={turno} moneda={config.moneda} />
      </section>
      {turno.estado === 'atendido' && <Opinar estado={estado} turno={turno} actualizar={actualizar} />}
    </>
  );
}

function Opinar({ estado, turno, actualizar }: { estado: EstadoAgenda; turno: Turno; actualizar: ActualizarAgenda }) {
  const ya = (estado.opiniones ?? []).some((o) => o.turnoToken === turno.token);
  const [n, setN] = useState(0);
  const [texto, setTexto] = useState('');
  const [msg, setMsg] = useState('');
  if (ya) return <p className="bar-ok" role="status"><Icono nombre="check" size={18} /> ¡Gracias por tu opinión!</p>;
  return (
    <section className="un-conf-dis" aria-labelledby="t-opinar">
      <h2 id="t-opinar" className="bar-h3" style={{ marginTop: 0 }}>¿Cómo te atendieron?</h2>
      <div className="un-elegir-estrellas" role="radiogroup" aria-label="Estrellas">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={n === i} aria-label={`${i} ${i === 1 ? 'estrella' : 'estrellas'}`} data-llena={i <= n ? '1' : undefined} onClick={() => setN(i)}>★</button>
        ))}
      </div>
      <label className="un-nota-in">Tu comentario (opcional)
        <textarea className="c-inp" rows={3} maxLength={400} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Me encantó, me atendieron muy bien…" />
      </label>
      {msg && <p className="bar-err" role="alert">{msg}</p>}
      <button
        type="button"
        className="bar-btn prim"
        style={{ marginTop: 10 }}
        onClick={() => {
          let fallo = '';
          const err = actualizar((e) => {
            const r = dejarOpinion(e, turno.token, n, texto);
            if ('error' in r) {
              fallo = r.error;
              return e;
            }
            return r.estado;
          });
          setMsg(fallo || err || '');
        }}
      >
        Publicar opinión
      </button>
    </section>
  );
}
