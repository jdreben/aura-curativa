<script lang="ts">
	import { resolve } from '$app/paths';
	import { INSURERS, SERVICES, claimable, estimate } from '#lib/estimate.ts';
	import type { Insurer, PatientPlanId, ServiceId } from '#lib/estimate.ts';

	let insurer = $state<Insurer | ''>('');
	let plan = $state<PatientPlanId | ''>('');
	const insurerPlans = $derived(INSURERS.find((i) => i.id === insurer)?.plans ?? []);
	let service = $state<ServiceId | ''>('');

	const est = $derived(estimate(plan, service, 0));
	const canClaim = $derived(claimable(est));
	const EXAMPLES: { label: string; insurer: Insurer; plan: PatientPlanId; service: ServiceId }[] = [
		{ label: 'Acupuntura · Triple-S Pocket Plata', insurer: 'triple-s', plan: 'pocket-plata', service: 'acupuntura' },
		{ label: 'Especialista · First Medical Silver', insurer: 'first-medical', plan: 'fm-silver', service: 'especialista' },
		{ label: 'Especialista · Triple-S Directo Plata', insurer: 'triple-s', plan: 'directo-plata', service: 'especialista' }
	];

	function useExample(ex: (typeof EXAMPLES)[number]) {
		insurer = ex.insurer;
		plan = ex.plan;
		service = ex.service;
	}

</script>

<section class="text-center">
	<h1 class="text-3xl font-bold tracking-tight text-teal-900 sm:text-4xl">¿Me reembolsan?</h1>
	<p class="mx-auto mt-3 max-w-2xl text-slate-600">
		Antes de pagarle a un proveedor fuera de la red, sepa cuánto le devuelve su plan, qué le conviene
		más, y cómo reclamarlo.
	</p>
</section>

<div class="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
	<span class="self-center text-xs text-slate-500">Ejemplos:</span>
	{#each EXAMPLES as ex (ex.label)}
		<button
			type="button"
			onclick={() => useExample(ex)}
			class="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50"
		>
			{ex.label}
		</button>
	{/each}
</div>

<div class="mx-auto mt-6 max-w-2xl space-y-6">
	<section class="rounded-xl border border-slate-200 bg-white p-5">
		<h2 class="text-sm font-semibold text-slate-800">1 · Su plan</h2>
		<div class="mt-3 grid gap-4 sm:grid-cols-2">
			<select
				value={insurer}
				onchange={(e) => {
					insurer = e.currentTarget.value as Insurer | '';
					plan = '';
				}}
				aria-label="Aseguradora"
				class="block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-teal-600 focus:ring-teal-600"
			>
				<option value="">— Su aseguradora —</option>
				{#each INSURERS as i (i.id)}<option value={i.id}>{i.name}</option>{/each}
			</select>
			{#if insurer}
				<select
					bind:value={plan}
					aria-label="Su plan"
					class="block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-teal-600 focus:ring-teal-600"
				>
					<option value="">— Su plan —</option>
					{#each insurerPlans as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
				</select>
			{/if}
		</div>
		<p class="mt-2 text-xs text-slate-500">Planes individuales 2027. Pronto: MCS, Plan de Salud Menonita y otros.</p>
	</section>

	<section class="rounded-xl border border-slate-200 bg-white p-5">
		<h2 class="text-sm font-semibold text-slate-800">2 · Su servicio</h2>
		<select
			bind:value={service}
			aria-label="Servicio"
			class="mt-3 block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-teal-600 focus:ring-teal-600"
		>
			<option value="">— ¿Qué servicio? —</option>
			{#each SERVICES as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
		</select>
	</section>

	{#if est}
		{@const tone =
			est.verdict === 'reimbursable'
				? 'border-teal-300 bg-teal-50 text-teal-950'
				: est.verdict === 'not-reimbursable'
					? 'border-rose-200 bg-rose-50 text-rose-950'
					: est.verdict === 'direct'
						? 'border-violet-200 bg-violet-50 text-violet-950'
						: 'border-amber-200 bg-amber-50 text-amber-950'}
		<section class="rounded-xl border p-5 {tone}" aria-live="polite">
			<h2 class="text-sm font-semibold opacity-80">3 · Su respuesta</h2>
			<p class="mt-2 text-xl font-bold">{est.headline}</p>
			<ul class="mt-4 space-y-2 text-sm">
				{#each est.explanation as line (line)}<li>{line}</li>{/each}
			</ul>
			{#if est.alternatives.length > 0}
				<p class="mt-4 text-sm font-semibold">Lo que le conviene:</p>
				<ul class="mt-1 list-disc space-y-1 pl-5 text-sm">
					{#each est.alternatives as alt (alt)}<li>{alt}</li>{/each}
				</ul>
			{/if}
		</section>
	{/if}

	{#if est && canClaim}
		<section class="rounded-xl border border-teal-200 bg-white p-6 text-center">
			<h2 class="text-lg font-semibold text-teal-900">¿Quiere ayuda con el proceso?</h2>
			<p class="mt-1 text-sm text-slate-600">
				Le llenamos el formulario de {est.insurer === 'triple-s' ? 'Triple-S' : 'First Medical'} y se lo preparamos para su proveedor.
			</p>
			<a
				href={`${resolve('/reclamar')}?${new URLSearchParams({ plan, servicio: service })}`}
				class="mt-4 inline-block rounded-xl bg-teal-700 px-8 py-3 font-semibold text-white shadow hover:bg-teal-800"
			>
				¡Empecemos!
			</a>
		</section>
	{/if}

	<p class="text-xs text-slate-500">
		Fuentes: pólizas 2027 de los planes individuales de Triple-S (Directo, Pocket, Uno) y First Medical
		Directo. Son estimados, no una determinación de cubierta.
	</p>
</div>
