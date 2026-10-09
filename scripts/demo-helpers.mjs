// Shared helpers for the scripted demo videos (Playwright recording + ffmpeg stitching).
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function caption(page, text) {
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

async function highlight(locator, on) {
	await locator
		.evaluate(
			(el, on) => {
				el.style.outline = on ? '4px solid #f59e0b' : '';
				el.style.outlineOffset = on ? '3px' : '';
			},
			on,
			{ timeout: 300 }
		)
		.catch(() => {});
}

export async function press(locator, wait = 700) {
	await locator.scrollIntoViewIfNeeded();
	await highlight(locator, true);
	await sleep(wait);
	await locator.click();
	// The clicked element often unmounts (e.g. Acepto); highlight() gives up after 300ms instead of 30s.
	await highlight(locator, false);
}

export async function pick(locator, value, wait = 600) {
	await locator.scrollIntoViewIfNeeded();
	await highlight(locator, true);
	await sleep(wait);
	await locator.selectOption(value);
	await highlight(locator, false);
}

export async function glide(page, px, ms = 1200) {
	await page.evaluate((top) => window.scrollBy({ top, behavior: 'smooth' }), px);
	await sleep(ms);
}

export async function showPdfPages(page, pdfPath, outDir, pages) {
	execFileSync('pdftoppm', ['-png', '-r', '110', pdfPath, join(outDir, 'page')], { stdio: 'ignore' });
	const files = readdirSync(outDir)
		.filter((f) => f.startsWith('page') && f.endsWith('.png'))
		.sort();
	for (const [index, text] of pages) {
		const data = readFileSync(join(outDir, files[index])).toString('base64');
		await page.setContent(
			`<body style="margin:0;background:#e2e8f0;display:flex;justify-content:center"><img src="data:image/png;base64,${data}" style="width:900px;margin:24px 0;box-shadow:0 10px 40px rgba(0,0,0,.2)"></body>`
		);
		await caption(page, text);
		await sleep(1500);
		await glide(page, 700);
		await sleep(1200);
	}
}

export async function endCard(page, subtitle, footer) {
	await page.setContent(
		`<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#ccfbf1,#ede9fe);font-family:system-ui"><div style="text-align:center"><div style="font-size:56px;font-weight:800;color:#134e4a">Healing Aura</div><div style="font-size:24px;color:#334155;margin-top:12px">${subtitle}</div><div style="font-size:18px;color:#475569;margin-top:28px">${footer}</div></div></body>`
	);
	await sleep(4500);
}

// segments: [{ file, trim?: [start, end] }]; everything is fit onto a 1280x720 canvas.
export function stitch(segments, out) {
	const fit = 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xccfbf1,setsar=1,fps=30';
	const inputs = [...new Set(segments.map((s) => s.file))];
	const uses = inputs.map((f) => segments.filter((s) => s.file === f).length);
	const filters = inputs.map((_, i) => (uses[i] > 1 ? `[${i}:v]split=${uses[i]}${Array.from({ length: uses[i] }, (_, k) => `[i${i}_${k}]`).join('')}` : `[${i}:v]null[i${i}_0]`));
	const seen = inputs.map(() => 0);
	const labels = segments.map((s, n) => {
		const i = inputs.indexOf(s.file);
		const src = `[i${i}_${seen[i]++}]`;
		const trim = s.trim
			? `trim=start=${s.trim[0]}${s.trim[1] != null ? `:end=${s.trim[1]}` : ''},setpts=PTS-STARTPTS,`
			: '';
		filters.push(`${src}${trim}${fit}[s${n}]`);
		return `[s${n}]`;
	});
	filters.push(`${labels.join('')}concat=n=${segments.length}:v=1:a=0[v]`);
	execFileSync(
		'ffmpeg',
		['-y', '-loglevel', 'error', ...inputs.flatMap((f) => ['-i', f]), '-filter_complex', filters.join(';'), '-map', '[v]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', out],
		{ stdio: 'inherit' }
	);
}

export const webm = (dir) => join(dir, readdirSync(dir).find((f) => f.endsWith('.webm')));
