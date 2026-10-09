// Plan-specific questions and the justification letter. Sources: docs/triple-s-2027-reembolsos.md, docs/first-medical-2027-reembolsos.md.
import type { Insurer, ServiceId } from './estimate.ts';
import type { RouteId } from './plans.ts';

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
	providerName: string;
	answers: Record<string, boolean>;
};

export function letterParagraphs(l: LetterInput): string[] {
	const what = `${l.serviceName.toLowerCase()}${l.providerName ? ` con ${l.providerName}` : ''}${l.date ? ` el ${l.date}` : ''}${l.paid ? `, por lo cual pagué $${l.paid}` : ''}`;
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
