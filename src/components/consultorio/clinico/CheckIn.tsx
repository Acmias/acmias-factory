'use client';

import { useState } from 'react';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { useAhora } from '@/components/barberia/useBarberia';
import { soloDigitos } from '@/lib/utiles';
import { claveDia, hora } from '@/lib/rubros/barberia/agenda';
import { nombreProf, registrarLlegada, salaDeEspera } from '@/lib/rubros/consultorio/clinico/logica';
import { useClinico } from './useClinico';

/**
 * Check-in en recepción (F4): el paciente escanea el QR, avisa que llegó y ve en vivo cuántos
 * pacientes faltan antes que él. No pide datos clínicos.
 */
export function CheckIn({ slug }: { slug: string }) {
  const { config, estado: agenda, clinico, actualizarClinico, estilo, listo } = useClinico(slug);
  const ahora = useAhora();
  const [tel, setTel] = useState('');
  const [turnoId, setTurnoId] = useState<string | null>(null);
  const [error, setError] = useState('');
  if (!config || !agenda || !clinico) return <DemoNoEncontrada listo={listo} />;
  const hoy = claveDia(ahora);
  const deHoy = agenda.turnos.filter((t) => claveDia(t.inicio) === hoy && (t.estado === 'reservado' || t.estado === 'confirmado'));
  const ejemplo = deHoy.filter((t) => !clinico.llegadas.some((l) => l.turnoId === t.id) && +new Date(t.inicio) >= ahora).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const ejemploPac = ejemplo && agenda.clientes.find((c) => c.id === ejemplo.clienteId);

  function avisar(e: React.FormEvent) {
    e.preventDefault();
    const d = soloDigitos(tel);
    const p = agenda!.clientes.find((c) => d.length >= 8 && (c.whatsapp.endsWith(d.slice(-8)) || d.endsWith(c.whatsapp.slice(-8))));
    const t = p && deHoy.filter((x) => x.clienteId === p.id).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
    if (!t) return setError('No encontramos un turno para hoy con ese WhatsApp. Acercate a la recepción.');
    actualizarClinico((c) => registrarLlegada(c, t.id));
    setTurnoId(t.id);
    setError('');
  }

  const turno = turnoId ? agenda.turnos.find((t) => t.id === turnoId) : null;
  const llegada = turnoId ? clinico.llegadas.find((l) => l.turnoId === turnoId) : null;
  const sala = turno ? salaDeEspera(agenda, clinico, turno.profId) : [];
  const pos = sala.findIndex((x) => x.turno.id === turnoId);
  const prof = turno ? agenda.profesionales.find((p) => p.id === turno.profId) : undefined;

  return (
    <div className="cl-portal cl" style={estilo}>
      <AvisoDemo texto="Demo con datos ficticios" />
      <main className="cl-portal-in" style={{ paddingBottom: 40 }}>
        <header style={{ display: 'grid', gap: 2 }}>
          <small className="cl-gris">{config.negocio}</small>
          <h1 style={{ margin: 0, fontSize: 26 }}>Avisá que llegaste</h1>
        </header>
        {!turno ? (
          <form className="d-card cl-form" onSubmit={avisar}>
            <p className="sub" style={{ margin: 0 }}>Escribí tu WhatsApp. No te pedimos el motivo de la consulta.</p>
            <label>WhatsApp<input className="c-inp" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="11 5555 1234" /></label>
            {error && <p role="alert" style={{ margin: 0, color: 'var(--sem-rojo)', fontWeight: 700 }}>{error}</p>}
            <button type="submit" className="d-btn prim" style={{ minHeight: 52 }}>Avisar que llegué</button>
            {ejemploPac && <button type="button" className="d-btn" onClick={() => setTel(ejemploPac.whatsapp)}>Para la demo: usar a {ejemploPac.nombre} (turno {hora(ejemplo.inicio)} h)</button>}
          </form>
        ) : (
          <section className="cl-hero" aria-live="polite" aria-label="Tu lugar en la sala de espera">
            <span>Turno de las {hora(turno.inicio)} h · {nombreProf(prof)}</span>
            {llegada?.atendido || pos < 0 ? (
              <strong>Te están esperando en el consultorio</strong>
            ) : pos === 0 ? (
              <strong>Sos el próximo</strong>
            ) : (
              <strong>{pos === 1 ? 'Falta 1 paciente' : `Faltan ${pos} pacientes`} antes que vos</strong>
            )}
            <span><Icono nombre="check" size={16} /> Avisaste que llegaste a las {llegada ? hora(llegada.fecha) : ''} h. Esta pantalla se actualiza sola.</span>
          </section>
        )}
      </main>
    </div>
  );
}
