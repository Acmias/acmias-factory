'use client';

import { useSyncExternalStore } from 'react';
import { Icono } from '@/components/Icono';
import { useConfigCargada } from '@/components/demo/useDemoCargada';
import { fechaCorta, hora } from '@/lib/rubros/barberia/agenda';
import { NOMBRE_DOC, leerValidacion } from '@/lib/rubros/consultorio/clinico/logica';

const sinSuscripcion = () => () => {};

/**
 * Validación pública del QR (CLI-08): muestra solo que el documento existe, de qué tipo es, quién lo
 * emitió y cuándo. Nunca su contenido. Los datos viajan en el enlace, así se valida desde otro celular.
 */
export function ValidarDocumento({ slug }: { slug: string }) {
  const { estilo } = useConfigCargada(slug);
  const hash = useSyncExternalStore(sinSuscripcion, () => window.location.hash, () => '');
  const listo = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const d = hash ? leerValidacion(hash) : null;
  return (
    <main className="cl-validar" style={estilo}>
      <div className="d-card" aria-live="polite">
        {!listo ? null : d ? (
          <>
            <span className="cl-chip ok" style={{ justifySelf: 'center', fontSize: 14, padding: '6px 12px' }}><Icono nombre="check" size={16} /> Documento encontrado</span>
            <h1 style={{ margin: 0, fontSize: 24 }}>{NOMBRE_DOC[d.t] ?? 'Documento'}</h1>
            <p style={{ margin: 0 }}>Emitido por <strong>{d.p}</strong>{d.m ? ` · ${d.m}` : ''}</p>
            <p style={{ margin: 0 }} className="cl-gris">{d.n} · {fechaCorta(new Date(d.f))} {hora(d.f)} h · Código {d.c}</p>
            <p className="cl-aviso" style={{ margin: '6px 0 0' }}>Documento de demostración: sin validez legal. En producción, la receta se emite por una plataforma registrada y lleva su clave única de identificación.</p>
            <p className="cl-gris" style={{ margin: 0, fontSize: 13 }}>Por privacidad, esta página no muestra el contenido del documento.</p>
          </>
        ) : (
          <>
            <h1 style={{ margin: 0, fontSize: 22 }}>No pudimos leer el código</h1>
            <p className="cl-gris" style={{ margin: 0 }}>Volvé a escanear el QR del documento o pedile al consultorio uno nuevo.</p>
          </>
        )}
      </div>
    </main>
  );
}
