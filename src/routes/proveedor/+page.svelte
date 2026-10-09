<script lang="ts">
	import QRCode from 'qrcode';
	import { resolve } from '$app/paths';
	import Field from '#lib/components/Field.svelte';
	import Problems from '#lib/components/Problems.svelte';
	import {
		MAX_LINES,
		emptyLine,
		emptyProvider,
		emptyVisit,
		encodePayload,
		lineTotal,
		money,
		providerProblems
	} from '#lib/claim.ts';
	import { demoProvider, demoVisit } from '#lib/demo.ts';

	let provider = $state(emptyProvider());
	let visit = $state(emptyVisit());
	let attempted = $state(false);
	let result = $state<
		| { status: 'idle' }
		| { status: 'loading' }
		| { status: 'error'; message: string }
		| { status: 'ready'; link: string; qr: string }
	>({ status: 'idle' });
	let copied = $state(false);

	const problems = $derived(providerProblems(provider, visit));
	const total = $derived(lineTotal(visit.lines));

	function loadDemo() {
		provider = demoProvider();
		visit = demoVisit();
		result = { status: 'idle' };
	}

	async function generate() {
		attempted = true;
		if (problems.length > 0) return;
		result = { status: 'loading' };
		try {
			const encoded = await encodePayload({
				v: 1,
				provider: $state.snapshot(provider),
				visit: $state.snapshot(visit)
			});
			const link = `${location.origin}${resolve('/paciente')}#${encoded}`;
			const qr = await QRCode.toDataURL(link, { errorCorrectionLevel: 'L', margin: 1, width: 320 });
			result = { status: 'ready', link, qr };
		} catch (e) {
			result = { status: 'error', message: e instanceof Error ? e.message : String(e) };
		}
	}

	async function copy(link: string) {
		try {
			await navigator.clipboard.writeText(link);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}
</script>

<div class="flex items-start justify-between gap-4">
	<div>
		<h1 class="text-2xl font-bold text-teal-900">Proveedor</h1>
		<p class="mt-1 text-sm text-slate-600">
			Complete la sección E del formulario de Triple-S. El paciente completará el resto.
		</p>
	</div>
	<button
		type="button"
		onclick={loadDemo}
		class="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
	>
		Datos de ejemplo
	</button>
</div>

<form
	class="mt-6 space-y-8"
	onsubmit={(e) => {
		e.preventDefault();
		generate();
	}}
>
	<fieldset class="rounded-xl border border-slate-200 bg-white p-5">
		<legend class="px-1 text-sm font-semibold text-slate-800">Información del proveedor</legend>
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label="Nombre del proveedor" bind:value={provider.name} required class="sm:col-span-2" />
			<Field label="NPI" bind:value={provider.npi} required inputmode="numeric" placeholder="10 dígitos" />
			<Field label="Especialidad" bind:value={provider.specialty} />
			<Field label="EIN (identificación patronal)" bind:value={provider.ein} placeholder="66-0000000" />
			<Field label="Número de licencia" bind:value={provider.license} />
			<Field label="Dirección" bind:value={provider.address1} required />
			<Field label="Ciudad, estado, código postal" bind:value={provider.address2} placeholder="San Juan, PR 00911" />
			<Field label="Teléfono" bind:value={provider.phone} type="tel" />
		</div>
	</fieldset>

	<fieldset class="rounded-xl border border-slate-200 bg-white p-5">
		<legend class="px-1 text-sm font-semibold text-slate-800">Diagnóstico</legend>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each visit.diagnoses as _, i (i)}
				<Field label={`Código ICD-10 ${i + 1}`} bind:value={visit.diagnoses[i]} placeholder="E55.9" required={i === 0} />
			{/each}
			<div class="flex items-end">
				{#if visit.diagnoses.length < 4}
					<button
						type="button"
						onclick={() => visit.diagnoses.push('')}
						class="text-sm font-medium text-teal-700 hover:underline"
					>
						+ Añadir diagnóstico
					</button>
				{/if}
			</div>
			<Field label="Descripción del diagnóstico" bind:value={visit.diagnosisDescription} class="sm:col-span-2" />
			<Field label="Número de cuenta / récord del paciente" bind:value={visit.accountNumber} />
			<Field label="Número de preautorización (si aplica)" bind:value={visit.preauthNumber} />
		</div>
	</fieldset>

	<fieldset class="rounded-xl border border-slate-200 bg-white p-5">
		<legend class="px-1 text-sm font-semibold text-slate-800">Servicios (máximo {MAX_LINES})</legend>
		<div class="space-y-4">
			{#each visit.lines as line, i (i)}
				<div class="rounded-lg border border-slate-100 bg-slate-50 p-4">
					<div class="mb-3 flex items-center justify-between">
						<span class="text-sm font-semibold text-slate-700">Servicio {i + 1}</span>
						{#if visit.lines.length > 1}
							<button
								type="button"
								onclick={() => visit.lines.splice(i, 1)}
								class="text-xs text-rose-700 hover:underline"
							>
								Quitar
							</button>
						{/if}
					</div>
					<div class="grid gap-3 sm:grid-cols-4">
						<Field label="Fecha" type="date" bind:value={line.dateFrom} required />
						<Field label="Código (CPT/HCPCS)" bind:value={line.cpt} placeholder="99205" required />
						<Field label="Modificador" bind:value={line.modifier} />
						<Field label="Unidades" bind:value={line.units} inputmode="numeric" />
						<Field label="Descripción" bind:value={line.description} required class="sm:col-span-2" />
						<Field label="Lugar de servicio" bind:value={line.placeOfService} hint="11 = oficina, 02 = telemedicina" />
						<Field label="Cantidad pagada ($)" bind:value={line.amountPaid} inputmode="decimal" required />
					</div>
				</div>
			{/each}
			{#if visit.lines.length < MAX_LINES}
				<button
					type="button"
					onclick={() => visit.lines.push(emptyLine())}
					class="text-sm font-medium text-teal-700 hover:underline"
				>
					+ Añadir servicio
				</button>
			{/if}
			<p class="text-right text-sm text-slate-700">
				Total pagado: <span class="font-semibold">{money(total)}</span>
			</p>
		</div>
	</fieldset>

	{#if attempted}<Problems {problems} />{/if}

	<button
		type="submit"
		disabled={result.status === 'loading'}
		class="w-full rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white shadow hover:bg-teal-800 disabled:opacity-60"
	>
		{result.status === 'loading' ? 'Generando…' : 'Generar código QR para el paciente'}
	</button>
</form>

{#if result.status === 'error'}
	<div class="mt-6 rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
		No se pudo generar el código: {result.message}. Intente de nuevo.
	</div>
{:else if result.status === 'ready'}
	<section class="mt-8 rounded-xl border border-teal-200 bg-white p-6 text-center">
		<h2 class="text-lg font-semibold text-teal-900">Muéstrele este código al paciente</h2>
		<img src={result.qr} alt="Código QR para el paciente" class="mx-auto mt-4 h-72 w-72" />
		<p class="mt-3 text-xs text-slate-500">
			Los datos van dentro del código. Nada se guardó en un servidor.
		</p>
		<div class="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
			<button
				type="button"
				onclick={() => result.status === 'ready' && copy(result.link)}
				class="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
			>
				{copied ? '¡Copiado!' : 'Copiar enlace'}
			</button>
			<a
				href={result.link}
				target="_blank"
				rel="noopener"
				class="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
			>
				Abrir como paciente
			</a>
		</div>
	</section>
{/if}
