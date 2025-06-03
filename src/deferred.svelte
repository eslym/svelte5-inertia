<script lang="ts">
	import { page } from './app.svelte';
	import type { Snippet } from 'svelte';

	let {
		data,
		children,
		fallback
	}: { data: string | string[]; children: Snippet; fallback: Snippet } = $props();

	let slot = $derived(
		(Array.isArray(data) ? data : [data]).every((k) => typeof page.props[k] !== 'undefined')
			? children
			: fallback
	);
</script>

{@render slot()}
