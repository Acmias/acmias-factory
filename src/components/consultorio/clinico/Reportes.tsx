'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icono } from '@/components/Icono';
import { useAhora } from '@/components/barberia/useBarberia';
import { formatoPrecio } from '@/lib/utiles';
import { DIA_MS, claveDia, fechaCorta, turnosDelDia } from '@/lib/rubros/barberia/agenda';
import { DIAGNOSTICOS } from '@/lib/rubros/consultorio/clinico/datos';
import { NOMBRE_DOC, edad, salaDeEspera, invitar, listasDeTrabajo, margenPorProcedimiento, mezclaCoberturas, nutricion, pediatria, porSemana, statsPresupuestos } from '@/lib/rubros/consultorio/clinico/logica';
import { GraficoBarras, GraficoLinea } from './Graficos';
import type { PropsClinico } from './comun';

function ListaInvitar({ titulo, detalle, ids, lista, props }: { titulo: string; detalle: string; ids: string[]; lista: string; props: PropsClinico }) {
  const { agenda, clinico, actualizarClinico, config, quien } = props;
  const hoy = claveDia(useAhora());
  const yaHoy = clinico.invitaciones.some((i) => i.lista === lista && claveDia(i.fecha) === hoy);
  const nombres = ids.map((id) => agenda.clientes.find((c) => c.id === id)?.nombre).filter(Boolean) as string[];
  return (
    <div className="cl-tarea">
      <strong>{ids.length}</strong>
      <p style={{ fontWeight: 700 }}>{titulo}</p>
      <p className="cl-gris">{detalle}</p>
      {nombres.length > 0 && <p className="cl-gris" style={{ fontSize: 14 }}>{nombres.slice(0, 5).join(', ')}{nombres.length > 5 ? ` y ${nombres.length - 5} más` : ''}</p>}
      {yaHoy ? <span className="cl-chip ok"><Icono nombre="check" size={12} /> Invitados hoy</span> : (
        <button type="button" className="d-btn prim" disabled={!ids.length} onClick={() => actualizarClinico((c) => invitar(c, agenda, lista, ids, config.negocio, quien))}>Invitar a sacar turno</button>
      )}
    </div>
  );
}

/** Inicio del panel clínico: el día, y lo que hay para hacer con un botón al lado. */
export function Inicio(props: PropsClinico) {
  const { slug, agenda, clinico, config, irA } = props;
  const ahora = useAhora();
  const hoy = turnosDelDia(agenda.turnos, new Date(ahora)).filter((t) => t.estado !== 'cancelado');
  const precio = new Map(agenda.servicios.map((s) => [s.id, s.precio]));
  const cobrado = hoy.filter((t) => t.estado === 'atendido').reduce((s, t) => s + (precio.get(t.servicioId) ?? 0), 0);
  const l = listasDeTrabajo(agenda, clinico, ahora);
  const st = statsPresupuestos(clinico, ahora);
  const proc = clinico.variante === 'procedimientos';
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section className="d-card" aria-labelledby="t-hoy">
        <h2 id="t-hoy">Hoy en {config.negocio}</h2>
        <div className="cl-grid">
          <div className="cl-kpi"><strong>{hoy.length}</strong><span>turnos hoy</span></div>
          <div className="cl-kpi"><strong>{hoy.filter((t) => t.estado === 'atendido').length}</strong><span>atendidos</span></div>
          <div className="cl-kpi"><strong>{salaDeEspera(agenda, clinico).length}</strong><span>en sala de espera</span></div>
          <div className="cl-kpi"><strong>{hoy.filter((t) => t.estado === 'ausente').length}</strong><span>ausentes</span></div>
          <div className="cl-kpi"><strong>{formatoPrecio(cobrado, config.moneda)}</strong><span>en consultas atendidas</span></div>
        </div>
      </section>
      <section className="d-card" aria-labelledby="t-hacer">
        <h2 id="t-hacer">Para hacer hoy</h2>
        <p className="sub">Cada número trae su botón. Los mensajes al paciente son neutros: nunca dicen especialidad ni motivo.</p>
        <div className="cl-grid">
          {proc && <div className="cl-tarea"><strong>{st.sinRespuesta.length}</strong><p>presupuestos vistos sin respuesta</p><button type="button" className="d-btn prim" onClick={() => irA('presupuestos')}>Ver presupuestos</button></div>}
          {proc ? <ListaInvitar titulo="retoques pendientes" detalle="Procedimientos de hace más de 4 meses sin turno nuevo." ids={l.retoques} lista="Retoques pendientes" props={props} /> : <ListaInvitar titulo="pacientes con el control vencido" detalle="Crónicos que no reservaron el control que les indicaste." ids={l.controlesVencidos} lista="Controles vencidos" props={props} />}
          <div className="cl-tarea"><strong>{l.resultadosPendientes.length}</strong><p>resultados esperan tu revisión</p><button type="button" className="d-btn prim" onClick={() => irA('resultados')}>Revisar resultados</button></div>
          {!proc && <div className="cl-tarea"><strong>{st.sinRespuesta.length}</strong><p>presupuestos vistos sin respuesta</p><button type="button" className="d-btn" onClick={() => irA('presupuestos')}>Ver presupuestos</button></div>}
        </div>
      </section>
      <section className="d-card" aria-labelledby="t-acc">
        <h2 id="t-acc">Accesos rápidos</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="d-btn" onClick={() => irA('consultas')}><Icono nombre="lista" size={18} /> Consultas de hoy</button>
          <button type="button" className="d-btn" onClick={() => irA('agenda')}><Icono nombre="calendario" size={18} /> Agenda</button>
          <button type="button" className="d-btn" onClick={() => irA('reportes')}><Icono nombre="grafico" size={18} /> Reportes</button>
          <Link className="d-btn" href={`/d/${slug}/portal`}><Icono nombre="usuario" size={18} /> Portal del paciente</Link>
        </div>
      </section>
    </div>
  );
}

type Seccion = 'ingresos' | 'pacientes' | 'agenda' | 'clinicos' | 'presupuestos' | 'especialidad';

/** Reportes R1 a R7 con datos ficticios de la demo (últimas 5 semanas). */
export function Reportes(props: PropsClinico) {
  const { agenda, clinico, config, medico } = props;
  const ahora = useAhora();
  const [sec, setSec] = useState<Seccion>('ingresos');
  const sem = porSemana(agenda, ahora);
  const mix = mezclaCoberturas(agenda, ahora);
  const l = listasDeTrabajo(agenda, clinico, ahora);
  const st = statsPresupuestos(clinico, ahora);
  const fmt = (n: number) => formatoPrecio(n, config.moneda);
  const fechaCortaDe = (iso: string) => { const d = new Date(iso); return `${d.getDate()}/${d.getMonth() + 1}`; };
  const SECC: [Seccion, string][] = [['ingresos', 'Ingresos'], ['pacientes', 'Pacientes'], ['agenda', 'Agenda'], ['clinicos', 'Clínicos'], ['presupuestos', 'Presupuestos'], ['especialidad', 'Mi especialidad']];

  function exportar() {
    const filas: (string | number)[][] = sec === 'ingresos' || sec === 'agenda'
      ? [['Semana', 'Ingresos', 'Turnos', 'Ausentes', 'Ausentismo %'], ...sem.map((s) => [s.etiqueta, s.ingresos, s.turnos, s.ausentes, s.ausentismo])]
      : sec === 'presupuestos' ? [['Código', 'Procedimiento', 'Estado', 'Total'], ...clinico.presupuestos.map((p) => [p.codigo, p.procedimiento, p.estado, p.items.reduce((a, i) => a + i.monto, 0)])]
        : [['Lista', 'Pacientes'], ['Controles vencidos', l.controlesVencidos.length], ['Inactivos', l.inactivos.length], ['Retoques pendientes', l.retoques.length], ['Resultados por revisar', l.resultadosPendientes.length]];
    const csv = filas.map((f) => f.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `reporte-${sec}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const ausTotal = sem.reduce((a, s) => a + s.ausentes, 0);
  const turTotal = sem.reduce((a, s) => a + s.turnos, 0);
  const nuevos = agenda.clientes.filter((c) => +new Date(c.creado) > ahora - 30 * DIA_MS).length;
  const diagnosticos = DIAGNOSTICOS.map((d) => [d, clinico.evoluciones.filter((e) => e.diagnostico === d).length] as const).filter((x) => x[1]).sort((a, b) => b[1] - a[1]);
  const docs = (['receta', 'certificado', 'orden'] as const).map((t) => [NOMBRE_DOC[t], clinico.documentos.filter((d) => d.tipo === t).length] as const);
  const margen = margenPorProcedimiento(clinico);
  const ped = pediatria(agenda, clinico, ahora);
  const nut = nutricion(agenda, clinico, ahora);
  const pid = medico?.id ?? 'm-mendez';
  const nombreEsp = pid === 'm-rios' ? 'medicina estética' : pid === 'm-paz' ? 'pediatría' : pid === 'm-castillo' ? 'nutrición' : 'clínica médica';

  return (
    <section className="d-card" aria-labelledby="t-rep">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div><h2 id="t-rep">Reportes</h2><p className="sub">Datos ficticios de demostración, últimas 5 semanas.</p></div>
        <button type="button" className="d-btn" onClick={exportar}><Icono nombre="planilla" size={18} /> Exportar a Excel (CSV)</button>
      </div>
      <div className="seg" role="group" aria-label="Tipo de reporte" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        {SECC.map(([id, n]) => <button key={id} type="button" aria-pressed={sec === id} onClick={() => setSec(id)}>{n}</button>)}
      </div>

      {sec === 'ingresos' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="cl-grid">
            <div className="cl-kpi"><strong>{fmt(sem.reduce((a, s) => a + s.ingresos, 0))}</strong><span>en consultas atendidas (5 semanas)</span></div>
            <div className="cl-kpi"><strong>{fmt(Math.round(sem.reduce((a, s) => a + s.ingresos, 0) / Math.max(1, sem.reduce((a, s) => a + s.turnos - s.ausentes, 0))))}</strong><span>promedio por consulta</span></div>
            <div className="cl-kpi"><strong>{fmt(ausTotal * Math.round(sem.reduce((a, s) => a + s.ingresos, 0) / Math.max(1, turTotal - ausTotal)))}</strong><span>perdido por ausencias (estimado)</span></div>
          </div>
          <GraficoBarras titulo="Ingresos por semana" detalle={`Semana que empieza el día · ${config.moneda}`} puntos={sem.map((s) => ({ etiqueta: s.etiqueta, valor: s.ingresos }))} formato={fmt} />
          <figure className="d-card" style={{ margin: 0 }}>
            <figcaption><strong style={{ fontSize: 17 }}>De dónde vienen los ingresos</strong></figcaption>
            <div className="cl-barras" style={{ marginTop: 12 }}>
              {mix.map((m) => <div key={m.nombre}><span>{m.nombre}</span><span className="pista"><span style={{ width: `${m.porc}%` }} /></span><strong style={{ textAlign: 'right' }}>{m.porc} %</strong></div>)}
            </div>
          </figure>
        </div>
      )}

      {sec === 'pacientes' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="cl-grid">
            <div className="cl-kpi"><strong>{agenda.clientes.length}</strong><span>pacientes</span></div>
            <div className="cl-kpi"><strong>{nuevos}</strong><span>nuevos en 30 días</span></div>
            <div className="cl-kpi"><strong>{Object.keys(clinico.familias).length}</strong><span>grupos familiares</span></div>
          </div>
          <div className="cl-grid">
            <ListaInvitar titulo="pacientes con el control vencido" detalle="Crónicos que no reservaron el control indicado." ids={l.controlesVencidos} lista="Controles vencidos" props={props} />
            <ListaInvitar titulo="pacientes que no vienen hace más de 3 semanas" detalle="Sin turno atendido reciente ni turno próximo." ids={l.inactivos} lista="Inactivos" props={props} />
          </div>
        </div>
      )}

      {sec === 'agenda' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="cl-grid">
            <div className="cl-kpi"><strong>{turTotal}</strong><span>turnos terminados</span></div>
            <div className="cl-kpi"><strong>{turTotal ? Math.round((ausTotal / turTotal) * 100) : 0} %</strong><span>ausentismo</span></div>
          </div>
          <GraficoLinea titulo="Ausentismo por semana" detalle="Turnos perdidos sobre el total" puntos={sem.map((s) => ({ etiqueta: s.etiqueta, valor: s.ausentismo }))} formato={(v) => `${Math.round(v)} %`} />
        </div>
      )}

      {sec === 'clinicos' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="cl-grid">
            {docs.map(([n, v]) => <div key={n} className="cl-kpi"><strong>{v}</strong><span>{n.toLowerCase()}s emitidas</span></div>)}
            <div className="cl-kpi"><strong>{l.fueraDeRango.length}</strong><span>resultados fuera del rango que indicaste</span></div>
          </div>
          <figure className="d-card" style={{ margin: 0 }}>
            <figcaption><strong style={{ fontSize: 17 }}>Diagnósticos más frecuentes</strong><br /><span className="cl-gris">Solo los que cargaste con código CIE-10</span></figcaption>
            {diagnosticos.length ? <div className="cl-barras" style={{ marginTop: 12 }}>{diagnosticos.map(([d, n]) => <div key={d}><span>{d}</span><span className="pista"><span style={{ width: `${(n / diagnosticos[0][1]) * 100}%` }} /></span><strong style={{ textAlign: 'right' }}>{n}</strong></div>)}</div> : <p className="cl-vacio" style={{ marginTop: 12 }}>Todavía no cargaste diagnósticos. Aparecen al firmar consultas con código.</p>}
          </figure>
        </div>
      )}

      {sec === 'presupuestos' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="cl-grid">
            <div className="cl-kpi"><strong>{st.tasa} %</strong><span>se aceptan</span></div>
            <div className="cl-kpi"><strong>{st.diasAceptar} días</strong><span>hasta aceptar</span></div>
            <div className="cl-kpi"><strong>{fmt(st.montoAbierto)}</strong><span>en presupuestos abiertos</span></div>
          </div>
          <figure className="d-card" style={{ margin: 0 }}>
            <figcaption><strong style={{ fontSize: 17 }}>Margen por procedimiento</strong><br /><span className="cl-gris">Presupuestos aceptados, menos el costo de los insumos. Sin honorarios de terceros.</span></figcaption>
            <div style={{ overflowX: 'auto', marginTop: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 520 }}>
                <thead><tr><th style={{ textAlign: 'left', padding: 6 }}>Procedimiento</th><th style={{ textAlign: 'right', padding: 6 }}>Cantidad</th><th style={{ textAlign: 'right', padding: 6 }}>Ingreso</th><th style={{ textAlign: 'right', padding: 6 }}>Insumos</th><th style={{ textAlign: 'right', padding: 6 }}>Margen</th></tr></thead>
                <tbody>{margen.map((m) => <tr key={m.nombre}><td style={{ padding: 6, borderTop: '1px solid #eee' }}>{m.nombre}</td><td style={{ padding: 6, borderTop: '1px solid #eee', textAlign: 'right' }}>{m.cantidad}</td><td style={{ padding: 6, borderTop: '1px solid #eee', textAlign: 'right' }}>{fmt(m.ingreso)}</td><td style={{ padding: 6, borderTop: '1px solid #eee', textAlign: 'right' }}>{fmt(m.costo)}</td><td style={{ padding: 6, borderTop: '1px solid #eee', textAlign: 'right', fontWeight: 800 }}>{m.porc} %</td></tr>)}</tbody>
              </table>
            </div>
          </figure>
          <figure className="d-card" style={{ margin: 0 }}>
            <figcaption><strong style={{ fontSize: 17 }}>Por qué no se aceptan</strong></figcaption>
            <div className="cl-barras" style={{ marginTop: 12 }}>{st.motivos.map(([m, n]) => <div key={m}><span>{m}</span><span className="pista"><span style={{ width: `${(n / st.motivos[0][1]) * 100}%` }} /></span><strong style={{ textAlign: 'right' }}>{n}</strong></div>)}</div>
          </figure>
        </div>
      )}

      {sec === 'especialidad' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <p className="sub" style={{ margin: 0 }}>Paquete de {nombreEsp}, según el profesional elegido en &quot;Ver como&quot;.</p>
          {pid === 'm-rios' && (
            <div className="cl-grid">
              <ListaInvitar titulo="retoques pendientes" detalle="Toxina hace más de 4 meses, sin turno nuevo." ids={l.retoques} lista="Retoques pendientes" props={props} />
              <div className="cl-tarea"><strong>{clinico.presupuestos.filter((p) => p.realizado && +new Date(p.realizado) > ahora - 180 * DIA_MS).length}</strong><p>procedimientos en 6 meses</p></div>
              <div className="cl-tarea"><strong>{clinico.presupuestos.filter((p) => p.controles.some((c) => !c.hecho && +new Date(c.fecha) < ahora)).length}</strong><p>controles posteriores atrasados</p></div>
              <div className="cl-tarea"><strong>{margen[0] ? `${margen[0].porc} %` : '—'}</strong><p>margen de {margen[0]?.nombre.toLowerCase() ?? 'procedimientos'}</p></div>
            </div>
          )}
          {pid === 'm-paz' && (
            <>
              <div className="cl-grid">
                <ListaInvitar titulo="chicos con el control de niño sano vencido" detalle="Según la fecha de control que dejó registrada la pediatra." ids={ped.controlVencido} lista="Control de niño sano" props={props} />
                <ListaInvitar titulo="chicos con vacunas pendientes" detalle="Según lo que registró la pediatra en la ficha." ids={ped.vacunas} lista="Vacunas pendientes" props={props} />
                <div className="cl-tarea"><strong>{ped.ninos}</strong><p>pacientes chicos</p></div>
              </div>
              <ul className="cl-lista">
                {clinico.fichas.filter((f) => f.nacimiento).map((f) => <li key={f.pacienteId} className="cl-fila"><div><strong>{agenda.clientes.find((c) => c.id === f.pacienteId)?.nombre}</strong><small>{edad(f.nacimiento!, ahora)} años · próximo control {f.proximoControl ? fechaCorta(new Date(f.proximoControl + 'T12:00')) : 'sin fecha'}</small></div>{f.vacunasPendientes?.length ? <span className="cl-chip av">Vacunas pendientes</span> : <span className="cl-chip ok">Al día</span>}</li>)}
              </ul>
            </>
          )}
          {pid === 'm-castillo' && (
            <>
              <div className="cl-grid">
                <div className="cl-tarea"><strong>{nut.pacientes}</strong><p>pacientes con controles de peso</p></div>
                <div className="cl-tarea"><strong>{nut.bajaPromedio} kg</strong><p>bajaron en promedio desde el primer control</p></div>
                <div className="cl-tarea"><strong>{nut.objetivo} de {nut.pacientes}</strong><p>llegaron al objetivo que fijaste</p></div>
                <ListaInvitar titulo="sin seguimiento hace más de un mes" detalle="Dejaron de venir a los controles y no tienen turno." ids={nut.sinSeguimiento} lista="Sin seguimiento nutricional" props={props} />
              </div>
              {nut.ejemplo && <GraficoLinea titulo={`Peso de ${agenda.clientes.find((c) => c.id === nut.ejemplo!.id)?.nombre}`} detalle="kg · la línea punteada es el objetivo" puntos={nut.ejemplo.s.map((p) => ({ etiqueta: fechaCortaDe(p.fecha), valor: p.valor }))} formato={(v) => `${Math.round(v)}`} rango={nut.ejemplo.s[0].rango} />}
            </>
          )}
          {pid === 'm-mendez' && (
            <div className="cl-grid">
              <ListaInvitar titulo="crónicos con el control vencido" detalle="Hipertensión, diabetes y otras condiciones que cargaste." ids={l.controlesVencidos} lista="Controles vencidos" props={props} />
              <div className="cl-tarea"><strong>{clinico.fichas.filter((f) => f.cronico).length}</strong><p>pacientes con control periódico</p></div>
              <div className="cl-tarea"><strong>{l.fueraDeRango.length}</strong><p>resultados fuera de rango</p></div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
