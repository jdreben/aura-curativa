<script lang="ts">
	let { problems }: { problems: string[] } = $props();
</script>

{#if problems.length > 0}
	<div class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
		<p class="font-semibold">Antes de continuar, corrija:</p>
		<ul class="mt-2 list-disc space-y-1 pl-5">
			{#each problems as p (p)}<li>{p}</li>{/each}
		</ul>
	</div>
{/if}
