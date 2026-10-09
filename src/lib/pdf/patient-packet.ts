import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';
import type { Patient } from '../claim.ts';
import { emptyProvider, emptyVisit, patientFullName } from '../claim.ts';
import type { Insurer } from '../estimate.ts';
import type { BenefitExplanation } from '../justify.ts';
import { CLAIM_RULES, deadlineWords } from '../estimate.ts';
import type { RouteId } from '../plans.ts';
import { fillFirstMedical, FIRST_MEDICAL } from './first-medical.ts';
import { fillTripleS, isoToForm, TRIPLE_S, winAnsi } from './triple-s.ts';

export type PatientPacketInput = {
	insurer: Insurer;
	planName: string;
	route: RouteId;
	serviceName: string;
	received: boolean;
	date: string;
	paid: string;
	providerName: string;
	providerSpecialty: string;
	patient: Patient;
	expected: string;
	deadline: string;
	steps: string[];
	letter: string[];
	explanation: BenefitExplanation;
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
	page.drawText('Pasos', { x: 50, y, size: 12, font: f.bold });
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

function drawExplanation(doc: PDFDocument, f: Fonts, i: PatientPacketInput) {
	const page = doc.addPage([612, 792]);
	const insurerName = i.insurer === 'triple-s' ? TRIPLE_S.name : FIRST_MEDICAL.name;
	let y = 730;
	y = paragraph(page, 'Explicación de Beneficios para todos los servicios o suplidos reclamados', 50, y, f.bold, 15, 512) - 8;
	const rows: [string, string][] = [
		['Asegurado', patientFullName(i.patient)],
		['Contrato', i.patient.contractNumber.toUpperCase()],
		['Plan', `${i.planName} (${insurerName})`]
	];
	for (const [k, v] of rows) {
		page.drawText(winAnsi(k), { x: 50, y, size: 10.5, font: f.regular, color: GRAY });
		y = paragraph(page, v, 160, y, f.regular, 10.5, 400) - 4;
	}
	y -= 14;
	page.drawText(winAnsi('Servicios o suplidos reclamados'), { x: 50, y, size: 12, font: f.bold });
	y -= 20;
	const cols = [50, 130, 330, 490];
	['Fecha', 'Servicio o suplido', 'Proveedor', 'Pagado'].forEach((h, n) =>
		page.drawText(h, { x: cols[n], y, size: 9.5, font: f.bold, color: GRAY })
	);
	y -= 6;
	page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, thickness: 0.5, color: GRAY });
	y -= 14;
	const pending = 'Pendiente';
	const cells = [
		i.received && i.date ? isoToForm(i.date) : pending,
		i.serviceName,
		i.providerName || pending,
		i.received && i.paid ? `$${i.paid}` : pending
	];
	const bottoms = cells.map((c, n) => paragraph(page, c, cols[n], y, f.regular, 10, n === 1 ? 190 : n === 2 ? 150 : 70));
	y = Math.min(...bottoms) - 4;
	page.drawLine({ start: { x: 50, y: y + 8 }, end: { x: 562, y: y + 8 }, thickness: 0.5, color: GRAY });
	y -= 14;
	page.drawText(winAnsi('Reembolso solicitado'), { x: 50, y, size: 10.5, font: f.regular, color: GRAY });
	y = paragraph(page, i.expected, 160, y, f.regular, 10.5, 400) - 18;
	page.drawText(winAnsi('Base en la póliza'), { x: 50, y, size: 12, font: f.bold });
	y -= 18;
	y = paragraph(page, i.explanation.basis, 50, y, f.regular, 10.5, 512) - 16;
	page.drawText(winAnsi('Por qué procede el reembolso'), { x: 50, y, size: 12, font: f.bold });
	y -= 18;
	for (const para of i.explanation.paragraphs) y = paragraph(page, para, 50, y, f.regular, 10.5, 512) - 8;
	page.drawText(
		winAnsi('Preparado por el asegurado con Healing Aura a partir de la póliza 2027. No es una determinación de la aseguradora.'),
		{ x: 50, y: 48, size: 8.5, font: f.regular, color: GRAY }
	);
}

function drawLetter(doc: PDFDocument, f: Fonts, i: PatientPacketInput) {
	const page = doc.addPage([612, 792]);
	const p = i.patient;
	const today = new Date();
	const date = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
	let y = 720;
	for (const l of [patientFullName(p), p.address1, `${p.city}, ${p.state} ${p.zip}`, p.phone].filter((s) => s.trim())) {
		page.drawText(winAnsi(l), { x: 72, y, size: 11, font: f.regular });
		y -= 15;
	}
	y -= 15;
	page.drawText(date, { x: 72, y, size: 11, font: f.regular });
	y -= 30;
	const to = CLAIM_RULES[i.insurer].address;
	for (const l of to) {
		page.drawText(winAnsi(l), { x: 72, y, size: 11, font: f.regular });
		y -= 15;
	}
	y -= 15;
	page.drawText(winAnsi(`Asunto: Solicitud de reembolso — Contrato ${p.contractNumber.toUpperCase()}`), { x: 72, y, size: 11, font: f.bold });
	y -= 30;
	page.drawText('Saludos:', { x: 72, y, size: 11, font: f.regular });
	y -= 24;
	for (const para of i.letter) y = paragraph(page, para, 72, y, f.regular, 11, 468) - 10;
	y -= 30;
	page.drawText('Atentamente,', { x: 72, y, size: 11, font: f.regular });
	y -= 50;
	page.drawLine({ start: { x: 72, y }, end: { x: 300, y }, thickness: 0.75, color: BLACK });
	y -= 14;
	page.drawText(winAnsi(patientFullName(p)), { x: 72, y, size: 11, font: f.regular });
}

export async function buildPatientPacket(template: Uint8Array, i: PatientPacketInput): Promise<Uint8Array> {
	const out = await PDFDocument.create();
	out.setTitle('Solicitud de reembolso');
	out.setProducer('Healing Aura');
	const fonts: Fonts = {
		regular: await out.embedFont(StandardFonts.Helvetica),
		bold: await out.embedFont(StandardFonts.HelveticaBold)
	};
	drawCover(out, fonts, i);

	const lines = i.received ? [{ date: i.date, description: i.serviceName, paid: i.paid }] : [];
	const form =
		i.insurer === 'triple-s'
			? await fillTripleS(
					template,
					{ ...emptyProvider(), name: i.providerName, specialty: i.providerSpecialty },
					{
						...emptyVisit(),
						route: i.route,
						lines: lines.map((l) => ({
							dateFrom: l.date,
							dateTo: l.date,
							placeOfService: '11',
							description: l.description,
							cpt: '',
							modifier: '',
							units: '1',
							amountPaid: l.paid
						}))
					},
					i.patient
				)
			: await fillFirstMedical(template, {
					patient: i.patient,
					vision: i.route === 'vision',
					providerName: i.providerName,
					providerSpecialty: i.providerSpecialty,
					lines
				});
	for (const pg of await out.copyPages(form, form.getPageIndices())) out.addPage(pg);
	drawExplanation(out, fonts, i);
	if (i.received) drawLetter(out, fonts, i);
	return out.save();
}

export const formatDate = isoToForm;
