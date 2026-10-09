import { describe, expect, it } from 'vitest';
import { claimable, deadlineFrom, estimate } from './estimate';

describe('estimate', () => {
	it('needs plan and service', () => {
		expect(estimate('', 'especialista', 100)).toBeNull();
	});

	it('individual plans: routine out-of-network visit is not reimbursable, with the in-network price', () => {
		const e = estimate('directo-plata', 'especialista', 150);
		expect(e?.verdict).toBe('not-reimbursable');
		expect(e?.owe).toBe(150);
		expect(e?.alternatives[0]).toContain('$15');
		expect(claimable(e)).toBe(false);
	});

	it('individual plans: acupuncture goes through Contigo Fit, capped at $20', () => {
		const e = estimate('pocket-plata', 'acupuntura', 90);
		expect(e?.route).toBe('contigo-fit');
		expect(e?.back).toBe(20);
		expect(e?.owe).toBe(70);
		expect(claimable(e)).toBe(true);
		expect(estimate('directo-plata', 'acupuntura', 90)?.headline).toContain('Posiblemente');
	});

	it('individual plans: adult glasses up to $75', () => {
		expect(estimate('uno-plata', 'espejuelos', 50)?.back).toBe(50);
		expect(estimate('uno-plata', 'espejuelos', 300)?.back).toBe(75);
	});

	it('employer plans use the published average and never exceed what was paid', () => {
		const e = estimate('ts-empleador', 'especialista', 150);
		expect(e?.back).toBe(17);
		expect(e?.owe).toBe(133);
		expect(estimate('ts-empleador', 'pcp', 10)?.back).toBe(10);
	});

	it('emergencies are paid directly, not reimbursed', () => {
		expect(estimate('pocket-oro', 'emergencia', 500)?.verdict).toBe('direct');
	});

	it('First Medical reimburses out of network but publishes no tariff', () => {
		const e = estimate('fm-silver', 'especialista', 150);
		expect(e?.verdict).toBe('reimbursable');
		expect(e?.insurer).toBe('first-medical');
		expect(e?.back).toBeNull();
		expect(e?.explanation[0]).toContain('$20');
		expect(claimable(e)).toBe(true);
	});

	it('First Medical excludes acupuncture', () => {
		expect(estimate('fm-gold', 'acupuntura', 90)?.verdict).toBe('not-reimbursable');
	});

	it('deadlines count from the service date', () => {
		expect(deadlineFrom('2026-10-09', 90)).toBe('01/07/2027');
		expect(deadlineFrom('', 90)).toBe('');
	});

	it('unverified insurers say so', () => {
		expect(estimate('otro', 'especialista', 150)?.verdict).toBe('unknown');
	});
});
