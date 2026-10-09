<script lang="ts">
	type Props = {
		label: string;
		value: string;
		type?: string;
		placeholder?: string;
		hint?: string;
		required?: boolean;
		class?: string;
		autocomplete?: HTMLInputElement['autocomplete'];
		inputmode?: 'numeric' | 'decimal' | 'tel' | 'text';
	};
	let {
		label,
		value = $bindable(),
		type = 'text',
		placeholder = '',
		hint = '',
		required = false,
		class: className = '',
		autocomplete,
		inputmode
	}: Props = $props();
</script>

<label class="block {className}">
	<span class="text-sm font-medium text-slate-700">
		{label}{#if required}<span class="text-rose-600"> *</span>{/if}
	</span>
	<input
		{type}
		{placeholder}
		{autocomplete}
		{inputmode}
		bind:value
		class="mt-1 block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-teal-600 focus:ring-teal-600"
	/>
	{#if hint}<span class="mt-1 block text-xs text-slate-500">{hint}</span>{/if}
</label>
