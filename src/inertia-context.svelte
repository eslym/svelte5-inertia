<script lang="ts">
	import type { Snippet } from 'svelte';
	import { context, type InertiaContext } from './context';

	let {
		children
	}: {
		children: Snippet<[context: InertiaContext]>;
	} = $props();

	const ctx = context.get();
</script>

{@render children(ctx)}
