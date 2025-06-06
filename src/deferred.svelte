<script lang="ts">
	import { usePage } from './app.svelte';
	import type { Snippet } from 'svelte';

	let {
		data,
		children,
		fallback
	}: { data: string | string[]; children: Snippet; fallback: Snippet } = $props();

	let page = usePage();

	let slot = $derived(
		(Array.isArray(data) ? data : [data]).every((k) => typeof page.props[k] !== 'undefined')
			? children
			: fallback
	);
</script>

{@render slot()}
