import { test, expect, type Page } from '@playwright/test';

// Martes 10 de noviembre de 2026, 10:00.
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 10, 10, 0));
});

/** Ningún mensaje al paciente dice especialidad, procedimiento, resultado ni motivo (DEMO 15). */
const CLINICO = /diagn[oó]stic|alergi|evoluci|s[ií]ntoma|medicaci|tratamiento|receta|resultado|an[aá]lisis|glucemia|colesterol|toxina|relleno|rinoplast|cirug|procedimiento|est[eé]tic|nutrici|cl[ií]nic/i;

async function ingresar(page: Page) {
  await page.goto('/');
  if (!page.url().includes('/ingresar')) return;
  await page.getByLabel('Usuario').fill('vendedor');
  await page.getByLabel('Contraseña').fill('demo1234');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => u.pathname === '/');
}

async function crearDemo(page: Page, nombre: string) {
  await ingresar(page);
  await page.getByRole('button', { name: 'Consultorio', exact: true }).click();
  await page.getByLabel('Nombre del negocio').fill(nombre);
  await page.getByLabel('WhatsApp del negocio').fill('54 9 11 5555 1234');
  await page.getByRole('button', { name: 'Abrir demo' }).click();
  await page.waitForURL(/\/d\//);
  return page.url().split('/d/')[1];
}

async function mensajesDe(page: Page, paciente: string) {
  const sim = page.getByRole('region', { name: 'Simulador de WhatsApp' });
  if (!(await sim.isVisible())) await page.getByRole('button', { name: /Simulador de WhatsApp/ }).click();
  const elegir = sim.getByLabel('Ver los mensajes de');
  if (await elegir.count()) await elegir.selectOption({ label: paciente });
  return sim.locator('.cl-sim-chat');
}

async function entrarAlPortal(page: Page, slug: string) {
  await page.goto(`/d/${slug}/portal`);
  await page.getByRole('button', { name: /usar el WhatsApp de Ana Martínez/ }).click();
  await page.getByRole('button', { name: 'Enviarme el código' }).click();
  const chat = page.getByRole('region', { name: 'Simulador de WhatsApp' }).locator('.cl-sim-chat');
  await expect(chat).toContainText('Tu código para entrar');
  const codigo = (await chat.textContent())!.match(/es (\d{4})\./)![1];
  await page.getByRole('button', { name: 'Cerrar el simulador' }).click();
  await page.getByLabel('Código de 4 números').fill(codigo);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Hola, Ana' })).toBeVisible();
}

test('consulta con dictado simulado y combo, receta con QR, aviso neutro, portal con código y validación pública', async ({ page }) => {
  const slug = await crearDemo(page, 'Consultorio Norte');
  await page.goto(`/d/${slug}/panel`);
  await expect(page.getByText('Panel de Dra. Laura Méndez')).toBeVisible();
  await expect(page.getByText('Demo con datos ficticios. No cargues datos reales de pacientes.')).toBeVisible();

  await page.getByRole('tab', { name: 'Consultas' }).click();
  await page.getByLabel('Consulta sin turno').selectOption({ label: 'Ana Martínez' });
  await page.getByRole('button', { name: 'Abrir historia' }).click();
  await expect(page.getByText('Firmada').first()).toBeVisible(); // historia con evoluciones firmadas
  await page.getByRole('button', { name: 'Consulta de hoy' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Alergia registrada: Penicilina' })).toBeVisible();

  await page.getByLabel('Motivo de consulta').fill('Fiebre y dolor de garganta');
  await page.getByRole('button', { name: 'Dictar (simulación)' }).click();
  await expect(page.getByLabel('Examen y evolución')).toHaveValue(/Faringe eritematosa/);
  await page.getByLabel('Diagnóstico').selectOption('J11.1 Gripe');
  await page.getByRole('group', { name: 'Combos de indicaciones' }).getByRole('button', { name: 'Gripe' }).click();
  await expect(page.getByLabel('Texto de Receta')).toHaveValue(/Paracetamol 500 mg/);

  // Sin confirmar la firma no se puede cerrar.
  await page.getByRole('button', { name: 'Firmar y cerrar consulta' }).last().click();
  await expect(page.getByText(/Confirmá que firmás como Dra\. Laura Méndez/)).toBeVisible();
  await page.getByLabel(/Firmo como Dra\. Laura Méndez/).check();
  await page.getByRole('button', { name: 'Firmar y cerrar consulta' }).last().click();
  await expect(page.getByRole('heading', { name: 'Consulta firmada' })).toBeVisible();
  await expect(page.getByText('Demo — sin validez legal').first()).toBeVisible();
  await expect(page.getByRole('img', { name: /Código QR para validar/ }).first()).toBeVisible();

  // El paciente recibe un aviso neutro.
  const chat = await mensajesDe(page, 'Ana Martínez');
  await expect(chat).toContainText('Tenés un documento nuevo en tu portal de Consultorio Norte.');
  expect((await chat.textContent())!).not.toMatch(CLINICO);
  await page.getByRole('button', { name: 'Cerrar el simulador' }).click();

  // Portal: entra con código de un solo uso y ve la receta con su QR.
  await entrarAlPortal(page, slug);
  await page.getByRole('navigation', { name: 'Secciones del portal' }).getByRole('button', { name: 'Recetas' }).click();
  await expect(page.getByText(/Paracetamol 500 mg/).first()).toBeVisible();
  const validar = await page.getByRole('link', { name: /^Validar Receta/ }).first().getAttribute('href');

  // Validación pública: dice que existe, de quién y de cuándo; nunca el contenido.
  await page.goto(validar!);
  await expect(page.getByText('Documento encontrado')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Receta' })).toBeVisible();
  await expect(page.getByText(/Dra\. Laura Méndez/)).toBeVisible();
  await expect(page.getByText(/sin validez legal/)).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Paracetamol');
});

test('presupuesto: se envía, el paciente lo ve, elige cuotas o contado, firma, paga la seña simulada y se agenda con checklist', async ({ page }) => {
  const slug = await crearDemo(page, 'Centro Sur');
  await page.goto(`/d/${slug}/panel`);
  await page.getByLabel('Mostrar como').selectOption('procedimientos');
  await expect(page.getByText('Panel de Dra. Paula Ríos')).toBeVisible();
  await expect(page.getByText(/retoques pendientes/)).toBeVisible();

  await page.getByRole('tab', { name: 'Presupuestos' }).click();
  await expect(page.getByText(/presupuestos vistos hace más de 3 días sin respuesta/)).toBeVisible();
  await page.getByRole('button', { name: 'Nuevo presupuesto' }).click();
  const hoja = page.getByRole('dialog');
  await hoja.getByLabel('Paciente').selectOption({ label: 'Ana Martínez' });
  await hoja.getByLabel('Procedimiento (plantilla)').selectOption({ label: 'Relleno con ácido hialurónico' });
  await hoja.getByRole('button', { name: 'Enviar al paciente' }).click();
  await expect(page.getByRole('dialog')).toContainText('Relleno con ácido hialurónico');
  await page.getByRole('button', { name: 'Cerrar' }).click();

  const chat = await mensajesDe(page, 'Ana Martínez');
  await expect(chat).toContainText('Te enviamos una propuesta desde Centro Sur');
  expect((await chat.textContent())!).not.toMatch(CLINICO);
  await page.getByRole('button', { name: 'Cerrar el simulador' }).click();

  // El paciente abre la propuesta, elige contado, firma y paga (simulado).
  await entrarAlPortal(page, slug);
  await page.getByRole('button', { name: /Tenés una propuesta para revisar/ }).first().click();
  await expect(page.getByText(/Vale \d+ días más/)).toBeVisible();
  await page.getByRole('radio', { name: /Contado/ }).click();
  await page.getByRole('button', { name: 'Aceptar y firmar' }).click();
  await page.getByRole('button', { name: 'Firmar' }).click();
  await expect(page.getByText('Escribí tu nombre y marcá que aceptás.')).toBeVisible();
  await page.getByLabel(/Leí y acepto/).check();
  await page.getByRole('button', { name: 'Firmar' }).click();
  await expect(page.getByText('Pago simulado · no se cobra nada')).toBeVisible();
  await page.getByRole('button', { name: 'Aprobar pago' }).click();
  await expect(page.getByText('¡Listo! Tu propuesta quedó confirmada')).toBeVisible();

  // El consultorio lo ve aceptado y lo agenda; el checklist marca lo que falta.
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Presupuestos' }).click();
  await page.getByRole('region', { name: 'Aceptado' }).getByRole('button', { name: /Ana Martínez.*Relleno/ }).click();
  const det = page.getByRole('dialog');
  await expect(det).toContainText('Aceptado y firmado');
  await expect(det).toContainText('Pago recibido');
  await det.getByLabel('Fecha y hora del procedimiento').fill('2026-12-07T08:00');
  await det.getByRole('button', { name: 'Agendar procedimiento' }).click();
  await expect(det.getByText('Turno agendado. El paciente recibió la confirmación.')).toBeVisible();
  await expect(det.getByText(/0 de 3 listos/)).toBeVisible();
  await expect(det.getByRole('button', { name: /Registrar procedimiento realizado \(completá la lista\)/ })).toBeDisabled();
});

test('galería con PIN y accesos registrados; la secretaría no ve lo clínico', async ({ page }) => {
  const slug = await crearDemo(page, 'Centro Oeste');
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Galería' }).click();
  for (const d of ['1', '1', '1', '1']) await page.getByRole('button', { name: `Número ${d}`, exact: true }).click();
  await expect(page.getByText('PIN incorrecto. Probá de nuevo.')).toBeVisible();
  for (const d of ['1', '2', '3', '4']) await page.getByRole('button', { name: `Número ${d}`, exact: true }).click();
  await expect(page.getByText('Mover el divisor')).toBeVisible();
  await expect(page.getByText('Lo que autorizó la paciente')).toBeVisible();
  await expect(page.getByText('Quién abrió la galería')).toBeVisible();
  await expect(page.locator('.cl-comp').getByRole('link')).toHaveCount(0); // sin descarga

  await page.getByLabel('Ver como').selectOption('secretaria');
  await expect(page.getByText('Agenda de la secretaría')).toBeVisible();
  for (const t of ['Galería', 'Consultas', 'Resultados', 'Reportes']) await expect(page.getByRole('tab', { name: t, exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Presupuestos' })).toBeVisible();
});

test('resultados por revisar con gráfico y reportes con listas de trabajo que invitan con mensajes neutros', async ({ page }) => {
  const slug = await crearDemo(page, 'Consultorio Centro');
  await page.goto(`/d/${slug}/panel`);
  await page.getByRole('tab', { name: 'Resultados' }).click();
  await page.getByRole('button', { name: /^Ana Martínez/ }).click();
  await expect(page.getByRole('img', { name: /Colesterol total: evolución/ })).toBeVisible();
  await page.getByLabel('Comentario para el paciente').fill('Muy bien, seguimos igual.');
  await page.getByRole('button', { name: 'Marcar como revisado' }).click();
  await page.getByRole('group', { name: 'Filtrar resultados' }).getByRole('button', { name: 'Revisados' }).click();
  await expect(page.getByRole('button', { name: /^Ana Martínez/ }).first()).toBeVisible();

  await page.getByRole('tab', { name: 'Reportes' }).click();
  await expect(page.getByRole('img', { name: /Ingresos por semana/ })).toBeVisible();
  await page.getByRole('button', { name: 'Ver como tabla' }).first().click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('group', { name: 'Tipo de reporte' }).getByRole('button', { name: 'Pacientes' }).click();
  await page.getByRole('button', { name: 'Invitar a sacar turno' }).first().click();
  await expect(page.getByText('Invitados hoy').first()).toBeVisible();

  const chat = page.getByRole('region', { name: 'Simulador de WhatsApp' });
  await page.getByRole('button', { name: /Simulador de WhatsApp/ }).click();
  await expect(chat.locator('.cl-sim-chat')).toContainText('te invitamos a reservar tu próximo turno');
  const todos = await page.evaluate((s) => JSON.parse(localStorage.getItem(`acmias:demo:${s}:clinico`)!).mensajes.map((m: { texto: string; delPaciente?: boolean }) => (m.delPaciente ? '' : m.texto)).join(' '), slug);
  expect(todos).not.toMatch(CLINICO);
});
