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
		expect(estimate('uno-plata', 'espejuelos', 0)?.benefit).toBe('Hasta $75 al año');
		expect(estimate('directo-plata', 'especialista', 0)?.benefit).toBe('');
		expect(estimate('fm-silver', 'laboratorio', 0)?.benefit).toContain('coaseguro (60%)');
	});

	it('emergencies are paid directly, not reimbursed', () => {
		expect(estimate('pocket-oro', 'emergencia', 500)?.verdict).toBe('direct');
	});

	it('First Medical reimburses out of network at the contracted rate, which only the phone line quotes', () => {
		const e = estimate('fm-silver', 'especialista', 150);
		expect(e?.verdict).toBe('reimbursable');
		expect(e?.insurer).toBe('first-medical');
		expect(e?.back).toBeNull();
		expect(e?.explanation[0]).toContain('$20');
		expect(e?.explanation[1]).toContain('no publica sus tarifas');
		expect(e?.explanation[1]).toContain('99213');
		expect(claimable(e)).toBe(true);
	});

	it('First Medical covers one pair of adult glasses a year at the network rate minus $15', () => {
		const e = estimate('fm-gold', 'espejuelos', 200);
		expect(e?.verdict).toBe('reimbursable');
		expect(e?.benefit).toContain('$15');
		expect(claimable(e)).toBe(true);
	});

	it('First Medical radiology separates X-rays from MRI and other specialized tests', () => {
		const e = estimate('fm-silver', 'radiologia', 300);
		expect(e?.explanation.join(' ')).toContain('75%');
		expect(e?.alternatives[0]).toContain('20%');
	});

	it('First Medical caps therapy and chiropractic at 20 combined a year', () => {
		expect(estimate('fm-silver', 'quiropractico', 60)?.conditions.join(' ')).toContain('20');
		expect(estimate('fm-silver', 'especialista', 60)?.conditions.join(' ')).not.toContain('20');
	});

	it('First Medical excludes acupuncture', () => {
		expect(estimate('fm-gold', 'acupuntura', 90)?.verdict).toBe('not-reimbursable');
	});

	it('non-emergency ground ambulance: $80 per case (Triple-S) or per trip (First Medical)', () => {
		const ts = estimate('directo-bronce', 'ambulancia', 150);
		expect(ts?.route).toBe('ambulance');
		expect(ts?.back).toBe(80);
		expect(claimable(ts)).toBe(true);
		const fm = estimate('fm-gold', 'ambulancia', 60);
		expect(fm?.back).toBe(60);
		expect(fm?.alternatives[0]).toContain('9-1-1');
	});

	it('Contigo Fit covers gym, trainer and yoga on Triple-S; First Medical does not', () => {
		const ts = estimate('pocket-oro', 'gimnasio', 45);
		expect(ts?.route).toBe('contigo-fit');
		expect(ts?.back).toBe(20);
		expect(ts?.alternatives).toEqual([]);
		expect(estimate('fm-silver', 'gimnasio', 45)?.verdict).toBe('not-reimbursable');
	});

	it('Mi Momento pays $200 once; Directo Plata is unconfirmed', () => {
		expect(estimate('uno-plata', 'fertilidad', 250)?.back).toBe(200);
		expect(estimate('directo-plata', 'fertilidad', 250)?.headline).toContain('Posiblemente');
		const fm = estimate('fm-gold-plus', 'fertilidad', 120);
		expect(fm?.benefit).toContain('$15');
		expect(fm?.conditions.join(' ')).toContain('exclusiones 16 y 40');
	});

	it('medical cannabis: First Medical up to $350 a year in its dispensaries; Triple-S excludes it', () => {
		const fm = estimate('fm-silver', 'cannabis', 500);
		expect(fm?.back).toBe(350);
		expect(fm?.route).toBe('cannabis');
		expect(claimable(fm)).toBe(true);
		expect(estimate('pocket-plata', 'cannabis', 100)?.verdict).toBe('not-reimbursable');
	});

	it('First Medical nutritionist uses its own copay and visit limit', () => {
		const e = estimate('fm-gold', 'nutricionista', 80);
		expect(e?.benefit).toContain('$18');
		expect(e?.conditions.join(' ')).toContain('4 visitas');
		expect(estimate('pocket-plata', 'nutricionista', 80)?.verdict).toBe('not-reimbursable');
	});

	it('deadlines count from the service date', () => {
		expect(deadlineFrom('2026-10-09', 90)).toBe('01/07/2027');
		expect(deadlineFrom('', 90)).toBe('');
	});

});
