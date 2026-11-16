import { test, expect, type Page } from '@playwright/test';
import { enlacePinterest } from '../src/lib/rubros/unas/logica';

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

/** Con quién → servicio → primer horario libre. */
async function hastaElDiseno(page: Page, quien = 'Sofía Paz', servicio = /Esmaltado semipermanente/) {
  await expect(page.getByRole('heading', { name: '¿Con quién te las hacés?' })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(quien) }).click();
  await page.getByRole('button', { name: servicio }).click();
  await expect(page.getByRole('heading', { name: '¿Qué día?' })).toBeVisible();
  await page.locator('.bar-hora').first().click();
}

async function datos(page: Page, nombre: string, wa = '11 4444 3333') {
  await page.getByLabel('Tu nombre').fill(nombre);
  await page.getByLabel('Tu WhatsApp').fill(wa);
  await page.getByRole('button', { name: 'Reservar cita' }).click();
  await expect(page.getByRole('heading', { name: '¡Cita reservada!' })).toBeVisible();
}

/** Abre la ficha de la cita desde la pestaña Diseños del panel (hoy o mañana). */
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
  await fila.first().click();
  return page.getByRole('dialog');
}

test('enlaces de Pinterest: acepta pin.it y dominios del país, rechaza otros', () => {
  expect(enlacePinterest('https://pin.it/4AbCdEf')).toBe('https://pin.it/4AbCdEf');
  expect(enlacePinterest('ar.pinterest.com/pin/123456/')).toBe('https://ar.pinterest.com/pin/123456/');
  expect(enlacePinterest('Mirá este pin en Pinterest: https://pin.it/7xYz ')).toBe('https://pin.it/7xYz');
  expect(enlacePinterest('https://www.pinterest.com.mx/pin/99/ te gusta?')).toBe('https://www.pinterest.com.mx/pin/99/');
  expect(enlacePinterest('https://pinterest.estafa.com/pin/1')).toBeNull();
  expect(enlacePinterest('https://pinterest.ab.com/pin/1')).toBeNull();
  expect(enlacePinterest('https://es.pinterest.co.uk/pin/5/')).toBe('https://es.pinterest.co.uk/pin/5/');
  expect(enlacePinterest('https://instagram.com/p/abc')).toBeNull();
  expect(enlacePinterest('javascript:alert(1)')).toBeNull();
});

test('la clienta elige con quién, cuándo, la hora y su diseño; todo queda en la cita para la manicurista', async ({ page }) => {
  const slug = await crearDemo(page);
  await hastaElDiseno(page);

  // Primero los trabajos de quien la atiende, después los del equipo, después Pinterest.
  await expect(page.getByRole('heading', { name: 'Elegí tu diseño' })).toBeVisible();
  const titulos = await page.locator('.un-h3').allInnerTexts();
  expect(titulos.slice(0, 3).map((t) => t.replace(/^SP\s*/, '').trim())).toEqual(['Trabajos de Sofía', 'Lo que se hace en el equipo', 'Tu idea de Pinterest']);
  await expect(page.getByRole('group', { name: 'Trabajos de Sofía' }).getByRole('button')).toHaveCount(4);
  await expect(page.getByRole('group', { name: 'Diseños del equipo' }).getByRole('button', { name: /de Sofía/ })).toHaveCount(0);

  await page.getByRole('group', { name: 'Trabajos de Sofía' }).getByRole('button', { name: /^Flores lilas/ }).click();
  await page.getByLabel('Enlace del pin').fill('https://ar.pinterest.com/pin/123456789/');
  await page.getByLabel(/Algo más que tenga que saber Sofía/).fill('Que el dorado sea solo en el anular.');
  await expect(page.locator('.un-seguir p')).toContainText('Flores lilas (de Sofía) + idea de Pinterest');
  await page.getByRole('button', { name: 'Seguir' }).click();

  await expect(page.getByRole('heading', { name: 'Confirmá tu cita' })).toBeVisible();
  await expect(page.locator('.bar-resumen')).toContainText('nail art');
  await expect(page.locator('.un-conf-dis')).toContainText('Flores lilas');
  await datos(page, 'Rocío Prueba');

  await expect(page.getByRole('heading', { name: 'Lo que Sofía ya tiene en tu cita' })).toBeVisible();
  await expect(page.locator('.un-esmaltes')).toContainText('Lila');
  await expect(page.locator('.bar-burbuja')).toContainText('Diseño: Flores lilas (de Sofía) + idea de Pinterest');
  await expect(page.locator('.bar-burbuja')).toContainText('Nail art:');

  // En el panel: la cita aparece para preparar, con el diseño, los esmaltes, la nota y el pin.
  const ficha = await abrirFicha(page, slug, 'Rocío Prueba');
  await expect(ficha.getByRole('heading', { name: 'Para esta cita' })).toBeVisible();
  await expect(ficha).toContainText('Flores lilas');
  await expect(ficha).toContainText('Esmaltes a preparar');
  await expect(ficha).toContainText('Nude rosado');
  await expect(ficha).toContainText('Que el dorado sea solo en el anular.');
  await expect(ficha.getByRole('link', { name: 'Abrir el pin' })).toHaveAttribute('href', 'https://ar.pinterest.com/pin/123456789/');
  await expect(ficha).toContainText('Total estimado');
});

test('Pinterest: un enlace que no es de Pinterest se corrige y la captura queda guardada en la cita', async ({ page }) => {
  const slug = await crearDemo(page);
  await hastaElDiseno(page, 'Lucía Ferro');
  await page.getByLabel('Enlace del pin').fill('https://instagram.com/p/xyz');
  await page.getByRole('button', { name: 'Seguir' }).click();
  await expect(page.locator('#e-pin')).toContainText('no es de Pinterest');

  await page.getByLabel('Enlace del pin').fill('');
  // Una imagen chica (PNG 1×1) como captura del pin: se achica a JPEG en el teléfono.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.getByLabel('Subir captura del pin').setInputFiles({ name: 'pin.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByAltText('Tu captura del pin')).toBeVisible();
  await expect(page.locator('.un-seguir p')).toContainText('Idea de Pinterest');
  await page.getByRole('button', { name: 'Seguir' }).click();
  await datos(page, 'Mara Captura');

  const ficha = await abrirFicha(page, slug, 'Mara Captura');
  await expect(ficha.getByAltText('Captura del pin que eligió la clienta')).toBeVisible();
  const src = await ficha.getByAltText('Captura del pin que eligió la clienta').getAttribute('src');
  expect(src).toMatch(/^data:image\/jpeg;base64,/);
});

test('sin elegir diseño lo deciden en el local', async ({ page }) => {
  const slug = await crearDemo(page);
  await hastaElDiseno(page, 'Carla Medina', /Kapping gel/);
  await page.getByRole('button', { name: 'Lo decido en el local' }).click();
  await datos(page, 'Nina Sinidea');
  await expect(page.locator('.bar-burbuja')).toContainText('Diseño: Lo decide en el local');

  const ficha = await abrirFicha(page, slug, 'Nina Sinidea');
  await expect(ficha).toContainText('La clienta no eligió diseño');
});

test('el retiro no pide diseño', async ({ page }) => {
  await crearDemo(page);
  await hastaElDiseno(page, 'Lucía Ferro', /Retiro \+ manicura/);
  await expect(page.getByRole('heading', { name: 'Confirmá tu cita' })).toBeVisible();
  await expect(page.locator('.un-conf-dis')).toHaveCount(0);
});

test('con la primera libre, el diseño propio es de quien le tocó; desde su enlace cambia el diseño', async ({ page }) => {
  await crearDemo(page);
  await page.getByRole('button', { name: /Con la primera libre/ }).click();
  await page.getByRole('button', { name: /Kapping gel/ }).click();
  await page.locator('.bar-hora').first().click();
  const titulo = (await page.locator('.un-h3').first().innerText()).replace(/^[A-Z]{2}\s*/, '').trim();
  expect(titulo).toMatch(/^Trabajos de (Sofía|Carla|Lucía)$/);
  await page.getByRole('group', { name: 'Diseños del equipo' }).getByRole('button', { name: /^Nude natural/ }).click();
  await page.getByRole('button', { name: 'Seguir' }).click();
  await datos(page, 'Lola Cambia');

  await page.getByRole('link', { name: /Ver, cambiar o cancelar/ }).click();
  await expect(page.locator('.un-conf-dis')).toContainText('Nude natural');
  await page.getByRole('button', { name: 'Cambiar diseño' }).click();
  await page.getByRole('button', { name: /Ver todos los diseños del equipo/ }).click().catch(() => {});
  await page.getByRole('button', { name: /^Borgoña glitter/ }).click();
  await page.getByRole('button', { name: /^Almendra/ }).click();
  await page.getByRole('button', { name: 'Guardar diseño' }).click();
  await expect(page.getByRole('status')).toContainText('ya tiene tu diseño nuevo');
  await expect(page.locator('.un-conf-dis')).toContainText('Borgoña glitter');
  await expect(page.locator('.un-conf-dis')).toContainText('el diseño original es cuadrada');
});

test('catálogo: un diseño nuevo aparece al reservar y al ocultarlo deja de verse', async ({ page }) => {
  const slug = await crearDemo(page);
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Diseños' }).click();
  await expect(page.getByRole('heading', { name: 'Para preparar hoy' })).toBeVisible();
  await expect(page.getByText('Esmaltes del día')).toBeVisible();

  await page.getByRole('button', { name: 'Nuevo diseño' }).click();
  await page.getByRole('button', { name: 'Guardar diseño' }).click();
  await expect(page.locator('.un-nuevo .bar-err')).toContainText('Poné un nombre');
  await page.getByLabel('Nombre', { exact: true }).fill('Coral con lunares');
  await page.getByLabel('Quién lo hizo').selectOption({ label: 'Sofía Paz' });
  await page.getByLabel('Estilo').selectOption({ label: 'Lunares' });
  await page.getByRole('button', { name: /^Nude rosado/ }).click(); // lo saca
  await page.getByRole('button', { name: /^Coral/ }).click();
  await page.getByRole('button', { name: /^Blanco leche/ }).click();
  await page.getByRole('button', { name: 'Guardar diseño' }).click();
  await expect(page.getByRole('status').filter({ hasText: '"Coral con lunares" ya aparece al reservar' })).toBeVisible();

  await page.goto(`/d/${slug}`);
  await hastaElDiseno(page);
  await expect(page.getByRole('group', { name: 'Trabajos de Sofía' }).getByRole('button', { name: /^Coral con lunares/ })).toBeVisible();

  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Diseños' }).click();
  await page.getByRole('button', { name: 'Ocultar Coral con lunares' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'ya no se muestra al reservar' })).toBeVisible();
  await page.goto(`/d/${slug}`);
  await hastaElDiseno(page);
  await expect(page.getByRole('button', { name: /^Coral con lunares/ })).toHaveCount(0);
});

test('la demo de ejemplo abre con su sitio, la agenda muestra el diseño y las métricas facturan el nail art', async ({ page }) => {
  await ingresar(page);
  await page.getByRole('button', { name: 'Ver demo de Estudio Nácar Uñas' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Estudio Nácar Uñas' })).toBeVisible();
  const slug = page.url().split('/d/')[1].split(/[#/]/)[0];
  await page.goto(`/d/${slug}/sitio`);
  await expect(page.getByRole('heading', { name: 'Elegí con quién, cuándo y tu diseño' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'El equipo y sus trabajos' })).toBeVisible();
  await page.goto(`/d/${slug}/panel`);
  await expect(page.getByText('Panel del salón')).toBeVisible();
  await expect(page.locator('.ag-t-d').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Métricas' }).click();
  await expect(page.getByText('Facturado en servicios (estimado)')).toBeVisible();
  await page.getByRole('tab', { name: 'Ajustes' }).click();
  await expect(page.getByLabel('Seña para uñas esculpidas (%)')).toHaveValue('30');
});
