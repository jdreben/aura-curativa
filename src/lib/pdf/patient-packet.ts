import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';
import type { Accident, Patient } from '../claim.ts';
import { emptyProvider, emptyVisit, patientFullName } from '../claim.ts';
import type { Insurer, ServiceId } from '../estimate.ts';
import type { BenefitExplanation, LetterParts } from '../justify.ts';
import { CLAIM_RULES, deadlineWords } from '../estimate.ts';
import type { RouteId } from '../plans.ts';
import { fillFirstMedical, FIRST_MEDICAL } from './first-medical.ts';
import { fillTripleS, isoToForm, TRIPLE_S, winAnsi } from './triple-s.ts';

export type PatientPacketInput = {
	insurer: Insurer;
	planName: string;
	route: RouteId;
	serviceId: ServiceId;
	serviceName: string;
	received: boolean;
	date: string;
	paid: string;
	patient: Patient;
	expected: string;
	deadline: string;
	steps: string[];
	letter: LetterParts;
	explanation: BenefitExplanation;
	accident: Accident | null;
};

type Fonts = { regular: PDFFont; bold: PDFFont };
const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.4, 0.4, 0.4);

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

function paragraph(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, maxWidth: number, color = BLACK) {
	for (const l of wrap(text, font, size, maxWidth)) {
		page.drawText(l, { x, y, size, font, color });
		y -= size * 1.4;
	}
	return y;
}

function drawCover(doc: PDFDocument, f: Fonts, i: PatientPacketInput) {
	const page = doc.addPage([612, 792]);
	const insurerName = i.insurer === 'triple-s' ? TRIPLE_S.name : FIRST_MEDICAL.name;
	let y = 730;
	page.drawText('Healing Aura', { x: 50, y, size: 22, font: f.bold });
	y -= 22;
	page.drawText(winAnsi(`Paquete de reembolso — ${insurerName}`), { x: 50, y, size: 13, font: f.regular, color: GRAY });
	y -= 34;
	const rows: [string, string][] = [
		['Paciente', patientFullName(i.patient)],
		['Plan', i.planName],
		['Servicio', i.serviceName],
		['Reembolso esperado', i.expected],
		['Fecha límite', i.deadline || 'Según la fecha del servicio']
	];
	for (const [k, v] of rows) {
		page.drawText(winAnsi(k), { x: 50, y, size: 10.5, font: f.regular, color: GRAY });
		y = paragraph(page, v, 180, y, f.regular, 10.5, 370) - 4;
	}
	y -= 14;
	page.drawText(winAnsi('Próximos pasos'), { x: 50, y, size: 12, font: f.bold });
	y -= 20;
	i.steps.forEach((s, n) => {
		page.drawRectangle({ x: 52, y: y - 2, width: 9, height: 9, borderColor: BLACK, borderWidth: 0.75 });
		page.drawText(`${n + 1}.`, { x: 68, y, size: 10.5, font: f.bold });
		y = paragraph(page, s, 86, y, f.regular, 10.5, 464) - 6;
	});
	y -= 12;
	page.drawText('Cómo enviar', { x: 50, y, size: 12, font: f.bold });
	y -= 20;
	const rules = CLAIM_RULES[i.insurer];
	y = paragraph(page, rules.email ? `Por email a ${rules.email} o por correo a:` : 'Por correo a:', 70, y, f.regular, 10.5, 480) - 6;
	for (const line of rules.address) {
		page.drawText(winAnsi(line), { x: 90, y, size: 10.5, font: f.regular });
		y -= 14;
	}
	if (rules.note) y = paragraph(page, rules.note, 70, y - 4, f.regular, 9, 480, GRAY);
	paragraph(
		page,
		`Tiene ${deadlineWords(rules.deadlineDays)} desde la fecha del servicio para solicitar el reembolso${i.deadline ? ` (fecha límite: ${i.deadline})` : ''}.`,
		70,
		y - 8,
		f.regular,
		10.5,
		480
	);
	page.drawText(
		winAnsi('Generado en su dispositivo por Healing Aura. Ningún dato se guardó en un servidor. No es asesoría legal ni de seguros.'),
		{ x: 50, y: 48, size: 8.5, font: f.regular, color: GRAY }
	);
}

// The request letter carries the benefit explanation, so the insurer reviews one document; it can run past a page.
function drawLetter(doc: PDFDocument, f: Fonts, i: PatientPacketInput) {
	const p = i.patient;
	const left = 72;
	const width = 468;
	let page = doc.addPage([612, 792]);
	let y = 740;
	const room = (h: number) => {
		if (y - h < 60) {
			page = doc.addPage([612, 792]);
			y = 740;
		}
	};
	const line = (text: string, size = 10.5, font = f.regular, color = BLACK) => {
		room(size * 1.35);
		page.drawText(winAnsi(text), { x: left, y, size, font, color });
		y -= size * 1.35;
	};
	const para = (text: string, size = 10.5, font = f.regular) => {
		for (const l of wrap(text, font, size, width)) line(l, size, font);
		y -= 6;
	};

	const today = new Date();
	const date = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
	for (const l of [patientFullName(p), p.address1, `${p.city}, ${p.state} ${p.zip}`, p.phone].filter((s) => s.trim())) line(l);
	y -= 8;
	line(date);
	y -= 10;
	for (const l of CLAIM_RULES[i.insurer].address) line(l);
	y -= 8;
	para(`Asunto: Solicitud de reembolso — Contrato ${p.contractNumber.toUpperCase()}`, 10.5, f.bold);
	y -= 4;
	line('Saludos:');
	y -= 8;
	para(i.letter.request);

	y -= 6;
	para('Explicación de Beneficios para todos los servicios o suplidos reclamados', 11.5, f.bold);
	const cols = [left, left + 80, left + 400];
	room(40);
	['Fecha', 'Servicio o suplido', 'Pagado'].forEach((h, n) => page.drawText(h, { x: cols[n], y, size: 9.5, font: f.bold, color: GRAY }));
	y -= 6;
	page.drawLine({ start: { x: left, y }, end: { x: left + width, y }, thickness: 0.5, color: GRAY });
	y -= 14;
	const pending = 'Pendiente';
	const cells = [i.received && i.date ? isoToForm(i.date) : pending, i.serviceName, i.received && i.paid ? `$${i.paid}` : pending];
	const bottoms = cells.map((c, n) => paragraph(page, c, cols[n], y, f.regular, 10, n === 1 ? 310 : 68));
	y = Math.min(...bottoms) - 2;
	page.drawLine({ start: { x: left, y: y + 8 }, end: { x: left + width, y: y + 8 }, thickness: 0.5, color: GRAY });
	y -= 10;
	para(`Reembolso solicitado: ${i.expected}`);
	para(`Base en la póliza: ${i.explanation.basis}`);
	for (const t of i.explanation.paragraphs) para(t);

	y -= 4;
	para(i.letter.closing);
	room(70);
	y -= 4;
	line('Atentamente,');
	y -= 30;
	page.drawLine({ start: { x: left, y }, end: { x: 300, y }, thickness: 0.75, color: BLACK });
	y -= 14;
	line(patientFullName(p));
}

export type PacketParts = { cover: boolean };

export async function buildPatientPacket(
	template: Uint8Array,
	i: PatientPacketInput,
	parts: PacketParts = { cover: true }
): Promise<Uint8Array> {
	const out = await PDFDocument.create();
	out.setTitle('Solicitud de reembolso');
	out.setProducer('Healing Aura');
	const fonts: Fonts = {
		regular: await out.embedFont(StandardFonts.Helvetica),
		bold: await out.embedFont(StandardFonts.HelveticaBold)
	};
	if (parts.cover) drawCover(out, fonts, i);

	// The service comes from the patient's selection; the provider's fields stay blank for the provider.
	const lines = [{ date: i.received ? i.date : '', description: i.serviceName, paid: i.received ? i.paid : '' }];
	const form =
		i.insurer === 'triple-s'
			? await fillTripleS(
					template,
					emptyProvider(),
					{
						...emptyVisit(),
						route: i.route,
						lines: lines.map((l) => ({
							dateFrom: l.date,
							dateTo: l.date,
							placeOfService: '',
							description: l.description,
							cpt: '',
							modifier: '',
							units: '',
							amountPaid: l.paid
						}))
					},
					i.patient,
					i.accident
				)
			: await fillFirstMedical(template, {
					patient: i.patient,
					vision: i.route === 'vision' || i.serviceId === 'espejuelos',
					cannabis: i.route === 'cannabis',
					accident: i.accident,
					lines
				});
	for (const pg of await out.copyPages(form, form.getPageIndices())) out.addPage(pg);
	drawLetter(out, fonts, i);
	return out.save();
}

// The "Pasos" page on its own, for patients who emailed the packet to their provider.
export async function buildStepsPdf(i: PatientPacketInput): Promise<Uint8Array> {
	const out = await PDFDocument.create();
	out.setTitle('Próximos pasos');
	out.setProducer('Healing Aura');
	drawCover(out, { regular: await out.embedFont(StandardFonts.Helvetica), bold: await out.embedFont(StandardFonts.HelveticaBold) }, i);
	return out.save();
}

export const formatDate = isoToForm;
