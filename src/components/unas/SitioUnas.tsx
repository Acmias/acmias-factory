'use client';

import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp, formatoPrecio } from '@/lib/utiles';
import { hhmm, nombreDiaSemana } from '@/lib/rubros/barberia/agenda';
import { adicionalesVisibles, carpeta } from '@/lib/rubros/unas/logica';
import { CatalogoYOpiniones } from './InicioSalon';
import { useDemoBarberia } from '@/components/barberia/useBarberia';
import { MuestraUnas } from './MuestraUnas';

/** Sitio del salón de uñas: trabajos del equipo, servicios y reserva con diseño. */
export function SitioUnas({ slug }: { slug: string }) {
  const { config, estado, listo, estilo } = useDemoBarberia(slug);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const wa = enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, quiero hacer una consulta.`);
  const abiertos = [1, 2, 3, 4, 5, 6, 0].filter((d) => estado.horario[d]);
  const h = abiertos.length ? estado.horario[abiertos[0]]! : null;
  const destacados = [...carpeta(estado, 'salon').slice(0, 2), ...carpeta(estado, 'tendencia').slice(0, 1)];
  const extras = adicionalesVisibles(estado);
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
              <h1>Tus uñas, como las soñaste</h1>
              <p>Mirá nuestros diseños, las inspiraciones y las tendencias 2027. Reservá tu turno en un minuto: elegís el servicio, el diseño y el horario.</p>
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
      <section className="s-sec bar un un-sitio-cat">
        <div className="s-in">
          <CatalogoYOpiniones estado={estado} />
          <div className="s-acciones" style={{ marginTop: 18 }}>
            <Link href={`/d/${slug}`} className="s-btn uno"><Icono nombre="calendario" size={18} /> Reservar turno</Link>
          </div>
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
          {extras.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>Diseños adicionales</h3>
              <ul className="sb-servicios">
                {extras.map((a) => (
                  <li key={a.id}><span><strong>{a.nombre}</strong><small>{a.descripcion}</small></span><strong>+ {formatoPrecio(a.precio, config.moneda)}</strong></li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
      <section className="s-sec" style={{ background: 'var(--c-acento-suave)' }}>
        <div className="s-in s-info">
          <div><h3>Cómo reservar</h3><p>Elegí el servicio, si querés un diseño adicional y el horario. Pagás la seña por Mercado Pago y mandás el comprobante por WhatsApp.</p></div>
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
