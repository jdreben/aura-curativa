<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<section class="py-6 text-center">
	<h1 class="text-3xl font-bold tracking-tight text-teal-900 sm:text-4xl">
		Su médico no acepta su plan.<br />Su plan igual le puede reembolsar.
	</h1>
	<p class="mx-auto mt-4 max-w-2xl text-slate-600">
		Healing Aura convierte la solicitud de reembolso fuera de red en un proceso de dos minutos: el
		proveedor prepara la reclamación completa con los datos que ya tiene, el paciente la revisa y la
		acepta desde su celular, y sale un paquete listo para firmar y enviar a Triple-S.
	</p>
	<div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
		<a
			href={resolve('/proveedor')}
			class="rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white shadow hover:bg-teal-800"
		>
			Soy proveedor
		</a>
		<a
			href={resolve('/paciente')}
			class="rounded-xl border border-teal-700 px-6 py-3 font-semibold text-teal-800 hover:bg-teal-50"
		>
			Soy paciente
		</a>
	</div>
</section>

<section class="mt-12 grid gap-4 sm:grid-cols-3">
	<div class="rounded-xl border border-slate-200 bg-white p-5">
		<p class="text-xs font-semibold tracking-wide text-teal-700 uppercase">1 · Proveedor</p>
		<p class="mt-2 text-sm text-slate-700">
			Importa los datos del paciente de su expediente, añade diagnósticos y servicios, y genera un
			código QR.
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
