<script lang="ts">
	import Field from './Field.svelte';
	import { ACCIDENT_KINDS } from '../claim.ts';
	import type { Accident } from '../claim.ts';
	import type { Insurer } from '../estimate.ts';

	// First Medical only asks the kind of accident; Triple-S section C asks items 24 to 28.
	let { accident = $bindable(), insurer }: { accident: Accident; insurer: Insurer } = $props();
	const yesNo = [
		{ v: true, label: 'Sí' },
		{ v: false, label: 'No' }
	];
</script>

<div class="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
	<fieldset>
		<legend class="text-sm font-medium text-slate-700">¿Qué tipo de accidente?<span class="text-rose-600"> *</span></legend>
		<div class="mt-2 flex flex-wrap gap-4 text-sm">
			{#each ACCIDENT_KINDS as k (k.id)}
				<label class="flex items-center gap-2"><input type="radio" bind:group={accident.kind} value={k.id} class="text-teal-700" />{k.label}</label>
			{/each}
		</div>
	</fieldset>
	{#if insurer === 'triple-s'}
		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			{#if accident.kind === 'otro'}
				<Field label="Describa el accidente" bind:value={accident.description} required class="sm:col-span-2" />
			{/if}
			<Field label="Fecha del accidente" type="date" bind:value={accident.date} required />
			<Field label="Hora del accidente" type="time" bind:value={accident.time} />
		</div>
		{#each [{ key: 'causedByOther', q: '¿El accidente fue causado por otra persona?' }, { key: 'otherLiable', q: '¿Esa persona puede ser legalmente responsable?' }] as item (item.key)}
			<fieldset class="mt-4">
				<legend class="text-sm font-medium text-slate-700">{item.q}</legend>
				<div class="mt-2 flex gap-4 text-sm">
					{#each yesNo as o (o.label)}
						<label class="flex items-center gap-2">
							<input
								type="radio"
								name={item.key}
								checked={accident[item.key as 'causedByOther' | 'otherLiable'] === o.v}
								onchange={() => (accident[item.key as 'causedByOther' | 'otherLiable'] = o.v)}
								class="text-teal-700"
							/>{o.label}
						</label>
					{/each}
				</div>
			</fieldset>
		{/each}
	{/if}
</div>
