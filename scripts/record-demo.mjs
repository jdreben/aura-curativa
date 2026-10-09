// Records the demo video: node scripts/record-demo.mjs (needs `npm run preview` on :4173, ffmpeg, pdftoppm).
import { chromium, devices } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = 'demo-video';
const RAW = join(OUT, 'raw');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(RAW, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function caption(page, text) {
	await page.evaluate((t) => {
		let el = document.getElementById('__cap');
		if (!el) {
			el = document.createElement('div');
			el.id = '__cap';
			Object.assign(el.style, {
				position: 'fixed',
				left: '50%',
				bottom: '28px',
				transform: 'translateX(-50%)',
				background: 'rgba(15,23,42,.9)',
				color: '#fff',
				padding: '12px 20px',
				borderRadius: '14px',
				font: '600 19px/1.35 system-ui, sans-serif',
				zIndex: '99999',
				width: 'max-content',
				maxWidth: '88%',
				textAlign: 'center',
				boxShadow: '0 8px 30px rgba(0,0,0,.25)'
			});
			document.body.appendChild(el);
		}
		el.textContent = t;
	}, text);
}

async function press(locator, wait = 700) {
	await locator.scrollIntoViewIfNeeded();
	await locator.evaluate((el) => {
		el.style.outline = '4px solid #f59e0b';
		el.style.outlineOffset = '3px';
	});
	await sleep(wait);
	await locator.click();
	await locator.evaluate((el) => (el.style.outline = '')).catch(() => {});
}

async function glide(page, px, steps = 30, stepMs = 40) {
	for (let i = 0; i < steps; i++) {
		await page.mouse.wheel(0, px / steps);
		await sleep(stepMs);
	}
}

const browser = await chromium.launch();

// Segment 1: provider on desktop.
const desk = await browser.newContext({
	viewport: { width: 1280, height: 720 },
	recordVideo: { dir: join(RAW, '1'), size: { width: 1280, height: 720 } }
});
const p1 = await desk.newPage();
await p1.goto(BASE);
await caption(p1, 'Many PR providers don’t take insurance. Patients pay — and rarely get reimbursed.');
await sleep(3500);
await caption(p1, 'Healing Aura: the doctor and patient finish the Triple-S claim together.');
await sleep(3000);
await press(p1.getByRole('link', { name: 'Soy proveedor' }));
await p1.waitForURL('**/proveedor');
await caption(p1, 'The provider fills in their part once: NPI, license, ICD-10, CPT, amount paid.');
await sleep(1200);
await press(p1.getByRole('button', { name: 'Datos de ejemplo' }));
await sleep(1200);
await glide(p1, 900, 45, 50);
await caption(p1, 'Validation catches what gets claims returned: bad NPI, bad codes, missing license.');
await sleep(2500);
await glide(p1, 700, 35, 50);
const gen = p1.getByRole('button', { name: /Generar código QR/ });
await press(gen);
await p1.getByAltText('Código QR para el paciente').scrollIntoViewIfNeeded();
await caption(p1, 'Everything travels inside the QR code. No server, no database.');
await sleep(4000);
const link = await p1.getByRole('link', { name: 'Abrir como paciente' }).getAttribute('href');
await desk.close();

// Segment 2: patient on a phone.
const phone = await browser.newContext({
	...devices['iPhone 13'],
	recordVideo: { dir: join(RAW, '2'), size: { width: 390, height: 664 } }
});
const p2 = await phone.newPage();
await p2.goto(link);
await caption(p2, 'Patient scans the QR and sees their visit.');
await sleep(3500);
await glide(p2, 500, 25, 50);
await press(p2.getByRole('button', { name: 'Preparar paquete de reembolso' }));
await caption(p2, 'It won’t build an incomplete claim.');
await p2.getByText('Antes de continuar, corrija:').scrollIntoViewIfNeeded();
await sleep(3000);
await press(p2.getByRole('button', { name: 'Datos de ejemplo' }));
await caption(p2, 'They add only what they know: name, contract number, address.');
await sleep(1500);
await glide(p2, 1600, 60, 45);
await sleep(800);
const [download] = await Promise.all([
	p2.waitForEvent('download', { timeout: 30000 }).catch(() => null),
	(async () => {
		await press(p2.getByRole('button', { name: 'Preparar paquete de reembolso' }));
		await p2.getByText('Su paquete está listo').scrollIntoViewIfNeeded();
		await caption(p2, 'The PDF is built on the phone. Nothing leaves the device.');
		await sleep(3500);
		await press(p2.getByRole('link', { name: 'Descargar PDF' }));
	})()
]);
await sleep(1000);
if (!download) throw new Error('packet download never fired');
const pdfPath = join(OUT, 'packet.pdf');
await download.saveAs(pdfPath);
await phone.close();

// Segment 3: the generated packet itself.
execFileSync('pdftoppm', ['-png', '-r', '110', pdfPath, join(OUT, 'page')], { stdio: 'ignore' });
const pages = readdirSync(OUT)
	.filter((f) => f.startsWith('page') && f.endsWith('.png'))
	.sort();
const img = (f) => `data:image/png;base64,${readFileSync(join(OUT, f)).toString('base64')}`;
const show = [
	[pages[1], 'The official Triple-S form, filled field by field.'],
	[pages[3], 'Plus the itemized receipt Triple-S requires — NPI, EIN, license, every line.'],
	[pages[0], 'And a cover sheet: mailing address and checklist. Sign, stamp, mail.']
];
const docs = await browser.newContext({
	viewport: { width: 1280, height: 720 },
	recordVideo: { dir: join(RAW, '3'), size: { width: 1280, height: 720 } }
});
const p3 = await docs.newPage();
for (const [file, text] of show) {
	await p3.setContent(
		`<body style="margin:0;background:#e2e8f0;display:flex;justify-content:center"><img src="${img(file)}" style="width:900px;margin:24px 0;box-shadow:0 10px 40px rgba(0,0,0,.2)"></body>`
	);
	await caption(p3, text);
	await sleep(1500);
	await glide(p3, 700, 70, 55);
	await sleep(1200);
}
await p3.setContent(
	`<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#ccfbf1,#ede9fe);font-family:system-ui"><div style="text-align:center"><div style="font-size:56px;font-weight:800;color:#134e4a">Healing Aura</div><div style="font-size:24px;color:#334155;margin-top:12px">Out-of-network reimbursement, made easy in Puerto Rico.</div><div style="font-size:18px;color:#475569;margin-top:28px">No database · Built in the browser · Next: MCS, eligibility checks, mail-for-me</div></div></body>`
);
await sleep(4500);
await docs.close();
await browser.close();

// Stitch: pad the phone segment onto a 1280x720 canvas so all segments match.
const seg = (n) => {
	const dir = join(RAW, n);
	return join(dir, readdirSync(dir).find((f) => f.endsWith('.webm')));
};
const final = join(OUT, 'healing-aura-demo.mp4');
const fit = 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xccfbf1,setsar=1,fps=30';
execFileSync(
	'ffmpeg',
	[
		'-y',
		'-loglevel', 'error',
		'-i', seg('1'),
		'-i', seg('2'),
		'-i', seg('3'),
		'-filter_complex',
		`[0:v]${fit}[a];[1:v]${fit}[b];[2:v]${fit}[c];[a][b][c]concat=n=3:v=1:a=0[v]`,
		'-map', '[v]',
		'-c:v', 'libx264',
		'-pix_fmt', 'yuv420p',
		'-crf', '20',
		final
	],
	{ stdio: 'inherit' }
);
writeFileSync(join(OUT, 'README.txt'), 'Generated by scripts/record-demo.mjs. Synthetic data only.\n');
console.log(final);
