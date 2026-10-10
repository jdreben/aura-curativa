// Patient-flow demo video: node scripts/record-patient-demo.mjs (BASE defaults to the live site; needs ffmpeg, pdftoppm).
import { chromium } from '@playwright/test';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { caption, endCard, glide, pick, press, showPdfPages, sleep, stitch, webm } from './demo-helpers.mjs';

const BASE = process.env.BASE ?? 'https://18-212-154-202.sslip.io';
const OUT = join('demo-video', 'patient');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: { width: 1280, height: 720 },
	recordVideo: { dir: join(OUT, 'raw1'), size: { width: 1280, height: 720 } }
});
const p = await ctx.newPage();
await p.goto(BASE);
await p.getByText('¿Me reembolsan?').first().waitFor();
await caption(p, 'In Puerto Rico, many patients pay cash out of network and guess what their plan pays back.');
await sleep(3500);

const insurer = p.getByRole('combobox', { name: 'Aseguradora' });
const plan = () => p.getByRole('combobox', { name: 'Su plan' });
const service = p.getByRole('combobox', { name: 'Servicio' });

await caption(p, 'Pick your insurer, then your exact 2027 plan.');
await pick(insurer, 'triple-s');
await pick(plan(), 'directo-plata');
await caption(p, 'Then the service you need.');
await pick(service, 'especialista');
await glide(p, 300, 800);
await caption(p, 'Triple-S Directo Plata doesn’t reimburse it — and shows the cheaper path: a $15 copay in network.');
await sleep(4500);

await glide(p, -300, 800);
await caption(p, 'Same visit on First Medical Directo Silver: reimbursed at their rate minus a $20 copay.');
await pick(insurer, 'first-medical');
await pick(plan(), 'fm-silver');
await glide(p, 350, 1000);
await sleep(3500);
await caption(p, 'And the catch nobody mentions: only 90 days to file.');
await glide(p, 500, 1000);
await sleep(2500);

await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
await sleep(900);
await caption(p, 'Acupuncture on Triple-S Pocket Plata? One tap on an example.');
await press(p.getByRole('button', { name: 'Acupuntura · Triple-S Pocket Plata' }));
await glide(p, 420, 1000);
await caption(p, 'Contigo Fit pays $20 a month. Want help with the process?');
await sleep(2500);
await press(p.getByRole('link', { name: '¡Empecemos!' }));
await p.waitForURL('**/reclamar**');
await caption(p, 'Already got the service? Yes.');
await sleep(1200);
await press(p.getByRole('button', { name: 'Sí', exact: true }));
const fill = async (name, value) => {
	const box = p.getByRole('textbox', { name });
	await box.scrollIntoViewIfNeeded();
	await box.pressSequentially(value, { delay: 25 });
};
await caption(p, 'When, how much, and who.');
await fill('Cuánto pagó ($)*', '90');
await press(p.getByRole('button', { name: 'Continuar' }));
await caption(p, 'A few questions that justify the claim under the policy.');
for (const btn of await p.getByRole('button', { name: 'Sí', exact: true }).all()) {
	await btn.click();
	await sleep(500);
}
await sleep(800);
await press(p.getByRole('button', { name: 'Continuar' }));
await caption(p, 'Only what the app can’t fill in for you.');
await fill('Nombre*', 'Carmen');
await fill('Apellido paterno*', 'Ortiz');
await fill('Número de contrato*', 'ZUA123456789');
await fill('Dirección postal*', 'Urb. Villa Prades, Calle 3 #45');
await fill('Pueblo*', 'San Juan');
await fill('Código postal*', '00924');
await fill('Teléfono*', '(787) 555-0199');
await press(p.getByRole('button', { name: 'Llenar mi formulario' }));
await p.getByText('Revise su formulario').waitFor();
await caption(p, 'Review it. Anything wrong? Fix it and it refills.');
await sleep(3500);
await press(p.getByRole('button', { name: 'Sí, todo correcto' }));
await press(p.getByRole('button', { name: /Enviárselo por email/ }));
await caption(p, 'A prefilled email asks the provider to complete and sign their part.');
await glide(p, 250, 1000);
await sleep(2500);
await caption(p, 'Sent from the patient’s own email. Nothing is stored.');
const [download] = await Promise.all([
	p.waitForEvent('download', { timeout: 30000 }),
	(async () => {
		await sleep(1500);
		await press(p.getByRole('link', { name: 'Descargar el paquete completo (PDF)' }));
	})()
]);
const pdfPath = join(OUT, 'form.pdf');
await download.saveAs(pdfPath);
await sleep(1000);
await ctx.close();

const docs = await browser.newContext({
	viewport: { width: 1280, height: 720 },
	recordVideo: { dir: join(OUT, 'raw2'), size: { width: 1280, height: 720 } }
});
const d = await docs.newPage();
await showPdfPages(d, pdfPath, OUT, [
	[1, 'The real Triple-S form, filled in. The provider completes section E and signs.'],
	[3, 'A letter citing the policy clause that entitles the refund.'],
	[0, 'And a cover sheet: expected amount, steps, deadline, where to send.']
]);
await endCard(d, '¿Me reembolsan? Know before you pay.', 'Triple-S and First Medical 2027 individual plans · No account · Nothing stored');
await docs.close();
await browser.close();

const final = join('demo-video', 'aura-curativa-patient.mp4');
stitch([{ file: webm(join(OUT, 'raw1')) }, { file: webm(join(OUT, 'raw2')) }], final);
console.log(final);
