'use client';

import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { AvisoDemo, DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { enlaceWhatsApp } from '@/lib/utiles';
import { unidadesDe } from '@/lib/rubros/consorcio/logica';
import { useDemoConsorcio } from './useConsorcio';

const PUNTOS = [
  { icono: 'planilla' as const, titulo: 'Expensas claras y en regla', texto: 'Liquidación y recibo con todo lo que pide la Ley 14.701: gastos con su factura, personal, seguros, honorarios y estado de cuentas.' },
  { icono: 'whatsapp' as const, titulo: 'Todo por WhatsApp', texto: 'Cada vecino recibe su expensa con un enlace propio, los recordatorios de vencimiento y los comunicados del edificio.' },
  { icono: 'carrito' as const, titulo: 'Pagás con Mercado Pago', texto: 'Desde el enlace, en un minuto. El dinero va directo a la cuenta de tu consorcio y el recibo llega solo.' },
  { icono: 'llave' as const, titulo: 'Obras con fotos', texto: 'Presupuestos comparados y fotos de antes, durante y después de cada trabajo, a la vista de todos.' },
];

/** Sitio de la administración: qué ofrece, edificios administrados y acceso de vecinos. */
export function SitioConsorcio({ slug }: { slug: string }) {
  const { config, estado, listo, estilo } = useDemoConsorcio(slug);
  if (!config || !estado) return <DemoNoEncontrada listo={listo} />;
  const wa = enlaceWhatsApp(config.whatsapp, `Hola ${config.negocio}, quiero pedir un presupuesto para administrar mi edificio.`);
  return (
    <div className="sitio cs-sitio" style={estilo}>
      <AvisoDemo texto="Edificios y datos de ejemplo" />
      <section className="cs-s-hero">
        <div className="s-in">
          <nav className="s-nav" aria-label="Principal">
            <strong style={{ fontFamily: 'var(--fuente-carta)', fontSize: 20 }}>{config.negocio}</strong>
            <Link href={`/d/${slug}`} className="s-btn dos" style={{ minHeight: 44, padding: '0 16px' }}>Soy vecino</Link>
          </nav>
          <h1>Tu edificio, en orden y a la vista</h1>
          <p>Administración de consorcios en Caseros y Tres de Febrero. Expensas claras, cobro con Mercado Pago y todo por WhatsApp.</p>
          <div className="s-acciones">
            <a href={wa} className="s-btn uno" target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" /> Pedí presupuesto para tu edificio</a>
            <Link href={`/d/${slug}`} className="s-btn dos"><Icono nombre="usuario" size={18} /> Ver mi expensa</Link>
          </div>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in">
          <h2>Cómo trabajamos</h2>
          <div className="cs-s-puntos">
            {PUNTOS.map((x) => (
              <article key={x.titulo}>
                <span aria-hidden="true"><Icono nombre={x.icono} size={22} /></span>
                <h3>{x.titulo}</h3>
                <p>{x.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="s-sec" style={{ background: 'var(--c-acento-suave)' }}>
        <div className="s-in">
          <h2>Edificios que administramos</h2>
          <ul className="cs-s-eds">
            {estado.edificios.map((ed) => (
              <li key={ed.id}>
                <strong>{ed.nombre}</strong>
                <span>{ed.localidad}</span>
                <small>{unidadesDe(estado, ed.id).length} unidades{ed.espacio ? ` · ${ed.espacio.nombre}` : ''}</small>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="s-sec">
        <div className="s-in s-info">
          <div><h3>Matrícula</h3><p>{estado.administracion.matricula}. Registro Público de Administradores de Consorcios de la Provincia de Buenos Aires.</p></div>
          <div><h3>Oficina</h3><p>{config.direccion || estado.administracion.domicilio}</p></div>
          <div><h3>Contacto</h3><p><a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp de la administración</a></p></div>
        </div>
      </section>
      <footer style={{ padding: '24px 20px', fontSize: 13 }} className="cs-gris">
        <div className="s-in">{config.negocio} · Sitio de demostración hecho con ACMIAS</div>
      </footer>
    </div>
  );
}
