import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';
import type { Patient, Provider, Visit } from '../claim';
import { lineTotal, money, patientFullName } from '../claim';
import { filingDeadline, planById, routeById } from '../plans.ts';
import { TRIPLE_S, fillTripleS, isoToForm, winAnsi } from './triple-s';

const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.4, 0.4, 0.4);
const RULE = rgb(0.75, 0.75, 0.75);

type Fonts = { regular: PDFFont; bold: PDFFont };

function text(page: PDFPage, s: string, x: number, y: number, font: PDFFont, size = 10, color = BLACK) {
	page.drawText(winAnsi(s), { x, y, size, font, color });
}

function fit(s: string, font: PDFFont, size: number, maxWidth: number): string {
	let t = winAnsi(s);
	while (t.length > 1 && font.widthOfTextAtSize(t, size) > maxWidth) t = t.slice(0, -2) + '…';
	return t;
}

function rule(page: PDFPage, y: number, x1 = 50, x2 = 562) {
	page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.75, color: RULE });
}

function wrap(s: string, font: PDFFont, size: number, maxWidth: number): string[] {
	const lines: string[] = [];
	let line = '';
	for (const word of winAnsi(s).split(' ')) {
		const next = line ? `${line} ${word}` : word;
		if (line && font.widthOfTextAtSize(next, size) > maxWidth) {
			lines.push(line);
			line = word;
		} else line = next;
	}
	if (line) lines.push(line);
	return lines;
}

function drawCover(doc: PDFDocument, f: Fonts, patient: Patient, visit: Visit) {
	const page = doc.addPage([612, 792]);
	const route = routeById(visit.route);
	const plan = planById(patient.plan);
	let y = 730;
	text(page, 'Healing Aura', 50, y, f.bold, 22);
	y -= 22;
	text(page, 'Paquete de reembolso — Triple-S Salud', 50, y, f.regular, 13, GRAY);
	y -= 34;

	const summary: [string, string][] = [
		['Paciente', patientFullName(patient)],
		['Plan', plan?.name ?? '—'],
		['Razón', route?.label ?? '—'],
		['Total pagado', money(lineTotal(visit.lines))],
		['Reembolso esperado', route?.amount || 'Según los beneficios fuera de la red de su plan'],
		['Fecha límite', filingDeadline(visit.lines.map((l) => l.dateFrom)) || '—']
	];
	for (const [k, v] of summary) {
		text(page, k, 50, y, f.regular, 10.5, GRAY);
		for (const l of wrap(v, f.regular, 10.5, 370)) {
			text(page, l, 180, y, f.regular, 10.5);
			y -= 14;
		}
		y -= 2;
	}
	y -= 16;

	text(page, 'Antes de enviar, verifique:', 50, y, f.bold, 12);
	y -= 20;
	const steps = [
		'El paciente firma y fecha la sección D (Autorización del paciente).',
		'El médico firma y pone su sello timbrado en la sección E y en la factura detallada.',
		...(route?.conditions ?? []),
		'Un formulario por miembro de la familia y por año póliza.',
		...(patient.hasOtherCoverage ? ['Incluya la Explicación de Beneficios (EOB) del otro seguro.'] : []),
		'Guarde una copia de todo antes de enviar.'
	];
	for (const s of steps) {
		const lines = wrap(s, f.regular, 10.5, 480);
		page.drawRectangle({ x: 52, y: y - 2, width: 9, height: 9, borderColor: BLACK, borderWidth: 0.75 });
		for (const l of lines) {
			text(page, l, 70, y, f.regular, 10.5);
			y -= 14;
		}
		y -= 4;
	}
	y -= 16;

	text(page, 'Cómo enviar (escoja una):', 50, y, f.bold, 12);
	y -= 20;
	text(page, `Correo electrónico: ${TRIPLE_S.email} (escanee todo en un PDF)`, 70, y, f.regular, 10.5);
	y -= 16;
	text(page, 'App Mi Triple-S o centro de servicio', 70, y, f.regular, 10.5);
	y -= 16;
	for (const l of wrap(`Correo postal: ${TRIPLE_S.mailTo.join(', ')}`, f.regular, 10.5, 480)) {
		text(page, l, 70, y, f.regular, 10.5);
		y -= 14;
	}

	text(
		page,
		'Generado en su dispositivo por Healing Aura. Ningún dato se guardó en un servidor. No es asesoría legal ni de seguros.',
		50,
		60,
		f.regular,
		8.5,
		GRAY
	);
	text(page, `Formulario: ${TRIPLE_S.formRevision}. Reglas: pólizas Triple-S 2027.`, 50, 48, f.regular, 8.5, GRAY);
}

function drawReceipt(doc: PDFDocument, f: Fonts, provider: Provider, visit: Visit, patient: Patient) {
	const page = doc.addPage([612, 792]);
	let y = 740;
	text(page, provider.name, 50, y, f.bold, 16);
	y -= 16;
	for (const l of [provider.specialty, provider.address1, provider.address2, provider.phone].filter(Boolean)) {
		text(page, l, 50, y, f.regular, 9.5, GRAY);
		y -= 12;
	}
	const ids = [`NPI ${provider.npi}`, provider.ein && `EIN ${provider.ein}`, provider.license && `Licencia ${provider.license}`]
		.filter(Boolean)
		.join('   ·   ');
	text(page, ids, 50, y, f.regular, 9.5);
	y -= 26;

	text(page, 'FACTURA DETALLADA / RECIBO DE PAGO', 50, y, f.bold, 13);
	y -= 22;

	const meta: [string, string][] = [
		['Paciente', patientFullName(patient)],
		['Contrato Triple-S', patient.contractNumber.toUpperCase()],
		['Cuenta / récord', visit.accountNumber || '—'],
		['Diagnóstico (ICD-10)', visit.diagnoses.filter((d) => d.trim()).map((d) => d.toUpperCase()).join(', ')]
	];
	if (visit.diagnosisDescription) meta.push(['Descripción', visit.diagnosisDescription]);
	const reason = routeById(visit.route)?.reason;
	if (reason) meta.push(['Razón de la solicitud', reason]);
	for (const [k, v] of meta) {
		text(page, k, 50, y, f.regular, 9.5, GRAY);
		for (const l of wrap(v, f.regular, 9.5, 385)) {
			text(page, l, 175, y, f.regular, 9.5);
			y -= 13;
		}
		y -= 1;
	}
	y -= 12;

	const cols = [
		{ h: 'Fecha', x: 50, w: 60 },
		{ h: 'Servicio', x: 112, w: 225 },
		{ h: 'Código', x: 340, w: 50 },
		{ h: 'Mod', x: 392, w: 28 },
		{ h: 'Uds', x: 422, w: 26 },
		{ h: 'Facturado', x: 450, w: 54 },
		{ h: 'Pagado', x: 508, w: 54 }
	];
	for (const c of cols) text(page, c.h, c.x, y, f.bold, 9);
	y -= 6;
	rule(page, y);
	y -= 14;
	for (const l of visit.lines) {
		const paid = Number.parseFloat(l.amountPaid) || 0;
		const cells = [
			isoToForm(l.dateFrom),
			l.description,
			l.cpt.toUpperCase(),
			l.modifier.toUpperCase(),
			l.units,
			money(paid),
			money(paid)
		];
		cells.forEach((c, i) => text(page, fit(c, f.regular, 9, cols[i].w), cols[i].x, y, f.regular, 9));
		y -= 8;
		rule(page, y);
		y -= 14;
	}
	const total = money(lineTotal(visit.lines));
	text(page, 'Total pagado por el paciente', 330, y, f.bold, 10);
	text(page, total, 562 - f.bold.widthOfTextAtSize(total, 10), y, f.bold, 10);
	y -= 20;
	text(page, 'Balance pendiente: $0.00 — pagado en su totalidad.', 50, y, f.regular, 9.5, GRAY);
	y -= 60;

	page.drawLine({ start: { x: 50, y }, end: { x: 280, y }, thickness: 0.75, color: BLACK });
	page.drawRectangle({ x: 330, y: y - 10, width: 232, height: 80, borderColor: RULE, borderWidth: 0.75 });
	text(page, 'Sello timbrado del proveedor', 336, y + 58, f.regular, 8.5, GRAY);
	y -= 12;
	text(page, 'Firma del proveedor y fecha', 50, y, f.regular, 8.5, GRAY);

	text(page, `Contrato Triple-S: ${patient.contractNumber.toUpperCase()}`, 50, 48, f.regular, 8.5, GRAY);
}

export async function buildTripleSPacket(
	template: Uint8Array,
	provider: Provider,
	visit: Visit,
	patient: Patient
): Promise<Uint8Array> {
	const out = await PDFDocument.create();
	out.setTitle('Solicitud de reembolso Triple-S');
	out.setProducer('Healing Aura');
	const fonts: Fonts = {
		regular: await out.embedFont(StandardFonts.Helvetica),
		bold: await out.embedFont(StandardFonts.HelveticaBold)
	};
	const lines = visit.lines.filter((l) => l.cpt.trim() || l.amountPaid.trim());
	const v = { ...visit, lines };

	drawCover(out, fonts, patient, v);
	const form = await fillTripleS(template, provider, v, patient);
	const pages = await out.copyPages(form, form.getPageIndices());
	for (const p of pages) out.addPage(p);
	drawReceipt(out, fonts, provider, v, patient);
	return out.save();
}
