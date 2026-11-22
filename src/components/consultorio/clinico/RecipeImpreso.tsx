'use client';

import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { DemoNoEncontrada } from '@/components/demo/useDemoCargada';
import { fechaCorta } from '@/lib/rubros/barberia/agenda';
import { PARTICULAR } from '@/lib/rubros/consultorio/datos-ejemplo';
import { NOMBRE_DOC, nombreProf } from '@/lib/rubros/consultorio/clinico/logica';
import { useClinico } from './useClinico';
import { QrDocumento } from './comun';

/**
 * Récipe impreso listo para firmar y sellar (F6). Es un respaldo: en Argentina la receta válida es la
 * electrónica emitida por una plataforma registrada. En otros países, verificar si el papel sigue siendo válido.
 */
export function RecipeImpreso({ slug, id }: { slug: string; id: string }) {
  const { config, estado: agenda, clinico, listo } = useClinico(slug);
  const d = clinico?.documentos.find((x) => x.id === id);
  if (!config || !agenda || !clinico) return <DemoNoEncontrada listo={listo} />;
  if (!d) return <main className="cl-validar"><div className="d-card"><h1 style={{ margin: 0, fontSize: 22 }}>No encontramos ese documento</h1><Link className="d-btn" href={`/d/${slug}/panel`}>Volver al panel</Link></div></main>;
  const prof = agenda.profesionales.find((p) => p.id === d.profId);
  const pac = agenda.clientes.find((c) => c.id === d.pacienteId);
  return (
    <div className="cl-recipe-fondo">
      <div className="cl-recipe-acciones">
        <Link className="d-btn" href={`/d/${slug}/panel`}><Icono nombre="atras" size={18} /> Volver</Link>
        <button type="button" className="d-btn prim" onClick={() => window.print()}><Icono nombre="imprimir" size={18} /> Imprimir</button>
      </div>
      <article className="cl-recipe" aria-label={`${NOMBRE_DOC[d.tipo]} para imprimir`}>
        <header className="cl-recipe-cab">
          <div>
            <strong style={{ fontSize: 22 }}>{config.negocio}</strong>
            <span>{config.direccion || 'Dirección del consultorio'} · WhatsApp {config.whatsapp}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong>{nombreProf(prof)}</strong>
            <span>{prof?.especialidad} · {prof?.matricula}</span>
          </div>
        </header>
        <div className="cl-recipe-datos">
          <span><b>Paciente:</b> {pac?.nombre}</span>
          <span><b>Cobertura:</b> {pac?.cobertura ?? PARTICULAR}{pac?.afiliado ? ` · ${pac.afiliado}` : ''}</span>
          <span><b>Fecha:</b> {fechaCorta(new Date(d.fecha))} {new Date(d.fecha).getFullYear()}</span>
        </div>
        <div className="cl-recipe-cuerpo">
          <span className="cl-recipe-rp">{d.tipo === 'receta' ? 'Rp/' : d.tipo === 'orden' ? 'Solicito:' : 'Certifico que:'}</span>
          <p>{d.tipo === 'certificado' ? `${pac?.nombre} — ${d.texto}.` : d.texto}</p>
        </div>
        <footer className="cl-recipe-pie">
          <div style={{ display: 'grid', gap: 4, justifyItems: 'start' }}>
            <QrDocumento slug={slug} doc={d} prof={prof} negocio={config.negocio} size={96} />
            <small>Código {d.codigo}</small>
          </div>
          <div className="cl-recipe-firma"><span /><small>Firma y sello</small></div>
        </footer>
        <p className="cl-recipe-aviso">Documento de demostración, sin validez legal. Respaldo impreso: en Argentina la receta válida es la electrónica, emitida por una plataforma registrada en ReNaPDiS.</p>
      </article>
    </div>
  );
}
