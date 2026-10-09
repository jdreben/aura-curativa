<script lang="ts">
	import { onMount } from 'svelte';
	import { asset, resolve } from '$app/paths';
	import Field from '#lib/components/Field.svelte';
	import Problems from '#lib/components/Problems.svelte';
	import type { ProviderPayload } from '#lib/claim.ts';
	import { decodePayload, emptyPatient, lineTotal, money, patientProblems } from '#lib/claim.ts';
	import { demoPatient, demoProvider, demoVisit } from '#lib/demo.ts';
	import { buildTripleSPacket } from '#lib/pdf/packet.ts';
	import { TRIPLE_S } from '#lib/pdf/triple-s.ts';

	let claim = $state<
		| { status: 'loading' }
		| { status: 'missing' }
		| { status: 'error'; message: string }
		| { status: 'ready'; payload: ProviderPayload }
	>({ status: 'loading' });
	let patient = $state(emptyPatient());
	let attempted = $state(false);
	let packet = $state<
		| { status: 'idle' }
		| { status: 'loading' }
		| { status: 'error'; message: string }
		| { status: 'ready'; url: string }
	>({ status: 'idle' });

	const problems = $derived(patientProblems(patient));

	async function readHash() {
		const encoded = location.hash.slice(1);
		if (!encoded) {
			claim = { status: 'missing' };
			return;
		}
		claim = { status: 'loading' };
		try {
			claim = { status: 'ready', payload: await decodePayload(encoded) };
		} catch (e) {
			claim = { status: 'error', message: e instanceof Error ? e.message : String(e) };
		}
	}

	onMount(() => {
		readHash();
		window.addEventListener('hashchange', readHash);
		return () => {
			window.removeEventListener('hashchange', readHash);
			if (packet.status === 'ready') URL.revokeObjectURL(packet.url);
		};
	});

	function loadDemoClaim() {
		claim = { status: 'ready', payload: { v: 1, provider: demoProvider(), visit: demoVisit() } };
	}

	async function generate(payload: ProviderPayload) {
		attempted = true;
		if (problems.length > 0) return;
		if (packet.status === 'ready') URL.revokeObjectURL(packet.url);
		packet = { status: 'loading' };
		try {
			const res = await fetch(asset('forms/triple-s-reembolso.pdf'));
			if (!res.ok) throw new Error(`no se pudo cargar el formulario (${res.status})`);
			const template = new Uint8Array(await res.arrayBuffer());
			const bytes = await buildTripleSPacket(
				template,
				payload.provider,
				payload.visit,
				$state.snapshot(patient)
			);
			const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
			packet = { status: 'ready', url };
		} catch (e) {
			packet = { status: 'error', message: e instanceof Error ? e.message : String(e) };
		}
	}
</script>

<h1 class="text-2xl font-bold text-teal-900">Paciente</h1>

{#if claim.status === 'loading'}
	<div class="mt-6 animate-pulse rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
		Leyendo la información de su proveedor…
	</div>
{:else if claim.status === 'missing'}
	<div class="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
		<p class="font-semibold">Escanee el código QR de su proveedor para comenzar.</p>
		<p class="mt-2">
			Su proveedor genera el código desde
			<a href={resolve('/proveedor')} class="font-medium text-teal-700 underline">la página de proveedor</a>.
			Si solo quiere ver cómo funciona, use un ejemplo.
		</p>
		<button
			type="button"
			onclick={loadDemoClaim}
			class="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
		>
			Ver con datos de ejemplo
		</button>
	</div>
{:else if claim.status === 'error'}
	<div class="mt-6 rounded-xl border border-rose-300 bg-rose-50 p-6 text-sm text-rose-900" role="alert">
		<p class="font-semibold">No pudimos leer este enlace.</p>
		<p class="mt-1">{claim.message}. Pídale a su proveedor que genere un código nuevo.</p>
	</div>
{:else}
	{@const payload = claim.payload}
	{@const { provider, visit } = payload}
	{@const lines = visit.lines.filter((l) => l.cpt.trim() || l.amountPaid.trim())}
	<section class="mt-6 rounded-xl border border-teal-200 bg-white p-5">
		<p class="text-xs font-semibold tracking-wide text-teal-700 uppercase">Su visita</p>
		<p class="mt-1 font-semibold">{provider.name}</p>
		<p class="text-sm text-slate-600">{provider.specialty} · NPI {provider.npi}</p>
		{#if lines.length === 0}
			<p class="mt-3 text-sm text-amber-800">
				Este código no incluye servicios. Pídale a su proveedor que genere uno nuevo.
			</p>
		{:else}
			<ul class="mt-3 divide-y divide-slate-100 text-sm">
				{#each lines as l, i (i)}
					<li class="flex justify-between gap-4 py-2">
						<span>{l.description} <span class="text-slate-500">({l.cpt})</span></span>
						<span class="shrink-0">{money(Number.parseFloat(l.amountPaid) || 0)}</span>
					</li>
				{/each}
			</ul>
			<p class="mt-2 text-right text-sm">
				Total pagado: <span class="font-semibold">{money(lineTotal(lines))}</span>
			</p>
		{/if}
	</section>

	<form
		class="mt-6 space-y-6"
		onsubmit={(e) => {
			e.preventDefault();
			generate(payload);
		}}
	>
		<fieldset class="rounded-xl border border-slate-200 bg-white p-5">
			<div class="mb-4 flex items-center justify-between">
				<legend class="text-sm font-semibold text-slate-800">Su información (Triple-S)</legend>
				<button
					type="button"
					onclick={() => (patient = demoPatient())}
					class="text-xs text-slate-600 underline"
				>
					Datos de ejemplo
				</button>
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field label="Nombre" bind:value={patient.firstName} required autocomplete="given-name" />
				<Field label="Inicial" bind:value={patient.middleInitial} />
				<Field label="Apellido paterno" bind:value={patient.lastNamePaternal} required autocomplete="family-name" />
				<Field label="Apellido materno" bind:value={patient.lastNameMaternal} />
				<Field
					label="Número de contrato"
					bind:value={patient.contractNumber}
					required
					placeholder="ZUA123456789"
					hint="En su tarjeta del plan, incluyendo las letras al principio."
					class="sm:col-span-2"
				/>
				<Field label="Número de grupo" bind:value={patient.groupNumber} />
				<Field label="Nombre del grupo (patrono)" bind:value={patient.groupName} />
				<Field label="Dirección postal" bind:value={patient.address1} required autocomplete="address-line1" class="sm:col-span-2" />
				<Field label="Dirección 2" bind:value={patient.address2} autocomplete="address-line2" class="sm:col-span-2" />
				<Field label="Ciudad / pueblo" bind:value={patient.city} required autocomplete="address-level2" />
				<div class="grid grid-cols-2 gap-4">
					<Field label="Estado" bind:value={patient.state} />
					<Field label="Código postal" bind:value={patient.zip} required inputmode="numeric" autocomplete="postal-code" />
				</div>
				<Field label="Teléfono" bind:value={patient.phone} type="tel" required autocomplete="tel" />
				<Field label="Teléfono alterno" bind:value={patient.altPhone} type="tel" />
			</div>
			<div class="mt-5 space-y-3 text-sm">
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={patient.hasOtherCoverage} class="rounded text-teal-700" />
					Tengo otro seguro médico
				</label>
				{#if patient.hasOtherCoverage}
					<p class="rounded-lg bg-amber-50 p-3 text-amber-900">
						Incluya la Explicación de Beneficios (EOB) del otro seguro. Complete la sección B a mano
						por ahora.
					</p>
				{/if}
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={patient.medicareEligible} class="rounded text-teal-700" />
					Soy elegible a Medicare
				</label>
			</div>
		</fieldset>

		{#if attempted}<Problems {problems} />{/if}

		<button
			type="submit"
			disabled={packet.status === 'loading'}
			class="w-full rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white shadow hover:bg-teal-800 disabled:opacity-60"
		>
			{packet.status === 'loading' ? 'Preparando su paquete…' : 'Preparar paquete de reembolso'}
		</button>
	</form>

	{#if packet.status === 'error'}
		<div class="mt-6 rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
			No se pudo preparar el paquete: {packet.message}. Intente de nuevo.
		</div>
	{:else if packet.status === 'ready'}
		<section class="mt-6 rounded-xl border border-teal-200 bg-white p-6">
			<h2 class="text-lg font-semibold text-teal-900">Su paquete está listo</h2>
			<ol class="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
				<li>Descárguelo e imprímalo.</li>
				<li>Firme la sección D. Su médico firma y sella la sección E y la factura.</li>
				<li>Envíelo a {TRIPLE_S.mailTo.join(', ')}.</li>
			</ol>
			<div class="mt-4 flex flex-col gap-2 sm:flex-row">
				<a
					href={packet.url}
					download="reembolso-triple-s.pdf"
					class="rounded-lg bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800"
				>
					Descargar PDF
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
		</section>
	{/if}
{/if}
