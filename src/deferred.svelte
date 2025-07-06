<script lang="ts">
	import type { Snippet } from 'svelte';
	import { context } from './context';

	let {
		data,
		children,
		fallback
	}: { data: string | string[]; children: Snippet; fallback: Snippet } = $props();

	const inertia = context.get();

	let slot = $derived(
		(Array.isArray(data) ? data : [data]).every((k) => typeof inertia.page.props[k] !== 'undefined')
			? children
			: fallback
	);
</script>

{@render slot()}
