<script lang="ts">
	import { page } from '$app/state';
	import { INSURERS, SERVICES, estimate, inNetworkCost } from '#lib/estimate.ts';
	import type { Estimate, Insurer, PatientPlanId, ServiceId } from '#lib/estimate.ts';
	import { METAL_NAMES, PLAN_YEAR, comparables, comparePlan, premiumFor } from '#lib/compare.ts';
	import type { ComparePlan } from '#lib/compare.ts';

	const initial = comparePlan(page.url.searchParams.get('plan') ?? '');
	let insurer = $state<Insurer | ''>(initial?.insurer ?? '');
	let planId = $state<PatientPlanId | ''>(initial?.id ?? '');
	let age = $state(40);

	const insurerPlans = $derived(INSURERS.find((i) => i.id === insurer)?.plans ?? []);
	const selected = $derived(comparePlan(planId));
	const others = $derived(selected ? comparables(selected) : null);
	const columns = $derived<ComparePlan[]>(selected && others ? [selected, ...others.plans] : []);
	const ageValue = $derived(Math.min(99, Math.max(0, Math.round(Number(age) || 0))));
	const premiums = $derived(columns.map((p) => premiumFor(p, ageValue)));
	const cheapest = $derived(Math.min(...premiums.filter((p): p is number => p !== null)));

	const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	const insurerName = (id: Insurer) => INSURERS.find((i) => i.id === id)?.name ?? id;

	type Badge = { label: string; tone: string };
	function badge(e: Estimate): Badge {
		if (e.verdict === 'reimbursable' && e.headline.startsWith('Posiblemente')) return { label: 'Posiblemente', tone: 'bg-amber-100 text-amber-900' };
		if (e.verdict === 'reimbursable') return { label: 'Se reembolsa', tone: 'bg-emerald-100 text-emerald-900' };
		if (e.verdict === 'direct') return { label: 'Pago directo', tone: 'bg-sky-100 text-sky-900' };
		if (e.verdict === 'unknown') return { label: 'Sin verificar', tone: 'bg-slate-100 text-slate-700' };
		return { label: 'No se reembolsa', tone: 'bg-rose-50 text-rose-800' };
	}
	function detail(e: Estimate): string {
		if (e.benefit) return e.benefit;
		if (e.verdict === 'direct') return 'El plan le paga al proveedor; usted paga su copago.';
		// The estimator speaks to a member ("su plan"); here the plan may not be theirs.
		const t = e.headline.replace(/^No: /, '').replace(/^su plan/i, 'este plan');
		return t.charAt(0).toUpperCase() + t.slice(1);
	}

	const COST_ROWS: { label: string; value: (p: ComparePlan) => string }[] = [
		{ label: 'Tipo de red', value: (p) => p.network },
		{ label: 'Deducible', value: (p) => p.deductible },
		{ label: 'Gasto máximo de bolsillo', value: (p) => p.moop },
		{ label: 'Hospitalización (por admisión)', value: (p) => p.hospital },
		{ label: 'Sala de emergencia', value: (p) => p.emergency }
	];

	const cell = (p: ComparePlan, s: ServiceId) => estimate(p.id, s, 0);
</script>

<svelte:head><title>Compare planes {PLAN_YEAR} — Healing Aura</title></svelte:head>

<section class="text-center">
	<h1 class="text-3xl font-bold tracking-tight text-teal-900 sm:text-4xl">Compare planes {PLAN_YEAR}</h1>
	<p class="mx-auto mt-3 max-w-2xl text-slate-600">
		Escoja un plan y vea, al lado de los planes del mismo nivel en otras aseguradoras, cuánto cuesta y qué le
		reembolsan fuera de la red.
	</p>
</section>

<div class="mx-auto mt-6 grid max-w-2xl gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
	<label class="block">
		<span class="text-sm font-medium text-slate-700">Aseguradora</span>
		<select
			value={insurer}
			onchange={(e) => {
				insurer = e.currentTarget.value as Insurer | '';
				planId = '';
			}}
			class="mt-1 block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-teal-600 focus:ring-teal-600"
		>
			<option value="">— Escoja —</option>
			{#each INSURERS as i (i.id)}<option value={i.id}>{i.name}</option>{/each}
		</select>
	</label>
	<label class="block">
		<span class="text-sm font-medium text-slate-700">Plan</span>
		<select
			bind:value={planId}
			disabled={!insurer}
			class="mt-1 block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-teal-600 focus:ring-teal-600 disabled:bg-slate-50"
		>
			<option value="">— Escoja —</option>
			{#each insurerPlans as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
		</select>
	</label>
	<label class="block">
		<span class="text-sm font-medium text-slate-700">Edad: {ageValue <= 20 ? '0–20' : ageValue >= 65 ? '65+' : ageValue}</span>
		<input type="range" min="18" max="70" bind:value={age} class="mt-3 w-full accent-teal-700" aria-label="Edad" />
	</label>
</div>

{#if !selected}
	<p class="mx-auto mt-8 max-w-2xl rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
		Escoja una aseguradora y un plan para ver la comparación.
	</p>
{:else}
	{#if others?.nearest}
		<p class="mx-auto mt-6 max-w-2xl rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
			{insurerName(columns[1]?.insurer ?? selected.insurer)} no vende un plan {METAL_NAMES[selected.metal]} en {PLAN_YEAR}. Lo comparamos con su nivel más cercano: {METAL_NAMES[others.nearest]}.
		</p>
	{/if}

	<div class="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
		<table class="w-full min-w-[640px] border-collapse text-sm">
			<thead>
				<tr>
					<th class="sticky left-0 z-10 w-44 bg-white p-3 text-left align-bottom text-xs font-medium text-slate-500">Plan</th>
					{#each columns as p, i (p.id)}
						<th class="p-3 text-left align-bottom {i === 0 ? 'bg-teal-50' : ''}">
							<span class="block text-xs font-medium text-slate-500">{insurerName(p.insurer)} · {METAL_NAMES[p.metal]}</span>
							<span class="block font-semibold text-slate-900">{p.name.replace(/^(Triple-S|First Medical) /, '')}</span>
							{#if i === 0}<span class="mt-1 inline-block rounded-full bg-teal-700 px-2 py-0.5 text-xs font-medium text-white">Plan seleccionado</span>{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				<tr class="border-t border-slate-200">
					<th class="sticky left-0 z-10 bg-white p-3 text-left align-top font-semibold text-slate-800">
						Prima mensual
						<span class="block text-xs font-normal text-slate-500">Individual, {ageValue <= 20 ? '0–20' : ageValue >= 65 ? '65+' : `${ageValue}`} años, no fumador</span>
					</th>
					{#each columns as p, i (p.id)}
						{@const prem = premiums[i]}
						<td class="p-3 align-top {i === 0 ? 'bg-teal-50' : ''}">
							{#if prem !== null}
								<span class="text-2xl font-bold text-slate-900">{money(prem)}</span>
								<span class="block text-xs text-slate-500">{money(prem * 12)} al año</span>
								{#if prem === cheapest && columns.length > 1}<span class="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">La más baja</span>{/if}
							{:else}
								<span class="text-sm text-slate-500">Aún no publicada para {PLAN_YEAR}</span>
							{/if}
						</td>
					{/each}
				</tr>
				{#each COST_ROWS as row (row.label)}
					<tr class="border-t border-slate-100">
						<th class="sticky left-0 z-10 bg-white p-3 text-left align-top font-medium text-slate-700">{row.label}</th>
						{#each columns as p, i (p.id)}<td class="p-3 align-top text-slate-800 {i === 0 ? 'bg-teal-50' : ''}">{row.value(p)}</td>{/each}
					</tr>
				{/each}
				<tr class="border-t border-slate-200 bg-slate-50">
					<th colspan={columns.length + 1} class="p-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
						Servicios fuera de la red: ¿se reembolsan?
					</th>
				</tr>
				{#each SERVICES as s (s.id)}
					<tr class="border-t border-slate-100">
						<th class="sticky left-0 z-10 bg-white p-3 text-left align-top font-medium text-slate-700">{s.name}</th>
						{#each columns as p, i (p.id)}
							{@const e = cell(p, s.id)}
							{@const inNet = inNetworkCost(p.id, s.id)}
							<td class="p-3 align-top {i === 0 ? 'bg-teal-50' : ''}">
								{#if e}
									{@const b = badge(e)}
									<span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium {b.tone}">{b.label}</span>
									<span class="mt-1 block text-slate-800">{detail(e)}</span>
								{/if}
								{#if inNet}<span class="mt-1 block text-xs text-slate-500">En la red: {inNet}</span>{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="mt-6 text-xs text-slate-500">
		<p>
			Fuentes {PLAN_YEAR}:
			{#each columns as p, i (p.id)}
				{#each p.sources as src (src.href + src.label)}
					<a href={src.href} target="_blank" rel="noopener" class="underline">{p.name.replace(/^(Triple-S|First Medical) /, '')}: {src.label}</a>{' '}
				{/each}{i < columns.length - 1 ? '· ' : ''}
			{/each}
		</p>
		<p class="mt-2">
			"Se reembolsa" quiere decir que la póliza le devuelve parte de lo que pagó a un proveedor fuera de la red. Las
			cantidades son de las pólizas {PLAN_YEAR}; no son una determinación de cubierta.
		</p>
	</div>
{/if}
