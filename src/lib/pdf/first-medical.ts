import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';
import type { Accident, Patient } from '../claim.ts';
import { isoToForm, winAnsi } from './triple-s.ts';

export const FIRST_MEDICAL = {
	name: 'First Medical',
	formRevision: 'FM-COM_CS_23.30_03_S (Aprobado 02/20/2023)'
} as const;

export type FirstMedicalForm = {
	patient: Patient & { dob: string };
	vision: boolean;
	cannabis: boolean;
	accident: Accident | null;
	lines: { date: string; description: string; paid: string }[];
};

const INK = rgb(0.05, 0.15, 0.55);

// The form has no AcroForm fields; coordinates measured from FM-COM_CS_23.30_03_S label positions.
export async function fillFirstMedical(template: Uint8Array, f: FirstMedicalForm): Promise<PDFDocument> {
	const doc = await PDFDocument.load(template);
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const page = doc.getPage(0);
	const w = writer(page, font);
	const p = f.patient;
	const first = [p.firstName, p.middleInitial].filter(Boolean).join(' ');
	const last = [p.lastNamePaternal, p.lastNameMaternal].filter(Boolean).join(' ');

	w('X', f.cannabis ? 456 : f.vision ? 235 : 40, 717, 10);
	for (const [y, size] of [
		[617, 10],
		[591, 8.5]
	]) {
		w(first, 40, y, size, 150);
		w(last, 202, y, size, 185);
		w(p.contractNumber, 400, y, size, 170);
	}
	w([p.address1, p.address2].filter(Boolean).join(', '), 40, 570, 9, 340);
	w(`${p.city}, ${p.state} ${p.zip}`, 40, 560, 9, 340);
	w(isoToForm(p.dob).replace(/\//g, ' / '), 400, 571.5, 9, 120);
	w(p.groupName, 40, 531, 10, 255);
	w(p.groupNumber, 310, 531, 10, 255);
	w(p.phone, 40, 501, 10, 255);
	w(p.altPhone, 310, 501, 10, 255);
	w('X', p.hasOtherCoverage ? 149 : 178, 474, 9);
	if (p.hasOtherCoverage) {
		w(p.otherPlanName, 378, 474, 9, 190);
		w(p.otherPolicyNumber, 388, 453, 9, 180);
	}
	if (f.accident?.kind) w('X', { auto: 212, trabajo: 342, otro: 454 }[f.accident.kind], 426, 9);
	// "Proveedor no acepta el plan" is the claim reason; the provider's own fields stay blank for them to fill.
	// Cannabis is bought inside the FM Cannabis network, so it takes that box instead.
	w('X', f.cannabis ? 342 : 212, 415, 9);

	const rows = [338, 316, 294, 272];
	f.lines.slice(0, rows.length).forEach((l, i) => {
		const y = rows[i];
		w(isoToForm(l.date), 40, y, 10, 105);
		w(l.description, 266, y, 9, 128);
		const paid = Number.parseFloat(l.paid);
		if (paid > 0) {
			const t = `$${paid.toFixed(2)}`;
			w(t, 570 - font.widthOfTextAtSize(t, 10), y, 10);
		}
	});
	return doc;
}

function writer(page: PDFPage, font: PDFFont) {
	return (text: string, x: number, y: number, size: number, maxWidth?: number) => {
		const t = winAnsi(text);
		if (!t) return;
		let s = size;
		if (maxWidth) while (s > 6 && font.widthOfTextAtSize(t, s) > maxWidth) s -= 0.5;
		page.drawText(t, { x, y, size: s, font, color: INK });
	};
}
