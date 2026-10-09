import type { PlanId, RouteId } from './plans.ts';

export type Provider = {
	name: string;
	npi: string;
	ein: string;
	license: string;
	specialty: string;
	address1: string;
	address2: string;
	phone: string;
};

export type ServiceLine = {
	dateFrom: string;
	dateTo: string;
	placeOfService: string;
	description: string;
	cpt: string;
	modifier: string;
	units: string;
	amountPaid: string;
};

export type Visit = {
	diagnoses: string[];
	diagnosisDescription: string;
	preauthNumber: string;
	accountNumber: string;
	route: RouteId | '';
	lines: ServiceLine[];
};


export type Patient = {
	lastNamePaternal: string;
	lastNameMaternal: string;
	firstName: string;
	middleInitial: string;
	address1: string;
	address2: string;
	city: string;
	state: string;
	zip: string;
	contractNumber: string;
	phone: string;
	altPhone: string;
	groupNumber: string;
	groupName: string;
	hasOtherCoverage: boolean;
	medicareEligible: boolean;
	plan: PlanId | '';
	dob: string;
};

export type Insurer = 'triple-s';

export type ClaimPayload = {
	v: 2;
	provider: Provider;
	visit: Visit;
	patient: Patient;
};

export const MAX_LINES = 6;

export const emptyLine = (): ServiceLine => ({
	dateFrom: '',
	dateTo: '',
	placeOfService: '11',
	description: '',
	cpt: '',
	modifier: '',
	units: '1',
	amountPaid: ''
});

export const emptyProvider = (): Provider => ({
	name: '',
	npi: '',
	ein: '',
	license: '',
	specialty: '',
	address1: '',
	address2: '',
	phone: ''
});

export const emptyVisit = (): Visit => ({
	diagnoses: [''],
	diagnosisDescription: '',
	preauthNumber: '',
	accountNumber: '',
	route: '',
	lines: [emptyLine()]
});

export const emptyPatient = (): Patient => ({
	lastNamePaternal: '',
	lastNameMaternal: '',
	firstName: '',
	middleInitial: '',
	address1: '',
	address2: '',
	city: '',
	state: 'PR',
	zip: '',
	contractNumber: '',
	phone: '',
	altPhone: '',
	groupNumber: '',
	groupName: '',
	hasOtherCoverage: false,
	medicareEligible: false,
	plan: '',
	dob: ''
});

function toBase64Url(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
	const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
	return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
	const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
	return new Uint8Array(await new Response(out).arrayBuffer());
}

// Compressed so the QR stays sparse enough to scan from a phone held at arm's length.
export async function encodePayload(payload: ClaimPayload): Promise<string> {
	const compact = {
		...payload,
		visit: { ...payload.visit, diagnoses: payload.visit.diagnoses.filter((d) => d.trim()) }
	};
	const json = new TextEncoder().encode(JSON.stringify(compact, (_, v) => (v === '' ? undefined : v)));
	return toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

export async function decodePayload(encoded: string): Promise<ClaimPayload> {
	const json = await pipe(fromBase64Url(encoded), new DecompressionStream('deflate-raw'));
	const parsed: unknown = JSON.parse(new TextDecoder().decode(json));
	if (!isPayload(parsed)) throw new Error('Formato de enlace no reconocido');
	// Empty strings are dropped when encoding to keep the QR small; restore them here.
	const blankLine = Object.fromEntries(Object.keys(emptyLine()).map((k) => [k, ''])) as ServiceLine;
	const visit = { ...emptyVisit(), ...parsed.visit };
	return {
		v: 2,
		provider: { ...emptyProvider(), ...parsed.provider },
		patient: { ...emptyPatient(), ...parsed.patient },
		visit: {
			...visit,
			diagnoses: visit.diagnoses.length ? visit.diagnoses : [''],
			lines: visit.lines.map((l) => ({ ...blankLine, ...l }))
		}
	};
}

function isPayload(x: unknown): x is ClaimPayload {
	if (typeof x !== 'object' || x === null) return false;
	const p = x as Record<string, unknown>;
	return (
		p.v === 2 && typeof p.provider === 'object' && typeof p.visit === 'object' && typeof p.patient === 'object'
	);
}

// Without a server, the patient's phone proves acceptance by showing a code derived from the exact payload they reviewed.
export async function acceptanceCode(encoded: string): Promise<string> {
	const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(encoded)));
	const n = ((digest[0] << 24) | (digest[1] << 16) | (digest[2] << 8) | digest[3]) >>> 0;
	return String(n % 10000).padStart(4, '0');
}

// NPI check digit is Luhn over "80840" + first 9 digits (CMS NPI standard).
export function isValidNpi(npi: string): boolean {
	if (!/^\d{10}$/.test(npi)) return false;
	const digits = ('80840' + npi).split('').map(Number);
	let sum = 0;
	for (let i = 0; i < digits.length; i++) {
		let d = digits[digits.length - 1 - i];
		if (i % 2 === 1) {
			d *= 2;
			if (d > 9) d -= 9;
		}
		sum += d;
	}
	return sum % 10 === 0;
}

export const isValidIcd10 = (code: string) => /^[A-TV-Z]\d[0-9A-Z](\.?[0-9A-Z]{1,4})?$/i.test(code);
export const isValidCpt = (code: string) => /^(\d{4}[0-9FTU]|[A-V]\d{4})$/i.test(code);

export const lineTotal = (lines: ServiceLine[]) =>
	lines.reduce((sum, l) => sum + (Number.parseFloat(l.amountPaid) || 0), 0);

export const money = (n: number) =>
	n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function patientFullName(p: Patient): string {
	const first = [p.firstName, p.middleInitial].filter(Boolean).join(' ');
	return [p.lastNamePaternal, p.lastNameMaternal, first].filter(Boolean).join(' ').trim();
}

export function providerProblems(provider: Provider, visit: Visit): string[] {
	const problems: string[] = [];
	if (!provider.name.trim()) problems.push('Falta el nombre del proveedor.');
	if (!isValidNpi(provider.npi)) problems.push('El NPI no es válido (10 dígitos con dígito verificador).');
	if (!provider.ein.trim() && !provider.license.trim())
		problems.push('Triple-S requiere el EIN o el número de licencia además del NPI.');
	if (!provider.address1.trim()) problems.push('Falta la dirección del proveedor.');
	const dx = visit.diagnoses.filter((d) => d.trim());
	if (dx.length === 0) problems.push('Incluya al menos un diagnóstico ICD-10.');
	for (const d of dx) if (!isValidIcd10(d)) problems.push(`Diagnóstico "${d}" no parece un código ICD-10.`);
	const lines = visit.lines.filter((l) => l.cpt.trim() || l.amountPaid.trim());
	if (lines.length === 0) problems.push('Incluya al menos un servicio.');
	if (!visit.route) problems.push('Escoja la razón de la solicitud de reembolso.');
	lines.forEach((l, i) => {
		const n = i + 1;
		if (!l.dateFrom) problems.push(`Servicio ${n}: falta la fecha.`);
		if (!isValidCpt(l.cpt)) problems.push(`Servicio ${n}: código de procedimiento "${l.cpt}" no válido.`);
		if (!(Number.parseFloat(l.amountPaid) > 0)) problems.push(`Servicio ${n}: falta la cantidad pagada.`);
		if (!l.description.trim()) problems.push(`Servicio ${n}: falta la descripción del servicio.`);
	});
	return problems;
}

export function patientProblems(p: Patient): string[] {
	const problems: string[] = [];
	if (!p.lastNamePaternal.trim() || !p.firstName.trim()) problems.push('Falta su nombre y apellido.');
	if (!p.contractNumber.trim()) problems.push('Falta su número de contrato (vea su tarjeta del plan).');
	if (!p.address1.trim() || !p.city.trim() || !p.zip.trim()) problems.push('Falta su dirección postal completa.');
	if (!p.phone.trim()) problems.push('Falta su número de teléfono.');
	if (!p.plan) problems.push('Escoja el plan del paciente.');
	return problems;
}
