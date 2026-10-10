import { readFileSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { demoPatients } from '../demo';
import { benefitExplanation, letterParts, packetSteps } from '../justify';
import { buildPatientPacket, buildStepsPdf } from './patient-packet';
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
	letter: letterParts(letterInput(insurer)),
	explanation: benefitExplanation({ ...letterInput(insurer), benefit: '$20 al mes' }),
	accident: null
});

describe('patient packet', () => {
	const pages = async (b: Uint8Array) => (await PDFDocument.load(b)).getPageCount();

	it('Triple-S: cover + 2 form pages + the letter with its benefit explanation', async () => {
		const t = new Uint8Array(readFileSync('static/forms/triple-s-reembolso.pdf'));
		const bytes = await buildPatientPacket(t, base('triple-s'));
		const full = await pages(bytes);
		expect(full).toBe(4);
		expect(await pages(await buildPatientPacket(t, base('triple-s'), { cover: false }))).toBe(full - 1);
		if (process.env.TS_OUT) writeFileSync(process.env.TS_OUT, bytes);
	});

	it('First Medical: the letter is in the packet before the service too; steps PDF is one page', async () => {
		const t = new Uint8Array(readFileSync('static/forms/first-medical-reembolso.pdf'));
		const bytes = await buildPatientPacket(t, base('first-medical'));
		expect(await pages(bytes)).toBe(3);
		if (process.env.FM_OUT) writeFileSync(process.env.FM_OUT, bytes);
		const before = await buildPatientPacket(t, { ...base('first-medical'), received: false, date: '', paid: '' });
		expect(await pages(before)).toBe(3);
		expect(await pages(await buildStepsPdf(base('first-medical')))).toBe(1);
	});

	it('the letter stays on one page even with a long explanation', async () => {
		const t = new Uint8Array(readFileSync('static/forms/first-medical-reembolso.pdf'));
		const long = base('first-medical');
		const many = { ...long, explanation: { ...long.explanation, paragraphs: [...long.explanation.paragraphs, ...long.explanation.paragraphs] } };
		expect(await pages(await buildPatientPacket(t, many))).toBe(3);
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

	const stepsIn = (o: Partial<Parameters<typeof packetSteps>[0]> = {}) =>
		packetSteps({ insurer: 'triple-s', route: 'contigo-fit', delivery: 'print', preauth: false, otherCoverage: false, deadline: '10/09/2027', deadlineDays: 365, ...o });

	it('steps are only about the packet, in order: provider, signatures, send with the attachments', () => {
		const print = stepsIn();
		expect(print).toHaveLength(3);
		expect(print[0]).toContain('sección E');
		expect(print[1]).toContain('sección D');
		expect(print.at(-1)).toContain('Envíe');
		expect(print.join(' ')).not.toContain('HRA');
		const all = stepsIn({ route: 'ambulance', preauth: true, otherCoverage: true }).at(-1) ?? '';
		for (const x of ['informe médico', 'autorización previa', 'otro seguro']) expect(all).toContain(x);
		expect(stepsIn({ delivery: 'email' })[0]).toContain('Espere');
		const before = stepsIn({ insurer: 'first-medical', route: 'routine', delivery: 'before', deadline: '', deadlineDays: 90 });
		expect(before[0]).toContain('Lleve este paquete a su cita');
		expect(before.at(-1)).toContain('90 días');
	});

	it('packet builds with other insurance, Medicare and an accident on both forms', async () => {
		const accident = { kind: 'otro' as const, description: 'Caída en la casa', date: '2026-09-30', time: '14:05', causedByOther: true, otherLiable: false };
		const patient = { ...demoPatients()[2].patient, medicareEligible: true, medicareId: '1EG4TE5MK73', medicarePart: 'B' as const };
		for (const insurer of ['triple-s', 'first-medical'] as const) {
			const t = new Uint8Array(readFileSync(`static/forms/${insurer === 'triple-s' ? 'triple-s' : 'first-medical'}-reembolso.pdf`));
			const bytes = await buildPatientPacket(t, { ...base(insurer), patient, accident });
			expect((await PDFDocument.load(bytes)).getPageCount()).toBe(insurer === 'triple-s' ? 4 : 3);
			if (process.env.COB_OUT) writeFileSync(`${process.env.COB_OUT}-${insurer}.pdf`, bytes);
		}
	});


	it('letter cites the right rule', () => {
		const fm = Object.values(base('first-medical').letter).join(' ') + base('first-medical').explanation.paragraphs.join(' ');
		expect(fm).toContain('100% de los gastos incurridos');
		expect(base('triple-s').letter.request).toContain('Contigo Fit');
	});
});
