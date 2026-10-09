import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import jsQR from 'jsqr';
import { PDFDocument } from 'pdf-lib';
import { PNG } from 'pngjs';

const shots = process.env.SHOTS;
const shot = async (page: Page, name: string) => {
	if (shots) await page.screenshot({ path: `${shots}/${test.info().project.name}-${name}.png`, fullPage: true });
};

test('provider prepares, patient accepts, provider prints', async ({ page, context }) => {
	await page.goto('/proveedor');
	await page.getByRole('combobox', { name: 'Importar del expediente' }).selectOption('HA-0057');
	await expect(page.getByLabel('Apellido paterno')).toHaveValue('Rivera');
	await expect(page.getByRole('combobox', { name: 'Plan' })).toHaveValue('directo-plata');
	await page.getByRole('button', { name: 'Datos de ejemplo' }).click();

	const reason = page.getByRole('combobox', { name: 'Razón de la solicitud' });
	await reason.selectOption('routine');
	await expect(page.getByText('Este plan no reembolsa visitas regulares')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Escoja una ruta reembolsable para continuar' })).toBeDisabled();
	await shot(page, '1-not-covered');
	await page.getByRole('button', { name: 'Usar esta ruta' }).first().click();
	await expect(reason).toHaveValue('contigo-fit');
	await expect(page.getByText('Reembolsable · $20 al mes, hasta 12 meses')).toBeVisible();
	await shot(page, '1-provider');
	await page.getByRole('button', { name: /Generar código QR/ }).click();
	const qr = page.getByAltText('Código QR para el paciente');
	await expect(qr).toBeVisible();

	const link = (await page.getByRole('link', { name: 'Abrir como paciente' }).getAttribute('href')) ?? '';
	const png = PNG.sync.read(await qr.screenshot());
	expect(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data).toBe(link);
	await shot(page, '2-qr');

	const patient = await context.newPage();
	await patient.goto(link);
	await expect(patient.getByText('Ortiz Santiago Carmen L')).toBeVisible();
	await expect(patient.getByText('ZUA123456789')).toBeVisible();
	await expect(patient.getByText('Reembolso esperado: $20 al mes, hasta 12 meses')).toBeVisible();
	const accept = patient.getByRole('button', { name: 'Acepto' });
	await expect(accept).toBeDisabled();
	await shot(patient, '3-review');
	await patient.getByRole('checkbox').check();
	await accept.click();
	const code = (await patient.getByLabel('Código de aceptación').textContent())?.trim() ?? '';
	expect(code).toMatch(/^\d{4}$/);
	await shot(patient, '4-accepted');

	const codeInput = page.getByRole('textbox', { name: 'Código de aceptación' });
	await codeInput.fill(code === '0000' ? '1111' : '0000');
	await expect(page.getByText('El código no coincide')).toBeVisible();
	await codeInput.fill(code);
	await expect(page.getByText('El paciente revisó y aceptó')).toBeVisible();
	await page.getByRole('button', { name: 'Preparar paquete para imprimir' }).click();
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('link', { name: 'Descargar PDF' }).click()
	]);
	const pdf = await PDFDocument.load(readFileSync((await download.path()) ?? ''));
	expect(pdf.getPageCount()).toBe(4);
	await shot(page, '5-print');

	await page.getByRole('textbox', { name: 'Código postal*' }).fill('00901');
	await expect(page.getByText('La información cambió')).toBeVisible();
});

test('patient learns what comes back', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('combobox', { name: 'Su plan' })).toHaveCount(0);
	await page.getByRole('combobox', { name: 'Aseguradora' }).selectOption('triple-s');
	await expect(page.getByRole('combobox', { name: 'Su plan' }).locator('option')).toHaveCount(6);
	await page.getByRole('combobox', { name: 'Su plan' }).selectOption('directo-plata');
	await page.getByRole('combobox', { name: 'Servicio' }).selectOption('especialista');
	await expect(page.getByText('No: su plan no reembolsa este servicio fuera de la red')).toBeVisible();
	await expect(page.getByText('Con un proveedor de la red le costaría $15.')).toBeVisible();
	await expect(page.getByRole('link', { name: '¡Empecemos!' })).toHaveCount(0);
	await shot(page, 'p1-no');

	await page.getByRole('combobox', { name: 'Aseguradora' }).selectOption('first-medical');
	await expect(page.getByRole('combobox', { name: 'Su plan' })).toHaveValue('');
	await page.getByRole('combobox', { name: 'Su plan' }).selectOption('fm-silver');
	await expect(page.getByText('Sí: First Medical reembolsa fuera de la red')).toBeVisible();
	await expect(page.getByText('¿Quiere ayuda con el proceso?')).toBeVisible();
	await shot(page, 'p2-first-medical');
});

test('patient who already got the service: guided form, review, fix, send to provider', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Acupuntura · Triple-S Pocket Plata' }).click();
	await expect(page.getByText('Sí, por Contigo Fit: $20 al mes')).toBeVisible();
	await page.getByRole('link', { name: '¡Empecemos!' }).click();
	await expect(page).toHaveURL(/reclamar\?plan=pocket-plata&servicio=acupuntura/);

	await page.getByRole('button', { name: 'Sí', exact: true }).click();
	await page.getByRole('button', { name: 'Continuar' }).click();
	await expect(page.getByText('Indique cuánto pagó.')).toBeVisible();
	await page.getByRole('textbox', { name: 'Cuánto pagó ($)*' }).fill('90');
	await page.getByRole('textbox', { name: 'Nombre del proveedor' }).fill('Dra. Isabel Rivera');
	await page.getByRole('button', { name: 'Continuar' }).click();

	await page.getByRole('button', { name: 'Continuar' }).click();
	await expect(page.getByText('Conteste todas las preguntas.')).toBeVisible();
	for (const b of await page.getByRole('button', { name: 'Sí', exact: true }).all()) await b.click();
	await shot(page, 'w1-questions');
	await page.getByRole('button', { name: 'Continuar' }).click();

	await page.getByRole('textbox', { name: 'Nombre*', exact: true }).fill('Carmen');
	await page.getByRole('textbox', { name: 'Apellido paterno*' }).fill('Ortiz');
	await page.getByRole('textbox', { name: 'Número de contrato*' }).fill('ZUA123456789');
	await page.getByRole('textbox', { name: 'Dirección postal*' }).fill('Calle 3 #45');
	await page.getByRole('textbox', { name: 'Pueblo*' }).fill('San Juan');
	await page.getByRole('textbox', { name: 'Código postal*' }).fill('00924');
	await page.getByRole('textbox', { name: 'Teléfono*' }).fill('(787) 555-0199');
	await page.getByRole('button', { name: 'Llenar mi formulario' }).click();

	await expect(page.getByText('Revise su formulario')).toBeVisible();
	await expect(page.getByText('Calle 3 #45, San Juan, PR 00924')).toBeVisible();
	await shot(page, 'w2-review');
	await page.getByRole('button', { name: 'Corregir algo' }).click();
	await page.getByRole('textbox', { name: 'Código postal*' }).fill('00926');
	await page.getByRole('button', { name: 'Guardar y volver a llenar' }).click();
	await expect(page.getByText('Calle 3 #45, San Juan, PR 00926')).toBeVisible();
	await page.getByRole('button', { name: 'Sí, todo correcto' }).click();

	await expect(page.getByText('Envíelo a su proveedor')).toBeVisible();
	await page.getByRole('textbox', { name: 'Email del proveedor' }).fill('dra.rivera@example.com');
	await page.getByRole('textbox', { name: 'Su email' }).fill('carmen@example.com');
	await expect(page.getByRole('textbox', { name: 'Mensaje' })).toHaveValue(/complete y firme la sección E/);
	const href = (await page.getByRole('link', { name: 'Abrir en mi email' }).getAttribute('href')) ?? '';
	expect(href).toMatch(/^mailto:dra\.rivera%40example\.com\?cc=carmen%40example\.com/);
	expect(decodeURIComponent(href)).toContain('Saludos, Dra. Isabel Rivera:');
	await shot(page, 'w3-send');

	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('link', { name: 'Descargar para imprimir' }).click()
	]);
	const pdf = await PDFDocument.load(readFileSync((await download.path()) ?? ''));
	expect(pdf.getPageCount()).toBe(4);
});

test('patient before the service: preauthorization warning, form to bring', async ({ page }) => {
	await page.goto('/reclamar?plan=fm-silver&servicio=quiropractico');
	await page.getByRole('button', { name: 'Todavía no' }).click();
	await expect(page.getByText('Necesita preautorización.')).toBeVisible();
	await shot(page, 'w4-preauth');
	await page.getByRole('button', { name: 'Continuar' }).click();
	await page.getByRole('textbox', { name: 'Nombre*', exact: true }).fill('José');
	await page.getByRole('textbox', { name: 'Apellido paterno*' }).fill('Rivera');
	await page.getByRole('textbox', { name: 'Número de contrato*' }).fill('FM123456');
	await page.getByRole('textbox', { name: 'Dirección postal*' }).fill('Calle Ponce 210');
	await page.getByRole('textbox', { name: 'Pueblo*' }).fill('Ponce');
	await page.getByRole('textbox', { name: 'Código postal*' }).fill('00730');
	await page.getByRole('textbox', { name: 'Teléfono*' }).fill('(787) 555-0123');
	await page.getByRole('button', { name: 'Llenar mi formulario' }).click();
	await expect(page.getByText('Falta su fecha de nacimiento.')).toBeVisible();
	await page.getByLabel('Fecha de nacimiento').fill('1979-11-02');
	await page.getByRole('button', { name: 'Llenar mi formulario' }).click();
	await page.getByRole('button', { name: 'Sí, todo correcto' }).click();
	await expect(page.getByText('Llévelo a su cita')).toBeVisible();
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('link', { name: 'Descargar para imprimir' }).click()
	]);
	const pdf = await PDFDocument.load(readFileSync((await download.path()) ?? ''));
	expect(pdf.getPageCount()).toBe(2);
});

test('demo data clicks straight through the wizard', async ({ page }) => {
	await page.goto('/reclamar?plan=fm-silver&servicio=especialista');
	await page.getByRole('button', { name: 'Datos de ejemplo' }).click();
	await page.getByRole('button', { name: 'Sí', exact: true }).click();
	for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Continuar' }).click();
	await page.getByRole('button', { name: 'Llenar mi formulario' }).click();
	await expect(page.getByText('Revise su formulario')).toBeVisible();
	await expect(page.getByText('FM0012345678')).toBeVisible();
	await page.getByRole('button', { name: 'Sí, todo correcto' }).click();
	await expect(page.getByRole('textbox', { name: 'Email del proveedor' })).toHaveValue('proveedor@example.com');
});

test('claim page without a valid plan says so', async ({ page }) => {
	await page.goto('/reclamar?plan=nope&servicio=especialista');
	await expect(page.getByText('No encontramos un reembolso que preparar.')).toBeVisible();
});

test('bad link shows an error, not a blank page', async ({ page }) => {
	await page.goto('/paciente#garbage');
	await expect(page.getByText('No pudimos leer este enlace.')).toBeVisible();
});
