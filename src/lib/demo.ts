import type { Patient, Provider, Visit } from './claim';

// Synthetic only. NPI passes the check digit but is not a registered provider.
export const demoProvider = (): Provider => ({
	name: 'Dra. Isabel Rivera Colón, MD',
	npi: '1234567893',
	ein: '66-0000000',
	license: 'PR-12345',
	specialty: 'Medicina Integrativa / Acupuntura',
	address1: 'Calle Loíza 1500, Suite 2',
	address2: 'San Juan, PR 00911',
	phone: '(787) 555-0142'
});

export const demoVisit = (): Visit => {
	const d = new Date();
	const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	const line = (cpt: string, description: string, amountPaid: string) => ({
		dateFrom: today,
		dateTo: today,
		placeOfService: '11',
		description,
		cpt,
		modifier: '',
		units: '1',
		amountPaid
	});
	return {
		diagnoses: ['M54.50'],
		diagnosisDescription: 'Dolor lumbar',
		preauthNumber: '',
		accountNumber: 'HA-0042',
		route: 'contigo-fit',
		lines: [
			line('97810', 'Acupuntura, 15 min iniciales', '70.00'),
			line('97811', 'Acupuntura, 15 min adicionales', '35.00')
		]
	};
};

export type IntakeRecord = { id: string; label: string; patient: Patient };

// Simulated practice records: stands in for the intake data a real EHR/practice system already holds.
export const demoPatients = (): IntakeRecord[] => [
	{
		id: 'HA-0042',
		label: 'Carmen L. Ortiz Santiago',
		patient: {
			lastNamePaternal: 'Ortiz',
			lastNameMaternal: 'Santiago',
			firstName: 'Carmen',
			middleInitial: 'L',
			address1: 'Urb. Villa Prades, Calle 3 #45',
			address2: '',
			city: 'San Juan',
			state: 'PR',
			zip: '00924',
			contractNumber: 'ZUA123456789',
			phone: '(787) 555-0199',
			altPhone: '',
			groupNumber: '0001234',
			groupName: 'Empresa Ejemplo, Inc.',
			hasOtherCoverage: false,
			otherPlanName: '',
			otherPolicyNumber: '',
			otherGroupNumber: '',
			otherPhone: '',
			otherFax: '',
			otherAddress: '',
			medicareEligible: false,
			medicareId: '',
			medicarePart: '',
			plan: 'pocket-plata',
			dob: '1986-03-14'
		}
	},
	{
		id: 'HA-0057',
		label: 'José A. Rivera Medina',
		patient: {
			lastNamePaternal: 'Rivera',
			lastNameMaternal: 'Medina',
			firstName: 'José',
			middleInitial: 'A',
			address1: 'Calle Ponce de León 210, Apt 4B',
			address2: '',
			city: 'Ponce',
			state: 'PR',
			zip: '00730',
			contractNumber: 'ZUB987654321',
			phone: '(787) 555-0123',
			altPhone: '(939) 555-0177',
			groupNumber: '0005678',
			groupName: 'Cooperativa Ejemplo',
			hasOtherCoverage: false,
			otherPlanName: '',
			otherPolicyNumber: '',
			otherGroupNumber: '',
			otherPhone: '',
			otherFax: '',
			otherAddress: '',
			medicareEligible: false,
			medicareId: '',
			medicarePart: '',
			plan: 'directo-plata',
			dob: '1979-11-02'
		}
	},
	{
		id: 'HA-0063',
		label: 'Ana M. Torres Vélez',
		patient: {
			lastNamePaternal: 'Torres',
			lastNameMaternal: 'Vélez',
			firstName: 'Ana',
			middleInitial: 'M',
			address1: 'Bo. Mameyes, Carr. 191 Km 2.1',
			address2: '',
			city: 'Río Grande',
			state: 'PR',
			zip: '00745',
			contractNumber: 'ZUA555000111',
			phone: '(787) 555-0150',
			altPhone: '',
			groupNumber: '0009012',
			groupName: 'Municipio Ejemplo',
			hasOtherCoverage: true,
			otherPlanName: 'MCS Classicare',
			otherPolicyNumber: 'MCS778899001',
			otherGroupNumber: '4455',
			otherPhone: '(787) 555-0300',
			otherFax: '',
			otherAddress: 'PO Box 9023547, San Juan, PR 00902',
			medicareEligible: false,
			medicareId: '',
			medicarePart: '',
			plan: 'otro',
			dob: '1991-07-25'
		}
	}
];
