import { readFileSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { demoPatients } from '../demo';
import { benefitExplanation, letterParagraphs, packetSteps } from '../justify';
import { buildPatientPacket } from './patient-packet';
import { to12h } from './triple-s';
import type { PatientPacketInput } from './patient-packet';

const letterInput = (insurer: 'triple-s' | 'first-medical') => ({
	insurer,
	route: insurer === 'triple-s' ? ('contigo-fit' as const) : ('routine' as const),
	planName: 'Plan',
	serviceName: 'Acupuntura',
	date: '10/09/2026',
	paid: '90.00',
	answers: { hra: true, preventiva: true, licencia: true, 'sin-red': true }
});

const base = (insurer: 'triple-s' | 'first-medical'): PatientPacketInput => ({
	insurer,
	planName: insurer === 'triple-s' ? 'Triple-S Pocket Plata 2027' : 'First Medical Directo Silver 2027',
	route: insurer === 'triple-s' ? 'contigo-fit' : 'routine',
	serviceId: insurer === 'triple-s' ? 'acupuntura' : 'especialista',
	serviceName: insurer === 'triple-s' ? 'Acupuntura, masaje terapéutico o reflexología' : 'Visita a especialista',
	received: true,
	date: '2026-10-09',
	paid: '90.00',
	patient: demoPatients()[0].patient,
	expected: '$20 al mes',
	deadline: '10/09/2027',
	steps: ['Paso uno.', 'Paso dos.'],
	letter: letterParagraphs(letterInput(insurer)),
	explanation: benefitExplanation({ ...letterInput(insurer), benefit: '$20 al mes' }),
	accident: null
});

describe('patient packet', () => {
	it('Triple-S: cover + 2 form pages + benefit explanation + letter', async () => {
		const t = new Uint8Array(readFileSync('static/forms/triple-s-reembolso.pdf'));
		const bytes = await buildPatientPacket(t, base('triple-s'));
		expect((await PDFDocument.load(bytes)).getPageCount()).toBe(5);
		if (process.env.TS_OUT) writeFileSync(process.env.TS_OUT, bytes);
	});

	it('First Medical: cover + form + benefit explanation + letter; the explanation is there before the service too', async () => {
		const t = new Uint8Array(readFileSync('static/forms/first-medical-reembolso.pdf'));
		const bytes = await buildPatientPacket(t, base('first-medical'));
		expect((await PDFDocument.load(bytes)).getPageCount()).toBe(4);
		if (process.env.FM_OUT) writeFileSync(process.env.FM_OUT, bytes);
		const before = await buildPatientPacket(t, { ...base('first-medical'), received: false });
		expect((await PDFDocument.load(before)).getPageCount()).toBe(3);
	});

	it('benefit explanation cites the policy for each route', () => {
		const fm = benefitExplanation({ ...letterInput('first-medical'), benefit: 'x' });
		expect(fm.basis).toContain('Reembolso de gastos cubiertos por servicios obtenidos fuera de la red');
		expect(fm.paragraphs.join(' ')).toContain('Artículo 48.050');
		expect(benefitExplanation({ ...letterInput('triple-s'), benefit: 'x' }).basis).toContain('Contigo Fit');
		expect(benefitExplanation({ ...letterInput('triple-s'), route: 'vision', benefit: 'x' }).basis).toContain('exclusión 52');
	});

	it('accident time prints as 12-hour', () => {
		expect(to12h('14:05')).toBe('2:05 PM');
		expect(to12h('00:30')).toBe('12:30 AM');
	});

	it('other insurance adds the other plan\'s EOB before mailing', () => {
		const steps = packetSteps({ insurer: 'triple-s', received: true, preauth: null, conditions: [], deadline: '', deadlineDays: 365, otherCoverage: true });
		const eob = steps.findIndex((s) => s.includes('otro seguro'));
		expect(eob).toBeGreaterThan(-1);
		expect(eob).toBe(steps.length - 2);
	});

	it('packet builds with other insurance, Medicare and an accident on both forms', async () => {
		const accident = { kind: 'otro' as const, description: 'Caída en la casa', date: '2026-09-30', time: '14:05', causedByOther: true, otherLiable: false };
		const patient = { ...demoPatients()[2].patient, medicareEligible: true, medicareId: '1EG4TE5MK73', medicarePart: 'B' as const };
		for (const insurer of ['triple-s', 'first-medical'] as const) {
			const t = new Uint8Array(readFileSync(`static/forms/${insurer === 'triple-s' ? 'triple-s' : 'first-medical'}-reembolso.pdf`));
			const bytes = await buildPatientPacket(t, { ...base(insurer), patient, accident });
			expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(3);
			if (process.env.COB_OUT) writeFileSync(`${process.env.COB_OUT}-${insurer}.pdf`, bytes);
		}
	});

	it('steps run in the order the patient does them', () => {
		const after = packetSteps({ insurer: 'triple-s', received: true, preauth: null, conditions: ['Complete la HRA.'], deadline: '10/09/2027', deadlineDays: 365, otherCoverage: false });
		expect(after[0]).toBe('Complete la HRA.');
		expect(after.findIndex((s) => s.includes('sección E'))).toBeLessThan(after.findIndex((s) => s.includes('sección D')));
		expect(after.at(-1)).toContain('Envíe');
		const before = packetSteps({ insurer: 'first-medical', received: false, preauth: 'Pida autorización previa.', conditions: [], deadline: '', deadlineDays: 90, otherCoverage: false });
		expect(before[0]).toBe('Pida autorización previa.');
		expect(before.findIndex((s) => s.includes('Lleve este paquete'))).toBeLessThan(before.findIndex((s) => s.startsWith('Después del servicio')));
		expect(before.at(-1)).toContain('Explicación de Beneficios');
	});

	it('letter cites the right rule', () => {
		const fm = base('first-medical').letter.join(' ');
		expect(fm).toContain('100% de lo pagado');
		expect(base('triple-s').letter.join(' ')).toContain('Contigo Fit');
	});
});
