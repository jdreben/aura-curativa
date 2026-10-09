<script lang="ts">
	import Field from './Field.svelte';
	import OtherCoverageFields from './OtherCoverageFields.svelte';
	import type { Insurer } from '../estimate.ts';
	import type { Patient } from '../claim.ts';
	import { PLANS } from '../plans.ts';

	let {
		patient = $bindable(),
		showPlan = true,
		insurer = 'triple-s'
	}: { patient: Patient; showPlan?: boolean; insurer?: Insurer } = $props();
</script>

<div class="grid gap-4 sm:grid-cols-4">
	{#if showPlan}<label class="block sm:col-span-2">
		<span class="text-sm font-medium text-slate-700">Plan<span class="text-rose-600"> *</span></span>
		<select
			bind:value={patient.plan}
			class="mt-1 block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-teal-600 focus:ring-teal-600"
		>
			<option value="">— Seleccione el plan —</option>
			{#each PLANS as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
		</select>
	</label>{/if}
	<Field label="Nombre" bind:value={patient.firstName} required />
	<Field label="Inicial" bind:value={patient.middleInitial} />
	<Field label="Apellido paterno" bind:value={patient.lastNamePaternal} required />
	<Field label="Apellido materno" bind:value={patient.lastNameMaternal} />
	<Field
		label="Número de contrato"
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
<OtherCoverageFields bind:patient {insurer} />
