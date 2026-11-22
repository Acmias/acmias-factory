'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { hora } from '@/lib/rubros/barberia/agenda';
import { agregarMensaje, type ActualizarClinico } from '@/lib/rubros/consultorio/clinico/logica';
import type { EstadoAgenda } from '@/lib/rubros/barberia/tipos';
import type { EstadoClinico, Mensaje } from '@/lib/rubros/consultorio/clinico/tipos';

/** Respuestas fijas de la secretaria virtual: ante una pregunta de salud nunca da consejos (F13). */
function respuestas(agenda: EstadoAgenda, negocio: string): { pregunta: string; respuesta: string; boton?: Mensaje['boton'] }[] {
  const cob = (agenda.coberturas ?? []).join(', ');
  return [
    { pregunta: '¿Con qué coberturas atienden?', respuesta: `En ${negocio} trabajamos con ${cob}. ¿Querés reservar un turno?`, boton: { texto: 'Reservar turno', destino: 'reserva' } },
    { pregunta: 'Quiero un turno', respuesta: 'Podés elegir profesional, día y horario desde acá, sin llamar.', boton: { texto: 'Reservar turno', destino: 'reserva' } },
    { pregunta: 'Me duele el pecho, ¿qué tomo?', respuesta: 'No puedo darte indicaciones de salud por este medio. Si es una urgencia, llamá al servicio de emergencias. ¿Querés que alguien del consultorio te contacte?' },
  ];
}

/**
 * Simulador de WhatsApp (DEMO 15): muestra lo que recibiría el paciente. No manda mensajes reales.
 * En el panel se elige el paciente; en el portal muestra los mensajes del paciente que entró.
 */
export function Simulador({ slug, agenda, clinico, actualizarClinico, negocio, pacienteId: fijo, abierto: abiertoInicial = false }: {
  slug: string;
  agenda: EstadoAgenda;
  clinico: EstadoClinico;
  actualizarClinico: ActualizarClinico;
  negocio: string;
  pacienteId?: string;
  abierto?: boolean;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const ultimoDe = [...clinico.mensajes].reverse()[0]?.pacienteId;
  const [elegido, setElegido] = useState<string | null>(null);
  const pacienteId = fijo ?? elegido ?? ultimoDe ?? agenda.clientes[0]?.id;
  const msgs = clinico.mensajes.filter((m) => m.pacienteId === pacienteId);
  const chat = useRef<HTMLDivElement>(null);
  const total = clinico.mensajes.length;
  const [vistos, setVistos] = useState(total);
  const nuevos = Math.max(0, total - vistos);

  useEffect(() => {
    if (abierto) chat.current?.scrollTo({ top: chat.current.scrollHeight });
  }, [abierto, msgs.length]);

  const destino = (b: NonNullable<Mensaje['boton']>) =>
    b.destino === 'reserva' ? `/d/${slug}` : b.destino === 'presupuesto' ? `/d/${slug}/portal#presupuesto=${b.ref ?? ''}` : `/d/${slug}/portal`;

  function preguntar(i: number) {
    if (!pacienteId) return;
    const r = respuestas(agenda, negocio)[i];
    actualizarClinico((c) => agregarMensaje(agregarMensaje(c, { pacienteId, texto: r.pregunta, delPaciente: true }), { pacienteId, texto: r.respuesta, boton: r.boton }));
  }

  return (
    <>
      <button type="button" className="cl-sim-boton" aria-expanded={abierto} aria-controls="cl-sim" onClick={() => { setAbierto((x) => !x); setVistos(total); }}>
        <Icono nombre="whatsapp" size={20} /> {abierto ? 'Cerrar simulador' : 'Simulador de WhatsApp'}
        {!abierto && nuevos > 0 && <span className="n" aria-label={`${nuevos} mensajes nuevos`}>{nuevos}</span>}
      </button>
      {abierto && (
        <section id="cl-sim" className="cl-sim" aria-label="Simulador de WhatsApp">
          <div className="cl-sim-rot">Simulación: así lo recibiría el paciente</div>
          <div className="cl-sim-cab">
            <span className="bar-avatar" aria-hidden="true">{negocio[0]?.toUpperCase()}</span>
            <div style={{ display: 'grid', minWidth: 0 }}>
              <strong style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{negocio}</strong>
              <small className="cl-gris">Cuenta del consultorio</small>
            </div>
            {!fijo && (
              <select aria-label="Ver los mensajes de" value={pacienteId} onChange={(e) => setElegido(e.target.value)}>
                {agenda.clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            )}
            <button type="button" className="cl-sim-cerrar" aria-label="Cerrar el simulador" onClick={() => setAbierto(false)} style={fijo ? { marginLeft: 'auto' } : undefined}><Icono nombre="cerrar" size={18} /></button>
          </div>
          <div className="cl-sim-chat" ref={chat} aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={`cl-burbuja${m.delPaciente ? ' mia' : ''}`}>
                <p>{m.texto}</p>
                <time dateTime={m.fecha}>{hora(m.fecha)}</time>
                {m.boton && <Link href={destino(m.boton)}>{m.boton.texto}</Link>}
              </div>
            ))}
            {!msgs.length && <p className="cl-gris" style={{ textAlign: 'center', margin: '24px 0' }}>Todavía no hay mensajes para este paciente.</p>}
          </div>
          <div className="cl-sim-pie" aria-label="Probar la secretaria virtual">
            {respuestas(agenda, negocio).map((r, i) => <button key={r.pregunta} type="button" onClick={() => preguntar(i)}>{r.pregunta}</button>)}
          </div>
        </section>
      )}
    </>
  );
}
