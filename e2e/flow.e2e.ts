import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import jsQR from 'jsqr';
import { PDFDocument } from 'pdf-lib';
import { PNG } from 'pngjs';

const shots = process.env.SHOTS;
const shot = async (page: import('@playwright/test').Page, name: string) => {
	if (shots) await page.screenshot({ path: `${shots}/${test.info().project.name}-${name}.png`, fullPage: true });
};

test('provider QR to patient packet', async ({ page }) => {
	await page.goto('/');
	await shot(page, '1-home');

	await page.getByRole('link', { name: 'Soy proveedor' }).click();
	await page.getByRole('button', { name: 'Datos de ejemplo' }).click();
	await shot(page, '2-provider');
	await page.getByRole('button', { name: /Generar código QR/ }).click();
	await expect(page.getByAltText('Código QR para el paciente')).toBeVisible();
	await shot(page, '3-qr');

	const link = await page.getByRole('link', { name: 'Abrir como paciente' }).getAttribute('href');
	expect(link).toContain('/paciente#');
	const png = PNG.sync.read(await page.getByAltText('Código QR para el paciente').screenshot());
	expect(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data).toBe(link);
	await page.goto(link ?? '');
	await expect(page.getByText('Dra. Isabel Rivera Colón, MD')).toBeVisible();

	await page.getByRole('button', { name: 'Preparar paquete de reembolso' }).click();
	await expect(page.getByText('Antes de continuar, corrija:')).toBeVisible();

	await page.getByRole('button', { name: 'Datos de ejemplo' }).click();
	await shot(page, '4-patient');
	await page.getByRole('button', { name: 'Preparar paquete de reembolso' }).click();
	await expect(page.getByText('Su paquete está listo')).toBeVisible();
	await shot(page, '5-ready');

	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('link', { name: 'Descargar PDF' }).click()
	]);
	const pdf = await PDFDocument.load(readFileSync((await download.path()) ?? ''));
	expect(pdf.getPageCount()).toBe(4);
});

test('bad link shows an error, not a blank page', async ({ page }) => {
	await page.goto('/paciente#garbage');
	await expect(page.getByText('No pudimos leer este enlace.')).toBeVisible();
});
