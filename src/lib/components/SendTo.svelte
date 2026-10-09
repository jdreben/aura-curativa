<script lang="ts">
	import type { Insurer } from '../estimate.ts';
	import { CLAIM_RULES, deadlineWords } from '../estimate.ts';

	let { insurer, deadline = '' }: { insurer: Insurer; deadline?: string } = $props();
	const rules = $derived(CLAIM_RULES[insurer]);
</script>

<p>
	{#if rules.email}Envíelo por email a <strong>{rules.email}</strong> o por correo a:{:else}Envíelo por correo a:{/if}
</p>
<address class="my-3 not-italic leading-snug">
	{#each rules.address as line (line)}{line}<br />{/each}
</address>
{#if rules.note}<p class="text-xs opacity-80">{rules.note}</p>{/if}
<p class="mt-2">
	Tiene <strong>{deadlineWords(rules.deadlineDays)}</strong> desde la fecha del servicio para solicitar el reembolso{#if deadline}:
		fecha límite <strong>{deadline}</strong>{/if}.
</p>
