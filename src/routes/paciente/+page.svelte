<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import type { ClaimPayload } from '#lib/claim.ts';
	import { acceptanceCode, decodePayload, lineTotal, money, patientFullName } from '#lib/claim.ts';
	import { packetObjectUrl } from '#lib/pdf/browser.ts';
	import { TRIPLE_S, isoToForm } from '#lib/pdf/triple-s.ts';

	let claim = $state<
		| { status: 'loading' }
		| { status: 'missing' }
		| { status: 'error'; message: string }
		| { status: 'ready'; payload: ClaimPayload; code: string }
	>({ status: 'loading' });
	let certified = $state(false);
	let accepted = $state(false);
	let reportingIssue = $state(false);
	let preview = $state<
		| { status: 'idle' }
		| { status: 'loading' }
		| { status: 'error'; message: string }
		| { status: 'ready'; url: string }
	>({ status: 'idle' });

	async function readHash() {
		const encoded = location.hash.slice(1);
		accepted = false;
		certified = false;
		if (!encoded) {
			claim = { status: 'missing' };
			return;
		}
		claim = { status: 'loading' };
		try {
			const payload = await decodePayload(encoded);
			claim = { status: 'ready', payload, code: await acceptanceCode(encoded) };
		} catch (e) {
			claim = { status: 'error', message: e instanceof Error ? e.message : String(e) };
		}
	}

	onMount(() => {
		readHash();
		window.addEventListener('hashchange', readHash);
		return () => {
			window.removeEventListener('hashchange', readHash);
			if (preview.status === 'ready') URL.revokeObjectURL(preview.url);
		};
	});

	async function openPreview(payload: ClaimPayload) {
		preview = { status: 'loading' };
		try {
			preview = { status: 'ready', url: await packetObjectUrl(payload) };
		} catch (e) {
			preview = { status: 'error', message: e instanceof Error ? e.message : String(e) };
		}
	}
</script>

<h1 class="text-2xl font-bold text-teal-900">Revise su reclamación</h1>

{#if claim.status === 'loading'}
	<div class="mt-6 animate-pulse rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
		Leyendo su reclamación…
	</div>
{:else if claim.status === 'missing'}
	<div class="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
		<p class="font-semibold">Escanee el código QR que le muestra su proveedor.</p>
		<p class="mt-2">
			Su proveedor prepara la reclamación desde
			<a href={resolve('/proveedor')} class="font-medium text-teal-700 underline">la página de proveedor</a>.
			Usted solo la revisa y la acepta.
		</p>
	</div>
{:else if claim.status === 'error'}
	<div class="mt-6 rounded-xl border border-rose-300 bg-rose-50 p-6 text-sm text-rose-900" role="alert">
		<p class="font-semibold">No pudimos leer este enlace.</p>
		<p class="mt-1">{claim.message}. Pídale a su proveedor que genere un código nuevo.</p>
	</div>
{:else}
	{@const { provider, visit, patient } = claim.payload}
	{@const payload = claim.payload}
	{@const code = claim.code}
	{@const lines = visit.lines.filter((l) => l.cpt.trim() || l.amountPaid.trim())}

	{#if accepted}
		<section class="mt-6 rounded-xl border border-teal-300 bg-white p-8 text-center">
			<p class="text-sm font-semibold tracking-wide text-teal-700 uppercase">Aceptado</p>
			<p class="mt-2 text-slate-700">Muéstrele este código a su proveedor:</p>
			<p class="mt-4 font-mono text-6xl font-bold tracking-[0.3em] text-teal-900" aria-label="Código de aceptación">
				{code}
			</p>
			<p class="mt-6 text-sm text-slate-600">
				Su proveedor imprimirá el paquete. Usted firma la sección D, y su proveedor firma y sella.
				Luego se envía por correo a {TRIPLE_S.name}.
			</p>
		</section>
	{:else}
		<p class="mt-1 text-sm text-slate-600">
			{provider.name} preparó esta solicitud de reembolso a {TRIPLE_S.name}. Verifique que todo esté
			correcto.
		</p>

		<section class="mt-6 rounded-xl border border-slate-200 bg-white p-5">
			<p class="text-xs font-semibold tracking-wide text-teal-700 uppercase">Sus datos</p>
			<dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
				<dt class="text-slate-500">Nombre</dt>
				<dd>{patientFullName(patient)}</dd>
				<dt class="text-slate-500">Contrato</dt>
				<dd class="font-mono">{patient.contractNumber}</dd>
				{#if patient.groupNumber || patient.groupName}
					<dt class="text-slate-500">Grupo</dt>
					<dd>{[patient.groupNumber, patient.groupName].filter(Boolean).join(' · ')}</dd>
				{/if}
				<dt class="text-slate-500">Dirección</dt>
				<dd>
					{patient.address1}{#if patient.address2}, {patient.address2}{/if}<br />
					{patient.city}, {patient.state} {patient.zip}
				</dd>
				<dt class="text-slate-500">Teléfono</dt>
				<dd>{patient.phone}</dd>
				<dt class="text-slate-500">Otro seguro</dt>
				<dd>{patient.hasOtherCoverage ? 'Sí' : 'No'}</dd>
				<dt class="text-slate-500">Medicare</dt>
				<dd>{patient.medicareEligible ? 'Elegible' : 'No'}</dd>
			</dl>
		</section>

		<section class="mt-4 rounded-xl border border-slate-200 bg-white p-5">
			<p class="text-xs font-semibold tracking-wide text-teal-700 uppercase">Su visita</p>
			<p class="mt-2 font-semibold">{provider.name}</p>
			<p class="text-sm text-slate-600">{provider.specialty} · NPI {provider.npi}</p>
			<p class="mt-2 text-sm">
				<span class="text-slate-500">Diagnóstico:</span>
				{visit.diagnosisDescription || visit.diagnoses.join(', ')}
			</p>
			{#if lines.length === 0}
				<p class="mt-3 text-sm text-amber-800">
					Esta reclamación no incluye servicios. Pídale a su proveedor que genere un código nuevo.
				</p>
			{:else}
				<ul class="mt-3 divide-y divide-slate-100 text-sm">
					{#each lines as l, i (i)}
						<li class="flex justify-between gap-4 py-2">
							<span>
								{l.description}
								<span class="block text-xs text-slate-500">{isoToForm(l.dateFrom)} · {l.cpt}</span>
							</span>
							<span class="shrink-0">{money(Number.parseFloat(l.amountPaid) || 0)}</span>
						</li>
					{/each}
				</ul>
				<p class="mt-2 text-right text-sm">
					Total pagado: <span class="font-semibold">{money(lineTotal(lines))}</span>
				</p>
			{/if}
		</section>

		<div class="mt-4">
			{#if preview.status === 'ready'}
				<a
					href={preview.url}
					target="_blank"
					rel="noopener"
					class="text-sm font-medium text-teal-700 underline"
				>
					Abrir el formulario lleno (PDF)
				</a>
			{:else}
				<button
					type="button"
					onclick={() => openPreview(payload)}
					disabled={preview.status === 'loading'}
					class="text-sm font-medium text-teal-700 underline disabled:opacity-60"
				>
					{preview.status === 'loading' ? 'Preparando el formulario…' : 'Ver el formulario lleno (PDF)'}
				</button>
				{#if preview.status === 'error'}
					<p class="mt-1 text-sm text-rose-700" role="alert">
						No se pudo preparar el formulario: {preview.message}
					</p>
				{/if}
			{/if}
		</div>

		<section class="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-5">
			<label class="flex items-start gap-3 text-sm text-slate-800">
				<input type="checkbox" bind:checked={certified} class="mt-0.5 rounded text-teal-700" />
				<span>
					Certifico que la información es correcta y completa y que reclamo beneficios solo por los
					cargos incurridos por mí. Autorizo a mi proveedor a divulgar a {TRIPLE_S.name} la información
					necesaria para procesar esta reclamación.
				</span>
			</label>
			<button
				type="button"
				disabled={!certified}
				onclick={() => (accepted = true)}
				class="mt-4 w-full rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white shadow hover:bg-teal-800 disabled:opacity-50"
			>
				Acepto
			</button>
			<button
				type="button"
				onclick={() => (reportingIssue = !reportingIssue)}
				class="mt-3 w-full text-sm text-slate-600 underline"
			>
				Algo no está correcto
			</button>
			{#if reportingIssue}
				<p class="mt-2 rounded-lg bg-white p-3 text-sm text-slate-700">
					Dígale a su proveedor qué corregir. Su proveedor actualizará la información y le mostrará un código
					nuevo.
				</p>
			{/if}
		</section>
	{/if}
{/if}
