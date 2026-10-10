// Plan-specific questions and the justification letter. Sources: docs/triple-s-2027-reembolsos.md, docs/first-medical-2027-reembolsos.md.
import type { Insurer, ServiceId } from './estimate.ts';
import { deadlineWords } from './estimate.ts';
import type { RouteId } from './plans.ts';
import { routeById } from './plans.ts';

// blocksIfNo: a "No" means the claim can't succeed, so the wizard stops instead of only warning.
export type Question = { id: string; text: string; warnIfNo?: string; blocksIfNo?: boolean };

export function questionsFor(insurer: Insurer, route: RouteId): Question[] {
	if (insurer === 'triple-s' && route === 'contigo-fit') {
		return [
			{ id: 'hra', text: '¿Completó la evaluación de salud (HRA) en la app Mi Triple-S?', warnIfNo: 'Contigo Fit requiere la evaluación de salud (HRA). Complétela en la app Mi Triple-S y vuelva para preparar su reembolso.', blocksIfNo: true },
			{ id: 'preventiva', text: '¿Hizo su visita preventiva anual?', warnIfNo: 'Contigo Fit requiere la visita preventiva anual. Hágala en una clínica Salus o Centro Preventivo y vuelva para preparar su reembolso.', blocksIfNo: true },
			{ id: 'licencia', text: '¿Su proveedor está certificado y licenciado?', warnIfNo: 'Contigo Fit solo reembolsa servicios de proveedores certificados y licenciados.', blocksIfNo: true }
		];
	}
	if (insurer === 'triple-s' && route === 'vision') {
		return [{ id: 'adulto', text: '¿La persona que recibió el servicio tiene 21 años o más?', warnIfNo: 'El reembolso de espejuelos de Triple-S es solo para adultos de 21 años o más.', blocksIfNo: true }];
	}
	if (insurer === 'first-medical' && route === 'routine') {
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

export type LetterParts = { request: string; closing: string };

// The request opens the letter and the closing lists attachments; the benefit explanation goes between them.
export function letterParts(l: LetterInput): LetterParts {
	const what = `${l.serviceName.toLowerCase()}${l.date ? ` el ${l.date}` : ''}${l.paid ? `, por lo cual pagué $${l.paid}` : ''}`;
	const closing =
		'Adjunto el formulario de reembolso y el recibo original del proveedor con el diagnóstico (ICD-10), el código de cada servicio y su NPI.';

	if (l.route === 'ambulance') {
		return {
			request: `Solicito el reembolso del beneficio de ambulancia terrestre de mi póliza ${l.planName} (hasta $80 por ${l.insurer === 'triple-s' ? 'caso' : 'viaje'}) por ${what}.`,
			closing:
				'Adjunto el formulario de reembolso, el recibo original de la compañía de ambulancias y el informe médico con el diagnóstico, la razón del traslado y la distancia recorrida.'
		};
	}
	if (l.route === 'cannabis') {
		return {
			request: `Solicito el reembolso del beneficio de cannabis medicinal de mi póliza ${l.planName} (hasta $350 por año contrato) por ${what}, comprado en un dispensario de First Medical Cannabis.`,
			closing: 'Adjunto el formulario de reembolso, el recibo original del dispensario y copia de mi licencia vigente de paciente de cannabis medicinal.'
		};
	}
	if (l.route === 'mi-momento') {
		return { request: `Solicito el reembolso del beneficio Mi Momento de mi póliza ${l.planName} ($200, una sola vez) por ${what}.`, closing };
	}
	if (l.insurer === 'first-medical') {
		return {
			request: `Solicito el reembolso de gastos cubiertos por servicios obtenidos fuera de la red, conforme a la sección "Reembolso de gastos cubiertos por servicios obtenidos fuera de la red" de mi póliza ${l.planName}, por ${what}. El proveedor no acepta el plan.`,
			closing
		};
	}
	if (l.route === 'contigo-fit') {
		return { request: `Solicito el reembolso del beneficio Contigo Fit de mi póliza ${l.planName} ($20 mensuales, hasta 12 meses) por ${what}.`, closing };
	}
	if (l.route === 'vision') {
		return {
			request: `Solicito el reembolso del beneficio de espejuelos o lentes de contacto para adultos de mi póliza ${l.planName} (hasta $75 por año póliza) por ${what}, en una óptica no participante.`,
			closing
		};
	}
	return { request: `Solicito el reembolso por ${what} conforme a mi póliza ${l.planName}.`, closing };
}

export type BenefitExplanation = { basis: string; paragraphs: string[] };

// The "why you are entitled" page that goes with every claim; written for the insurer's reviewer.
export function benefitExplanation(l: LetterInput & { benefit: string; coverage?: string | null }): BenefitExplanation {
	const service = l.serviceName.toLowerCase();
	if (l.route === 'ambulance' && l.insurer === 'first-medical') {
		return {
			basis: 'Póliza First Medical Directo 2027 (FMHP-PD-2027): Servicios Médicos Ambulatorios, "Ambulancia Terrestre".',
			paragraphs: [
				'La póliza cubre, a través de reembolso y hasta $80 por viaje, la ambulancia terrestre hacia o desde un hospital local, una facilidad alterna o un traslado entre instituciones hospitalarias.',
				`El servicio reclamado, ${service}, está dentro de este beneficio. Beneficio aplicable: ${l.benefit}.`,
				'La póliza requiere someter la solicitud dentro de 90 días desde la fecha del servicio, con el recibo original.'
			]
		};
	}
	if (l.route === 'cannabis') {
		return {
			basis:
				'Póliza First Medical Directo 2027 (FMHP-PD-2027): beneficio "Cannabis Medicinal" y sección "Reembolso de gastos cubiertos por cannabis medicinal".',
			paragraphs: [
				'La póliza reembolsa al suscriptor de 21 años o más el gasto en cannabis medicinal comprado en la red de dispensarios de First Medical Cannabis, hasta $350 por año contrato.',
				`El producto reclamado se compró en esa red con la recomendación de un médico registrado. Beneficio aplicable: ${l.benefit}.`,
				'Se anexa copia de la licencia vigente de paciente autorizado emitida por el Departamento de Salud. La solicitud se somete dentro de 90 días desde la compra.'
			]
		};
	}
	if (l.route === 'ambulance') {
		return {
			basis: `Póliza ${l.planName}: beneficio de ambulancia terrestre que no es de emergencia.`,
			paragraphs: [
				'La póliza reembolsa la ambulancia terrestre que no es de emergencia, hasta $80 por caso.',
				`El servicio reclamado, ${service}, está dentro de este beneficio. Beneficio aplicable: ${l.benefit}.`,
				'Se anexa el informe médico con el diagnóstico, la razón del traslado y la distancia recorrida. La póliza permite someter la solicitud hasta un año desde la fecha del servicio.'
			]
		};
	}
	if (l.route === 'mi-momento') {
		return {
			basis: `Póliza ${l.planName}: beneficio Mi Momento.`,
			paragraphs: [
				'El beneficio Mi Momento reembolsa $200, una sola vez, por una consulta de planificación de fertilidad.',
				`El servicio reclamado, ${service}, está dentro de este beneficio. Beneficio aplicable: ${l.benefit}.`,
				'La póliza permite someter la solicitud hasta un año desde la fecha del servicio.'
			]
		};
	}
	if (l.insurer === 'first-medical') {
		return {
			basis:
				'Póliza First Medical Directo 2027 (FMHP-PD-2027): sección "Reembolso de gastos cubiertos por servicios obtenidos fuera de la red" y sección "Ley Núm. 134-2020"; Artículo 48.050 del Código de Seguros de Salud de Puerto Rico.',
			paragraphs: [
				`${l.planName} es un plan de libre selección. La póliza dispone que First Medical reembolsará al suscriptor el 100% de los gastos cubiertos que sean médicamente necesarios, según las tarifas contratadas por su red International Medical Card para un proveedor de una especialidad similar, menos el copago que aplique.`,
				`El servicio o suplido reclamado, ${service}, está cubierto por la póliza${l.coverage ? ` («${l.coverage}»)` : ''}. Beneficio aplicable: ${l.benefit}.`,
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
				'El beneficio Contigo Fit reembolsa $20 mensuales, hasta 12 meses, por gimnasio, entrenador, yoga, acupuntura, masaje terapéutico o reflexología con un proveedor certificado y licenciado.',
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

export type Delivery = 'print' | 'email' | 'before';

export type StepsInput = {
	insurer: Insurer;
	route: RouteId;
	delivery: Delivery;
	preauth: boolean;
	otherCoverage: boolean;
	deadline: string;
	deadlineDays: number;
};

// Only what the patient does with the packet; plan rules are explained before the packet is made.
export function packetSteps(s: StepsInput): string[] {
	const ts = s.insurer === 'triple-s';
	const attach = [
		s.route === 'ambulance' ? 'el recibo de la ambulancia' : s.route === 'cannabis' ? 'el recibo del dispensario' : 'el recibo original',
		...(s.route === 'ambulance' ? ['el informe médico con el diagnóstico y la distancia recorrida'] : []),
		...(s.route === 'cannabis' ? ['copia de su licencia de paciente de cannabis medicinal'] : []),
		...(s.preauth ? ['copia de la autorización previa'] : []),
		...(s.otherCoverage ? ['la Explicación de Beneficios (EOB) de su otro seguro'] : [])
	];
	const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0]);
	const sign = ts ? 'Firme y feche la sección D del formulario y firme la carta.' : 'Firme y feche la sección 4 del formulario y firme la carta.';
	const send = (when: string) => `Envíe el formulario, la carta y ${list(attach)} ${when}. Guarde una copia de todo.`;
	const section = ts ? 'la sección E (Información sobre los servicios)' : 'la Sección 3 (Información del Proveedor)';
	const receipt = ts
		? 'También, pida que su proveedor le dé un recibo original, timbrado y firmado, con su nombre, dirección, especialidad, licencia y NPI, el diagnóstico (ICD-10), el código de cada servicio y lo pagado. Recibos de caja o facturas que solo digan "balance pendiente" no se aceptan.'
		: 'También, pida que su proveedor le dé un recibo original con su nombre, dirección, teléfono y NPI, el diagnóstico (ICD-10), los códigos CPT de cada servicio y lo pagado.';

	if (s.delivery === 'before') {
		return [
			`Lleve este paquete a su cita o entrégueselo a su proveedor y pídale que complete y firme ${section} del formulario. ${receipt}`,
			'Después del servicio, escriba la fecha y lo pagado en el formulario y en la carta.',
			sign,
			send(`dentro de ${deadlineWords(s.deadlineDays)} desde la fecha del servicio`)
		];
	}
	const by = `antes del ${s.deadline || 'plazo de su plan'}`;
	if (s.delivery === 'email') {
		return [
			ts
				? 'Espere a que su proveedor le devuelva el formulario con la sección E completada y firmada y el recibo timbrado y firmado, con su nombre, dirección, especialidad, licencia y NPI, el diagnóstico (ICD-10), el código de cada servicio y lo pagado. Recibos de caja o facturas que solo digan "balance pendiente" no se aceptan.'
				: 'Espere a que su proveedor le devuelva el formulario con la Sección 3 completada y el recibo con su nombre, dirección, teléfono y NPI, el diagnóstico (ICD-10), los códigos CPT de cada servicio y lo pagado.',
			'Imprima el formulario y la carta.',
			sign,
			send(by)
		];
	}
	return [`Lleve el paquete a su proveedor y pídale que complete y firme ${section} del formulario. ${receipt}`, sign, send(by)];
}

export function providerRequest(insurer: Insurer): string {
	return insurer === 'triple-s'
		? 'Por favor complete y firme la sección E (Información sobre los servicios) del formulario adjunto, y devuélvamelo junto con un recibo timbrado y firmado que incluya su nombre, dirección, especialidad, licencia y NPI, el diagnóstico (ICD-10), el código de cada servicio y lo pagado.'
		: 'Por favor complete la Sección 3 (Información del Proveedor) del formulario adjunto y envíeme un recibo con su nombre, dirección, teléfono y NPI, el diagnóstico (ICD-10), los códigos CPT de cada servicio y lo pagado, para someter mi reembolso a First Medical.';
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
		: 'En su cita o comunicación con el proveedor, pídale que por favor complete la Sección 3 (Información del Proveedor) del formulario y le dé un recibo original con su nombre, dirección, teléfono y NPI, el diagnóstico (ICD-10), los códigos CPT de cada servicio y lo pagado.';
}
