'use client';

import { useEffect } from 'react';
import { iniciarEstadoDe, reemplazarEstadoDe, useEstadoDe } from '@/lib/almacen';
import { useDemoBarberia } from '@/components/barberia/useBarberia';
import { VERSION_CLINICO, crearClinico } from '@/lib/rubros/consultorio/clinico/datos';
import { nombreProf } from '@/lib/rubros/consultorio/clinico/logica';
import type { EstadoClinico } from '@/lib/rubros/consultorio/clinico/tipos';

/** Agenda del consultorio + módulo clínico (clave aparte, datos ficticios). */
export function useClinico(slug: string) {
  const base = useDemoBarberia(slug);
  const { config, estado: agenda } = base;
  const [c, actualizarClinico] = useEstadoDe<EstadoClinico>(`${slug}:clinico`);
  const clinico = c && c.version === VERSION_CLINICO ? c : null;

  useEffect(() => {
    if (config?.rubro !== 'consultorio' || !agenda || clinico) return;
    // Datos de una versión anterior del módulo: se regeneran (son de ejemplo).
    if (c) reemplazarEstadoDe(`${slug}:clinico`, crearClinico(agenda, config.moneda));
    else iniciarEstadoDe(`${slug}:clinico`, () => crearClinico(agenda, config.moneda));
  }, [config, agenda, clinico, c, slug]);

  const medico = agenda?.profesionales.find((p) => p.id === clinico?.medicoId) ?? agenda?.profesionales[0];
  const quien = clinico?.rol === 'secretaria' ? 'Secretaría (demo)' : `${nombreProf(medico)} (demo)`;
  return { ...base, clinico, actualizarClinico, medico, quien };
}
