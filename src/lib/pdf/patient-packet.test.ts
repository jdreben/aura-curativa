import { readFileSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { demoPatients } from '../demo';
import { letterParagraphs } from '../justify';
import { buildPatientPacket } from './patient-packet';
import type { PatientPacketInput } from './patient-packet';

const base = (insurer: 'triple-s' | 'first-medical'): PatientPacketInput => ({
	insurer,
	planName: insurer === 'triple-s' ? 'Triple-S Pocket Plata 2027' : 'First Medical Directo Silver 2027',
	route: insurer === 'triple-s' ? 'contigo-fit' : 'routine',
	serviceName: insurer === 'triple-s' ? 'Acupuntura, masaje terapéutico o reflexología' : 'Visita a especialista',
	received: true,
	date: '2026-10-09',
	paid: '90.00',
	providerName: 'Dra. Isabel Rivera Colón',
	providerSpecialty: 'Acupuntura',
	patient: demoPatients()[0].patient,
	expected: '$20 al mes',
	deadline: '10/09/2027',
	steps: ['Paso uno.', 'Paso dos.'],
	letter: letterParagraphs({
		insurer,
		route: insurer === 'triple-s' ? 'contigo-fit' : 'routine',
		planName: 'Plan',
		serviceName: 'Acupuntura',
		date: '10/09/2026',
		paid: '90.00',
		providerName: 'Dra. Rivera',
		answers: { hra: true, preventiva: true, licencia: true, 'sin-red': true }
	})
});

describe('patient packet', () => {
	it('Triple-S: cover + 2 form pages + letter', async () => {
		const t = new Uint8Array(readFileSync('static/forms/triple-s-reembolso.pdf'));
		const bytes = await buildPatientPacket(t, base('triple-s'));
		expect((await PDFDocument.load(bytes)).getPageCount()).toBe(4);
		if (process.env.TS_OUT) writeFileSync(process.env.TS_OUT, bytes);
	});

	it('First Medical: cover + form + letter; no letter before the service', async () => {
		const t = new Uint8Array(readFileSync('static/forms/first-medical-reembolso.pdf'));
		const bytes = await buildPatientPacket(t, base('first-medical'));
		expect((await PDFDocument.load(bytes)).getPageCount()).toBe(3);
		if (process.env.FM_OUT) writeFileSync(process.env.FM_OUT, bytes);
		const before = await buildPatientPacket(t, { ...base('first-medical'), received: false });
		expect((await PDFDocument.load(before)).getPageCount()).toBe(2);
	});

	it('letter cites the right rule', () => {
		const fm = base('first-medical').letter.join(' ');
		expect(fm).toContain('100% de lo pagado');
		expect(base('triple-s').letter.join(' ')).toContain('Contigo Fit');
	});
});
