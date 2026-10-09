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
		<div class="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4">
			<a href={resolve('/')} class="flex shrink-0 items-center gap-2 text-xl font-bold tracking-tight text-teal-800 sm:gap-3 sm:text-3xl">
				<span class="inline-block h-5 w-5 rounded-full bg-gradient-to-br from-teal-400 to-violet-400 sm:h-8 sm:w-8"></span>
				Healing Aura
			</a>
			<nav class="flex gap-5 whitespace-nowrap text-xl font-semibold tracking-tight sm:gap-8 sm:text-3xl">
				<a href={resolve('/')} class="text-teal-800 hover:underline">¿Me reembolsan?</a>
				<a href={resolve('/comparar')} class="text-teal-800 hover:underline">Comparar planes</a>
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
