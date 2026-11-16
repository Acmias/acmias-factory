'use client';

import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp, formatoPrecio } from '@/lib/utiles';
import { hhmm, nombreDiaSemana } from '@/lib/rubros/barberia/agenda';
import { NOMBRE_FORMA, deQuien, trabajosDe } from '@/lib/rubros/unas/logica';
import { useDemoBarberia } from '@/components/barberia/useBarberia';
import { MuestraUnas } from './MuestraUnas';

/** Sitio del salón de uñas: trabajos del equipo, servicios y reserva con diseño. */
export function SitioUnas({ slug }: { slug: string }) {
  const { config, estado, listo, estilo } = useDemoBarberia(slug);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const wa = enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, quiero hacer una consulta.`);
  const abiertos = [1, 2, 3, 4, 5, 6, 0].filter((d) => estado.horario[d]);
  const h = abiertos.length ? estado.horario[abiertos[0]]! : null;
  const visibles = (estado.disenos ?? []).filter((d) => d.visible);
  const destacados = visibles.slice(0, 3);
  return (
    <div className="sitio un-sitio" style={estilo}>
      <AvisoDemo texto="Manicuristas, diseños y precios de ejemplo" />
      <section className="un-s-hero">
        <div className="s-in">
          <nav className="s-nav" aria-label="Principal">
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {config.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.logo} alt="" style={{ width: 48, height: 48, borderRadius: 12, background: '#fff', objectFit: 'contain', padding: 5 }} />
              ) : (
                <span className="c-inicial" style={{ width: 48, height: 48, fontSize: 22, borderRadius: 12 }} aria-hidden="true">{config.negocio[0]?.toUpperCase()}</span>
              )}
              <strong style={{ fontFamily: 'var(--fuente-carta)', fontSize: 20 }}>{config.negocio}</strong>
            </span>
            <Link href={`/d/${slug}`} className="s-btn dos" style={{ minHeight: 44, padding: '0 16px' }}>Reservar</Link>
          </nav>
          <div className="un-s-hero-in">
            <div>
              <h1>Elegí con quién, cuándo y tu diseño</h1>
              <p>Mirá los trabajos de cada manicurista, elegí uno o traé tu idea de Pinterest. Queda guardado en tu cita y te esperamos con los esmaltes listos.</p>
              <div className="s-acciones">
                <Link href={`/d/${slug}`} className="s-btn uno"><Icono nombre="calendario" size={18} /> Reservar cita</Link>
                <a href={wa} className="s-btn dos" target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" /> Escribinos</a>
              </div>
            </div>
            <div className="un-s-abanico" aria-hidden="true">
              {destacados.map((d) => <MuestraUnas key={d.id} diseno={d} className="un-muestra grande" />)}
            </div>
          </div>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in">
          <h2>El equipo y sus trabajos</h2>
          <div className="un-s-equipo">
            {estado.profesionales.map((p) => (
              <article key={p.id}>
                <h3>{p.nombre}</h3>
                <p>{p.especialidad}</p>
                <ul>
                  {trabajosDe(estado, p.id).slice(0, 4).map((d) => (
                    <li key={d.id}><MuestraUnas diseno={d} titulo={d.nombre} /><span>{d.nombre}<small>{NOMBRE_FORMA[d.forma]}</small></span></li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="un-s-nota">Las ilustraciones son de ejemplo: en tu sitio van las fotos reales de cada trabajo.</p>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in">
          <h2>Del catálogo del equipo</h2>
          <ul className="un-s-cat">
            {visibles.filter((d) => d.autora === 'equipo').map((d) => (
              <li key={d.id}><MuestraUnas diseno={d} titulo={d.nombre} /><span>{d.nombre}<small>{deQuien(estado, d)}</small></span></li>
            ))}
          </ul>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in">
          <h2>Servicios</h2>
          <ul className="sb-servicios">
            {estado.servicios.map((s) => (
              <li key={s.id}>
                <span><strong>{s.nombre}</strong><small>{s.duracion} min · {s.descripcion}</small></span>
                <strong>{formatoPrecio(s.precio, config.moneda)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="s-sec" style={{ background: 'var(--c-acento-suave)' }}>
        <div className="s-in s-info">
          <div><h3>Cómo reservar</h3><p>Elegí manicurista, servicio, día y hora. Después tu diseño: uno de ella, uno del equipo o el enlace de Pinterest.</p></div>
          <div><h3>Horario</h3><p>{h ? `${abiertos.length > 2 && abiertos.every((d, i) => i === 0 || d === (abiertos[i - 1] + 1) % 7) ? `De ${nombreDiaSemana(abiertos[0])} a ${nombreDiaSemana(abiertos[abiertos.length - 1])}` : abiertos.map(nombreDiaSemana).join(', ')} de ${hhmm(h[0])} a ${hhmm(h[1])} h.` : 'A confirmar.'}</p></div>
          <div><h3>Dónde estamos</h3><p>{config.direccion || '[Dirección del salón]'}</p></div>
        </div>
      </section>
      <footer style={{ padding: '24px 20px', fontSize: 13 }} className="un-gris">
        <div className="s-in">{config.negocio} · Sitio de demostración hecho con ACMIAS</div>
      </footer>
    </div>
  );
}
