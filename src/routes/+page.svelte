<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<section class="py-6 text-center">
	<h1 class="text-3xl font-bold tracking-tight text-teal-900 sm:text-4xl">
		Su médico no acepta su plan.<br />Su plan igual le puede reembolsar.
	</h1>
	<p class="mx-auto mt-4 max-w-2xl text-slate-600">
		Healing Aura le dice al proveedor qué es reembolsable bajo el plan del paciente, prepara la
		reclamación completa con los datos que ya tiene, y el paciente solo la revisa y la acepta desde su
		celular.
	</p>
	<a
		href={resolve('/proveedor')}
		class="mt-8 inline-block rounded-xl bg-teal-700 px-8 py-3 font-semibold text-white shadow hover:bg-teal-800"
	>
		Preparar una reclamación
	</a>
</section>

<section class="mt-12 grid gap-4 sm:grid-cols-3">
	<div class="rounded-xl border border-slate-200 bg-white p-5">
		<p class="text-xs font-semibold tracking-wide text-teal-700 uppercase">1 · Proveedor</p>
		<p class="mt-2 text-sm text-slate-700">
			Importa al paciente y su plan, añade la visita, y ve al instante si es reembolsable — y si no,
			qué ruta sí funciona.
		</p>
	</div>
	<div class="rounded-xl border border-slate-200 bg-white p-5">
		<p class="text-xs font-semibold tracking-wide text-teal-700 uppercase">2 · Paciente</p>
		<p class="mt-2 text-sm text-slate-700">
			Escanea el QR, revisa la reclamación completa y la acepta. Su teléfono muestra un código de
			confirmación.
		</p>
	</div>
	<div class="rounded-xl border border-slate-200 bg-white p-5">
		<p class="text-xs font-semibold tracking-wide text-teal-700 uppercase">3 · Paquete</p>
		<p class="mt-2 text-sm text-slate-700">
			El proveedor imprime el formulario oficial de Triple-S, la factura detallada y la hoja de envío.
			Se firma, se sella y se envía.
		</p>
	</div>
</section>

<section class="mt-8 rounded-xl border border-violet-200 bg-violet-50 p-5 text-sm text-violet-900">
	<p class="font-semibold">Privacidad por diseño</p>
	<p class="mt-1">
		No hay base de datos. Los datos de la reclamación viajan dentro del código QR, en la parte del enlace
		que el navegador nunca envía al servidor. El PDF se genera en su dispositivo. Cuando cierra la
		página, no queda nada.
	</p>
</section>
