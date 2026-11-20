'use client';

import { useEffect, useState } from 'react';
import { useEstadoDe } from '@/lib/almacen';
import { useConfigCargada } from '@/components/demo/useDemoCargada';
import type { EstadoConsorcio } from '@/lib/rubros/consorcio/tipos';

export function useAhoraConsorcio() {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

/** Demo de la administración de consorcios guardada en el dispositivo. */
export function useDemoConsorcio(slug: string) {
  const { config: c, tema, estilo, listo } = useConfigCargada(slug);
  const config = c?.rubro === 'consorcio' ? c : undefined;
  const [e, actualizar] = useEstadoDe<EstadoConsorcio>(slug);
  const estado = config && e?.rubro === 'consorcio' ? e : null;
  const ahora = useAhoraConsorcio();
  return { config, estado, actualizar, tema, estilo, listo, ahora };
}

export type ActualizarConsorcio = (fn: (e: EstadoConsorcio) => EstadoConsorcio) => string | null;

/** Ejecuta una acción que puede fallar y devuelve el error, si hubo. */
export function intentar<T extends { error: string } | { estado: EstadoConsorcio }>(actualizar: ActualizarConsorcio, fn: (e: EstadoConsorcio) => T): { error: string | null; resultado: T | null } {
  let resultado: T | null = null;
  let fallo = '';
  const err = actualizar((e) => {
    const r = fn(e);
    resultado = r;
    if ('error' in r) {
      fallo = r.error;
      return e;
    }
    return r.estado;
  });
  return { error: fallo || err, resultado };
}
