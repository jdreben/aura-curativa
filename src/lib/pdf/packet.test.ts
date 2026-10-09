import { readFileSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { demoPatients, demoProvider, demoVisit } from '../demo';
import { buildTripleSPacket } from './packet';
import { contractSuffix } from './triple-s';

const template = new Uint8Array(readFileSync('static/forms/triple-s-reembolso.pdf'));

describe('Triple-S packet', () => {
	it('builds cover + 2 form pages + receipt', async () => {
		const bytes = await buildTripleSPacket(template, demoProvider(), demoVisit(), demoPatients()[0].patient);
		const doc = await PDFDocument.load(bytes);
		expect(doc.getPageCount()).toBe(4);
		if (process.env.PACKET_OUT) writeFileSync(process.env.PACKET_OUT, bytes);
	});

	it('patient-prepared packet leaves out the receipt', async () => {
		const visit = { ...demoVisit(), lines: demoVisit().lines.map((l) => ({ ...l, cpt: '' })) };
		const blank = { name: '', npi: '', ein: '', license: '', specialty: '', address1: '', address2: '', phone: '' };
		const bytes = await buildTripleSPacket(template, blank, visit, demoPatients()[0].patient, { receipt: false, expected: '$20' });
		expect((await PDFDocument.load(bytes)).getPageCount()).toBe(3);
		if (process.env.PATIENT_PACKET_OUT) writeFileSync(process.env.PATIENT_PACKET_OUT, bytes);
	});

	it('strips the pre-printed ZU prefix', () => {
		expect(contractSuffix('zu a12 345')).toBe('A12345');
		expect(contractSuffix('A12345')).toBe('A12345');
	});
});
