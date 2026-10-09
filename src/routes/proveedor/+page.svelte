<script lang="ts">
	import QRCode from 'qrcode';
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Field from '#lib/components/Field.svelte';
	import PatientFields from '#lib/components/PatientFields.svelte';
	import CoverageCheck from '#lib/components/CoverageCheck.svelte';
	import Problems from '#lib/components/Problems.svelte';
	import {
		MAX_LINES,
		acceptanceCode,
		emptyLine,
		emptyPatient,
		emptyProvider,
		emptyVisit,
		encodePayload,
		lineTotal,
		money,
		patientFullName,
		patientProblems,
		providerProblems
	} from '#lib/claim.ts';
	import { demoPatients, demoProvider, demoVisit } from '#lib/demo.ts';
	import { packetObjectUrl } from '#lib/pdf/browser.ts';
	import { ROUTES, assess, canFile } from '#lib/plans.ts';

	const records = demoPatients();

	let provider = $state(emptyProvider());
	let visit = $state(emptyVisit());
	let patient = $state(emptyPatient());
	let recordId = $state('');
	let attempted = $state(false);
	let result = $state<
		| { status: 'idle' }
		| { status: 'loading' }
		| { status: 'error'; message: string }
		| { status: 'ready'; link: string; qr: string; code: string; snapshot: string }
	>({ status: 'idle' });
	let enteredCode = $state('');
	let packet = $state<
		| { status: 'idle' }
		| { status: 'loading' }
		| { status: 'error'; message: string }
		| { status: 'ready'; url: string }
	>({ status: 'idle' });

	const problems = $derived([...patientProblems(patient), ...providerProblems(provider, visit)]);
	const total = $derived(lineTotal(visit.lines));
	const assessment = $derived(
		assess(
			patient.plan,
			visit.route,
			visit.lines.map((l) => l.cpt.trim())
		)
	);
	const fileable = $derived(canFile(assessment));
	const snapshot = $derived(JSON.stringify({ provider, visit, patient }));
	const stale = $derived(result.status === 'ready' && result.snapshot !== snapshot);
	const accepted = $derived(result.status === 'ready' && !stale && enteredCode.trim() === result.code);

	function pickRecord(id: string) {
		recordId = id;
		const rec = records.find((r) => r.id === id);
		patient = rec ? structuredClone(rec.patient) : emptyPatient();
		visit.accountNumber = rec ? rec.id : '';
	}

	function loadDemo() {
		provider = demoProvider();
		visit = demoVisit();
		pickRecord(records[0].id);
		reset();
	}

	// ?demo fills synthetic data so a live demo can skip typing; there is no visible button.
	if (page.url.searchParams.has('demo')) loadDemo();

	function reset() {
		if (packet.status === 'ready') URL.revokeObjectURL(packet.url);
		packet = { status: 'idle' };
		enteredCode = '';
		result = { status: 'idle' };
	}

	const currentPayload = () => ({
		v: 2 as const,
		provider: $state.snapshot(provider),
		visit: $state.snapshot(visit),
		patient: $state.snapshot(patient)
	});

	async function generate() {
		attempted = true;
		if (problems.length > 0 || !fileable) return;
		reset();
		result = { status: 'loading' };
		try {
			const encoded = await encodePayload(currentPayload());
			const link = `${location.origin}${resolve('/paciente')}#${encoded}`;
			const qr = await QRCode.toDataURL(link, { errorCorrectionLevel: 'L', margin: 2, scale: 6 });
			result = { status: 'ready', link, qr, code: await acceptanceCode(encoded), snapshot };
		} catch (e) {
			result = { status: 'error', message: e instanceof Error ? e.message : String(e) };
		}
	}

	async function buildPacket() {
		packet = { status: 'loading' };
		try {
			packet = { status: 'ready', url: await packetObjectUrl(currentPayload()) };
		} catch (e) {
			packet = { status: 'error', message: e instanceof Error ? e.message : String(e) };
		}
	}

	onDestroy(() => {
		if (packet.status === 'ready') URL.revokeObjectURL(packet.url);
	});
</script>

<div class="flex items-start justify-between gap-4">
	<div>
		<h1 class="text-2xl font-bold text-teal-900">Proveedor</h1>
		<p class="mt-1 text-sm text-slate-600">
			Prepare la reclamación completa. El paciente solo la revisa y la acepta desde su teléfono.
		</p>
	</div>
</div>

<form
	class="mt-6 space-y-8"
	onsubmit={(e) => {
		e.preventDefault();
		generate();
	}}
>
	<fieldset class="rounded-xl border border-slate-200 bg-white p-5">
		<legend class="px-1 text-sm font-semibold text-slate-800">Paciente</legend>
		<label class="block">
			<span class="text-sm font-medium text-slate-700">Importar del expediente</span>
			<select
				value={recordId}
				onchange={(e) => pickRecord(e.currentTarget.value)}
				class="mt-1 block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-teal-600 focus:ring-teal-600"
			>
				<option value="">— Seleccione un paciente —</option>
				{#each records as r (r.id)}
					<option value={r.id}>{r.label} · {r.id}</option>
				{/each}
			</select>
			<span class="mt-1 block text-xs text-slate-500">
				Simulado: en producción esto viene del formulario de admisión en el sistema de la práctica.
			</span>
		</label>
		<div class="mt-5">
			<PatientFields bind:patient />
		</div>
	</fieldset>

	<fieldset class="rounded-xl border border-slate-200 bg-white p-5">
		<legend class="px-1 text-sm font-semibold text-slate-800">Proveedor</legend>
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

	<fieldset class="rounded-xl border border-slate-200 bg-white p-5">
		<legend class="px-1 text-sm font-semibold text-slate-800">¿Es reembolsable?</legend>
		<label class="block">
			<span class="text-sm font-medium text-slate-700">
				Razón de la solicitud<span class="text-rose-600"> *</span>
			</span>
			<select
				bind:value={visit.route}
				class="mt-1 block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-teal-600 focus:ring-teal-600"
			>
				<option value="">— Seleccione —</option>
				{#each ROUTES as r (r.id)}<option value={r.id}>{r.label}</option>{/each}
			</select>
		</label>
		<div class="mt-4">
			<CoverageCheck {assessment} onpick={(route) => (visit.route = route)} />
		</div>
	</fieldset>

	{#if attempted}<Problems {problems} />{/if}

	<button
		type="submit"
		disabled={result.status === 'loading' || assessment.status === 'not-covered'}
		class="w-full rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white shadow hover:bg-teal-800 disabled:opacity-50"
	>
		{result.status === 'loading'
			? 'Generando…'
			: assessment.status === 'not-covered'
				? 'Escoja una ruta reembolsable para continuar'
				: 'Generar código QR para revisión del paciente'}
	</button>
</form>

{#if result.status === 'error'}
	<div class="mt-6 rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
		No se pudo generar el código: {result.message}. Intente de nuevo.
	</div>
{:else if result.status === 'ready'}
	<section class="mt-8 rounded-xl border border-teal-200 bg-white p-6">
		{#if stale}
			<div class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
				La información cambió después de generar este código. Genere uno nuevo para que el paciente
				revise la versión correcta.
			</div>
		{:else}
			<div class="grid items-center gap-6 sm:grid-cols-2">
				<div class="text-center">
					<img
						src={result.qr}
						alt="Código QR para el paciente"
						class="mx-auto w-64 [image-rendering:pixelated]"
					/>
					<a
						href={result.link}
						target="_blank"
						rel="noopener"
						class="mt-2 inline-block text-xs text-slate-500 underline"
					>
						Abrir como paciente
					</a>
				</div>
				<div>
					<h2 class="text-lg font-semibold text-teal-900">
						{patientFullName(patient)} revisa y acepta
					</h2>
					<ol class="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
						<li>El paciente escanea el código con su celular.</li>
						<li>Revisa la reclamación completa y la acepta.</li>
						<li>Su teléfono muestra un código de 4 dígitos. Escríbalo aquí.</li>
					</ol>
					<label class="mt-4 block">
						<span class="text-sm font-medium text-slate-700">Código de aceptación</span>
						<input
							bind:value={enteredCode}
							inputmode="numeric"
							maxlength="4"
							placeholder="0000"
							class="mt-1 block w-32 rounded-lg border-slate-300 text-center font-mono text-xl tracking-widest shadow-sm focus:border-teal-600 focus:ring-teal-600"
						/>
					</label>
					{#if enteredCode.length === 4 && !accepted}
						<p class="mt-2 text-sm text-rose-700" role="alert">
							El código no coincide. ¿El paciente escaneó el código más reciente?
						</p>
					{/if}
				</div>
			</div>

			{#if accepted}
				<div class="mt-6 border-t border-slate-100 pt-6">
					<p class="text-sm font-semibold text-teal-800">✓ El paciente revisó y aceptó esta reclamación.</p>
					{#if packet.status === 'ready'}
						<div class="mt-3 flex flex-col gap-2 sm:flex-row">
							<a
								href={packet.url}
								target="_blank"
								rel="noopener"
								class="rounded-lg bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800"
							>
								Abrir para imprimir
							</a>
							<a
								href={packet.url}
								download="reembolso-triple-s.pdf"
								class="rounded-lg border border-slate-300 px-4 py-2 text-center text-sm hover:bg-slate-50"
							>
								Descargar PDF
							</a>
						</div>
						<p class="mt-3 text-sm text-slate-600">
							Imprima. El paciente firma la sección D. Usted firma y sella la sección E y la factura.
						</p>
					{:else}
						<button
							type="button"
							onclick={buildPacket}
							disabled={packet.status === 'loading'}
							class="mt-3 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
						>
							{packet.status === 'loading' ? 'Preparando…' : 'Preparar paquete para imprimir'}
						</button>
						{#if packet.status === 'error'}
							<p class="mt-2 text-sm text-rose-700" role="alert">
								No se pudo preparar el paquete: {packet.message}. Intente de nuevo.
							</p>
						{/if}
					{/if}
				</div>
			{/if}
		{/if}
	</section>
{/if}
