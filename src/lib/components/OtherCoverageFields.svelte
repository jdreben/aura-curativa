<script lang="ts">
	import Field from './Field.svelte';
	import type { Patient } from '../claim.ts';
	import type { Insurer } from '../estimate.ts';

	// Shows only what the insurer's reimbursement form asks about the other plan.
	let { patient = $bindable(), insurer }: { patient: Patient; insurer: Insurer } = $props();
</script>

<label class="mt-4 flex items-center gap-2 text-sm">
	<input type="checkbox" bind:checked={patient.hasOtherCoverage} class="rounded text-teal-700" />
	Tengo otro seguro médico
</label>
{#if patient.hasOtherCoverage}
<div class="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
	<p class="text-sm font-semibold text-slate-800">Su otro seguro</p>
	<div class="mt-3 grid gap-4 sm:grid-cols-2">
		<Field label="Nombre del otro plan médico" bind:value={patient.otherPlanName} required class="sm:col-span-2" />
		<Field
			label={insurer === 'triple-s' ? 'Número de póliza' : 'Número de contrato'}
			bind:value={patient.otherPolicyNumber}
			required
		/>
		{#if insurer === 'triple-s'}
			<Field label="Número de grupo" bind:value={patient.otherGroupNumber} />
			<Field label="Teléfono del otro seguro" bind:value={patient.otherPhone} type="tel" />
			<Field label="Fax del otro seguro" bind:value={patient.otherFax} type="tel" />
			<Field label="Dirección del otro seguro" bind:value={patient.otherAddress} class="sm:col-span-2" />
		{/if}
	</div>
	<p class="mt-3 text-sm text-slate-600">Anexe la Explicación de Beneficios (EOB) del otro seguro para este servicio.</p>
</div>
{/if}

{#if insurer === 'triple-s'}
	<label class="mt-4 flex items-center gap-2 text-sm">
		<input type="checkbox" bind:checked={patient.medicareEligible} class="rounded text-teal-700" />
		Soy elegible a Medicare
	</label>
	{#if patient.medicareEligible}
		<div class="mt-3 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
			<Field label="Número de Medicare (HICN o MBI)" bind:value={patient.medicareId} required />
			<fieldset>
				<legend class="text-sm font-medium text-slate-700">Parte</legend>
				<div class="mt-2 flex gap-4 text-sm">
					<label class="flex items-center gap-2"><input type="radio" bind:group={patient.medicarePart} value="A" class="text-teal-700" />Parte A</label>
					<label class="flex items-center gap-2"><input type="radio" bind:group={patient.medicarePart} value="B" class="text-teal-700" />Parte B</label>
				</div>
			</fieldset>
		</div>
	{/if}
{/if}
