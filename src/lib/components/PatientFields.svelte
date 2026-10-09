<script lang="ts">
	import Field from './Field.svelte';
	import type { Patient } from '../claim.ts';

	let { patient = $bindable() }: { patient: Patient } = $props();
</script>

<div class="grid gap-4 sm:grid-cols-4">
	<Field label="Nombre" bind:value={patient.firstName} required />
	<Field label="Inicial" bind:value={patient.middleInitial} />
	<Field label="Apellido paterno" bind:value={patient.lastNamePaternal} required />
	<Field label="Apellido materno" bind:value={patient.lastNameMaternal} />
	<Field
		label="Contrato Triple-S"
		bind:value={patient.contractNumber}
		required
		placeholder="ZUA123456789"
		class="sm:col-span-2"
	/>
	<Field label="Número de grupo" bind:value={patient.groupNumber} />
	<Field label="Nombre del grupo" bind:value={patient.groupName} />
	<Field label="Dirección postal" bind:value={patient.address1} required class="sm:col-span-2" />
	<Field label="Dirección 2" bind:value={patient.address2} class="sm:col-span-2" />
	<Field label="Ciudad / pueblo" bind:value={patient.city} required />
	<Field label="Estado" bind:value={patient.state} />
	<Field label="Código postal" bind:value={patient.zip} required inputmode="numeric" />
	<Field label="Teléfono" bind:value={patient.phone} type="tel" required />
</div>
<div class="mt-4 flex flex-wrap gap-6 text-sm">
	<label class="flex items-center gap-2">
		<input type="checkbox" bind:checked={patient.hasOtherCoverage} class="rounded text-teal-700" />
		Tiene otro seguro médico
	</label>
	<label class="flex items-center gap-2">
		<input type="checkbox" bind:checked={patient.medicareEligible} class="rounded text-teal-700" />
		Elegible a Medicare
	</label>
</div>
{#if patient.hasOtherCoverage}
	<p class="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
		Incluya la Explicación de Beneficios (EOB) del otro seguro y complete la sección B a mano.
	</p>
{/if}
