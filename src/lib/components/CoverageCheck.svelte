<script lang="ts">
	import type { Assessment, RouteId } from '../plans.ts';

	let { assessment, onpick }: { assessment: Assessment; onpick: (route: RouteId) => void } = $props();
</script>

{#if assessment.status === 'incomplete'}
	<p class="text-sm text-slate-500">Escoja el plan del paciente y la razón para ver si es reembolsable.</p>
{:else if assessment.status === 'not-covered'}
	<div class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950" role="status">
		<p class="font-semibold">Este plan no reembolsa visitas regulares con proveedores no participantes.</p>
		<p class="mt-1">Lo que sí puede hacer el paciente:</p>
		<ul class="mt-3 space-y-2">
			{#each assessment.alternatives as alt (alt.text)}
				<li class="flex items-start justify-between gap-3 rounded-md bg-white p-3">
					<span>{alt.text}</span>
					{#if alt.route}
						{@const route = alt.route}
						<button
							type="button"
							onclick={() => onpick(route)}
							class="shrink-0 rounded-md border border-teal-700 px-3 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50"
						>
							Usar esta ruta
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{:else}
	{@const ok = assessment.status === 'covered'}
	<div
		class="rounded-lg border p-4 text-sm {ok
			? 'border-teal-200 bg-teal-50 text-teal-950'
			: 'border-amber-200 bg-amber-50 text-amber-950'}"
		role="status"
	>
		<p class="font-semibold">
			{#if assessment.status === 'covered'}Reembolsable
			{:else if assessment.status === 'unconfirmed'}Posiblemente reembolsable
			{:else}Plan no verificado{/if}
			{#if assessment.route.amount}· {assessment.route.amount}{/if}
		</p>
		{#if assessment.route.conditions.length > 0}
			<ul class="mt-2 list-disc space-y-1 pl-5">
				{#each assessment.route.conditions as c (c)}<li>{c}</li>{/each}
			</ul>
		{/if}
	</div>
{/if}
{#if assessment.status !== 'incomplete' && assessment.notes.length > 0}
	<ul class="mt-3 space-y-1 text-sm text-amber-900">
		{#each assessment.notes as n (n)}<li>⚠ {n}</li>{/each}
	</ul>
{/if}
