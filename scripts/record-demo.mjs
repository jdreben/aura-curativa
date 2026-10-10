// Provider-flow demo video: node scripts/record-demo.mjs (BASE defaults to the live site; needs ffmpeg, pdftoppm).
import { chromium, devices } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.BASE ?? 'https://auracurativa.pages.dev';
const OUT = join('demo-video', 'provider');
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
	// The clicked element often unmounts (e.g. Acepto); don't wait the default 30s for it.
	await locator.evaluate((el) => (el.style.outline = ''), null, { timeout: 300 }).catch(() => {});
}

async function glide(page, px, ms = 1200) {
	await page.evaluate((top) => window.scrollBy({ top, behavior: 'smooth' }), px);
	await sleep(ms);
}

const browser = await chromium.launch();

// Segment 1: provider on desktop.
const desk = await browser.newContext({
	viewport: { width: 1280, height: 720 },
	recordVideo: { dir: join(RAW, '1'), size: { width: 1280, height: 720 } }
});
const p1 = await desk.newPage();
const t0 = Date.now();
await p1.goto(`${BASE}/proveedor?demo`);
await caption(p1, 'For providers: prepare the whole claim for the patient from data the office already has.');
await sleep(3000);
await caption(p1, 'Patient and plan come straight from the practice’s intake records (simulated here).');
await sleep(1200);
const picker = p1.getByRole('combobox', { name: 'Importar del expediente' });
await picker.evaluate((el) => {
	el.style.outline = '4px solid #f59e0b';
	el.style.outlineOffset = '3px';
});
await sleep(700);
await picker.selectOption('HA-0042');
await picker.evaluate((el) => (el.style.outline = ''));
await sleep(1800);
await caption(p1, 'Add the visit: ICD-10 diagnosis, CPT services, amount paid.');
await glide(p1, 1500, 1800);
const reason = p1.getByRole('combobox', { name: 'Razón de la solicitud' });
await reason.scrollIntoViewIfNeeded();
await reason.selectOption('routine');
await glide(p1, 400, 900);
await caption(p1, 'A regular out-of-network visit isn’t reimbursable on 2027 Triple-S individual plans. We say so.');
await sleep(4500);
await caption(p1, 'And show what does work. Acupuncture qualifies for Contigo Fit.');
await sleep(1500);
await press(p1.getByRole('button', { name: 'Usar esta ruta' }).first());
await sleep(800);
await glide(p1, -200, 900);
await caption(p1, 'Reimbursable: $20/month, with the conditions the patient must meet.');
await sleep(3500);
await press(p1.getByRole('button', { name: /Generar código QR/ }));
await p1.getByAltText('Código QR para el paciente').scrollIntoViewIfNeeded();
await caption(p1, 'The whole claim travels inside the QR code. No server, no database.');
await sleep(4000);
const link = await p1.getByRole('link', { name: 'Abrir como paciente' }).getAttribute('href');
const cut1 = (Date.now() - t0) / 1000;

// Segment 2: patient reviews on a phone.
const phone = await browser.newContext({
	...devices['iPhone 13'],
	recordVideo: { dir: join(RAW, '2'), size: { width: 390, height: 664 } }
});
const p2 = await phone.newPage();
await p2.goto(link);
await p2.getByText('Qué esperar').waitFor();
await caption(p2, 'The patient scans and sees the completed claim. Nothing to type.');
await sleep(3000);
await glide(p2, 900);
await caption(p2, 'Including exactly what to expect back and the filing deadline.');
await sleep(2500);
await glide(p2, 700);
await caption(p2, 'They certify it’s correct and accept.');
await press(p2.getByRole('checkbox'));
await sleep(600);
await press(p2.getByRole('button', { name: 'Acepto' }));
const code = (await p2.getByLabel('Código de aceptación').textContent()).trim();
await caption(p2, 'Their phone shows a code tied to this exact version of the claim.');
await sleep(4000);
await phone.close();

// Back on the provider's screen: idle time while the phone segment ran gets cut.
const cut2 = (Date.now() - t0) / 1000;
await caption(p1, 'The provider enters the code. That unlocks printing.');
const codeInput = p1.getByRole('textbox', { name: 'Código de aceptación' });
await codeInput.scrollIntoViewIfNeeded();
await sleep(1200);
await codeInput.pressSequentially(code, { delay: 250 });
await sleep(1200);
await press(p1.getByRole('button', { name: 'Preparar paquete para imprimir' }));
await caption(p1, 'Print. Patient signs section D; provider signs and stamps.');
const [download] = await Promise.all([
	p1.waitForEvent('download', { timeout: 30000 }),
	(async () => {
		await sleep(2500);
		await press(p1.getByRole('link', { name: 'Descargar PDF' }));
	})()
]);
const pdfPath = join(OUT, 'packet.pdf');
await download.saveAs(pdfPath);
await sleep(1500);
await desk.close();

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
	await glide(p3, 700);
	await sleep(1200);
}
await p3.setContent(
	`<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#ccfbf1,#ede9fe);font-family:system-ui"><div style="text-align:center"><div style="font-size:56px;font-weight:800;color:#134e4a">Aura Curativa</div><div style="font-size:24px;color:#334155;margin-top:12px">Out-of-network reimbursement, made easy in Puerto Rico.</div><div style="font-size:18px;color:#475569;margin-top:28px">Honest coverage answers · No database · Next: MCS, group/PPO plans, email submission</div></div></body>`
);
await sleep(4500);
await docs.close();
await browser.close();

// Stitch: pad the phone segment onto a 1280x720 canvas so all segments match.
const seg = (n) => {
	const dir = join(RAW, n);
	return join(dir, readdirSync(dir).find((f) => f.endsWith('.webm')));
};
const final = join('demo-video', 'aura-curativa-provider.mp4');
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
		`[0:v]split[d1][d2];[d1]trim=0:${cut1},setpts=PTS-STARTPTS,${fit}[a];[1:v]${fit}[b];` +
			`[d2]trim=start=${cut2},setpts=PTS-STARTPTS,${fit}[c];[2:v]${fit}[e];[a][b][c][e]concat=n=4:v=1:a=0[v]`,
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
