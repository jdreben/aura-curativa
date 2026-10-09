<script lang="ts">
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import PatientFields from '#lib/components/PatientFields.svelte';
	import Problems from '#lib/components/Problems.svelte';
	import { emptyPatient, emptyProvider, emptyVisit, patientProblems } from '#lib/claim.ts';
	import type { ServiceLine } from '#lib/claim.ts';
	import { CLAIM_RULES, PATIENT_PLANS, SERVICES, claimable, deadlineFrom, estimate } from '#lib/estimate.ts';
	import type { PatientPlanId, ServiceId } from '#lib/estimate.ts';
	import { packetObjectUrl } from '#lib/pdf/browser.ts';
	import { TRIPLE_S } from '#lib/pdf/triple-s.ts';
	import type { PlanId } from '#lib/plans.ts';

	const today = () => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	};

	let plan = $state<PatientPlanId | ''>('');
	let service = $state<ServiceId | ''>('');
	let paid = $state('');
	let date = $state(today());
	let patient = $state(emptyPatient());
	let attempted = $state(false);
	let packet = $state<
		| { status: 'idle' }
		| { status: 'loading' }
		| { status: 'error'; message: string }
		| { status: 'ready'; url: string }
	>({ status: 'idle' });

	const est = $derived(estimate(plan, service, Number.parseFloat(paid)));
	const canClaim = $derived(claimable(est));
	const formPlan = $derived<PlanId>(
		plan === '' || plan === 'ts-empleador' || plan === 'otro' || plan.startsWith('fm-') ? 'otro' : (plan as PlanId)
	);
	const problems = $derived([
		...patientProblems({ ...patient, plan: formPlan }),
		...(Number.parseFloat(paid) > 0 ? [] : ['Indique cuánto pagó.']),
		...(date ? [] : ['Indique la fecha del servicio.'])
	]);
	const serviceName = $derived(SERVICES.find((s) => s.id === service)?.name ?? '');
	const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

	function resetPacket() {
		if (packet.status === 'ready') URL.revokeObjectURL(packet.url);
		packet = { status: 'idle' };
	}

	async function prepare() {
		attempted = true;
		if (problems.length > 0 || !est?.route) return;
		resetPacket();
		packet = { status: 'loading' };
		try {
			const line: ServiceLine = {
				dateFrom: date,
				dateTo: date,
				placeOfService: '11',
				description: serviceName,
				cpt: '',
				modifier: '',
				units: '1',
				amountPaid: Number.parseFloat(paid).toFixed(2)
			};
			const url = await packetObjectUrl(
				{
					v: 2,
					provider: emptyProvider(),
					visit: { ...emptyVisit(), route: est.route, lines: [line] },
					patient: { ...$state.snapshot(patient), plan: formPlan }
				},
				{ receipt: false, expected: est.headline }
			);
			packet = { status: 'ready', url };
		} catch (e) {
			packet = { status: 'error', message: e instanceof Error ? e.message : String(e) };
		}
	}

	onDestroy(resetPacket);
</script>

<section class="text-center">
	<h1 class="text-3xl font-bold tracking-tight text-teal-900 sm:text-4xl">¿Me reembolsan?</h1>
	<p class="mx-auto mt-3 max-w-2xl text-slate-600">
		Antes de pagarle a un proveedor fuera de la red, sepa cuánto le devuelve su plan, qué le conviene
		más, y cómo reclamarlo.
	</p>
</section>

<div class="mx-auto mt-8 max-w-2xl space-y-6">
	<section class="rounded-xl border border-slate-200 bg-white p-5">
		<h2 class="text-sm font-semibold text-slate-800">1 · Su plan</h2>
		<select
			bind:value={plan}
			aria-label="Su plan"
			class="mt-3 block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-teal-600 focus:ring-teal-600"
		>
			<option value="">— Seleccione su plan —</option>
			{#each PATIENT_PLANS as g (g.group)}
				<optgroup label={g.group}>
					{#each g.plans as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
				</optgroup>
			{/each}
		</select>
	</section>

	<section class="rounded-xl border border-slate-200 bg-white p-5">
		<h2 class="text-sm font-semibold text-slate-800">2 · Su servicio</h2>
		<div class="mt-3 grid gap-4 sm:grid-cols-3">
			<select
				bind:value={service}
				aria-label="Servicio"
				class="block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-teal-600 focus:ring-teal-600 sm:col-span-2"
			>
				<option value="">— ¿Qué servicio? —</option>
				{#each SERVICES as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
			</select>
			<label class="relative block">
				<span class="pointer-events-none absolute top-2 left-3 text-sm text-slate-500">$</span>
				<input
					bind:value={paid}
					inputmode="decimal"
					placeholder="Cuánto paga"
					aria-label="Cuánto paga"
					class="block w-full rounded-lg border-slate-300 pl-7 text-sm shadow-sm focus:border-teal-600 focus:ring-teal-600"
				/>
			</label>
		</div>
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
			{#if est.back !== null && Number.parseFloat(paid) > 0}
				<div class="mt-4 grid grid-cols-2 gap-3">
					<div class="rounded-lg bg-white p-3">
						<p class="text-xs text-slate-500">Le devuelven (aprox.)</p>
						<p class="text-2xl font-bold text-teal-800">{usd(est.back)}</p>
					</div>
					<div class="rounded-lg bg-white p-3">
						<p class="text-xs text-slate-500">Usted paga</p>
						<p class="text-2xl font-bold text-slate-900">{usd(est.owe ?? 0)}</p>
					</div>
				</div>
			{/if}
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

	{#if est && canClaim && est.insurer}
		{@const rules = CLAIM_RULES[est.insurer]}
		<section class="rounded-xl border border-slate-200 bg-white p-5">
			<h2 class="text-sm font-semibold text-slate-800">4 · Cómo reclamarlo</h2>
			<label class="mt-3 block w-48">
				<span class="text-sm font-medium text-slate-700">Fecha del servicio</span>
				<input
					type="date"
					bind:value={date}
					class="mt-1 block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-teal-600 focus:ring-teal-600"
				/>
			</label>
			<ol class="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
				{#each est.conditions as c (c)}<li>{c}</li>{/each}
				<li>
					Pídale a su proveedor un <strong>recibo original, timbrado y firmado</strong> con su nombre,
					dirección, especialidad, licencia y NPI, el diagnóstico (ICD-10), el código (CPT) de cada servicio y
					lo que usted pagó. Recibos de caja o de "balance pendiente" no se aceptan.
				</li>
				{#if est.insurer === 'triple-s'}
					<li>Pídale que complete y firme la sección E del formulario que preparamos abajo.</li>
				{:else if rules.form}
					<li>
						Llene la
						<a href={rules.form} target="_blank" rel="noopener" class="font-medium text-teal-700 underline">Solicitud de Reembolso de First Medical</a>
						y marque "Proveedor no acepta el plan".
					</li>
				{/if}
				<li>Envíelo a {rules.send}</li>
				<li>
					<strong>Fecha límite: {deadlineFrom(date, rules.deadlineDays) || `${rules.deadlineDays} días después del servicio`}</strong>
					({rules.deadlineDays === 365 ? 'un año' : `${rules.deadlineDays} días`} desde el servicio).
				</li>
			</ol>

			{#if est.insurer === 'triple-s'}
			<form
				class="mt-6 space-y-4 border-t border-slate-100 pt-5"
				onsubmit={(e) => {
					e.preventDefault();
					prepare();
				}}
			>
				<p class="text-sm font-semibold text-slate-800">Prepare su formulario</p>
				<PatientFields bind:patient showPlan={false} />
				{#if attempted}<Problems {problems} />{/if}
				{#if packet.status === 'ready'}
					<div class="flex flex-col gap-2 sm:flex-row">
						<a
							href={packet.url}
							download="reembolso-triple-s.pdf"
							class="rounded-lg bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800"
						>
							Descargar formulario
						</a>
						<a
							href={packet.url}
							target="_blank"
							rel="noopener"
							class="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm hover:bg-slate-50"
						>
							Ver / imprimir
						</a>
					</div>
				{:else}
					<button
						type="submit"
						disabled={packet.status === 'loading'}
						class="w-full rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white shadow hover:bg-teal-800 disabled:opacity-60"
					>
						{packet.status === 'loading' ? 'Preparando…' : 'Preparar mi formulario'}
					</button>
				{/if}
				{#if packet.status === 'error'}
					<p class="text-sm text-rose-700" role="alert">
						No se pudo preparar el formulario: {packet.message}. Intente de nuevo.
					</p>
				{/if}
			</form>
			{/if}

			<p class="mt-5 text-sm text-slate-600">
				¿Su proveedor prefiere prepararlo por usted? Compártale
				<a href={resolve('/proveedor')} class="font-medium text-teal-700 underline">la versión para proveedores</a>.
			</p>
		</section>
	{/if}

	<p class="text-xs text-slate-500">
		Fuentes: pólizas 2027 de Triple-S (Directo, Pocket, Uno) y First Medical Directo, y el estimado de
		servicios fuera de la red que Triple-S publica bajo la Ley 134-2020. Son estimados, no una
		determinación de cubierta.
	</p>
</div>
