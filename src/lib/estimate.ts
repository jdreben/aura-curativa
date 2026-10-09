// Patient-side estimator. Sources: docs/triple-s-2027-reembolsos.md, docs/triple-s-oon-estimates-2027.md.
import type { RouteId } from './plans.ts';

export type PatientPlanId =
	| 'directo-bronce'
	| 'directo-plata'
	| 'pocket-plata'
	| 'pocket-oro'
	| 'uno-plata'
	| 'ts-empleador'
	| 'otro';

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

export const PATIENT_PLANS: { group: string; plans: { id: PatientPlanId; name: string }[] }[] = [
	{
		group: 'Triple-S — plan individual 2027',
		plans: [
			{ id: 'directo-bronce', name: 'Directo Bronce' },
			{ id: 'directo-plata', name: 'Directo Plata' },
			{ id: 'pocket-plata', name: 'Pocket Plata' },
			{ id: 'pocket-oro', name: 'Pocket Oro' },
			{ id: 'uno-plata', name: 'Uno Plata' }
		]
	},
	{ group: 'Triple-S — otro', plans: [{ id: 'ts-empleador', name: 'Plan de mi trabajo (patrono / PYMES)' }] },
	{ group: 'Otra aseguradora', plans: [{ id: 'otro', name: 'MCS, First Medical, Menonita u otra' }] }
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

type Published = { label: string; tariff: number; copay: number; coinsurance: number; reimbursement: number };

// Triple-S "Estimado de servicios para proveedores fuera de la red", 2027 (Ley 134-2020).
const TS_PUBLISHED: Partial<Record<ServiceId, Published>> = {
	pcp: { label: 'Visitas – PCP', tariff: 32, copay: 10, coinsurance: 0, reimbursement: 22 },
	especialista: { label: 'Visitas – médicos especialistas', tariff: 32, copay: 15, coinsurance: 0, reimbursement: 17 },
	subespecialista: { label: 'Visitas – médicos subespecialistas', tariff: 32, copay: 25, coinsurance: 0, reimbursement: 7 },
	// No published row for mental health; specialist row is the closest visit type.
	'salud-mental': { label: 'Visitas – médicos especialistas', tariff: 32, copay: 15, coinsurance: 0, reimbursement: 17 },
	laboratorio: { label: 'Servicios de laboratorio', tariff: 29, copay: 0, coinsurance: 35, reimbursement: 10 },
	radiologia: { label: 'Servicios de radiología', tariff: 48, copay: 0, coinsurance: 45, reimbursement: 22 },
	'terapia-fisica': { label: 'Terapia física', tariff: 20, copay: 15, coinsurance: 0, reimbursement: 5 },
	quiropractico: { label: 'Manipulaciones quiroprácticas', tariff: 27, copay: 15, coinsurance: 0, reimbursement: 12 },
	cirugia: { label: 'Cirugía ambulatoria', tariff: 421, copay: 200, coinsurance: 0, reimbursement: 221 }
};

type IndividualPlan = 'directo-bronce' | 'directo-plata' | 'pocket-plata' | 'pocket-oro' | 'uno-plata';

// In-network cost-sharing from each 2027 póliza; Pocket and Uno show "preferred network / Blue Select".
const IN_NETWORK: Record<IndividualPlan, Partial<Record<ServiceId, string>>> = {
	'directo-bronce': { pcp: '$10', especialista: '$25', subespecialista: '$30', 'salud-mental': '$25', laboratorio: '60% coaseguro', radiologia: '60% coaseguro', quiropractico: '$15 la visita', acupuntura: '$15 (Triple-S Natural)' },
	'directo-plata': { pcp: '$0', especialista: '$15', subespecialista: '$25', 'salud-mental': '$15', laboratorio: '35% coaseguro', radiologia: '40% coaseguro', quiropractico: '$15', acupuntura: '$15 (Triple-S Natural)' },
	'pocket-plata': { pcp: '$0', especialista: '$0 en Red Pocket / $10', subespecialista: '$0 en Red Pocket / $25', 'salud-mental': '$0 en Red Pocket / $10', laboratorio: '30% coaseguro', radiologia: '40% coaseguro', quiropractico: '$10 en Red Pocket', acupuntura: '$15 (Triple-S Natural)' },
	'pocket-oro': { pcp: '$0', especialista: '$0 en Red Pocket / $10', subespecialista: '$0 en Red Pocket / $25', 'salud-mental': '$0 en Red Pocket / $10', laboratorio: '30% coaseguro ($0 en SALUS)', radiologia: '30% coaseguro', quiropractico: '$10 en Red Pocket', acupuntura: '$15 (Triple-S Natural)' },
	'uno-plata': { pcp: '$0 en Blue One / $15', especialista: '$0 en Blue One / $25', subespecialista: '$10 en Blue One / $30', 'salud-mental': '$0 en Blue One / $25', laboratorio: '$0 en Blue One / 40%', radiologia: '$0 en Blue One / 40%', quiropractico: '$0 en Blue One / $25', acupuntura: '$15 (Triple-S Natural)' }
};

const INDIVIDUAL: PatientPlanId[] = ['directo-bronce', 'directo-plata', 'pocket-plata', 'pocket-oro', 'uno-plata'];

export type Estimate = {
	verdict: 'reimbursable' | 'not-reimbursable' | 'direct' | 'unknown';
	headline: string;
	back: number | null;
	owe: number | null;
	explanation: string[];
	alternatives: string[];
	route: RouteId | null;
	conditions: string[];
};

const money = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export function estimate(plan: PatientPlanId | '', service: ServiceId | '', paid: number): Estimate | null {
	if (!plan || !service) return null;
	const p = Math.max(0, paid || 0);
	const published = TS_PUBLISHED[service];

	if (service === 'emergencia' && plan !== 'otro') {
		return {
			verdict: 'direct',
			headline: 'Las emergencias se cubren aunque el hospital esté fuera de la red',
			back: null,
			owe: null,
			explanation: [
				'El proveedor le factura a Triple-S directamente. Usted paga solo su copago de sala de emergencia.',
				'No le pueden cobrar más que dentro de la red (Ley 134-2020, facturas sorpresa).'
			],
			alternatives: ['Si le enviaron una factura por la diferencia, llame a Triple-S: no le corresponde pagarla.'],
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

	if (plan === 'ts-empleador') {
		if (!published) {
			return {
				verdict: 'unknown',
				headline: 'Depende de su plan',
				back: null,
				owe: null,
				explanation: ['Triple-S no publica un estimado fuera de la red para este servicio. Busque "reembolso" en el certificado de su plan.'],
				alternatives: service === 'acupuntura' ? ['Si su plan incluye Triple-S Natural, la acupuntura dentro de la red cuesta alrededor de $15.'] : [],
				route: null,
				conditions: []
			};
		}
		const back = Math.min(published.reimbursement, p || published.reimbursement);
		return {
			verdict: 'reimbursable',
			headline: `Alrededor de ${money(back)}, si su plan incluye beneficio de reembolso`,
			back,
			owe: p ? Math.max(0, p - back) : null,
			explanation: [
				`Triple-S reembolsa según su tarifa contratada, no según lo que usted pagó. Para "${published.label}" la tarifa promedio es ${money(published.tariff)}, menos ${published.coinsurance ? `${published.coinsurance}% de coaseguro` : `${money(published.copay)} de copago`}: un reembolso promedio de ${money(published.reimbursement)}.`,
				'Solo aplica si su plan incluye beneficio de reembolso. Busque "reembolso" en el certificado de su plan.'
			],
			alternatives: [`Dentro de la red pagaría alrededor de ${published.coinsurance ? `${published.coinsurance}% de coaseguro` : money(published.copay)}.`],
			route: 'routine',
			conditions: []
		};
	}

	return {
		verdict: 'unknown',
		headline: 'Aún no hemos verificado este plan',
		back: null,
		owe: null,
		explanation: [
			'Algunos planes sí reembolsan fuera de la red (por ejemplo, planes PPO y muchos planes de patrono). Busque "reembolso" o "fuera de la red" en su póliza.',
			'Por ley (Ley 134-2020) cada aseguradora publica un estimado de costos fuera de la red. MCS: mcs.com.pr, "Estimado de Costo".'
		],
		alternatives: [],
		route: null,
		conditions: []
	};
}

export const claimable = (e: Estimate | null) => !!e && e.verdict === 'reimbursable' && e.route !== null;
