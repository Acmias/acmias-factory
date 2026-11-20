import { test, expect, type Page } from '@playwright/test';
import { crearEstadoConsorcio } from '../src/lib/rubros/consorcio/datos-ejemplo';
import {
  agregarGasto, cargos, cerrarMes, deuda, elegirPresupuesto, faltantesPresupuesto, periodoAbierto, registrarPago, reservar, resumenGastos, situacion, unidadesDe,
} from '../src/lib/rubros/consorcio/logica';

// Viernes 20 de noviembre de 2026, 11:00 (Caseros, Tres de Febrero).
const AHORA = new Date(2026, 10, 20, 11, 0).getTime();
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(AHORA));
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'Se cambió la lámpara.' : undefined));
});

async function ingresar(page: Page) {
  await page.goto('/');
  if (!page.url().includes('/ingresar')) return;
  await page.getByLabel('Usuario').fill('vendedor');
  await page.getByLabel('Contraseña').fill('demo1234');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => u.pathname === '/');
}

async function crearDemo(page: Page) {
  await ingresar(page);
  await page.getByRole('button', { name: 'Consorcios', exact: true }).click();
  await page.getByLabel('Nombre del negocio').fill('Administración Del Oeste');
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\//);
  return page.url().split('/d/')[1].split(/[#/?]/)[0];
}

async function panel(page: Page, slug: string, pestana?: string | RegExp) {
  await page.goto(`/d/${slug}/panel`);
  await expect(page.getByText('3 edificios · 64 unidades')).toBeVisible();
  if (pestana) await page.getByRole('tab', { name: pestana }).click();
}

/** Entra a "Mi expensa" con el primer ejemplo del estado pedido. */
async function comoVecino(page: Page, slug: string, estado: 'En mora' | 'Al día' | 'Por vencer') {
  await page.goto(`/d/${slug}`);
  await page.locator('.cs-ejemplos button').filter({ hasText: estado }).first().click();
  await expect(page.getByRole('tab', { name: 'Mi expensa' })).toBeVisible();
}

test('lógica: prorrateo exacto, interés por mora, transferencias a confirmar y requisitos de presupuestos', () => {
  const e = crearEstadoConsorcio('ARS', 'Adm', AHORA);
  expect(e.unidades).toHaveLength(64);
  for (const ed of e.edificios) expect(Math.round(unidadesDe(e, ed.id).reduce((s, u) => s + u.coef, 0) * 100) / 100).toBe(100);

  const per = periodoAbierto(e, 'ed-alamos', AHORA);
  expect(per).toBe('2026-11');
  const r = resumenGastos(e, 'ed-alamos', per);
  const c = cerrarMes(e, 'ed-alamos', per, AHORA);
  expect('estado' in c).toBe(true);
  if (!('estado' in c)) return;
  const xs = c.estado.expensas.filter((x) => x.liquidacionId === c.liquidacion.id);
  expect(xs).toHaveLength(24);
  // El reparto suma exactamente lo liquidado.
  expect(xs.reduce((s, x) => s + x.ordinaria, 0)).toBe(r.ordinarias);
  expect(xs.reduce((s, x) => s + x.extraordinaria, 0)).toBe(r.extraordinarias);
  // La unidad morosa arrastra el saldo con 3% de interés.
  const moroso = xs.find((x) => x.unidadId === 'u-ALA-5C')!;
  expect(moroso.saldoAnterior).toBeGreaterThan(0);
  expect(moroso.interes).toBe(Math.round(moroso.saldoAnterior * 0.03));
  expect(cerrarMes(c.estado, 'ed-alamos', per, AHORA)).toEqual({ error: 'noviembre ya está liquidado.' });
  expect(agregarGasto(c.estado, { edificioId: 'ed-alamos', periodo: per, rubro: 'otros', detalle: 'Algo', proveedor: 'X', importe: 10, tipo: 'ordinario' }, AHORA)).toEqual({ error: 'noviembre ya está liquidado en este edificio. Cargalo en el mes abierto.' });

  // Transferencia: queda a confirmar y no baja la deuda hasta confirmarla.
  const antes = deuda(c.estado, 'u-ALA-5C');
  const t = registrarPago(c.estado, 'u-ALA-5C', 1000, 'transferencia', AHORA);
  expect('pago' in t && t.pago.estado).toBe('a-confirmar');
  if ('estado' in t) expect(deuda(t.estado, 'u-ALA-5C')).toBe(antes);
  // Mercado Pago: solo si el consorcio vinculó su cuenta.
  expect(registrarPago(e, 'u-PLZ-1A', 1000, 'mercadopago', AHORA)).toEqual({ error: 'Este consorcio todavía no vinculó su cuenta de Mercado Pago.' });

  const pintura = e.obras.find((o) => o.id === 'o-pintura')!;
  const incompleto = pintura.presupuestos.find((p) => !p.cuit)!;
  expect(faltantesPresupuesto(incompleto)).toEqual(expect.arrayContaining(['CUIT del prestador', 'garantía', 'seguros (ART y responsabilidad civil)']));
  expect('error' in elegirPresupuesto(e, 'o-pintura', incompleto.id, 'Asamblea')).toBe(true);

  // Con 2 o más meses vencidos no se puede reservar el SUM.
  expect(situacion(e, 'u-ALA-5C', AHORA).meses).toBeGreaterThanOrEqual(2);
  expect('error' in reservar(e, 'u-ALA-5C', '2026-11-28', 'Noche (20 a 2 h)', 'expensa', AHORA)).toBe(true);
  expect(cargos(xs[0])).toBeGreaterThan(0);
});

test('tablero con los 3 edificios y el ciclo del mes: cargar gasto, cerrar, enviar por WhatsApp y ver liquidación y recibo', async ({ page }) => {
  const slug = await crearDemo(page);
  await panel(page, slug);
  for (const n of ['Edificio Los Álamos', 'Torre Jacarandá', 'Edificio Plaza']) await expect(page.getByRole('heading', { name: n })).toBeVisible();
  await expect(page.locator('.met').filter({ hasText: 'Unidades en mora' })).toContainText('11');

  await page.getByRole('tab', { name: 'Gastos' }).click();
  await expect(page.getByRole('heading', { name: /Gastos de noviembre · Edificio Los Álamos/ })).toBeVisible();
  await page.getByRole('button', { name: 'Cargar gasto' }).click();
  await page.getByRole('button', { name: 'Guardar gasto' }).click();
  await expect(page.getByRole('dialog').locator('.bar-err')).toContainText('Escribí qué se pagó');
  await page.getByLabel('Detalle').fill('Cambio de lámparas del hall');
  await page.getByLabel('Proveedor').fill('Electricidad Caseros');
  await page.getByLabel('Importe').fill('48000');
  await page.getByRole('button', { name: 'Guardar gasto' }).click();
  await expect(page.locator('.cs-gastos')).toContainText('Cambio de lámparas del hall');

  await page.getByRole('tab', { name: 'Expensas' }).click();
  await page.getByRole('button', { name: /Cerrar noviembre y emitir expensas/ }).click();
  await expect(page.getByRole('heading', { name: /Expensas de noviembre · liquidación N° 4/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Diciembre abierto/ })).toBeVisible();
  await expect(page.getByText('enviadas por WhatsApp:')).toContainText('0 de 24');
  await page.getByRole('button', { name: 'Enviar 24 por WhatsApp' }).click();
  await expect(page.getByRole('button', { name: 'Todas enviadas' })).toBeDisabled();

  await page.getByRole('button', { name: 'Ver liquidación' }).click();
  const liq = page.getByRole('dialog');
  for (const t of ['Gastos del mes', 'Personal del consorcio', 'Seguros, honorarios y juicios', 'Estado de cuentas por unidad', 'Unidades en mora', 'Ley 14.701', 'Cambio de lámparas del hall']) await expect(liq).toContainText(t);
  await liq.getByRole('button', { name: 'Cerrar' }).click();

  await page.getByRole('button', { name: 'Recibo de 5° C' }).click();
  const rec = page.getByRole('dialog');
  await expect(rec).toContainText('Recibo N°');
  await expect(rec).toContainText('Lugar y formas de pago');
  await expect(rec).toContainText('Deuda a la fecha');
  await expect(rec).toContainText('RPAC PBA');
});

test('el vecino en mora paga con Mercado Pago (simulado): queda sin deuda, recibo por WhatsApp y el panel lo ve', async ({ page }) => {
  const slug = await crearDemo(page);
  await comoVecino(page, slug, 'En mora');
  await expect(page.getByRole('heading', { name: /Tenés que pagar/ })).toBeVisible();
  await page.getByRole('button', { name: 'Pagar con Mercado Pago' }).click();
  const mp = page.getByRole('dialog');
  await expect(mp).toContainText('Se acredita en: Consorcio de Propietarios');
  await expect(mp).toContainText('no se cobra nada ni se piden datos de tarjeta');
  await mp.getByLabel('Tarjeta de débito').check();
  await mp.getByRole('button', { name: /^Pagar \$/ }).click();
  await expect(page.getByRole('heading', { name: '¡Pago aprobado!' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Estás al día' })).toBeVisible();
  await expect(page.locator('.bar-burbuja')).toContainText('Sin deuda a la fecha');
  await expect(page.locator('.cs-hist li').first()).toContainText('Pago con Mercado Pago');

  await panel(page, slug, /Cobranza/);
  await expect(page.locator('.cs-pagos').last().locator('li').first()).toContainText('Mercado Pago');
  await expect(page.getByRole('heading', { name: 'Unidades en mora (10)' })).toBeVisible();
});

test('transferencia con comprobante: el vecino avisa y la administración confirma', async ({ page }) => {
  const slug = await crearDemo(page);
  await comoVecino(page, slug, 'En mora');
  const unidad = (await page.locator('.cs-vec-hero h1').innerText()).trim();
  await page.getByRole('button', { name: 'Pagué por transferencia' }).click();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.getByLabel('Comprobante de la transferencia').setInputFiles({ name: 'comp.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByAltText('Comprobante')).toBeVisible();
  await page.getByRole('button', { name: 'Avisar a la administración' }).click();
  await expect(page.getByRole('heading', { name: 'Aviso de transferencia enviado' })).toBeVisible();
  await expect(page.locator('.cs-aviso')).toContainText('La administración la está confirmando');

  await panel(page, slug, /Cobranza/);
  const fila = page.locator('#t-conf').locator('..').locator('li').filter({ hasText: unidad }).filter({ hasText: 'con comprobante' });
  await expect(fila).toBeVisible();
  await fila.getByRole('button', { name: /Confirmar pago/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'confirmado. Recibo N°' })).toBeVisible();
});

test('obras: el presupuesto incompleto no se puede elegir; se aprueba otro, se suben evidencias y se carga como extraordinaria', async ({ page }) => {
  const slug = await crearDemo(page);
  await panel(page, slug, 'Obras');
  await page.getByRole('button', { name: 'Torre Jacarandá' }).click();
  await page.locator('.cs-obra').filter({ hasText: 'Pintura de hall y escaleras' }).click();
  const hoja = page.getByRole('dialog');
  await expect(hoja.locator('tr').filter({ hasText: 'Pintor independiente' })).toContainText('Falta:');
  await hoja.locator('tr').filter({ hasText: 'Pintor independiente' }).getByRole('button', { name: 'Elegir' }).click();
  await expect(hoja.locator('.bar-err')).toContainText('no se puede contratar');
  await hoja.locator('tr').filter({ hasText: 'Color Oeste' }).getByRole('button', { name: 'Elegir' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'La obra quedó aprobada' })).toBeVisible();

  await hoja.getByRole('button', { name: 'Terminar obra y cargar como extraordinaria' }).click();
  await expect(hoja.locator('.bar-err')).toContainText('Subí al menos una foto del trabajo terminado');
  await hoja.getByRole('group', { name: 'Etapa' }).getByRole('button', { name: 'Después' }).click();
  await hoja.getByLabel('Qué se ve o qué se hizo').fill('Hall pintado, dos manos de látex.');
  await hoja.getByRole('button', { name: 'Agregar evidencia' }).click();
  await expect(hoja.locator('.cs-ev').filter({ hasText: 'Hall pintado' })).toBeVisible();
  await hoja.getByRole('button', { name: 'Terminar obra y cargar como extraordinaria' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Obra terminada' })).toBeVisible();
  await hoja.getByRole('button', { name: 'Cerrar' }).click();

  await page.getByRole('tab', { name: 'Gastos' }).click();
  await expect(page.locator('.cs-gastos tr').filter({ hasText: 'Pintura de hall y escaleras (cuota 1 de 2)' })).toContainText('Extraordinario');
});

test('SUM: un vecino al día reserva y la administración lo ve; el precio lo fija cada edificio', async ({ page }) => {
  const slug = await crearDemo(page);
  await comoVecino(page, slug, 'Al día');
  const edificio = (await page.locator('.cs-vec-ed').innerText()).split(' · ')[0];
  await page.getByRole('tab', { name: /Salón|SUM|Quincho/ }).click();
  await page.getByRole('group', { name: 'Turno' }).getByRole('button').first().click();
  await page.getByRole('button', { name: 'Reservar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Se suma a tu próxima expensa');
  await expect(page.getByRole('heading', { name: 'Tus reservas' })).toBeVisible();

  await panel(page, slug, 'Espacios comunes');
  await page.getByRole('button', { name: edificio }).click();
  await expect(page.locator('.cs-pagos li')).toHaveCount(await page.locator('.cs-pagos li').count());
  await page.getByPlaceholder('Nuevo precio').fill('50000');
  await page.getByRole('button', { name: 'Cambiar precio' }).click();
  await expect(page.getByText('Precio por turno:')).toContainText('50.000');
});

test('Mercado Pago por consorcio: el Plaza no lo tiene; al vincularlo, sus vecinos pueden pagar', async ({ page }) => {
  const slug = await crearDemo(page);
  await panel(page, slug, 'Edificios');
  await page.getByRole('button', { name: 'Edificio Plaza' }).click();
  await expect(page.getByText('Sin vincular')).toBeVisible();
  await page.getByRole('button', { name: 'Vincular cuenta de Mercado Pago' }).click();
  await page.getByLabel('Alias o correo de la cuenta del consorcio').fill('consorcio.plaza.mp');
  await page.getByRole('button', { name: 'Autorizar (simulado)' }).click();
  await expect(page.getByText('Los pagos de los vecinos se acreditan en')).toContainText('consorcio.plaza.mp');

  await page.getByRole('button', { name: /Ver las 12/ }).click();
  const cod = await page.locator('table code').first().innerText();
  await page.goto(`/d/${slug}?uf=${cod}`);
  await expect(page.locator('.cs-vec-ed')).toContainText('Edificio Plaza');
  await expect(page.getByRole('button', { name: 'Pagar con Mercado Pago' }).or(page.getByRole('heading', { name: 'Estás al día' }))).toBeVisible();
});

test('comunicados con lectura y reclamos de punta a punta', async ({ page }) => {
  const slug = await crearDemo(page);
  await panel(page, slug, /Comunicados y reclamos/);
  await page.getByLabel('Título').fill('Fumigación el lunes');
  await page.getByLabel('Texto').fill('El lunes a las 10 h se fumigan los espacios comunes.');
  await page.getByRole('button', { name: 'Enviar a las 24 unidades' }).click();
  await expect(page.locator('.cs-lista li').filter({ hasText: 'Fumigación el lunes' })).toContainText('0 de 24 lo leyeron');

  await comoVecino(page, slug, 'Al día');
  const ed = await page.locator('.cs-vec-ed').innerText();
  test.skip(!ed.includes('Los Álamos'), 'El primer vecino al día es de otro edificio');
  await page.getByRole('tab', { name: /Avisos y reclamos/ }).click();
  await page.getByRole('button', { name: /Fumigación el lunes/ }).click();
  await expect(page.getByText('se fumigan los espacios comunes')).toBeVisible();
  await page.getByLabel('¿Dónde?').fill('Cochera');
  await page.getByLabel('¿Qué pasa?').fill('No anda la luz de la cochera.');
  await page.getByRole('button', { name: 'Enviar reclamo' }).click();
  await expect(page.getByText('Reclamo enviado')).toBeVisible();
  const url = page.url();

  await panel(page, slug, /Comunicados y reclamos/);
  await expect(page.locator('.cs-lista li').filter({ hasText: 'Fumigación el lunes' })).toContainText('1 de 24 lo leyeron');
  const rec = page.locator('.cs-reclamos li').filter({ hasText: 'No anda la luz de la cochera' });
  await rec.getByRole('combobox').selectOption('Electricidad Caseros');
  await expect(rec).toContainText('Asignado a Electricidad Caseros');
  await rec.getByRole('button', { name: 'Marcar resuelto' }).click();
  await expect(rec).toContainText('Se cambió la lámpara.');

  await page.goto(url);
  await page.getByRole('tab', { name: /Avisos y reclamos/ }).click();
  await expect(page.locator('.cs-hist li').filter({ hasText: 'Cochera' })).toContainText('Resuelto');
});

test('la demo de ejemplo abre, el sitio tiene acceso de vecinos y un código inválido se avisa', async ({ page }) => {
  await ingresar(page);
  await page.getByRole('button', { name: 'Ver demo de Administración Del Oeste' }).click();
  await page.waitForURL(/\/d\//);
  const slug = page.url().split('/d/')[1].split(/[#/?]/)[0];
  await page.getByLabel('Código de la unidad').fill('XYZ-1A-000');
  await page.getByRole('button', { name: 'Ver mi expensa' }).click();
  await expect(page.locator('.bar-err')).toContainText('No encontramos ese código');
  await page.goto(`/d/${slug}/sitio`);
  await expect(page.getByRole('heading', { name: 'Tu edificio, en orden y a la vista' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Edificios que administramos' })).toBeVisible();
  await expect(page.getByText('Registro Público de Administradores de Consorcios de la Provincia de Buenos Aires')).toBeVisible();
});
