<script lang="ts">
	import { onDestroy } from 'svelte';
	import { asset, resolve } from '$app/paths';
	import { page } from '$app/state';
	import Field from '#lib/components/Field.svelte';
	import PatientFields from '#lib/components/PatientFields.svelte';
	import Linked from '#lib/components/Linked.svelte';
	import Problems from '#lib/components/Problems.svelte';
	import SendTo from '#lib/components/SendTo.svelte';
	import { emptyPatient, patientFullName } from '#lib/claim.ts';
	import { demoPatients } from '#lib/demo.ts';
	import { CLAIM_RULES, INSURERS, SERVICES, claimable, deadlineFrom, deadlineWords, estimate } from '#lib/estimate.ts';
	import type { PatientPlanId, ServiceId } from '#lib/estimate.ts';
	import { appointmentRequest, letterParagraphs, preauthWarning, providerRequest, questionsFor } from '#lib/justify.ts';
	import { buildPatientPacket } from '#lib/pdf/patient-packet.ts';
	import { isoToForm } from '#lib/pdf/triple-s.ts';

	const planId = page.url.searchParams.get('plan') as PatientPlanId | null;
	const serviceId = page.url.searchParams.get('servicio') as ServiceId | null;
	const insurerEntry = INSURERS.find((i) => i.plans.some((p) => p.id === planId));
	const planName = insurerEntry
		? `${insurerEntry.name} ${insurerEntry.plans.find((p) => p.id === planId)?.name ?? ''}`
		: '';
	const serviceName = SERVICES.find((s) => s.id === serviceId)?.name ?? '';
	const est = planId && serviceId ? estimate(planId, serviceId, 0) : null;
	const valid = !!insurerEntry && !!serviceName && claimable(est) && !!est?.route;
	const insurer = insurerEntry?.id ?? 'triple-s';
	const route = est?.route ?? 'routine';
	const rules = CLAIM_RULES[insurer];
	const questions = valid ? questionsFor(insurer, route) : [];
	const preauth = serviceId ? preauthWarning(insurer, serviceId) : null;

	const today = () => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	};

	type Step = 'received' | 'details' | 'questions' | 'you' | 'review' | 'send';
	let step = $state<Step>('received');
	let received = $state<boolean | null>(null);
	let date = $state(today());
	let paid = $state('');
	let providerName = $state('');
	let providerSpecialty = $state('');
	let answers = $state<Record<string, boolean>>({});
	let patient = $state({ ...emptyPatient(), state: 'PR' });
	let editing = $state(false);
	let attempted = $state(false);
	let myEmail = $state('');
	let providerEmail = $state('');
	let copied = $state(false);
	let pdf = $state<
		| { status: 'idle' }
		| { status: 'loading' }
		| { status: 'error'; message: string }
		| { status: 'ready'; url: string; blob: Blob }
	>({ status: 'idle' });

	const flow = $derived<Step[]>(
		received === false
			? ['received', 'questions', 'you', 'review', 'send']
			: ['received', 'details', ...(questions.length ? (['questions'] as Step[]) : []), 'you', 'review', 'send']
	);
	const stepIndex = $derived(flow.indexOf(step));
	const deadline = $derived(received ? deadlineFrom(date, rules.deadlineDays) : '');

	const detailProblems = $derived([
		...(date ? [] : ['Indique la fecha del servicio.']),
		...(Number.parseFloat(paid) > 0 ? [] : ['Indique cuánto pagó.'])
	]);
	const youProblems = $derived([
		...(patient.firstName.trim() && patient.lastNamePaternal.trim() ? [] : ['Falta su nombre y apellido.']),
		...(patient.contractNumber.trim() ? [] : ['Falta su número de contrato (vea su tarjeta del plan).']),
		...(patient.address1.trim() && patient.city.trim() && patient.zip.trim() ? [] : ['Falta su dirección postal completa.']),
		...(patient.phone.trim() ? [] : ['Falta su teléfono.']),
		...(insurer === 'first-medical' && !patient.dob ? ['Falta su fecha de nacimiento.'] : [])
	]);
	const warnings = $derived(questions.filter((q) => answers[q.id] === false && q.warnIfNo).map((q) => q.warnIfNo as string));

	const emailBody = $derived(
		[
			`Saludos${providerName ? `, ${providerName}` : ''}:`,
			'',
			`Estoy solicitando a ${insurerEntry?.name ?? 'mi plan'} el reembolso de ${serviceName.toLowerCase()}${received ? ` del ${isoToForm(date)}` : ''}.`,
			providerRequest(insurer),
			'',
			'Le adjunto el formulario ya completado con mi información.',
			'',
			'Gracias,',
			patientFullName(patient) || '',
			patient.phone
		].join('\n')
	);
	const emailSubject = $derived(`Solicitud de reembolso – ${patientFullName(patient)}`);
	const mailto = $derived(
		`mailto:${encodeURIComponent(providerEmail)}?${new URLSearchParams({
			...(myEmail ? { cc: myEmail } : {}),
			subject: emailSubject,
			body: `${emailBody}\n\n(Adjunte el PDF que descargó de Healing Aura.)`
		})
			.toString()
			.replace(/\+/g, '%20')}`
	);
	const canShareFiles = $derived(
		pdf.status === 'ready' &&
			typeof navigator !== 'undefined' &&
			!!navigator.canShare?.({ files: [new File([pdf.blob], 'reembolso.pdf', { type: 'application/pdf' })] })
	);

	function next() {
		attempted = true;
		if (step === 'details' && detailProblems.length) return;
		if (step === 'questions' && received && questions.some((q) => answers[q.id] === undefined)) return;
		if (step === 'you' && youProblems.length) {
			return;
		}
		attempted = false;
		if (step === 'you') {
			generate();
			return;
		}
		step = flow[stepIndex + 1];
		scrollTo({ top: 0, behavior: 'smooth' });
	}

	function back() {
		attempted = false;
		editing = false;
		if (stepIndex > 0) step = flow[stepIndex - 1];
	}

	// Synthetic data so a demo can click straight through every step; ?demo fills it on load.
	function fillDemo() {
		const demo = demoPatients()[insurer === 'triple-s' ? 0 : 1].patient;
		paid = route === 'vision' ? '180' : '90';
		providerName = 'Dra. Isabel Rivera Colón';
		providerSpecialty = serviceName.split(',')[0];
		answers = Object.fromEntries(questions.map((q) => [q.id, true]));
		patient = { ...demo, contractNumber: insurer === 'triple-s' ? demo.contractNumber : 'FM0012345678' };
		myEmail = 'paciente@example.com';
		providerEmail = 'proveedor@example.com';
		attempted = false;
	}

	if (valid && page.url.searchParams.has('demo')) fillDemo();

	function choose(r: boolean) {
		received = r;
		step = r ? 'details' : 'questions';
	}

	async function generate() {
		if (pdf.status === 'ready') URL.revokeObjectURL(pdf.url);
		pdf = { status: 'loading' };
		step = 'review';
		editing = false;
		scrollTo({ top: 0, behavior: 'smooth' });
		try {
			const file = insurer === 'triple-s' ? 'forms/triple-s-reembolso.pdf' : 'forms/first-medical-reembolso.pdf';
			const res = await fetch(asset(file));
			if (!res.ok) throw new Error(`no se pudo cargar el formulario (${res.status})`);
			const template = new Uint8Array(await res.arrayBuffer());
			const signStep =
				insurer === 'triple-s' ? 'Firme y feche la sección D del formulario.' : 'Firme y feche la sección 4 del formulario.';
			const steps = received
				? [
						signStep,
						insurer === 'triple-s'
							? 'Su proveedor completa y firma la sección E, y le da un recibo original timbrado y firmado.'
							: 'Su proveedor le da un recibo original con su NPI, el diagnóstico (ICD-10) y los códigos CPT.',
						'Firme la carta de solicitud.',
						...(est?.conditions ?? []),
						`Envíe todo antes del ${deadline || 'plazo de su plan'}.`
					]
				: [
						'Llévelo a su cita o entrégueselo al proveedor.',
						...(preauth ? [preauth] : []),
						...(est?.conditions ?? []),
						appointmentRequest(insurer),
						`Después del servicio, añada la fecha y lo pagado, firme y envíe dentro de ${deadlineWords(rules.deadlineDays)}.`
					];
			const bytes = await buildPatientPacket(template, {
				insurer,
				planName,
				route,
				serviceName,
				received: !!received,
				date,
				paid: received ? Number.parseFloat(paid).toFixed(2) : '',
				providerName,
				providerSpecialty,
				patient: $state.snapshot(patient),
				expected: est?.benefit ?? '',
				deadline,
				steps,
				letter: letterParagraphs({
					insurer,
					route,
					planName,
					serviceName,
					date: isoToForm(date),
					paid: Number.parseFloat(paid).toFixed(2),
					providerName,
					answers: $state.snapshot(answers)
				})
			});
			const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
			pdf = { status: 'ready', url: URL.createObjectURL(blob), blob };
		} catch (e) {
			pdf = { status: 'error', message: e instanceof Error ? e.message : String(e) };
		}
	}

	async function share() {
		if (pdf.status !== 'ready') return;
		try {
			await navigator.share({
				title: emailSubject,
				text: emailBody,
				files: [new File([pdf.blob], 'reembolso.pdf', { type: 'application/pdf' })]
			});
		} catch {
			// User cancelled the share sheet.
		}
	}

	async function copyMessage() {
		try {
			await navigator.clipboard.writeText(emailBody);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}

	onDestroy(() => {
		if (pdf.status === 'ready') URL.revokeObjectURL(pdf.url);
	});

	const btn = 'rounded-xl px-6 py-3 font-semibold shadow';
	const primary = `${btn} bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-60`;
	const secondary = `${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`;
</script>

<div class="mx-auto max-w-2xl">
	<a href={resolve('/')} class="text-sm text-teal-700 hover:underline">← Volver</a>

	{#if !valid}
		<div class="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900" role="alert">
			<p class="font-semibold">No encontramos un reembolso que preparar.</p>
			<p class="mt-1">Escoja su plan y servicio en la página principal.</p>
		</div>
	{:else}
		<div class="mt-4 flex items-start justify-between gap-3">
			<h1 class="text-2xl font-bold text-teal-900">Preparemos su reembolso</h1>
			{#if step !== 'review'}
				<button
					type="button"
					onclick={fillDemo}
					class="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
				>
					Datos de ejemplo
				</button>
			{/if}
		</div>
		<div class="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm leading-relaxed text-teal-950">
			<p class="font-semibold">{planName}</p>
			<p>{serviceName}</p>
			<p class="font-semibold text-teal-800">{est?.benefit}</p>
		</div>

		<ol class="mt-5 flex gap-1" aria-label="Progreso">
			{#each flow as s, i (s)}
				<li class="h-1.5 flex-1 rounded-full {i <= stepIndex ? 'bg-teal-600' : 'bg-slate-200'}"></li>
			{/each}
		</ol>

		<section class="mt-6 rounded-xl border border-slate-200 bg-white p-6">
			{#if step === 'received'}
				<h2 class="text-lg font-semibold text-slate-900">¿Ya recibió el servicio?</h2>
				<div class="mt-5 grid grid-cols-2 gap-3">
					<button type="button" class={primary} onclick={() => choose(true)}>Sí</button>
					<button type="button" class={secondary} onclick={() => choose(false)}>Todavía no</button>
				</div>
			{:else if step === 'details'}
				<h2 class="text-lg font-semibold text-slate-900">Sobre el servicio</h2>
				<div class="mt-4 grid gap-4 sm:grid-cols-2">
					<Field label="Fecha del servicio" type="date" bind:value={date} required />
					<Field label="Cuánto pagó ($)" bind:value={paid} inputmode="decimal" required />
					<Field label="Nombre del proveedor" bind:value={providerName} placeholder="Dra. Isabel Rivera" />
					<Field label="Especialidad del proveedor" bind:value={providerSpecialty} placeholder="Acupuntura" />
				</div>
				{#if attempted}<div class="mt-4"><Problems problems={detailProblems} /></div>{/if}
			{:else if step === 'questions'}
				{#if received === false}
					<h2 class="text-lg font-semibold text-slate-900">Antes de su cita</h2>
					{#if preauth}
						<p class="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
							<strong>Necesita preautorización.</strong> <Linked text={preauth} {insurer} />
						</p>
					{:else}
						<p class="mt-4 rounded-lg bg-teal-50 p-4 text-sm text-teal-900">
							Este servicio no requiere preautorización.
						</p>
					{/if}
					{#if (est?.conditions.length ?? 0) > 0}
						<p class="mt-4 text-sm font-semibold text-slate-800">Para que le reembolsen:</p>
						<ul class="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
							{#each est?.conditions ?? [] as c (c)}<li><Linked text={c} {insurer} /></li>{/each}
						</ul>
					{/if}
					<p class="mt-4 text-sm text-slate-700">
						Vamos a llenar el formulario con su información para que lo lleve a la cita.
					</p>
				{:else}
					<h2 class="text-lg font-semibold text-slate-900">Unas preguntas para justificar su reembolso</h2>
					<div class="mt-4 space-y-4">
						{#each questions as q (q.id)}
							<div>
								<p class="text-sm text-slate-800">{q.text}</p>
								<div class="mt-2 flex gap-2">
									{#each [true, false] as v (v)}
										<button
											type="button"
											aria-pressed={answers[q.id] === v}
											onclick={() => (answers[q.id] = v)}
											class="rounded-lg border px-4 py-1.5 text-sm {answers[q.id] === v
												? 'border-teal-700 bg-teal-700 text-white'
												: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}"
										>
											{v ? 'Sí' : 'No'}
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
					{#if warnings.length > 0}
						<ul class="mt-4 space-y-1 text-sm text-amber-900">
							{#each warnings as w (w)}<li>⚠ <Linked text={w} {insurer} /></li>{/each}
						</ul>
					{/if}
					{#if attempted && questions.some((q) => answers[q.id] === undefined)}
						<p class="mt-4 text-sm text-rose-700" role="alert">Conteste todas las preguntas.</p>
					{/if}
				{/if}
			{:else if step === 'you'}
				<h2 class="text-lg font-semibold text-slate-900">Su información</h2>
				<p class="mt-1 text-sm text-slate-600">Solo lo que no podemos llenar por usted. Está en su tarjeta del plan.</p>
				<div class="mt-4 grid gap-4 sm:grid-cols-2">
					<Field label="Nombre" bind:value={patient.firstName} required autocomplete="given-name" />
					<Field label="Apellido paterno" bind:value={patient.lastNamePaternal} required autocomplete="family-name" />
					<Field label="Apellido materno" bind:value={patient.lastNameMaternal} />
					<Field label="Número de contrato" bind:value={patient.contractNumber} required placeholder={insurer === 'triple-s' ? 'ZUA123456789' : ''} />
					<Field label="Dirección postal" bind:value={patient.address1} required autocomplete="address-line1" class="sm:col-span-2" />
					<Field label="Pueblo" bind:value={patient.city} required autocomplete="address-level2" />
					<Field label="Código postal" bind:value={patient.zip} required inputmode="numeric" autocomplete="postal-code" />
					<Field label="Teléfono" bind:value={patient.phone} type="tel" required autocomplete="tel" />
					{#if insurer === 'first-medical'}
						<Field label="Fecha de nacimiento" type="date" bind:value={patient.dob} required />
					{/if}
				</div>
				<label class="mt-4 flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={patient.hasOtherCoverage} class="rounded text-teal-700" />
					Tengo otro seguro médico
				</label>
				{#if attempted}<div class="mt-4"><Problems problems={youProblems} /></div>{/if}
			{:else if step === 'review'}
				{#if pdf.status === 'loading'}
					<p class="animate-pulse text-sm text-slate-500">Llenando su formulario…</p>
				{:else if pdf.status === 'error'}
					<p class="text-sm text-rose-700" role="alert">No se pudo preparar el formulario: {pdf.message}.</p>
					<button type="button" class="mt-3 {secondary}" onclick={generate}>Intentar de nuevo</button>
				{:else if pdf.status === 'ready' && !editing}
					<h2 class="text-lg font-semibold text-slate-900">Revise su formulario</h2>
					<dl class="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
						<dt class="text-slate-500">Nombre</dt><dd>{patientFullName(patient)}</dd>
						<dt class="text-slate-500">Contrato</dt><dd class="font-mono">{patient.contractNumber}</dd>
						<dt class="text-slate-500">Dirección</dt><dd>{patient.address1}, {patient.city}, {patient.state} {patient.zip}</dd>
						<dt class="text-slate-500">Teléfono</dt><dd>{patient.phone}</dd>
						{#if patient.dob}<dt class="text-slate-500">Nacimiento</dt><dd>{isoToForm(patient.dob)}</dd>{/if}
						<dt class="text-slate-500">Servicio</dt><dd>{serviceName}</dd>
						{#if received}
							<dt class="text-slate-500">Fecha</dt><dd>{isoToForm(date)}</dd>
							<dt class="text-slate-500">Pagó</dt><dd>${Number.parseFloat(paid).toFixed(2)}</dd>
						{/if}
						{#if providerName}<dt class="text-slate-500">Proveedor</dt><dd>{providerName}{providerSpecialty ? ` · ${providerSpecialty}` : ''}</dd>{/if}
					</dl>
					<a href={pdf.url} target="_blank" rel="noopener" class="mt-4 inline-block text-sm font-medium text-teal-700 underline">
						Ver el formulario completo (PDF)
					</a>
					<p class="mt-6 font-semibold text-slate-900">¿Todo se ve correcto?</p>
					<div class="mt-3 grid grid-cols-2 gap-3">
						<button type="button" class={primary} onclick={() => (step = 'send')}>Sí, todo correcto</button>
						<button type="button" class={secondary} onclick={() => (editing = true)}>Corregir algo</button>
					</div>
				{:else if editing}
					<h2 class="text-lg font-semibold text-slate-900">Corrija lo que haga falta</h2>
					{#if received}
						<div class="mt-4 grid gap-4 sm:grid-cols-2">
							<Field label="Fecha del servicio" type="date" bind:value={date} required />
							<Field label="Cuánto pagó ($)" bind:value={paid} inputmode="decimal" required />
							<Field label="Nombre del proveedor" bind:value={providerName} />
							<Field label="Especialidad del proveedor" bind:value={providerSpecialty} />
						</div>
					{/if}
					<div class="mt-4"><PatientFields bind:patient showPlan={false} /></div>
					{#if insurer === 'first-medical'}
						<div class="mt-4 w-48"><Field label="Fecha de nacimiento" type="date" bind:value={patient.dob} /></div>
					{/if}
					<button type="button" class="mt-6 w-full {primary}" onclick={generate}>Guardar y volver a llenar</button>
				{/if}
			{:else if step === 'send'}
				{#if received}
					<h2 class="text-lg font-semibold text-slate-900">Envíelo a su proveedor</h2>
					<p class="mt-1 text-sm text-slate-600">
						{insurer === 'triple-s'
							? 'Su proveedor completa y firma la sección E y se lo devuelve con el recibo.'
							: 'Su proveedor le da el recibo original con NPI, diagnóstico y códigos.'}
					</p>
					<div class="mt-4 grid gap-4 sm:grid-cols-2">
						<Field label="Su email" type="email" bind:value={myEmail} autocomplete="email" />
						<Field label="Email del proveedor" type="email" bind:value={providerEmail} />
					</div>
					<label class="mt-4 block">
						<span class="text-sm font-medium text-slate-700">Mensaje</span>
						<textarea
							readonly
							rows="9"
							class="mt-1 block w-full rounded-lg border-slate-300 bg-slate-50 text-sm"
						>{emailBody}</textarea>
					</label>
					<div class="mt-4 flex flex-col gap-2 sm:flex-row">
						{#if canShareFiles}
							<button type="button" class={primary} onclick={share}>Enviar con el PDF</button>
						{/if}
						{#if pdf.status === 'ready'}
							<a
								href={mailto}
								onclick={() => {
									if (pdf.status !== 'ready') return;
									const a = document.createElement('a');
									a.href = pdf.url;
									a.download = 'reembolso.pdf';
									a.click();
								}}
								class="{canShareFiles ? secondary : primary} text-center"
							>
								Abrir en mi email
							</a>
						{/if}
						<button type="button" class={secondary} onclick={copyMessage}>{copied ? '¡Copiado!' : 'Copiar mensaje'}</button>
					</div>
					<p class="mt-2 text-xs text-slate-500">
						El email sale de su propia cuenta. Healing Aura no envía ni guarda nada.
						{canShareFiles ? '' : 'Al abrir su email descargamos el PDF para que lo adjunte.'}
					</p>
					<div class="mt-6 border-t border-slate-100 pt-4">
						<p class="text-sm font-semibold text-slate-800">¿Prefiere imprimirlo?</p>
						{#if pdf.status === 'ready'}
							<a href={pdf.url} download="reembolso.pdf" class="mt-2 inline-block {secondary}">Descargar para imprimir</a>
						{/if}
					</div>
					<div class="mt-6 rounded-lg bg-teal-50 p-4 text-sm text-teal-900">
						<p class="font-semibold">Cuando su proveedor se lo devuelva, firme y envíe todo.</p>
						<div class="mt-2"><SendTo {insurer} {deadline} /></div>
					</div>
				{:else}
					<h2 class="text-lg font-semibold text-slate-900">Llévelo a su cita o entrégueselo al proveedor</h2>
					{#if pdf.status === 'ready'}
						<a href={pdf.url} download="reembolso.pdf" class="mt-4 inline-block {primary}">Descargar para imprimir</a>
					{/if}
					<p class="mt-4 text-sm text-slate-700">{appointmentRequest(insurer)}</p>
					{#if preauth}
						<p class="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
							<Linked text={preauth} {insurer} />
						</p>
					{/if}
					<div class="mt-4 rounded-lg bg-teal-50 p-4 text-sm text-teal-900">
						<p class="font-semibold">Después del servicio, añada la fecha y lo pagado, y firme.</p>
						<div class="mt-2"><SendTo {insurer} /></div>
					</div>
				{/if}
			{/if}

			{#if step !== 'received' && step !== 'review' && step !== 'send'}
				<div class="mt-6 flex justify-between gap-3">
					<button type="button" class={secondary} onclick={back}>Atrás</button>
					<button type="button" class={primary} onclick={next}>{step === 'you' ? 'Llenar mi formulario' : 'Continuar'}</button>
				</div>
			{/if}
		</section>
	{/if}
</div>
