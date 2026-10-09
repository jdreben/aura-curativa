<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Healing Aura — Reembolsos fuera de red</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-gradient-to-b from-teal-50 to-white text-slate-900">
	<header class="border-b border-teal-100 bg-white/70 backdrop-blur print:hidden">
		<div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
			<a href={resolve('/')} class="flex items-center gap-2 font-semibold text-teal-800">
				<span class="inline-block h-3 w-3 rounded-full bg-gradient-to-br from-teal-400 to-violet-400"></span>
				Healing Aura
			</a>
			<nav class="flex gap-4 text-sm text-slate-600">
				<a href={resolve('/proveedor')} class="hover:text-teal-700">Proveedor</a>
				<a href={resolve('/paciente')} class="hover:text-teal-700">Paciente</a>
			</nav>
		</div>
	</header>

	<main class="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
		{@render children()}
	</main>

	<footer class="border-t border-slate-200 py-6 text-center text-xs text-slate-500 print:hidden">
		Todo se procesa en su dispositivo. No guardamos datos. Prototipo — no es asesoría médica ni legal.
	</footer>
</div>
