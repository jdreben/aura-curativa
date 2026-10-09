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
	await page.getByRole('button', { name: 'Datos de ejemplo' }).click();
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

test('bad link shows an error, not a blank page', async ({ page }) => {
	await page.goto('/paciente#garbage');
	await expect(page.getByText('No pudimos leer este enlace.')).toBeVisible();
});
