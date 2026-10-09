<script lang="ts">
	import type { Insurer } from '../estimate.ts';
	import { linkFor } from '../justify.ts';

	let { text, insurer }: { text: string; insurer: Insurer } = $props();
	const link = $derived(linkFor(text, insurer));
</script>

{text}{#if link}
	{' '}<a href={link.href} target="_blank" rel="noopener" class="font-medium whitespace-nowrap underline">{link.label} ↗</a>
{/if}
