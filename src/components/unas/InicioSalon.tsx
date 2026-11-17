'use client';

import { opinionesVisibles, promedio } from '@/lib/rubros/unas/logica';
import type { EstadoAgenda } from '@/lib/rubros/barberia/tipos';
import { Estrellas, Galeria, TarjetaOpinion } from './DisenoCita';

/** Catálogo para mirar (tres carpetas) y opiniones de clientas. Lo usan el inicio de la reserva y el sitio. */
export function CatalogoYOpiniones({ estado }: { estado: EstadoAgenda }) {
  const ops = opinionesVisibles(estado);
  const prom = promedio(ops);
  const deEjemplo = ops.some((o) => o.ejemplo);
  return (
    <>
      <section aria-labelledby="t-cat" className="un-inicio-sec">
        <h2 id="t-cat" className="bar-h2">Nuestros diseños</h2>
        <Galeria estado={estado} max={6} />
      </section>
      {ops.length > 0 && (
        <section aria-labelledby="t-op" className="un-inicio-sec">
          <div className="un-op-cab">
            <h2 id="t-op" className="bar-h2" style={{ margin: 0 }}>Lo que dicen las clientas</h2>
            <span className="un-prom"><strong>{prom.toLocaleString('es-AR')}</strong><Estrellas n={prom} /><small>{ops.length} {ops.length === 1 ? 'opinión' : 'opiniones'}</small></span>
          </div>
          {deEjemplo && <p className="bar-ayuda">Opiniones de ejemplo. En tu salón las dejan las clientas después de su cita.</p>}
          <div className="un-opiniones">
            {ops.slice(0, 6).map((o) => <TarjetaOpinion key={o.id} o={o} />)}
          </div>
        </section>
      )}
    </>
  );
}
