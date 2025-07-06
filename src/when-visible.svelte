<script lang="ts" generics="T extends keyof SvelteHTMLElements = 'div'">
	import type { SvelteHTMLElements } from 'svelte/elements';
	import type { ReloadOptions } from '@inertiajs/core';
	import { onMount, type Snippet } from 'svelte';
	import { BROWSER } from 'esm-env';
	import { context } from './context';

	const router = context.get().router;

	let {
		children,
		fallback,
		data,
		params,
		as = 'div' as any,
		attrs = {},
		buffer = 0,
		always = false
	}: {
		children?: Snippet<[boolean]>;
		fallback?: Snippet<[boolean]>;
		as?: T;
		attrs?: SvelteHTMLElements[T];
		buffer?: number;
		always?: boolean;
	} & (
		| { data: string | string[]; params?: undefined }
		| {
				params: ReloadOptions;
				data?: undefined;
		  }
	) = $props();

	const tag = as;
	const reload = params ?? { only: Array.isArray(data) ? data : [data!] };

	let element: HTMLElement = $state(null!);

	let loaded = $state(false);

	let slot = $derived(loaded ? children : fallback);

	let fetching = $state(false);

	if (BROWSER) {
		onMount(() => {
			const observer = new IntersectionObserver(
				([entry]) => {
					if (!entry!.isIntersecting) return;
					if (!always) observer.disconnect();
					if (fetching) return;
					fetching = true;
					router.reload({
						...reload,
						onStart(visit) {
							fetching = true;
							reload.onStart?.(visit);
						},
						onFinish(page) {
							fetching = false;
							loaded = true;
							reload.onFinish?.(page);
						}
					});
				},
				{ rootMargin: `${buffer}px` }
			);

			observer.observe(element);

			return () => {
				observer.disconnect();
			};
		});
	}
</script>

{#if always || !loaded}
	<svelte:element this={tag} bind:this={element} {...attrs} />
{/if}

{@render slot?.(fetching)}
