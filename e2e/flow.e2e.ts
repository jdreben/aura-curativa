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

test('patient learns what comes back, then prepares the form', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('combobox', { name: 'Su plan' }).selectOption('directo-plata');
	await page.getByRole('combobox', { name: 'Servicio' }).selectOption('especialista');
	await page.getByRole('textbox', { name: 'Cuánto paga' }).fill('150');
	await expect(page.getByText('No: su plan no reembolsa este servicio fuera de la red')).toBeVisible();
	await expect(page.getByText('Con un proveedor de la red le costaría $15.')).toBeVisible();
	await expect(page.getByText('4 · Cómo reclamarlo')).toHaveCount(0);
	await shot(page, 'p1-no');

	await page.getByRole('combobox', { name: 'Su plan' }).selectOption('ts-empleador');
	await expect(page.getByText('Alrededor de $17, si su plan incluye beneficio de reembolso')).toBeVisible();
	await expect(page.getByText('$133.00')).toBeVisible();
	await shot(page, 'p2-employer');

	await page.getByRole('combobox', { name: 'Su plan' }).selectOption('fm-silver');
	await expect(page.getByText('Sí: First Medical reembolsa fuera de la red')).toBeVisible();
	await expect(page.getByText(/90 días desde el servicio/)).toBeVisible();
	await expect(page.getByRole('link', { name: 'Solicitud de Reembolso de First Medical' })).toBeVisible();
	await shot(page, 'p2b-first-medical');

	await page.getByRole('combobox', { name: 'Su plan' }).selectOption('pocket-plata');
	await page.getByRole('combobox', { name: 'Servicio' }).selectOption('acupuntura');
	await page.getByRole('textbox', { name: 'Cuánto paga' }).fill('90');
	await expect(page.getByText('Sí, por Contigo Fit: $20 al mes')).toBeVisible();
	await expect(page.getByText('4 · Cómo reclamarlo')).toBeVisible();

	await page.getByRole('button', { name: 'Preparar mi formulario' }).click();
	await expect(page.getByText('Antes de continuar, corrija:')).toBeVisible();
	await page.getByRole('textbox', { name: 'Nombre*', exact: true }).fill('Carmen');
	await page.getByLabel('Apellido paterno').fill('Ortiz');
	await page.getByLabel('Contrato Triple-S').fill('ZUA123456789');
	await page.getByLabel('Dirección postal').fill('Calle 3 #45');
	await page.getByLabel('Ciudad / pueblo').fill('San Juan');
	await page.getByRole('textbox', { name: 'Código postal*' }).fill('00924');
	await page.getByRole('textbox', { name: 'Teléfono*', exact: true }).fill('(787) 555-0199');
	await page.getByRole('button', { name: 'Preparar mi formulario' }).click();
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('link', { name: 'Descargar formulario' }).click()
	]);
	const pdf = await PDFDocument.load(readFileSync((await download.path()) ?? ''));
	expect(pdf.getPageCount()).toBe(3);
	await shot(page, 'p3-form');
});

test('bad link shows an error, not a blank page', async ({ page }) => {
	await page.goto('/paciente#garbage');
	await expect(page.getByText('No pudimos leer este enlace.')).toBeVisible();
});
