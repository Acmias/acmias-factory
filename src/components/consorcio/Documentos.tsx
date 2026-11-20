'use client';

import { Fragment } from 'react';
import { Icono } from '@/components/Icono';
import {
  NOMBRE_ETAPA, NOMBRE_MEDIO, NOMBRE_RUBRO, RUBROS, cargos, dinero, edificio, expensasDe, fechaCorta, gastosDe, mesLargo, situacion, totalRecibo, unidad, unidadesDe,
} from '@/lib/rubros/consorcio/logica';
import type { EstadoConsorcio, Evidencia, Expensa, Liquidacion } from '@/lib/rubros/consorcio/tipos';

const mayus = (s: string) => s[0].toUpperCase() + s.slice(1);
const iniciales = (n: string) => n.split(' ').map((x) => `${x[0]}.`).join(' ');

/** Foto de evidencia. Sin foto subida (demo), una ilustración por etapa. */
export function FotoEvidencia({ ev, className }: { ev: Evidencia; className?: string }) {
  if (ev.foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={ev.foto} alt={`${NOMBRE_ETAPA[ev.etapa]}: ${ev.nota}`} className={className ?? 'cs-foto'} />;
  }
  const grietas = ev.etapa === 'antes';
  const obra = ev.etapa === 'durante';
  return (
    <svg viewBox="0 0 160 100" className={className ?? 'cs-foto'} role="img" aria-label={`${NOMBRE_ETAPA[ev.etapa]} (ilustración de ejemplo): ${ev.nota}`}>
      <rect width="160" height="100" className={`cs-ilu-fondo ${ev.etapa}`} />
      <rect x="18" y="22" width="124" height="62" rx="3" className="cs-ilu-pared" />
      {grietas && <path d="M60 22 l6 14 -8 10 7 12 -5 10 M110 84 l-4 -12 8 -8 -6 -12" className="cs-ilu-grieta" />}
      {obra && (
        <>
          <rect x="18" y="22" width="62" height="62" className="cs-ilu-mano" />
          <path d="M100 30 l24 24 M108 26 l8 8" className="cs-ilu-herr" />
        </>
      )}
      {ev.etapa === 'despues' && <path d="M62 54 l12 12 24 -26" className="cs-ilu-ok" />}
      <text x="80" y="96" textAnchor="middle" className="cs-ilu-txt">{NOMBRE_ETAPA[ev.etapa]} · ilustración</text>
    </svg>
  );
}

/** Recibo / aviso de pago de expensas (Ley 14.701, art. 12). */
export function ReciboDoc({ estado, expensa, moneda, ahora }: { estado: EstadoConsorcio; expensa: Expensa; moneda: string; ahora: number }) {
  const u = unidad(estado, expensa.unidadId)!;
  const ed = edificio(estado, expensa.edificioId);
  const a = estado.administracion;
  const p = (v: number) => dinero(v, moneda);
  const s = situacion(estado, u.id, ahora);
  return (
    <article className="cs-doc" aria-label={`Recibo N° ${expensa.numero}`}>
      <header className="cs-doc-cab">
        <div>
          <strong>Consorcio de Propietarios {ed.nombre}</strong>
          <span>{ed.direccion}, {ed.localidad} · CUIT {ed.cuit}</span>
        </div>
        <div className="cs-doc-num">Recibo N° <strong>{String(expensa.numero).padStart(6, '0')}</strong></div>
      </header>
      <dl className="cs-doc-datos">
        <div><dt>Unidad</dt><dd>{u.nombre} · porcentual {u.coef.toLocaleString('es-AR')}%</dd></div>
        <div><dt>Propietario/a</dt><dd>{u.propietario}</dd></div>
        <div><dt>Período</dt><dd>Expensas de {mesLargo(expensa.periodo)}</dd></div>
        <div><dt>Vencimiento</dt><dd>{fechaCorta(expensa.vence)} · después, interés del {ed.interesMensual}% mensual</dd></div>
      </dl>
      <table className="cs-tabla">
        <tbody>
          <tr><td>Saldo anterior</td><td>{p(expensa.saldoAnterior)}</td></tr>
          {expensa.interes > 0 && <tr><td>Intereses por mora ({ed.interesMensual}%)</td><td>{p(expensa.interes)}</td></tr>}
          <tr><td>Expensas ordinarias</td><td>{p(expensa.ordinaria)}</td></tr>
          {expensa.extraordinaria > 0 && <tr><td>Expensas extraordinarias</td><td>{p(expensa.extraordinaria)}</td></tr>}
          <tr><td>Fondo de reserva</td><td>{p(expensa.fondo)}</td></tr>
          {expensa.otros > 0 && <tr><td>Reserva de {ed.espacio?.nombre ?? 'espacio común'}</td><td>{p(expensa.otros)}</td></tr>}
          <tr className="total"><td>Total a pagar</td><td>{p(totalRecibo(expensa))}</td></tr>
        </tbody>
      </table>
      <p className="cs-doc-deuda">{s.deuda > 0 ? <>Deuda a la fecha: <strong>{p(s.deuda)}</strong>{s.meses ? ` (${s.meses} ${s.meses === 1 ? 'mes vencido' : 'meses vencidos'})` : ''}</> : <strong>Sin deuda a la fecha.</strong>}</p>
      <div className="cs-doc-pie">
        <div>
          <strong>Lugar y formas de pago</strong>
          <span>{ed.mp.vinculada ? `Mercado Pago desde el enlace de tu unidad (se acredita en la cuenta del consorcio, ${ed.mp.cuenta}). ` : ''}Transferencia a la cuenta del consorcio ({ed.banco.entidad}, CBU {ed.banco.cbu}). Efectivo en la administración: {a.domicilio}.</span>
        </div>
        <div>
          <strong>Administración</strong>
          <span>{a.nombre} · {a.responsable} · CUIT {a.cuit} · {a.matricula} · Tel. {a.telefono}</span>
          <span className="cs-firma">Firma y aclaración: {a.responsable}</span>
        </div>
      </div>
    </article>
  );
}

/** Liquidación de expensas del edificio (Ley 14.701, art. 11). `privado` oculta los nombres en la vista de los vecinos. */
export function LiquidacionDoc({ estado, liq, moneda, privado = false }: { estado: EstadoConsorcio; liq: Liquidacion; moneda: string; privado?: boolean }) {
  const ed = edificio(estado, liq.edificioId);
  const a = estado.administracion;
  const p = (v: number) => dinero(v, moneda);
  const gastos = gastosDe(estado, ed.id, liq.periodo);
  const us = unidadesDe(estado, ed.id);
  const xs = estado.expensas.filter((x) => x.liquidacionId === liq.id);
  const personal = estado.personal.filter((x) => x.edificioId === ed.id && !x.tercerizado);
  const desde = new Date(`${liq.periodo}-01T00:00:00`).toISOString();
  const hasta = liq.cerrada;
  const ingresos = estado.pagos.filter((x) => x.estado === 'acreditado' && x.fecha >= desde && x.fecha < hasta && us.some((u) => u.id === x.unidadId));
  const porMedio = (['mercadopago', 'transferencia', 'efectivo'] as const).map((m) => ({ m, v: ingresos.filter((x) => x.medio === m).reduce((s, x) => s + x.importe, 0) }));
  const egresos = gastos.reduce((s, g) => s + g.importe, 0);
  const mora = xs.filter((x) => x.saldoAnterior > 0).sort((a, b) => b.saldoAnterior - a.saldoAnterior);
  const nombre = (n: string) => (privado ? iniciales(n) : n);
  return (
    <article className="cs-doc cs-liq" aria-label={`Liquidación de ${mesLargo(liq.periodo)}`}>
      <header className="cs-doc-cab">
        <div>
          <strong>Liquidación de expensas · {mayus(mesLargo(liq.periodo))} {liq.periodo.slice(0, 4)}</strong>
          <span>Consorcio de Propietarios {ed.nombre} · {ed.direccion}, {ed.localidad}</span>
          <span>CUIT {ed.cuit} · Clave de identificación sindical {ed.claveSindical}</span>
        </div>
        <div className="cs-doc-num">N° <strong>{liq.numero}</strong><small>Emitida el {fechaCorta(liq.cerrada)}</small></div>
      </header>
      <p className="cs-doc-admin">Administración: {a.nombre} · {a.responsable} · {a.domicilio} · Tel. {a.telefono} · CUIT {a.cuit} · {a.matricula}</p>

      <h3>Gastos del mes</h3>
      <table className="cs-tabla">
        <thead><tr><th>Rubro y detalle</th><th>Proveedor (CUIT)</th><th>Importe</th></tr></thead>
        <tbody>
          {RUBROS.map((r) => {
            const gs = gastos.filter((g) => g.rubro === r.id);
            if (!gs.length) return null;
            return (
              <Fragment key={r.id}>
                <tr className="rubro"><td colSpan={2}>{r.nombre}</td><td>{p(gs.reduce((s, g) => s + g.importe, 0))}</td></tr>
                {gs.map((g) => (
                  <tr key={g.id}><td>{g.detalle}{g.tipo === 'extraordinario' ? ' · extraordinario' : ''}</td><td>{g.proveedor}{g.cuit ? ` (${g.cuit})` : ''}</td><td>{p(g.importe)}</td></tr>
                ))}
              </Fragment>
            );
          })}
          <tr className="total"><td colSpan={2}>Ordinarias {p(liq.ordinarias)} · Extraordinarias {p(liq.extraordinarias)} · Fondo de reserva ({ed.fondoReservaPct}%) {p(liq.fondo)}</td><td>{p(liq.ordinarias + liq.extraordinarias + liq.fondo)}</td></tr>
        </tbody>
      </table>

      <h3>Personal del consorcio</h3>
      {personal.length ? (
        <table className="cs-tabla">
          <thead><tr><th>Nombre y cargo</th><th>Categoría</th><th>Sueldo neto</th><th>Cargas sociales</th></tr></thead>
          <tbody>{personal.map((x) => <tr key={x.id}><td>{x.nombre} · {x.rol}</td><td>{x.categoria ?? '—'}</td><td>{p(x.sueldo)}</td><td>{p(x.cargas)}</td></tr>)}</tbody>
        </table>
      ) : <p className="cs-doc-nota">El consorcio no tiene personal en relación de dependencia (servicios tercerizados con factura).</p>}

      <h3>Seguros, honorarios y juicios</h3>
      <ul className="cs-doc-lista">
        <li>Seguro integral: {ed.seguro.compania}, póliza {ed.seguro.poliza}, vence {fechaCorta(ed.seguro.vence)}, cuota del mes {p(ed.seguro.cuota)}.</li>
        <li>Honorarios de administración: {p(ed.honorarios)} ({a.nombre}, CUIT {a.cuit}, responsable inscripto).</li>
        <li>Juicios en los que el consorcio es parte: no hay juicios en trámite.</li>
      </ul>

      <h3>Ingresos y movimientos de la cuenta del mes</h3>
      <ul className="cs-doc-lista">
        <li>Cobranzas: {p(ingresos.reduce((s, x) => s + x.importe, 0))} ({porMedio.filter((x) => x.v).map((x) => `${NOMBRE_MEDIO[x.m]} ${p(x.v)}`).join(' · ') || 'sin cobranzas'}).</li>
        <li>Pagos a proveedores y personal: {p(egresos)}.</li>
        <li>Cuenta del consorcio: {ed.banco.entidad}, CBU {ed.banco.cbu}{ed.mp.vinculada ? ` · Mercado Pago ${ed.mp.cuenta}` : ''}.</li>
      </ul>

      <h3>Estado de cuentas por unidad</h3>
      <div className="d-scroll">
        <table className="cs-tabla chica">
          <thead><tr><th>Unidad</th><th>%</th><th>Titular</th><th>Saldo anterior</th><th>Interés</th><th>Expensa</th><th>Total</th></tr></thead>
          <tbody>
            {xs.map((x) => {
              const u = unidad(estado, x.unidadId)!;
              return <tr key={x.id}><td>{u.nombre}</td><td>{u.coef.toLocaleString('es-AR')}</td><td>{nombre(u.propietario)}</td><td>{p(x.saldoAnterior)}</td><td>{x.interes ? p(x.interes) : '—'}</td><td>{p(cargos(x) - x.interes)}</td><td>{p(totalRecibo(x))}</td></tr>;
            })}
          </tbody>
        </table>
      </div>

      <h3>Unidades en mora</h3>
      {mora.length ? (
        <ul className="cs-doc-lista">
          {mora.map((x) => {
            const u = unidad(estado, x.unidadId)!;
            const previas = expensasDe(estado, u.id).filter((y) => y.periodo < liq.periodo);
            const n = Math.max(1, Math.min(previas.length, Math.round(x.saldoAnterior / Math.max(1, cargos(previas.at(-1) ?? x)))));
            const meses = previas.slice(-n).map((y) => mesLargo(y.periodo));
            return <li key={x.id}>{u.nombre}: {p(x.saldoAnterior)} adeudados ({meses.join(', ')}){x.interes ? ` · interés ${p(x.interes)}` : ''}</li>;
          })}
        </ul>
      ) : <p className="cs-doc-nota">No hay unidades en mora.</p>}
      <p className="cs-doc-nota">Modelo según la Ley 14.701 (Provincia de Buenos Aires), arts. 11 y 12. Demo ilustrativa con datos ficticios.</p>
    </article>
  );
}

export function BotonImprimir({ texto = 'Imprimir o guardar PDF' }: { texto?: string }) {
  return (
    <button type="button" className="d-btn" onClick={() => window.print()}>
      <Icono nombre="imprimir" size={16} /> {texto}
    </button>
  );
}

export { NOMBRE_RUBRO };
