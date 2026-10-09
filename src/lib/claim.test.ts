import { describe, expect, it } from 'vitest';
import { acceptanceCode, decodePayload, encodePayload, isValidCpt, isValidIcd10, isValidNpi, providerProblems } from './claim';
import { demoPatients, demoProvider, demoVisit } from './demo';

describe('payload', () => {
	it('round-trips through the QR encoding', async () => {
		const payload = { v: 2 as const, provider: demoProvider(), visit: demoVisit(), patient: demoPatients()[0].patient };
		const encoded = await encodePayload(payload);
		expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(await decodePayload(encoded)).toEqual(payload);
	});

	it('rejects garbage', async () => {
		await expect(decodePayload('not-a-payload')).rejects.toThrow();
	});
});

describe('validators', () => {
	it('checks the NPI check digit', () => {
		expect(isValidNpi('1234567893')).toBe(true);
		expect(isValidNpi('1234567890')).toBe(false);
		expect(isValidNpi('123')).toBe(false);
	});

	it('accepts real-looking codes', () => {
		expect(isValidIcd10('E55.9')).toBe(true);
		expect(isValidIcd10('R5383')).toBe(true);
		expect(isValidIcd10('hello')).toBe(false);
		expect(isValidCpt('99205')).toBe(true);
		expect(isValidCpt('G0438')).toBe(true);
		expect(isValidCpt('9920')).toBe(false);
	});

	it('demo data passes provider checks', () => {
		expect(providerProblems(demoProvider(), demoVisit())).toEqual([]);
	});
});

describe('payload compaction', () => {
	it('restores dropped empty fields', async () => {
		const visit = demoVisit();
		visit.preauthNumber = '';
		visit.lines[0].modifier = '';
		const patient = { ...demoPatients()[0].patient, altPhone: '', medicareEligible: true };
		const payload = { v: 2 as const, provider: { ...demoProvider(), ein: '' }, visit, patient };
		expect(await decodePayload(await encodePayload(payload))).toEqual(payload);
	});
});

describe('acceptance code', () => {
	it('is 4 digits and changes when the claim changes', async () => {
		const base = { v: 2 as const, provider: demoProvider(), visit: demoVisit(), patient: demoPatients()[0].patient };
		const a = await acceptanceCode(await encodePayload(base));
		const b = await acceptanceCode(await encodePayload({ ...base, patient: { ...base.patient, zip: '00901' } }));
		expect(a).toMatch(/^\d{4}$/);
		expect(a).not.toBe(b);
	});
});
