// Plan-specific questions and the justification letter. Sources: docs/triple-s-2027-reembolsos.md, docs/first-medical-2027-reembolsos.md.
import type { Insurer, ServiceId } from './estimate.ts';
import { deadlineWords } from './estimate.ts';
import type { RouteId } from './plans.ts';
import { routeById } from './plans.ts';

export type Question = { id: string; text: string; warnIfNo?: string };

export function questionsFor(insurer: Insurer, route: RouteId): Question[] {
	if (insurer === 'triple-s' && route === 'contigo-fit') {
		return [
			{ id: 'hra', text: '¿Completó la evaluación de salud (HRA) en la app Mi Triple-S?', warnIfNo: 'Complete la HRA en Mi Triple-S antes de someter: Contigo Fit la requiere.' },
			{ id: 'preventiva', text: '¿Hizo su visita preventiva anual?', warnIfNo: 'Haga su visita preventiva en una clínica Salus o Centro Preventivo: Contigo Fit la requiere.' },
			{ id: 'licencia', text: '¿Su proveedor está certificado y licenciado?', warnIfNo: 'Contigo Fit solo reembolsa proveedores certificados y licenciados.' }
		];
	}
	if (insurer === 'triple-s' && route === 'vision') {
		return [{ id: 'adulto', text: '¿La persona que recibió el servicio tiene 21 años o más?', warnIfNo: 'Este beneficio es solo para adultos de 21 años o más.' }];
	}
	if (insurer === 'first-medical') {
		return [{ id: 'sin-red', text: '¿Buscó un proveedor de esta especialidad en la red de First Medical y no había?' }];
	}
	return [];
}

export function preauthWarning(insurer: Insurer, service: ServiceId): string | null {
	if (insurer !== 'first-medical') return null;
	if (service === 'quiropractico' || service === 'terapia-fisica') {
		return 'First Medical requiere autorización previa del plan para manipulaciones quiroprácticas y terapias. Pídala antes de la cita.';
	}
	if (service === 'espejuelos') {
		return 'First Medical requiere autorización previa del plan para los espejuelos. Pídala antes de comprarlos.';
	}
	if (service === 'cirugia') {
		return 'Si la cirugía usa un hospital o facilidad, First Medical requiere aprobación por escrito al menos 72 horas antes.';
	}
	return null;
}

export type LetterInput = {
	insurer: Insurer;
	route: RouteId;
	planName: string;
	serviceName: string;
	date: string;
	paid: string;
	answers: Record<string, boolean>;
};

export function letterParagraphs(l: LetterInput): string[] {
	const what = `${l.serviceName.toLowerCase()}${l.date ? ` el ${l.date}` : ''}${l.paid ? `, por lo cual pagué $${l.paid}` : ''}`;
	const closing =
		'Adjunto el formulario de reembolso y el recibo original del proveedor con el diagnóstico (ICD-10), el código de cada servicio y su NPI.';

	if (l.insurer === 'first-medical') {
		return [
			`Solicito el reembolso de gastos cubiertos por servicios obtenidos fuera de la red, conforme a la sección "Reembolso de gastos cubiertos por servicios obtenidos fuera de la red" de mi póliza ${l.planName}, por ${what}. El proveedor no acepta el plan.`,
			l.answers['sin-red']
				? 'No existe un proveedor de la misma especialidad en la red. Conforme a la póliza, solicito el reembolso del 100% de lo pagado, menos el copago aplicable.'
				: 'Solicito el reembolso a la tarifa contratada por la red para un proveedor de la misma especialidad, menos el copago aplicable.',
			closing
		];
	}
	if (l.route === 'contigo-fit') {
		const met = [
			l.answers.hra && 'completé la evaluación de salud (HRA) en Mi Triple-S',
			l.answers.preventiva && 'hice mi visita preventiva anual',
			l.answers.licencia && 'el proveedor está certificado y licenciado'
		].filter(Boolean);
		return [
			`Solicito el reembolso del beneficio Contigo Fit de mi póliza ${l.planName} ($20 mensuales, hasta 12 meses) por ${what}.`,
			...(met.length ? [`Cumplo con los requisitos del beneficio: ${met.join(', ')}.`] : []),
			closing
		];
	}
	if (l.route === 'vision') {
		return [
			`Solicito el reembolso del beneficio de espejuelos o lentes de contacto para adultos de mi póliza ${l.planName} (hasta $75 por año póliza) por ${what}, en una óptica no participante.`,
			closing
		];
	}
	return [`Solicito el reembolso por ${what} conforme a mi póliza ${l.planName}.`, closing];
}

export type BenefitExplanation = { basis: string; paragraphs: string[] };

// The "why you are entitled" page that goes with every claim; written for the insurer's reviewer.
export function benefitExplanation(l: LetterInput & { benefit: string }): BenefitExplanation {
	const service = l.serviceName.toLowerCase();
	if (l.insurer === 'first-medical') {
		return {
			basis:
				'Póliza First Medical Directo 2027 (FMHP-PD-2027): sección "Reembolso de gastos cubiertos por servicios obtenidos fuera de la red" y sección "Ley Núm. 134-2020"; Artículo 48.050 del Código de Seguros de Salud de Puerto Rico.',
			paragraphs: [
				`${l.planName} es un plan de libre selección. La póliza dispone que First Medical reembolsará al suscriptor el 100% de los gastos cubiertos que sean médicamente necesarios, según las tarifas contratadas por su red International Medical Card para un proveedor de una especialidad similar, menos el copago que aplique.`,
				`El servicio o suplido reclamado, ${service}, está cubierto por la póliza. Beneficio aplicable: ${l.benefit}.`,
				l.answers['sin-red']
					? 'No hay un proveedor de esta especialidad en el directorio de First Medical. Conforme al inciso B del Artículo 48.050, procede el reembolso del 100% de los gastos incurridos, menos el copago que aplique.'
					: 'El proveedor no participa en la red de First Medical. Procede el reembolso a la tarifa mayor contratada con un proveedor de la misma especialidad, menos el copago o coaseguro que aplique.',
				'La póliza requiere someter la solicitud dentro de 90 días desde la fecha del servicio, con el recibo original del proveedor, el diagnóstico (ICD-10) y los códigos CPT.'
			]
		};
	}
	if (l.route === 'contigo-fit') {
		const met = [
			l.answers.hra && 'completó la evaluación de salud (HRA) en Mi Triple-S',
			l.answers.preventiva && 'hizo su visita preventiva anual',
			l.answers.licencia && 'el proveedor está certificado y licenciado'
		].filter(Boolean);
		return {
			basis: `Póliza ${l.planName}: beneficio Contigo Fit.`,
			paragraphs: [
				'El beneficio Contigo Fit reembolsa $20 mensuales, hasta 12 meses, por acupuntura, masaje terapéutico o reflexología con un proveedor certificado y licenciado.',
				`El servicio reclamado, ${service}, es uno de los servicios que cubre Contigo Fit. Beneficio aplicable: ${l.benefit}.`,
				met.length
					? `El asegurado cumple con los requisitos del beneficio: ${met.join(', ')}.`
					: 'Requisitos del beneficio: evaluación de salud (HRA) en Mi Triple-S, visita preventiva anual y proveedor certificado y licenciado.',
				'La póliza permite someter la solicitud hasta un año desde la fecha del servicio.'
			]
		};
	}
	if (l.route === 'vision') {
		return {
			basis: `Póliza ${l.planName}: exclusión 52, inciso (a), y beneficio de espejuelos o lentes de contacto para adultos.`,
			paragraphs: [
				'La póliza reembolsa espejuelos o lentes de contacto para adultos (21 años o más) comprados en una óptica no participante, hasta $75 por año póliza. Es una de las excepciones expresas a la exclusión de proveedores no participantes.',
				`El suplido reclamado, ${service}, está dentro de este beneficio. Beneficio aplicable: ${l.benefit}.`,
				'La póliza permite someter la solicitud hasta un año desde la fecha del servicio.'
			]
		};
	}
	const route = routeById(l.route);
	return {
		basis: `Póliza ${l.planName}.`,
		paragraphs: [
			...(route ? [route.reason] : []),
			...(l.benefit ? [`Beneficio aplicable: ${l.benefit}.`] : [])
		]
	};
}

export type StepsInput = {
	insurer: Insurer;
	received: boolean;
	preauth: string | null;
	conditions: string[];
	deadline: string;
	deadlineDays: number;
};

// In the order the patient does them: requirements, then the provider, then signatures, then mailing.
export function packetSteps(s: StepsInput): string[] {
	const send = (when: string) =>
		`Envíe el formulario, la Explicación de Beneficios${s.received ? ', la carta de solicitud' : ''} y el recibo original ${when}. Guarde una copia.`;
	if (s.received) {
		return [
			...s.conditions,
			s.insurer === 'triple-s'
				? 'Pida a su proveedor que complete y firme la sección E y le dé un recibo original, timbrado y firmado.'
				: 'Pida a su proveedor un recibo original con su NPI, el diagnóstico (ICD-10) y los códigos CPT.',
			s.insurer === 'triple-s' ? 'Firme y feche la sección D del formulario.' : 'Firme y feche la sección 4 del formulario.',
			'Firme la carta de solicitud.',
			send(`antes del ${s.deadline || 'plazo de su plan'}`)
		];
	}
	return [
		...(s.preauth ? [s.preauth] : []),
		...s.conditions,
		`Lleve este paquete a su cita. ${appointmentRequest(s.insurer)}`,
		'Después del servicio, escriba la fecha y lo pagado en el formulario, y fírmelo.',
		send(`dentro de ${deadlineWords(s.deadlineDays)} desde la fecha del servicio`)
	];
}

export function providerRequest(insurer: Insurer): string {
	return insurer === 'triple-s'
		? 'Por favor complete y firme la sección E (Información sobre los servicios) del formulario adjunto, y devuélvamelo junto con un recibo original, timbrado y firmado, que incluya su nombre, dirección, especialidad, licencia y NPI, el diagnóstico (ICD-10), el código de cada servicio y lo pagado.'
		: 'Por favor envíeme un recibo original con su nombre, dirección, teléfono y NPI, el diagnóstico (ICD-10), los códigos CPT de cada servicio y lo pagado, para someter mi reembolso a First Medical.';
}

export type Link = { label: string; href: string };

export const LINKS = {
	miTripleS: { label: 'Entrar a Mi Triple-S', href: 'https://salud.grupotriples.com/mitriples/' },
	salus: { label: 'Ver clínicas Salus', href: 'https://salud.grupotriples.com/clinicas-salus/' },
	directory: {
		'triple-s': { label: 'Directorio de proveedores de Triple-S', href: 'https://salud.grupotriples.com/directorios-de-proveedores/' },
		'first-medical': { label: 'Directorio de proveedores de First Medical', href: 'https://www.firstmedicalpr.com/directorio-de-proveedores/' }
	}
} satisfies Record<string, Link | Record<Insurer, Link>>;

// Points a step or tip at the page where the patient can actually do it.
export function linkFor(text: string, insurer: Insurer): Link | null {
	if (/HRA|Mi Triple-S/.test(text)) return LINKS.miTripleS;
	if (/preventiva|Salus/i.test(text)) return LINKS.salus;
	if (/proveedor de la red|Triple-S Natural|preautoriza|autorización previa|aprobación por escrito/i.test(text)) {
		return LINKS.directory[insurer];
	}
	return null;
}

export function appointmentRequest(insurer: Insurer): string {
	return insurer === 'triple-s'
		? 'En su cita o comunicación con el proveedor, pídale que por favor complete y firme la sección E (Información sobre los servicios) del formulario adjunto, y que le dé un recibo original, timbrado y firmado, con su nombre, dirección, especialidad, licencia y NPI, el diagnóstico (ICD-10), el código de cada servicio y lo pagado.'
		: 'En su cita o comunicación con el proveedor, pídale que por favor le dé un recibo original con su nombre, dirección, teléfono y NPI, el diagnóstico (ICD-10), los códigos CPT de cada servicio y lo pagado.';
}
