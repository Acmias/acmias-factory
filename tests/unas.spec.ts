import { test, expect, type Page } from '@playwright/test';
import { dejarOpinion, enlacePinterest, guardarCobro, montoSena } from '../src/lib/rubros/unas/logica';
import { crearEstadoUnas } from '../src/lib/rubros/unas/datos-ejemplo';

// Martes 10 de noviembre de 2026, 11:00: el salón abre de lunes a sábado de 10 a 20 h.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 10, 11, 0));
});

async function ingresar(page: Page) {
  await page.goto('/');
  if (!page.url().includes('/ingresar')) return;
  await page.getByLabel('Usuario').fill('vendedor');
  await page.getByLabel('Contraseña').fill('demo1234');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => u.pathname === '/');
}

async function crearDemo(page: Page, nombre = 'Estudio Nácar') {
  await ingresar(page);
  await page.getByRole('button', { name: 'Uñas', exact: true }).click();
  await page.getByLabel('Nombre del negocio').fill(nombre);
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\//);
  return page.url().split('/d/')[1].split(/[#/]/)[0];
}

/** Del inicio al paso del servicio. */
async function empezar(page: Page, servicio = /Esmaltado semipermanente/) {
  await page.getByRole('button', { name: 'Reservar turno' }).first().click();
  await expect(page.getByRole('heading', { name: '¿Qué te hacés?' })).toBeVisible();
  await page.getByRole('button', { name: servicio }).click();
}

async function confirmar(page: Page, nombre: string, forma: 'Efectivo' | 'Mercado Pago' = 'Efectivo') {
  await page.getByLabel('Tu nombre').fill(nombre);
  await page.getByLabel('Tu WhatsApp').fill('11 4444 3333');
  await page.getByRole('group', { name: 'Forma de pago' }).getByRole('button', { name: forma }).click();
  await page.getByRole('button', { name: 'Reservar turno' }).click();
  await expect(page.getByRole('heading', { name: /¡Turno reservado!/ })).toBeVisible();
}

/** Busca la fila del turno en "Para preparar" (recorre los próximos días). */
async function abrirFicha(page: Page, slug: string, nombre: string) {
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Diseños' }).click();
  await expect(page.getByRole('heading', { name: 'Para preparar hoy' })).toBeVisible();
  await expect(page.locator('.un-prep-fila').first()).toBeVisible();
  const fila = page.locator('.un-prep-fila').filter({ hasText: nombre });
  const dias = page.getByRole('group', { name: 'Día' }).getByRole('button');
  for (let i = 0; i < (await dias.count()) && !(await fila.count()); i++) {
    await dias.nth(i).click();
    await expect(dias.nth(i)).toHaveAttribute('aria-pressed', 'true');
  }
  return fila.first();
}

test('lógica: enlaces de Pinterest, seña redondeada, cobro y opiniones', () => {
  expect(enlacePinterest('Mirá este pin en Pinterest: https://pin.it/7xYz ')).toBe('https://pin.it/7xYz');
  expect(enlacePinterest('https://pinterest.ab.com/pin/1')).toBeNull();
  expect(enlacePinterest('https://instagram.com/p/abc')).toBeNull();

  const e = crearEstadoUnas('ARS', new Date(2026, 10, 10, 11, 0).getTime());
  expect(montoSena(e, 22400)).toBe(6700);
  expect(montoSena({ ...e, cobro: { ...e.cobro!, senaPct: 0 } }, 22400)).toBe(0);

  const sinAlias = guardarCobro(e, { ...e.cobro!, alias: '', enlace: '' });
  expect('error' in sinAlias && sinAlias.error).toContain('alias');
  const http = guardarCobro(e, { ...e.cobro!, enlace: 'http://mpago.la/abc' });
  expect('error' in http && http.error).toContain('https');

  const atendido = e.turnos.find((t) => t.estado === 'atendido')!;
  const futuro = e.turnos.find((t) => t.estado === 'reservado' || t.estado === 'confirmado')!;
  expect(dejarOpinion(e, futuro.token, 5, 'Hermoso')).toEqual({ error: 'Vas a poder opinar después de tu cita.' });
  const r = dejarOpinion(e, atendido.token, 5, 'Me encantó');
  expect('estado' in r).toBe(true);
  if ('estado' in r) expect(dejarOpinion(r.estado, atendido.token, 4, 'Otra')).toEqual({ error: 'Ya dejaste tu opinión de esta cita. ¡Gracias!' });
});

test('inicio: catálogo en tres carpetas para mirar, opiniones con estrellas y botón para reservar', async ({ page }) => {
  await crearDemo(page);
  const carpetas = page.getByRole('tablist', { name: 'Carpetas del catálogo' }).getByRole('tab');
  await expect(carpetas).toHaveText([/Diseños del salón/, /Inspiraciones/, /Tendencias 2027/]);
  await expect(page.locator('.un-galeria button.un-tarjeta')).toHaveCount(0); // en el inicio solo se mira
  await page.getByRole('tab', { name: /Tendencias 2027/ }).click();
  await expect(page.getByText('Mocha cromado')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lo que dicen las clientas' })).toBeVisible();
  await expect(page.locator('.un-prom')).toContainText('6 opiniones');
  await expect(page.getByText('Opiniones de ejemplo')).toBeVisible();
  await expect(page.locator('.un-opinion').first()).toContainText('★');
  await expect(page.getByRole('button', { name: 'Reservar turno' }).first()).toBeVisible();
});

test('reserva: servicio con precio, diseño adicional, foto opcional, horario, seña por Mercado Pago y comprobante por WhatsApp', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.getByRole('button', { name: 'Reservar turno' }).first().click();
  await expect(page.getByRole('button', { name: /Esmaltado semipermanente.*\$/ })).toBeVisible();
  await page.getByRole('button', { name: /Esmaltado semipermanente/ }).click();

  // Diseño adicional opcional, con su precio.
  await expect(page.getByRole('heading', { name: '¿Querés agregar un diseño?' })).toBeVisible();
  const total0 = await page.locator('.un-seguir p').innerText();
  await page.getByRole('button', { name: /Muñequitos/ }).click();
  await expect(page.locator('.un-seguir p')).not.toHaveText(total0);
  await expect(page.locator('.un-seguir p')).toContainText('1 adicional');
  await page.getByRole('button', { name: 'Seguir' }).click();

  // Foto de referencia opcional, desde las mismas carpetas del inicio.
  await expect(page.getByRole('heading', { name: '¿Querés usar alguna de nuestras ideas?' })).toBeVisible();
  await page.getByRole('tab', { name: /Tendencias 2027/ }).click();
  await page.getByRole('button', { name: /^Mocha cromado/ }).click();
  await expect(page.locator('.un-seguir p')).toContainText('Mocha cromado (Tendencias 2027)');
  await page.getByRole('button', { name: 'Seguir' }).click();

  await expect(page.getByRole('heading', { name: '¿Qué día?' })).toBeVisible();
  await page.locator('.bar-hora').first().click();

  // Sin forma de pago no reserva.
  await page.getByLabel('Tu nombre').fill('Rocío Prueba');
  await page.getByLabel('Tu WhatsApp').fill('11 4444 3333');
  await page.getByRole('button', { name: 'Reservar turno' }).click();
  await expect(page.locator('#e-forma')).toContainText('Elegí cómo vas a pagar');
  await expect(page.locator('.un-sena-aviso')).toContainText('seña de');
  await page.getByRole('group', { name: 'Forma de pago' }).getByRole('button', { name: 'Efectivo' }).click();
  await page.getByRole('button', { name: 'Reservar turno' }).click();

  await expect(page.getByRole('heading', { name: '¡Turno reservado! Falta la seña' })).toBeVisible();
  await expect(page.locator('.un-alias')).toContainText('salon.unas.demo');
  await expect(page.locator('.un-precios').last()).toContainText('Muñequitos');
  await expect(page.locator('.un-precios').last()).toContainText('En efectivo, en el local');
  const wa = page.getByRole('link', { name: 'Mandar comprobante por WhatsApp' });
  const href = decodeURIComponent((await wa.getAttribute('href')) ?? '');
  expect(href).toContain('5491155551234');
  expect(href).toContain('Diseño adicional: Muñequitos');
  expect(href).toContain('Foto de referencia: Mocha cromado');
  expect(href).toContain('comprobante de la seña');
  expect(href).toContain('El resto lo pago en efectivo');
  const [popup] = await Promise.all([page.waitForEvent('popup'), wa.click()]);
  await popup.close();
  await expect(page.getByRole('heading', { name: 'Comprobante enviado' })).toBeVisible();

  // En el panel: comprobante avisado, la dueña confirma la seña.
  const fila = await abrirFicha(page, slug, 'Rocío Prueba');
  await expect(fila).toContainText('Mandó el comprobante');
  await expect(fila).toContainText('+ Muñequitos');
  await page.getByRole('button', { name: 'Confirmar seña de Rocío Prueba' }).click();
  await expect(fila).toContainText('Seña confirmada');
  await fila.click();
  const ficha = page.getByRole('dialog');
  await expect(ficha.getByRole('heading', { name: 'Para esta cita' })).toBeVisible();
  await expect(ficha).toContainText('Mocha cromado');
  await expect(ficha).toContainText('Seña confirmada');
});

test('sin adicional y sin foto: lo charlan en el local', async ({ page }) => {
  const slug = await crearDemo(page);
  await empezar(page, /Kapping gel/);
  await page.getByRole('button', { name: 'No, sin diseño adicional' }).click();
  await page.getByRole('button', { name: 'No, otro / sin foto' }).click();
  await page.locator('.bar-hora').first().click();
  await confirmar(page, 'Nina Sinidea', 'Mercado Pago');
  await expect(page.locator('.un-precios').last()).toContainText('Por Mercado Pago');
  const fila = await abrirFicha(page, slug, 'Nina Sinidea');
  await expect(fila).toContainText('Sin adicional');
  await fila.click();
  await expect(page.getByRole('dialog')).toContainText('Sin foto de referencia');
});

test('la dueña apaga la lista de adicionales y pone seña 0: la reserva salta ese paso y no pide seña', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Precios y seña' }).click();
  await page.getByLabel('Mostrar la lista al reservar').uncheck();
  await expect(page.getByRole('status').filter({ hasText: 'ya no aparece al reservar' })).toBeVisible();
  await page.getByLabel(/Seña \(% del total/).fill('0');
  await page.getByRole('button', { name: 'Guardar seña' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Datos de la seña guardados' })).toBeVisible();

  await page.goto(`/d/${slug}`);
  await empezar(page);
  await expect(page.getByRole('heading', { name: '¿Querés usar alguna de nuestras ideas?' })).toBeVisible();
  await expect(page.locator('.bar-paso').filter({ hasText: /^\d?Diseño$/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'No, otro / sin foto' }).click();
  await page.locator('.bar-hora').first().click();
  await expect(page.locator('.un-sena-aviso')).toHaveCount(0);
  await confirmar(page, 'Sol Sinseña');
  await expect(page.getByRole('heading', { name: '¡Turno reservado!', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Avisar al salón' })).toBeVisible();
});

test('el retiro no pide diseño ni foto', async ({ page }) => {
  await crearDemo(page);
  await empezar(page, /Retiro \+ manicura/);
  await expect(page.getByRole('heading', { name: '¿Qué día?' })).toBeVisible();
  await page.locator('.bar-hora').first().click();
  await expect(page.getByRole('heading', { name: 'Confirmá tu turno' })).toBeVisible();
  await expect(page.locator('.un-precios dt').filter({ hasText: /^\+/ })).toHaveCount(0);
});

test('catálogo: la dueña sube una foto a Inspiraciones con el enlace del pin y aparece en el inicio', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Diseños' }).click();
  await page.getByRole('button', { name: 'Agregar foto' }).click();
  await page.locator('.un-nuevo select').first().selectOption({ label: 'Inspiraciones' });
  await page.getByLabel('Nombre', { exact: true }).fill('Coral de verano');
  await page.getByLabel('Enlace del pin (opcional)').fill('https://www.instagram.com/p/xyz');
  await page.getByRole('button', { name: 'Guardar en el catálogo' }).click();
  await expect(page.locator('.un-nuevo .bar-err')).toContainText('no es de Pinterest');
  await page.getByLabel('Enlace del pin (opcional)').fill('https://pin.it/3abc');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.getByLabel('Subir foto del diseño').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByAltText('Vista previa')).toBeVisible();
  await page.getByRole('button', { name: 'Guardar en el catálogo' }).click();
  await expect(page.getByRole('status').filter({ hasText: '"Coral de verano" ya está en Inspiraciones' })).toBeVisible();
  await expect(page.locator('.un-cat li').filter({ hasText: 'Coral de verano' })).toContainText('foto propia');

  await page.goto(`/d/${slug}`);
  await page.getByRole('tab', { name: /Inspiraciones/ }).click();
  await expect(page.getByAltText('Coral de verano')).toBeVisible();
});

test('la clienta opina desde su turno después de la cita y la opinión aparece en el inicio', async ({ page }) => {
  const slug = await crearDemo(page);
  await empezar(page, /Retiro \+ manicura/);
  await page.locator('.bar-hora').first().click();
  await confirmar(page, 'Ema Opina');
  const turno = await page.getByRole('link', { name: /Ver, cambiar o cancelar/ }).getAttribute('href');

  const fila = await abrirFicha(page, slug, 'Ema Opina');
  await fila.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Atendido' }).click();

  await page.goto(turno!);
  await expect(page.getByRole('heading', { name: '¿Cómo te atendieron?' })).toBeVisible();
  await page.getByRole('radio', { name: '5 estrellas' }).click();
  await page.getByLabel('Tu comentario (opcional)').fill('Me atendieron re bien, volveré.');
  await page.getByRole('button', { name: 'Publicar opinión' }).click();
  await expect(page.getByText('¡Gracias por tu opinión!')).toBeVisible();

  await page.goto(`/d/${slug}`);
  await expect(page.locator('.un-opinion').first()).toContainText('Me atendieron re bien, volveré.');
  await expect(page.locator('.un-prom')).toContainText('7 opiniones');

  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Opiniones' }).click();
  await page.getByRole('button', { name: 'Ocultar la opinión de Ema O.' }).click();
  await page.goto(`/d/${slug}`);
  await expect(page.locator('.un-prom')).toContainText('6 opiniones');
});

test('la demo de ejemplo abre con su sitio y el panel tiene sus pestañas', async ({ page }) => {
  await ingresar(page);
  await page.getByRole('button', { name: 'Ver demo de Estudio Nácar Uñas' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Estudio Nácar Uñas' })).toBeVisible();
  const slug = page.url().split('/d/')[1].split(/[#/]/)[0];
  await page.goto(`/d/${slug}/sitio`);
  await expect(page.getByRole('heading', { name: 'Tus uñas, como las soñaste' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Diseños adicionales' })).toBeVisible();
  await page.goto(`/d/${slug}/panel`);
  await expect(page.getByText('Panel del salón')).toBeVisible();
  for (const t of ['Diseños', 'Precios y seña', 'Opiniones', 'Métricas']) await expect(page.getByRole('tab', { name: t })).toBeVisible();
  await page.getByRole('tab', { name: 'Ajustes' }).click();
  await expect(page.getByText('se configuran en la pestaña "Precios y seña"')).toBeVisible();
});
