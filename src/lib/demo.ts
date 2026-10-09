import type { Patient, Provider, Visit } from './claim';

// Synthetic only. NPI passes the check digit but is not a registered provider.
export const demoProvider = (): Provider => ({
	name: 'Dra. Isabel Rivera Colón, MD',
	npi: '1234567893',
	ein: '66-0000000',
	license: 'PR-12345',
	specialty: 'Medicina Funcional / Medicina Interna',
	address1: 'Calle Loíza 1500, Suite 2',
	address2: 'San Juan, PR 00911',
	phone: '(787) 555-0142'
});

export const demoVisit = (): Visit => {
	const d = new Date();
	const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	return {
		diagnoses: ['E55.9', 'R53.83'],
		diagnosisDescription: 'Deficiencia de vitamina D; fatiga',
		preauthNumber: '',
		accountNumber: 'HA-0042',
		lines: [
			{
				dateFrom: today,
				dateTo: today,
				placeOfService: '11',
				description: 'Visita de oficina, paciente nuevo (60 min)',
				cpt: '99205',
				modifier: '',
				units: '1',
				amountPaid: '250.00'
			},
			{
				dateFrom: today,
				dateTo: today,
				placeOfService: '11',
				description: 'Venipuntura',
				cpt: '36415',
				modifier: '',
				units: '1',
				amountPaid: '15.00'
			}
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
			medicareEligible: false
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
			medicareEligible: false
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
			medicareEligible: false
		}
	}
];
