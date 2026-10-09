// Patient-side estimator. Sources: docs/triple-s-2027-reembolsos.md, docs/triple-s-oon-estimates-2027.md.
import type { RouteId } from './plans.ts';

export type PatientPlanId =
	| 'directo-bronce'
	| 'directo-plata'
	| 'pocket-plata'
	| 'pocket-oro'
	| 'uno-plata'
	| 'fm-gold-plus'
	| 'fm-gold'
	| 'fm-silver-plus'
	| 'fm-silver';

export type ServiceId =
	| 'pcp'
	| 'especialista'
	| 'subespecialista'
	| 'salud-mental'
	| 'laboratorio'
	| 'radiologia'
	| 'terapia-fisica'
	| 'quiropractico'
	| 'acupuntura'
	| 'cirugia'
	| 'espejuelos'
	| 'emergencia';

// Order is the order shown to patients; more insurers (MCS, Menonita…) get added here.
export const INSURERS: { id: 'triple-s' | 'first-medical'; name: string; plans: { id: PatientPlanId; name: string }[] }[] = [
	{
		id: 'triple-s',
		name: 'Triple-S',
		plans: [
			{ id: 'directo-bronce', name: 'Directo Bronce 2027' },
			{ id: 'directo-plata', name: 'Directo Plata 2027' },
			{ id: 'pocket-plata', name: 'Pocket Plata 2027' },
			{ id: 'pocket-oro', name: 'Pocket Oro 2027' },
			{ id: 'uno-plata', name: 'Uno Plata 2027' }
		]
	},
	{
		id: 'first-medical',
		name: 'First Medical',
		plans: [
			{ id: 'fm-gold-plus', name: 'Directo Gold Plus 2027' },
			{ id: 'fm-gold', name: 'Directo Gold 2027' },
			{ id: 'fm-silver-plus', name: 'Directo Silver Plus 2027' },
			{ id: 'fm-silver', name: 'Directo Silver 2027' }
		]
	}
];

export const SERVICES: { id: ServiceId; name: string }[] = [
	{ id: 'especialista', name: 'Visita a especialista' },
	{ id: 'subespecialista', name: 'Visita a subespecialista' },
	{ id: 'pcp', name: 'Visita a médico primario' },
	{ id: 'salud-mental', name: 'Psicólogo o psiquiatra' },
	{ id: 'acupuntura', name: 'Acupuntura, masaje terapéutico o reflexología' },
	{ id: 'laboratorio', name: 'Laboratorio' },
	{ id: 'radiologia', name: 'Rayos X o radiología' },
	{ id: 'terapia-fisica', name: 'Terapia física' },
	{ id: 'quiropractico', name: 'Quiropráctico' },
	{ id: 'cirugia', name: 'Cirugía ambulatoria' },
	{ id: 'espejuelos', name: 'Espejuelos o lentes de contacto (adulto)' },
	{ id: 'emergencia', name: 'Sala de emergencia' }
];

type IndividualPlan = 'directo-bronce' | 'directo-plata' | 'pocket-plata' | 'pocket-oro' | 'uno-plata';

// In-network cost-sharing from each 2027 póliza; Pocket and Uno show "preferred network / Blue Select".
const IN_NETWORK: Record<IndividualPlan, Partial<Record<ServiceId, string>>> = {
	'directo-bronce': { pcp: '$10', especialista: '$25', subespecialista: '$30', 'salud-mental': '$25', laboratorio: '60% coaseguro', radiologia: '60% coaseguro', quiropractico: '$15 la visita', acupuntura: '$15' },
	'directo-plata': { pcp: '$0', especialista: '$15', subespecialista: '$25', 'salud-mental': '$15', laboratorio: '35% coaseguro', radiologia: '40% coaseguro', quiropractico: '$15', acupuntura: '$15' },
	'pocket-plata': { pcp: '$0', especialista: '$0 en Red Pocket / $10', subespecialista: '$0 en Red Pocket / $25', 'salud-mental': '$0 en Red Pocket / $10', laboratorio: '30% coaseguro', radiologia: '40% coaseguro', quiropractico: '$10 en Red Pocket', acupuntura: '$15' },
	'pocket-oro': { pcp: '$0', especialista: '$0 en Red Pocket / $10', subespecialista: '$0 en Red Pocket / $25', 'salud-mental': '$0 en Red Pocket / $10', laboratorio: '30% coaseguro ($0 en SALUS)', radiologia: '30% coaseguro', quiropractico: '$10 en Red Pocket', acupuntura: '$15' },
	'uno-plata': { pcp: '$0 en Blue One / $15', especialista: '$0 en Blue One / $25', subespecialista: '$10 en Blue One / $30', 'salud-mental': '$0 en Blue One / $25', laboratorio: '$0 en Blue One / 40%', radiologia: '$0 en Blue One / 40%', quiropractico: '$0 en Blue One / $25', acupuntura: '$15' }
};

const INDIVIDUAL: PatientPlanId[] = ['directo-bronce', 'directo-plata', 'pocket-plata', 'pocket-oro', 'uno-plata'];

type FirstMedicalPlan = 'fm-gold-plus' | 'fm-gold' | 'fm-silver-plus' | 'fm-silver';

// First Medical Directo 2027 cubierta de beneficios (FMHP-PD-2027), cost-sharing tables; [Metro Pavía] in brackets.
const FM_COST: Record<FirstMedicalPlan, Partial<Record<ServiceId, string>>> = {
	'fm-gold-plus': { pcp: '$5', especialista: '$15', subespecialista: '$20', 'salud-mental': '$15', laboratorio: '35%', radiologia: '35%', 'terapia-fisica': '$10', quiropractico: '$15', cirugia: '35%' },
	'fm-gold': { pcp: '$8', especialista: '$18', subespecialista: '$20', 'salud-mental': '$18', laboratorio: '45%', radiologia: '45%', 'terapia-fisica': '$12', quiropractico: '$18', cirugia: '45%' },
	'fm-silver-plus': { pcp: '$10', especialista: '$18', subespecialista: '$18', 'salud-mental': '$18', laboratorio: '55%', radiologia: '55%', 'terapia-fisica': '$15', quiropractico: '$18', cirugia: '65%' },
	'fm-silver': { pcp: '$10', especialista: '$20', subespecialista: '$30', 'salud-mental': '$20', laboratorio: '60%', radiologia: '60%', 'terapia-fisica': '$18', quiropractico: '$20', cirugia: '75%' }
};
const FM_PAVIA_FREE: ServiceId[] = ['pcp', 'especialista', 'laboratorio', 'radiologia'];

export type Insurer = 'triple-s' | 'first-medical';

export const CLAIM_RULES: Record<Insurer, { deadlineDays: number; send: string; form: string | null }> = {
	'triple-s': { deadlineDays: 365, send: 'reembolso@ssspr.com, la app Mi Triple-S o PO Box 363628, San Juan, PR 00936-3628', form: null },
	'first-medical': {
		deadlineDays: 90,
		send: 'las oficinas de First Medical (787-474-3999). La póliza no publica una dirección ni correo de reclamaciones; confírmelo al llamar.',
		form: 'https://www.firstmedicalpr.com/wp-content/uploads/2024/09/FM-COM_CS_23.30_03_S_Solicitud-de-Reembolso_Spanish_Approved_02202023.pdf'
	}
};

export type Estimate = {
	verdict: 'reimbursable' | 'not-reimbursable' | 'direct' | 'unknown';
	insurer: Insurer;
	headline: string;
	back: number | null;
	owe: number | null;
	explanation: string[];
	alternatives: string[];
	route: RouteId | null;
	conditions: string[];
};

const money = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const insurerOf = (plan: PatientPlanId): Insurer => (plan.startsWith('fm-') ? 'first-medical' : 'triple-s');

export function estimate(plan: PatientPlanId | '', service: ServiceId | '', paid: number): Estimate | null {
	if (!plan || !service) return null;
	return { ...estimateFor(plan, service, paid), insurer: insurerOf(plan) };
}

function estimateFor(plan: PatientPlanId, service: ServiceId, paid: number): Omit<Estimate, 'insurer'> {
	const p = Math.max(0, paid || 0);

	if (service === 'emergencia') {
		return {
			verdict: 'direct',
			headline: 'Las emergencias se cubren aunque el hospital esté fuera de la red',
			back: null,
			owe: null,
			explanation: [
				'El proveedor le factura a su plan directamente. Usted paga solo su copago de sala de emergencia.',
				'No le pueden cobrar más que dentro de la red (Ley 134-2020, facturas sorpresa).'
			],
			alternatives: ['Si le enviaron una factura por la diferencia, llame a su plan: no le corresponde pagarla.'],
			route: null,
			conditions: []
		};
	}

	if (INDIVIDUAL.includes(plan)) {
		const inNet = IN_NETWORK[plan as IndividualPlan][service];
		if (service === 'espejuelos') {
			const back = Math.min(75, p);
			return {
				verdict: 'reimbursable',
				headline: 'Sí: hasta $75 al año',
				back,
				owe: p - back,
				explanation: ['Su póliza reembolsa espejuelos o lentes de contacto para adultos (21+) en ópticas no participantes, hasta $75 por año póliza.'],
				alternatives: [],
				route: 'vision',
				conditions: []
			};
		}
		if (service === 'acupuntura') {
			const confirmed = plan !== 'directo-plata';
			const back = Math.min(20, p);
			return {
				verdict: 'reimbursable',
				headline: confirmed ? 'Sí, por Contigo Fit: $20 al mes' : 'Posiblemente, por Contigo Fit: $20 al mes',
				back,
				owe: p - back,
				explanation: [
					'Una visita regular fuera de la red no se reembolsa, pero el programa Contigo Fit reembolsa $20 al mes (hasta 12 meses) por acupuntura, masaje terapéutico o reflexología.',
					...(confirmed ? [] : ['La póliza 2027 de Directo Plata no menciona Contigo Fit. Confírmelo con Triple-S.'])
				],
				alternatives: [`Dentro de la red, Triple-S Natural cubre acupuntura, masaje terapéutico y naturopatía: ${inNet ?? '$15'} por visita, hasta 6 al año.`],
				route: 'contigo-fit',
				conditions: [
					'Complete la evaluación de salud (HRA) en la app Mi Triple-S.',
					'Haga su visita preventiva anual (Salus o Centro Preventivo).',
					'El proveedor debe estar certificado y licenciado.'
				]
			};
		}
		return {
			verdict: 'not-reimbursable',
			headline: 'No: su plan no reembolsa este servicio fuera de la red',
			back: 0,
			owe: p,
			explanation: [
				'Su plan es de red cerrada. La póliza 2027 excluye servicios de proveedores no participantes en Puerto Rico, salvo emergencias y una lista corta de beneficios.'
			],
			alternatives: [
				...(inNet ? [`Con un proveedor de la red le costaría ${inNet}.`] : []),
				...(service === 'laboratorio' ? ['Lleve la orden médica a un laboratorio participante o clínica SALUS.'] : []),
				'Si ningún proveedor de la red ofrece este servicio, llame a Triple-S antes de la visita: la póliza reembolsa el 100% menos su copago cuando no hay proveedor contratado (cláusula 18/19).'
			],
			route: 'no-network',
			conditions: ['Confirme con Triple-S que no hay proveedor participante para este servicio.']
		};
	}

	if (plan.startsWith('fm-')) {
		const cost = FM_COST[plan as FirstMedicalPlan][service];
		if (service === 'acupuntura') {
			return {
				verdict: 'not-reimbursable',
				headline: 'No: First Medical excluye la acupuntura',
				back: 0,
				owe: paid,
				explanation: ['La póliza 2027 excluye la acupuntura (exclusión 19) y la medicina natural (exclusión 20), dentro o fuera de la red.'],
				alternatives: [],
				route: null,
				conditions: []
			};
		}
		if (service === 'espejuelos') {
			return {
				verdict: 'unknown',
				headline: 'Verifique su beneficio de visión',
				back: null,
				owe: null,
				explanation: ['Aún no hemos verificado el beneficio de espejuelos de First Medical Directo 2027.'],
				alternatives: [],
				route: null,
				conditions: []
			};
		}
		return {
			verdict: 'reimbursable',
			headline: 'Sí: First Medical reembolsa fuera de la red',
			back: null,
			owe: null,
			explanation: [
				`Su plan es de libre selección. Le reembolsa la tarifa más alta que First Medical paga en su red a un proveedor de la misma especialidad, menos su ${cost ? `copago o coaseguro (${cost})` : 'copago o coaseguro'}. Si el proveedor cobró más, usted paga la diferencia.`,
				'First Medical no publica sus tarifas. Llame al 1-888-318-0274 (7 días, 8am–12am) con el código del servicio: por ley le tienen que dar el estimado.',
				'Si ninguna especialidad igual está en la red, le reembolsan el 100% de lo pagado menos su copago.'
			],
			alternatives: FM_PAVIA_FREE.includes(service)
				? ['En hospitales y clínicas de Metro Pavía este servicio le cuesta $0.']
				: [],
			route: 'routine',
			conditions: ['Debe ser un servicio cubierto y médicamente necesario.']
		};
	}

	return {
		verdict: 'unknown',
		headline: 'Aún no hemos verificado este plan',
		back: null,
		owe: null,
		explanation: ['Busque "reembolso" o "fuera de la red" en su póliza.'],
		alternatives: [],
		route: null,
		conditions: []
	};
}

export const claimable = (e: Estimate | null) => !!e && e.verdict === 'reimbursable' && e.route !== null;

export function deadlineFrom(isoDate: string, days: number): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
	if (!m) return '';
	const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days);
	return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}
