import { describe, expect, it } from 'vitest';
import { assess, canFile, filingDeadline, isLabCode } from './plans';

describe('assess', () => {
	it('blocks routine out-of-network visits on Triple-S individual plans and offers routes', () => {
		const a = assess('pocket-plata', 'routine', ['99213']);
		expect(a.status).toBe('not-covered');
		expect(canFile(a)).toBe(false);
		if (a.status === 'not-covered') {
			expect(a.alternatives.map((x) => x.route).filter(Boolean)).toEqual(['contigo-fit', 'no-network']);
		}
	});

	it('allows named routes', () => {
		const a = assess('pocket-plata', 'contigo-fit', ['97810']);
		expect(a.status).toBe('covered');
		expect(canFile(a)).toBe(true);
	});

	it('flags routes the plan policy does not mention', () => {
		expect(assess('directo-plata', 'contigo-fit', []).status).toBe('unconfirmed');
	});

	it('lets other plans through as unverified', () => {
		const a = assess('otro', 'routine', ['99213']);
		expect(a.status).toBe('unverified');
		expect(canFile(a)).toBe(true);
	});

	it('warns about out-of-network labs', () => {
		const a = assess('uno-plata', 'no-network', ['36415']);
		expect(a.status === 'covered' && a.notes.some((n) => n.includes('Laboratorios'))).toBe(true);
	});

	it('is incomplete until plan and route are chosen', () => {
		expect(assess('', 'routine', []).status).toBe('incomplete');
		expect(assess('pocket-oro', '', []).status).toBe('incomplete');
	});
});

describe('helpers', () => {
	it('detects lab codes', () => {
		expect(isLabCode('80053')).toBe(true);
		expect(isLabCode('36415')).toBe(true);
		expect(isLabCode('97810')).toBe(false);
	});

	it('deadline is one year from the earliest service', () => {
		expect(filingDeadline(['2026-10-09', '2026-10-01'])).toBe('10/01/2027');
		expect(filingDeadline([''])).toBe('');
	});
});
