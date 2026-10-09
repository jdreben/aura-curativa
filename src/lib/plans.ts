// Encodes docs/triple-s-2027-reembolsos.md. Re-check every plan year.

export type PlanId = 'directo-bronce' | 'directo-plata' | 'pocket-plata' | 'pocket-oro' | 'uno-plata' | 'otro';

export type RouteId =
	| 'routine'
	| 'no-network'
	| 'contigo-fit'
	| 'vision'
	| 'post-stabilization'
	| 'ambulance'
	| 'mi-momento'
	// First Medical only; not a Triple-S route, so it is not in ROUTES.
	| 'cannabis';

export const PLANS: { id: PlanId; name: string }[] = [
	{ id: 'directo-bronce', name: 'Triple-S Directo Bronce 2027' },
	{ id: 'directo-plata', name: 'Triple-S Directo Plata 2027' },
	{ id: 'pocket-plata', name: 'Triple-S Pocket Plata 2027' },
	{ id: 'pocket-oro', name: 'Triple-S Pocket Oro 2027' },
	{ id: 'uno-plata', name: 'Triple-S Uno Plata 2027' },
	{ id: 'otro', name: 'Otro plan Triple-S (grupo / PPO)' }
];

type Route = {
	id: RouteId;
	label: string;
	reason: string;
	amount: string;
	conditions: string[];
	// Plans whose 2027 policy names this route; others are reported as unconfirmed.
	confirmedIn: PlanId[];
};

const ALL: PlanId[] = ['directo-bronce', 'directo-plata', 'pocket-plata', 'pocket-oro', 'uno-plata'];
const NOT_DIRECTO_PLATA: PlanId[] = ['directo-bronce', 'pocket-plata', 'pocket-oro', 'uno-plata'];

export const ROUTES: Route[] = [
	{
		id: 'routine',
		label: 'Visita regular con proveedor no participante',
		reason: 'Servicio prestado por proveedor no participante.',
		amount: '',
		conditions: [],
		confirmedIn: []
	},
	{
		id: 'no-network',
		label: 'No hay proveedor participante para este servicio (cláusula 18/19)',
		reason:
			'Servicio cubierto y médicamente necesario sin proveedor contratado disponible en la red (cláusula 18/19 de la póliza).',
		amount: '100% de lo pagado, menos su copago o coaseguro',
		conditions: [
			'El servicio debe estar cubierto por la póliza y ser médicamente necesario.',
			'Confirme con Triple-S que no hay proveedor participante. Lo ideal es hacerlo antes del servicio.'
		],
		confirmedIn: ALL
	},
	{
		id: 'contigo-fit',
		label: 'Contigo Fit: gimnasio, entrenador, yoga, acupuntura, masaje o reflexología',
		reason: 'Beneficio Contigo Fit: gimnasio, entrenador, yoga, acupuntura, masaje terapéutico o reflexología por proveedor licenciado.',
		amount: '$20 al mes, hasta 12 meses',
		conditions: [
			'Completar la evaluación de salud (HRA) en la app Mi Triple-S.',
			'Haber hecho la visita preventiva anual (Salus o Centro Preventivo).',
			'Proveedor certificado y licenciado. Verifique con Triple-S si Contigo Fit usa un formulario propio.'
		],
		confirmedIn: NOT_DIRECTO_PLATA
	},
	{
		id: 'vision',
		label: 'Espejuelos o lentes de contacto (mayores de 21)',
		reason: 'Espejuelos o lentes de contacto para adulto, proveedor no participante.',
		amount: 'Hasta $75 por año póliza',
		conditions: [],
		confirmedIn: ALL
	},
	{
		id: 'post-stabilization',
		label: 'Cuidado post-estabilización después de una emergencia',
		reason: 'Cuidado post-estabilización por proveedor no participante; no fue posible trasladar al paciente.',
		amount: 'Lo menor entre lo pagado y la tarifa de un proveedor participante, menos copago o coaseguro',
		conditions: ['Debe existir una razón médica de peso que impidió el traslado.'],
		confirmedIn: ALL
	},
	{
		id: 'ambulance',
		label: 'Ambulancia terrestre (no emergencia)',
		reason: 'Ambulancia terrestre no de emergencia.',
		amount: 'Hasta $80 por caso',
		conditions: ['Incluya el informe médico con el diagnóstico y la distancia recorrida.'],
		confirmedIn: ALL
	},
	{
		id: 'mi-momento',
		label: 'Mi Momento: consulta de planificación de fertilidad',
		reason: 'Beneficio Mi Momento: consulta de planificación de fertilidad.',
		amount: '$200, una sola vez',
		conditions: [],
		confirmedIn: NOT_DIRECTO_PLATA
	}
];

export type Alternative = { text: string; route?: RouteId };

export type Assessment =
	| { status: 'incomplete' }
	| { status: 'covered' | 'unconfirmed'; route: Route; notes: string[] }
	| { status: 'unverified'; route: Route; notes: string[] }
	| { status: 'not-covered'; route: Route; alternatives: Alternative[]; notes: string[] };

export const routeById = (id: string) => ROUTES.find((r) => r.id === id);
export const planById = (id: string) => PLANS.find((p) => p.id === id);

// Venipuncture and the CPT pathology/lab range.
export const isLabCode = (cpt: string) => {
	const n = Number.parseInt(cpt, 10);
	return cpt === '36415' || (n >= 80047 && n <= 89398);
};

export function assess(plan: string, routeId: string, cpts: string[]): Assessment {
	const route = routeById(routeId);
	if (!planById(plan) || !route) return { status: 'incomplete' };

	const notes: string[] = [];
	if (plan !== 'otro' && cpts.some(isLabCode)) {
		notes.push(
			'Laboratorios en un laboratorio no participante no son reembolsables. Use la orden médica en un laboratorio participante o clínica SALUS.'
		);
	}

	if (plan === 'otro') {
		notes.push(
			'No tenemos la póliza de este plan. Muchos planes de grupo y PPO sí cubren servicios fuera de la red: verifique los beneficios fuera de la red del paciente.'
		);
		return { status: 'unverified', route, notes };
	}

	if (route.id === 'routine') {
		return {
			status: 'not-covered',
			route,
			notes,
			alternatives: [
				{
					text: 'Acupuntura, masaje terapéutico o reflexología: Contigo Fit reembolsa $20 al mes.',
					route: 'contigo-fit'
				},
				{
					text: 'Si no existe un proveedor participante para este servicio, Triple-S reembolsa 100% menos el costo compartido (cláusula 18/19). Llame a Triple-S antes de la visita.',
					route: 'no-network'
				},
				{
					text: 'Triple-S Natural cubre acupuntura, masaje terapéutico y naturopatía con proveedores participantes: 6 visitas al año, $15 de copago.'
				},
				{ text: 'Laboratorios: use la orden médica en un laboratorio participante o clínica SALUS.' }
			]
		};
	}

	const status = route.confirmedIn.includes(plan as PlanId) ? 'covered' : 'unconfirmed';
	if (status === 'unconfirmed') notes.push('La póliza 2027 de este plan no menciona este beneficio. Confirme con Triple-S.');
	return { status, route, notes };
}

export const canFile = (a: Assessment) => a.status !== 'incomplete' && a.status !== 'not-covered';

export function filingDeadline(serviceDates: string[]): string {
	const first = serviceDates.filter(Boolean).sort()[0];
	if (!first) return '';
	const [y, m, d] = first.split('-').map(Number);
	return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y + 1}`;
}
