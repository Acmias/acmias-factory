'use client';

import Link from 'next/link';
import { PanelBarberia } from '@/components/barberia/PanelBarberia';
import { Pacientes } from '@/components/consultorio/Pacientes';
import { reiniciarDatos } from '@/lib/almacen';
import { nombreProf, registrar } from '@/lib/rubros/consultorio/clinico/logica';
import type { Rol, Variante } from '@/lib/rubros/consultorio/clinico/tipos';
import { useClinico } from './useClinico';
import { Consultas, HistoriaClinica } from './Consultas';
import { Resultados } from './Resultados';
import { Presupuestos } from './Presupuestos';
import { Galeria } from './Galeria';
import { Inicio, Reportes } from './Reportes';
import { Administracion } from './Administracion';
import { Simulador } from './Simulador';
import type { PropsClinico } from './comun';

const MEDICO = [
  { id: 'inicio', nombre: 'Inicio' },
  { id: 'agenda', nombre: 'Agenda' },
  { id: 'consultas', nombre: 'Consultas' },
  { id: 'resultados', nombre: 'Resultados' },
  { id: 'presupuestos', nombre: 'Presupuestos' },
  { id: 'galeria', nombre: 'Galería' },
  { id: 'clientes', nombre: 'Pacientes' },
  { id: 'administracion', nombre: 'Administración' },
  { id: 'reportes', nombre: 'Reportes' },
  { id: 'espera', nombre: 'Lista de espera' },
  { id: 'bloqueos', nombre: 'Bloqueos y vacaciones' },
  { id: 'metricas', nombre: 'Métricas' },
  { id: 'ajustes', nombre: 'Ajustes' },
];
/** El profesional ve todo menos las métricas simples de la agenda (las reemplazan los reportes). */
const SOLO_SECRETARIA = ['metricas'];
const SECRETARIA = ['agenda', 'presupuestos', 'clientes', 'administracion', 'espera', 'bloqueos', 'metricas', 'ajustes'];

/**
 * Panel del consultorio (BRD 05 + BRD 15): la agenda de siempre más el módulo clínico.
 * "Ver como" cambia entre el profesional (ve todo lo suyo) y la secretaría (sin datos clínicos).
 */
export function PanelConsultorio({ slug }: { slug: string }) {
  const { config, estado: agenda, actualizar, clinico, actualizarClinico, medico, quien } = useClinico(slug);
  if (!config || !agenda) return <PanelBarberia slug={slug} />;
  // El módulo clínico se crea un instante después de la agenda (clave aparte).
  if (!clinico) return <div style={{ minHeight: '100vh', background: '#f5f6f8' }} aria-busy="true" />;
  const secretaria = clinico.rol === 'secretaria';
  const pestanas = MEDICO.filter((p) => (secretaria ? SECRETARIA.includes(p.id) : !SOLO_SECRETARIA.includes(p.id))).map((p) => (p.id === 'espera' ? { ...p, nombre: `Lista de espera${agenda.espera.length ? ` (${agenda.espera.length})` : ''}` } : p));

  function verComo(v: string) {
    actualizarClinico((c) => {
      const rol: Rol = v === 'secretaria' ? 'secretaria' : 'medico';
      return registrar({ ...c, rol, medicoId: rol === 'medico' ? v : c.medicoId }, 'Demo', `Cambió a la vista de ${rol === 'medico' ? 'profesional' : 'secretaría'}`);
    });
  }
  function mostrarComo(v: Variante) {
    actualizarClinico((c) => ({ ...c, variante: v, medicoId: c.rol === 'medico' ? (v === 'procedimientos' ? 'm-rios' : 'm-mendez') : c.medicoId }));
  }

  const barra = (
    <div className="cl-barra-fondo">
      <div className="cl-barra" role="region" aria-label="Controles de la demo">
        <span>Demo con datos ficticios. No cargues datos reales de pacientes.</span>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label>Ver como
            <select value={secretaria ? 'secretaria' : clinico.medicoId} onChange={(e) => verComo(e.target.value)}>
              {agenda.profesionales.map((p) => <option key={p.id} value={p.id}>{nombreProf(p)}</option>)}
              <option value="secretaria">Secretaría</option>
            </select>
          </label>
          <label>Mostrar como
            <select value={clinico.variante} onChange={(e) => mostrarComo(e.target.value as Variante)}>
              <option value="clinica">Consultorio clínico</option>
              <option value="procedimientos">Estética y procedimientos</option>
            </select>
          </label>
          <Link className="d-btn" href={`/d/${slug}/portal`}>Portal del paciente</Link>
          <button type="button" className="d-btn" onClick={() => { if (window.confirm('¿Reiniciar la demo? Vuelven los datos de ejemplo y se borra todo lo cargado en la visita.')) reiniciarDatos(slug, config.moneda, 'consultorio'); }}>Reiniciar demo</button>
        </div>
      </div>
    </div>
  );

  return (
    <PanelBarberia
      key={`${clinico.rol}-${clinico.medicoId}`}
      slug={slug}
      extras={{
        pestanas,
        inicial: secretaria ? 'agenda' : 'inicio',
        subtitulo: secretaria ? 'Agenda de la secretaría' : `Panel de ${nombreProf(medico)}`,
        barra,
        flotante: <Simulador slug={slug} agenda={agenda} clinico={clinico} actualizarClinico={actualizarClinico} negocio={config.negocio} />,
        render: (id, irA) => {
          const props: PropsClinico = { slug, config, agenda, actualizar, clinico, actualizarClinico, quien, medico, irA };
          if (id === 'inicio') return <Inicio {...props} />;
          if (id === 'consultas') return <Consultas {...props} />;
          if (id === 'resultados') return <Resultados {...props} />;
          if (id === 'presupuestos') return <Presupuestos {...props} />;
          if (id === 'galeria') return <Galeria {...props} />;
          if (id === 'reportes') return <Reportes {...props} />;
          if (id === 'administracion') return <Administracion {...props} />;
          if (id === 'clientes')
            return <Pacientes estado={agenda} actualizar={actualizar} historia={secretaria ? () => <div className="cl-aviso" role="note">Solo el profesional ve la historia clínica. Desde la secretaría se ven los datos de contacto, la cobertura y los turnos.</div> : (p) => <HistoriaClinica slug={slug} agenda={agenda} clinico={clinico} actualizarClinico={actualizarClinico} paciente={p} negocio={config.negocio} quien={quien} />} />;
          return null;
        },
      }}
    />
  );
}
