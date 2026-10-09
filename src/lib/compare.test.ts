import { describe, expect, it } from 'vitest';
import { COMPARE_PLANS, comparables, comparePlan, premiumFor } from './compare';
import { INSURERS } from './estimate';

describe('plan comparison', () => {
	it('covers every plan the app knows', () => {
		const ids = INSURERS.flatMap((i) => i.plans.map((p) => p.id)).sort();
		expect(COMPARE_PLANS.map((p) => p.id).sort()).toEqual(ids);
	});

	it('First Medical premiums match the 2027 flyer', () => {
		const silver = comparePlan('fm-silver');
		if (!silver) throw new Error('missing plan');
		expect(premiumFor(silver, 10)).toBe(94.08);
		expect(premiumFor(silver, 40)).toBe(189.35);
		expect(premiumFor(silver, 64)).toBe(444.49);
		expect(premiumFor(silver, 80)).toBe(444.49);
		expect(silver.premiums).toHaveLength(46);
	});

	it('compares within the metal tier, or the nearest tier when the other insurer has none', () => {
		const oro = comparePlan('pocket-oro');
		const bronce = comparePlan('directo-bronce');
		if (!oro || !bronce) throw new Error('missing plan');
		expect(comparables(oro).plans.map((p) => p.id)).toEqual(['fm-gold', 'fm-gold-plus']);
		expect(comparables(bronce).nearest).toBe('plata');
	});
});
