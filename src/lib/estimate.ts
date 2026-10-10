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
	| 'gimnasio'
	| 'nutricionista'
	| 'fertilidad'
	| 'ambulancia'
	| 'cannabis'
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
	{ id: 'nutricionista', name: 'Nutricionista' },
	{ id: 'fertilidad', name: 'Consulta de planificación de fertilidad' },
	{ id: 'acupuntura', name: 'Acupuntura, masaje terapéutico o reflexología' },
	{ id: 'gimnasio', name: 'Gimnasio, entrenador o yoga' },
	{ id: 'laboratorio', name: 'Laboratorio' },
	{ id: 'radiologia', name: 'Rayos X o radiología' },
	{ id: 'terapia-fisica', name: 'Terapia física' },
	{ id: 'quiropractico', name: 'Quiropráctico' },
	{ id: 'cirugia', name: 'Cirugía ambulatoria' },
	{ id: 'espejuelos', name: 'Espejuelos o lentes de contacto (adulto)' },
	{ id: 'cannabis', name: 'Cannabis medicinal' },
	{ id: 'ambulancia', name: 'Ambulancia terrestre (no de emergencia)' },
	{ id: 'emergencia', name: 'Sala de emergencia' }
];

type IndividualPlan = 'directo-bronce' | 'directo-plata' | 'pocket-plata' | 'pocket-oro' | 'uno-plata';

// In-network cost-sharing from each 2027 póliza; Pocket and Uno show "preferred network / Blue Select".
const IN_NETWORK: Record<IndividualPlan, Partial<Record<ServiceId, string>>> = {
	'directo-bronce': { 'terapia-fisica': '60% coaseguro', cirugia: '60% coaseguro (facilidad)', pcp: '$10', especialista: '$25', subespecialista: '$30', 'salud-mental': '$25', laboratorio: '60% coaseguro', radiologia: '60% coaseguro', quiropractico: '$15 la visita', acupuntura: '$15' },
	'directo-plata': { 'terapia-fisica': '$15', cirugia: '$200 (facilidad)', pcp: '$0', especialista: '$15', subespecialista: '$25', 'salud-mental': '$15', laboratorio: '35% coaseguro', radiologia: '40% coaseguro', quiropractico: '$15', acupuntura: '$15' },
	'pocket-plata': { 'terapia-fisica': '$10 en Red Pocket / $18', cirugia: '50% coaseguro (facilidad)', pcp: '$0', especialista: '$0 en Red Pocket / $10', subespecialista: '$0 en Red Pocket / $25', 'salud-mental': '$0 en Red Pocket / $10', laboratorio: '30% coaseguro', radiologia: '40% coaseguro', quiropractico: '$10 en Red Pocket', acupuntura: '$15' },
	'pocket-oro': { 'terapia-fisica': '$10 en Red Pocket / $18', cirugia: '45% coaseguro (facilidad)', pcp: '$0', especialista: '$0 en Red Pocket / $10', subespecialista: '$0 en Red Pocket / $25', 'salud-mental': '$0 en Red Pocket / $10', laboratorio: '30% coaseguro ($0 en SALUS)', radiologia: '30% coaseguro', quiropractico: '$10 en Red Pocket', acupuntura: '$15' },
	'uno-plata': { 'terapia-fisica': '$10 en Blue One / $20', cirugia: '$50 en Blue One / $300 (facilidad)', pcp: '$0 en Blue One / $15', especialista: '$0 en Blue One / $25', subespecialista: '$10 en Blue One / $30', 'salud-mental': '$0 en Blue One / $25', laboratorio: '$0 en Blue One / 40%', radiologia: '$0 en Blue One / 40%', quiropractico: '$0 en Blue One / $25', acupuntura: '$15' }
};

const INDIVIDUAL: PatientPlanId[] = ['directo-bronce', 'directo-plata', 'pocket-plata', 'pocket-oro', 'uno-plata'];

type FirstMedicalPlan = 'fm-gold-plus' | 'fm-gold' | 'fm-silver-plus' | 'fm-silver';

// First Medical Directo 2027 cubierta de beneficios (FMHP-PD-2027), cost-sharing tables; [Metro Pavía] in brackets.
const FM_COST: Record<FirstMedicalPlan, Partial<Record<ServiceId, string>>> = {
	'fm-gold-plus': { nutricionista: '$15', pcp: '$5', especialista: '$15', subespecialista: '$20', 'salud-mental': '$15', laboratorio: '35%', radiologia: '35%', 'terapia-fisica': '$10', quiropractico: '$15', cirugia: '35%' },
	'fm-gold': { nutricionista: '$18', pcp: '$8', especialista: '$18', subespecialista: '$20', 'salud-mental': '$18', laboratorio: '45%', radiologia: '45%', 'terapia-fisica': '$12', quiropractico: '$18', cirugia: '45%' },
	'fm-silver-plus': { nutricionista: '$20', pcp: '$10', especialista: '$18', subespecialista: '$18', 'salud-mental': '$18', laboratorio: '55%', radiologia: '55%', 'terapia-fisica': '$15', quiropractico: '$18', cirugia: '65%' },
	'fm-silver': { nutricionista: '$20', pcp: '$10', especialista: '$20', subespecialista: '$30', 'salud-mental': '$20', laboratorio: '60%', radiologia: '60%', 'terapia-fisica': '$18', quiropractico: '$20', cirugia: '75%' }
};
const FM_PAVIA_FREE: ServiceId[] = ['pcp', 'especialista', 'laboratorio', 'radiologia'];
// MRI, CT, sonograms and other "pruebas especializadas" (line K): 20% at Metro Pavía.
const FM_SPECIALIZED: Record<FirstMedicalPlan, string> = { 'fm-gold-plus': '40%', 'fm-gold': '45%', 'fm-silver-plus': '60%', 'fm-silver': '75%' };

// In-network cost-sharing for the comparison table; [Metro Pavía] / SALUS tiers are left to the policy.
export function inNetworkCost(plan: PatientPlanId, service: ServiceId): string | null {
	if (plan.startsWith('fm-')) return FM_COST[plan as FirstMedicalPlan][service] ?? null;
	return IN_NETWORK[plan as IndividualPlan]?.[service] ?? null;
}

// Usual billing codes, so the patient can ask the plan for a quote; the provider's receipt has the exact one.
const CPT_HINT: Partial<Record<ServiceId, string>> = {
	pcp: '99213 o 99214 (visita de paciente establecido)',
	especialista: '99213 o 99214 (visita de paciente establecido)',
	subespecialista: '99213 o 99214 (visita de paciente establecido)',
	'salud-mental': '90834 (psicoterapia de 45 minutos) o 90837 (60 minutos)',
	nutricionista: '97802 (evaluación inicial) o 97803 (seguimiento)',
	fertilidad: '99203 o 99213 (consulta)',
	'terapia-fisica': '97110 (ejercicio terapéutico)',
	quiropractico: '98940 (manipulación de 1 o 2 regiones)'
};

export type Insurer = 'triple-s' | 'first-medical';

export type ClaimRules = {
	deadlineDays: number;
	email: string | null;
	address: string[];
	note?: string;
	form: string | null;
};

export const CLAIM_RULES: Record<Insurer, ClaimRules> = {
	'triple-s': {
		deadlineDays: 365,
		email: 'reembolso@ssspr.com',
		address: ['Triple-S Salud', 'Departamento de Reembolsos', 'PO Box 363628', 'San Juan, PR 00936-3628'],
		form: null
	},
	'first-medical': {
		deadlineDays: 90,
		email: null,
		address: ['First Medical Health Plan, Inc.', 'Departamento de Reembolsos Médicos', 'PO Box 191580', 'San Juan, PR 00918-1580'],
		note: 'La póliza no publica una dirección exclusiva para reclamaciones. Confírmela al 787-474-3999.',
		form: 'https://www.firstmedicalpr.com/wp-content/uploads/2024/09/FM-COM_CS_23.30_03_S_Solicitud-de-Reembolso_Spanish_Approved_02202023.pdf'
	}
};

export const deadlineWords = (days: number) => (days === 365 ? 'un año' : `${days} días`);

export type Estimate = {
	verdict: 'reimbursable' | 'not-reimbursable' | 'direct' | 'unknown';
	insurer: Insurer;
	headline: string;
	// What is covered, without the yes/no framing; empty when nothing is.
	benefit: string;
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
			benefit: '',
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
				benefit: 'Hasta $75 al año',
				back,
				owe: p - back,
				explanation: ['Su póliza reembolsa espejuelos o lentes de contacto para adultos (21+) en ópticas no participantes, hasta $75 por año póliza.'],
				alternatives: [],
				route: 'vision',
				conditions: []
			};
		}
		if (service === 'ambulancia') {
			const back = Math.min(80, p);
			return {
				verdict: 'reimbursable',
				headline: 'Sí: hasta $80 por caso',
				benefit: 'Hasta $80 por caso',
				back,
				owe: p - back,
				explanation: ['Su póliza reembolsa la ambulancia terrestre que no es de emergencia, hasta $80 por caso.'],
				alternatives: ['Si fue una emergencia, Triple-S le paga a la ambulancia directamente: no necesita reembolso.'],
				route: 'ambulance',
				conditions: ['Incluya el informe médico con el diagnóstico, por qué necesitaba la ambulancia y la distancia recorrida.']
			};
		}
		if (service === 'fertilidad') {
			const confirmed = plan !== 'directo-plata';
			const back = Math.min(200, p);
			return {
				verdict: 'reimbursable',
				headline: confirmed ? 'Sí, por Mi Momento: $200 una vez' : 'Posiblemente, por Mi Momento: $200 una vez',
				benefit: `Mi Momento: $200, una sola vez${confirmed ? '' : ' (confirme con Triple-S)'}`,
				back,
				owe: p - back,
				explanation: [
					'El beneficio Mi Momento reembolsa $200, una sola vez, por una consulta de planificación de fertilidad.',
					...(confirmed ? [] : ['La póliza 2027 de Directo Plata no menciona Mi Momento. Confírmelo con Triple-S.'])
				],
				alternatives: [],
				route: 'mi-momento',
				conditions: []
			};
		}
		if (service === 'cannabis') {
			return {
				verdict: 'not-reimbursable',
				headline: 'No: Triple-S excluye el cannabis medicinal',
				benefit: '',
				back: 0,
				owe: p,
				explanation: ['La póliza 2027 excluye el cannabis medicinal, dentro o fuera de la red.'],
				alternatives: [],
				route: null,
				conditions: []
			};
		}
		if (service === 'acupuntura' || service === 'gimnasio') {
			const confirmed = plan !== 'directo-plata';
			const back = Math.min(20, p);
			return {
				verdict: 'reimbursable',
				headline: confirmed ? 'Sí, por Contigo Fit: $20 al mes' : 'Posiblemente, por Contigo Fit: $20 al mes',
				benefit: `Contigo Fit: $20 al mes, hasta 12 meses${confirmed ? '' : ' (confirme con Triple-S)'}`,
				back,
				owe: p - back,
				explanation: [
					'Una visita regular fuera de la red no se reembolsa, pero el programa Contigo Fit reembolsa $20 al mes (hasta 12 meses) por gimnasio, entrenador, yoga, acupuntura, masaje terapéutico o reflexología.',
					...(confirmed ? [] : ['La póliza 2027 de Directo Plata no menciona Contigo Fit. Confírmelo con Triple-S.'])
				],
				alternatives:
					service === 'acupuntura'
						? [`Dentro de la red, Triple-S Natural cubre acupuntura, masaje terapéutico y naturopatía: ${inNet ?? '$15'} por visita, hasta 6 al año.`]
						: [],
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
			benefit: '',
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
		// A fertility-planning consult is a gynecologist visit, billed at the specialist copay.
		const cost = FM_COST[plan as FirstMedicalPlan][service === 'fertilidad' ? 'especialista' : service];
		if (service === 'ambulancia') {
			const back = Math.min(80, p);
			return {
				verdict: 'reimbursable',
				headline: 'Sí: hasta $80 por viaje',
				benefit: 'Hasta $80 por viaje',
				back,
				owe: p - back,
				explanation: [
					'Su póliza cubre por reembolso, hasta $80 por viaje, la ambulancia terrestre hacia o desde un hospital local, una facilidad alterna o entre hospitales.'
				],
				alternatives: ['Si llamó al 9-1-1, First Medical le paga el 100% a la ambulancia directamente (Ley 129-2019): no necesita reembolso.'],
				route: 'ambulance',
				conditions: ['La ambulancia debe estar autorizada por la Comisión de Servicio Público.']
			};
		}
		if (service === 'cannabis') {
			const back = Math.min(350, p);
			return {
				verdict: 'reimbursable',
				headline: 'Sí: hasta $350 al año',
				benefit: 'Hasta $350 por año contrato',
				back,
				owe: p - back,
				explanation: [
					'Su póliza reembolsa el cannabis medicinal comprado en la red de dispensarios de First Medical Cannabis, hasta $350 por año contrato.'
				],
				alternatives: [],
				route: 'cannabis',
				conditions: [
					'Compre en un dispensario de First Medical Cannabis. Las compras en otros dispensarios no se reembolsan.',
					'Debe tener 21 años o más y licencia vigente de paciente de cannabis medicinal. Anexe copia de la licencia.',
					'La recomendación debe ser de un médico registrado para cannabis medicinal.'
				]
			};
		}
		if (service === 'gimnasio') {
			return {
				verdict: 'not-reimbursable',
				headline: 'No: First Medical no cubre gimnasio ni entrenador',
				benefit: '',
				back: 0,
				owe: p,
				explanation: ['La póliza 2027 no incluye gimnasio, entrenador ni yoga, y excluye lo que no está expresamente cubierto (exclusión 56).'],
				alternatives: ['El Programa de Bienestar FM da recompensas de hasta $200 al año para artículos en farmacias, no reembolsos en efectivo.'],
				route: null,
				conditions: []
			};
		}
		if (service === 'acupuntura') {
			return {
				verdict: 'not-reimbursable',
				headline: 'No: First Medical excluye la acupuntura',
				benefit: '',
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
				verdict: 'reimbursable',
				headline: 'Sí: First Medical reembolsa fuera de la red',
				benefit: 'Un par de espejuelos al año: tarifa de la red menos su copago ($15)',
				back: null,
				owe: null,
				explanation: [
					'Su póliza cubre un par de espejuelos para adultos por año contrato, con $15 de copago, a través de iVision International. Fuera de la red le reembolsan la tarifa contratada menos el copago. Si la óptica cobró más, usted paga la diferencia.',
					'Llame al 1-888-318-0274 con el código del servicio para saber cuánto le reembolsan.'
				],
				alternatives: ['En una óptica de iVision International el examen de la vista es $0 y los espejuelos, $15.'],
				route: 'routine',
				conditions: ['Un par por año contrato.']
			};
		}
		return {
			verdict: 'reimbursable',
			headline: 'Sí: First Medical reembolsa fuera de la red',
			benefit: `Tarifa de la red para la misma especialidad, menos su ${cost ? `${cost.includes('%') ? 'coaseguro' : 'copago'} (${cost})` : 'copago o coaseguro'}`,
			back: null,
			owe: null,
			explanation: [
				`Su plan es de libre selección. Le reembolsa la tarifa más alta que First Medical paga en su red a un proveedor de la misma especialidad, menos su ${cost ? `copago o coaseguro (${cost})` : 'copago o coaseguro'}. Si el proveedor cobró más, usted paga la diferencia.`,
				`First Medical no publica sus tarifas. Llame al 1-888-318-0274 (7 días, 8am–12am) con el código del servicio (CPT)${CPT_HINT[service] ? `, que suele ser ${CPT_HINT[service]}` : ''}: por ley le tienen que dar el estimado.`,
				'Si ninguna especialidad igual está en la red, le reembolsan el 100% de lo pagado menos su copago.',
				...(service === 'radiologia'
					? [`El ${cost} es para rayos X. MRI, CT, sonogramas y otras pruebas especializadas tienen ${FM_SPECIALIZED[plan as FirstMedicalPlan]} de coaseguro y la mayoría requiere autorización previa.`]
					: [])
			],
			alternatives: FM_PAVIA_FREE.includes(service)
				? [
						service === 'radiologia'
							? 'En hospitales y clínicas de Metro Pavía los rayos X le cuestan $0 y las pruebas especializadas, 20%.'
							: 'En hospitales y clínicas de Metro Pavía este servicio le cuesta $0.'
					]
				: [],
			route: 'routine',
			conditions: [
				'Debe ser un servicio cubierto y médicamente necesario.',
				...(service === 'terapia-fisica' || service === 'quiropractico'
					? ['Hasta 20 terapias y manipulaciones quiroprácticas combinadas por año contrato.']
					: []),
				...(service === 'nutricionista' ? ['Hasta 4 visitas por año contrato.'] : []),
				...(service === 'fertilidad'
					? ['Solo la consulta. La póliza excluye los tratamientos de infertilidad y la inseminación (exclusiones 16 y 40).']
					: [])
			]
		};
	}

	return {
		verdict: 'unknown',
		headline: 'Aún no hemos verificado este plan',
		benefit: '',
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
