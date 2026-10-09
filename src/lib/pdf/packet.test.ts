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

	it('strips the pre-printed ZU prefix', () => {
		expect(contractSuffix('zu a12 345')).toBe('A12345');
		expect(contractSuffix('A12345')).toBe('A12345');
	});
});
