import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFForm } from 'pdf-lib';
import type { Accident, Patient, Provider, Visit } from '../claim';
import { patientFullName } from '../claim';

export const TRIPLE_S = {
	name: 'Triple-S Salud',
	formRevision: 'SAC_Solicitud_Reembolso_Rev.062909',
	email: 'reembolso@ssspr.com',
	mailTo: ['TRIPLE-S SALUD', 'Departamento de Reembolsos', 'PO BOX 363628', 'SAN JUAN, PR 00936-3628']
} as const;

// Standard fonts only cover WinAnsi; anything else would throw inside pdf-lib.
export const winAnsi = (s: string) =>
	s.normalize('NFC').replace(/[^\x20-\x7E -ÿ–—‘’“”•…€]/g, '');

export function isoToForm(iso: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}

export function to12h(hhmm: string): string {
	const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
	if (!m) return hhmm;
	const h = Number(m[1]);
	return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

// The form pre-prints "Z U" before the contract box.
export const contractSuffix = (contract: string) =>
	contract.trim().toUpperCase().replace(/\s+/g, '').replace(/^ZU/, '');

function setText(form: PDFForm, font: PDFFont, name: string, value: string, maxSize = 9) {
	const t = winAnsi(value);
	if (!t) return;
	const field = form.getTextField(name);
	const width = field.acroField.getWidgets()[0].getRectangle().width - 4;
	let size = maxSize;
	while (size > 5 && font.widthOfTextAtSize(t, size) > width) size -= 0.5;
	field.setText(t);
	field.setFontSize(size);
}

const nonEmptyLines = (visit: Visit) => visit.lines.filter((l) => l.cpt.trim() || l.amountPaid.trim() || l.description.trim());

export async function fillTripleS(
	template: Uint8Array,
	provider: Provider,
	visit: Visit,
	patient: Patient,
	accident: Accident | null = null
): Promise<PDFDocument> {
	const doc = await PDFDocument.load(template);
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const form = doc.getForm();
	const set = (name: string, value: string, maxSize?: number) => setText(form, font, name, value, maxSize);

	set('1 NOMBRE APELLIDO PATERNO APELLIDO MATERNO NOMBRE INICIAL', patientFullName(patient), 11);
	set('2 DIRECCIÓN 1 Use si es diferente a la dirección del asegurado principal', patient.address1);
	set('3 DIRECCIÓN 2', patient.address2);
	set('4 CIUDADPUEBLO', patient.city);
	set('5 ESTADO', patient.state);
	set('6 CÓDIGO POSTAL', patient.zip);
	set('8 NÚMERO DE TELÉFONO PRIMARIO', patient.phone);
	set('10 NÚMERO DE TELÉFONO ALTERNO', patient.altPhone);
	set('11 NÚMERO DE GRUPO Ver Tarjeta del Plan', patient.groupNumber);
	set('12 NOMBRE DEL GRUPO', patient.groupName);

	// The IdNo box only holds the third prefix letter; the rest of the contract runs past it unboxed.
	const suffix = contractSuffix(patient.contractNumber);
	set('IdNo', suffix.slice(0, 1), 12);
	if (suffix.length > 1) {
		doc.getPage(0).drawText(winAnsi(suffix.slice(1)), {
			x: 366,
			y: 673,
			size: 12,
			font,
			color: rgb(0, 0, 0)
		});
	}

	form.getRadioGroup('Group1').select(patient.hasOtherCoverage ? 'SÍ' : 'NO');
	if (patient.hasOtherCoverage) {
		set('16 NOMBRE DE LA OTRA COMPAÑIA DE SEGURO O PLAN MÉDICO', patient.otherPlanName);
		set('18 NÚMERO DE PÓLI ZA', patient.otherPolicyNumber);
		set('19 NÚMERO DE GRUPO', patient.otherGroupNumber);
		set('20 NÚMERO DE TELÉFONO DEL OTRO SEGURO', patient.otherPhone);
		set('21 NÚMERO DE FAX DEL OTRO SEGURO', patient.otherFax);
		set('22 DIRECCIÓN DEL OTRO SEGURO', patient.otherAddress);
	}
	form.getRadioGroup('Group2').select(patient.medicareEligible ? 'Sí' : 'NO');
	if (patient.medicareEligible) {
		// Item 17 (HICN) has no form field, so it is drawn in its box.
		const hicn = winAnsi(patient.medicareId.trim().toUpperCase());
		if (hicn) doc.getPage(0).drawText(hicn, { x: 312, y: 540, size: 10, font, color: rgb(0, 0, 0) });
		const parts = form.getRadioGroup('Group3').getOptions();
		if (patient.medicarePart) form.getRadioGroup('Group3').select(parts[patient.medicarePart === 'A' ? 0 : 1]);
	}
	if (accident?.kind) {
		// Group4 option names are garbled in the PDF; widgets run auto, work, other from left to right.
		const kinds = form.getRadioGroup('Group4').getOptions();
		form.getRadioGroup('Group4').select(kinds[{ auto: 0, trabajo: 1, otro: 2 }[accident.kind]]);
		if (accident.kind === 'otro') set('Describe', accident.description);
		set('AccidentDate', isoToForm(accident.date), 8);
		set('AccidateTime', to12h(accident.time), 7);
		const yesNo = (group: string, v: boolean | null) => {
			if (v === null) return;
			const [no, yes] = form.getRadioGroup(group).getOptions();
			form.getRadioGroup(group).select(v ? yes : no);
		};
		yesNo('Group5', accident.causedByOther);
		yesNo('Group6', accident.otherLiable);
	}

	set('30 NOMBRE DEL PROVEEDOR  SUPLIDOR', provider.name);
	set('NationalProvID', provider.npi);
	if (provider.npi.trim()) form.getRadioGroup('Group7').select('NPI');
	set('32 NÚMERO LICENCIA DEL PROVEEDOR', provider.license);
	const address = form.getTextField('33 DIRECCIÓN PROVEEDOR  SUPLIDOR');
	address.enableMultiline();
	address.setText([provider.address1, provider.address2].map(winAnsi).filter(Boolean).join('\n'));
	address.setFontSize(8);
	set('34 ESPECIALIDAD DEL PROVEEDOR', provider.specialty);
	set('35 NÚMERO DE CUENTARECORD PACIENTE', visit.accountNumber);
	if (provider.name.trim()) form.getRadioGroup('Group8').select('Puerto Rico');
	set('37 NÚMERO TELÉFONO PROVEEDOR', provider.phone);
	set('Diag', visit.diagnosisDescription);
	set(
		'ICD',
		visit.diagnoses
			.filter((d) => d.trim())
			.map((d) => d.toUpperCase())
			.join(', ')
	);
	set('39 NÚMERO DE PREAUTORIZACIÓN DEL PLAN', visit.preauthNumber);

	nonEmptyLines(visit)
		.slice(0, 6)
		.forEach((line, i) => {
			const n = i + 1;
			set(`DESDE MMDDAAAA${n}`, isoToForm(line.dateFrom), 7);
			set(`HASTA MMDDAAAA${n}`, isoToForm(line.dateTo || line.dateFrom), 7);
			set(`LUGAR DE SERVICIO${n}`, line.placeOfService, 8);
			set(`DESCRIPCIÓN DEL SERVICIO${n}`, line.description, 8);
			set(`CÓDIGO DE PROCEDIMIENTO${n}`, line.cpt.toUpperCase(), 8);
			set(`MOD${n}`, line.modifier.toUpperCase(), 8);
			set(`DIAS UNIDADES${n}`, line.units, 8);
			const paid = Number.parseFloat(line.amountPaid);
			if (paid > 0) set(`TOTAL PAGADO${n}`, paid.toFixed(2), 8);
		});

	form.updateFieldAppearances(font);
	// Flattened so every viewer and printer renders the same thing.
	form.flatten();
	return doc;
}
