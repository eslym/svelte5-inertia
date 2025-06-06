<script lang="ts" module>
	import { type Page, router } from '@inertiajs/core';
	import { getContext, setContext, type Component } from 'svelte';

	const kPage = Symbol('inertia-page');
	const kPageListener = Symbol('inertia-page-listener');

	export type ComponentModule = {
		default: Component;
		layout?: Component | Component[];
	};
	export type ComponentResolver = (name: string) => ComponentModule | Promise<ComponentModule>;

	export interface InertiaAppProps {
		initialComponent: ComponentModule;
		initialPage: Page;
		resolveComponent: ComponentResolver;
		onupdate?: (event: CustomEvent<Page>) => void;
		origin?: URL;
	}

	/**
	 * Returns the current Inertia page data.
	 */
	export function usePage() {
		return getContext<Page>(kPage);
	}

	/**
	 * Registers a listener that will be called whenever the Inertia page is updated.
	 * @param listener - A function that receives the updated page data.
	 */
	export function onPageUpdated(listener: (page: Page) => void) {
		const listeners = getContext<Set<(page: Page) => void>>(kPageListener);
		if (!listeners) {
			throw new Error('onPageUpdated must be used within an InertiaApp context');
		}
		listeners.add(listener);
		return listeners.delete.bind(listeners, listener);
	}
</script>

<script lang="ts">
	import { cloneDeep } from 'lodash-es';
	import { BROWSER } from 'esm-env';

	let { initialComponent, initialPage, resolveComponent, onupdate, origin }: InertiaAppProps =
		$props();

	const updated = new Set<(page: Page) => void>();

	let component: ComponentModule = $state.raw(initialComponent);
	let key: number | null = $state(null);

	let layouts = $derived(
		Array.isArray(component.layout) ? component.layout : component.layout ? [component.layout] : []
	);

	let pageData = $state.raw(transformURL(initialPage));

	// svelte-ignore state_referenced_locally
	setContext(kPage, pageData);

	setContext(kPageListener, updated);

	function transformURL(page: Page): Page {
		const cloned = cloneDeep(page);
		if (!origin) {
			return cloned;
		}
		cloned.url = new URL(cloned.url, origin).href;
		return cloned;
	}

	if (BROWSER) {
		// svelte-ignore state_referenced_locally
		router.init({
			initialPage: pageData,
			resolveComponent,
			swapComponent: async (args) => {
				component = args.component as ComponentModule;
				pageData = transformURL(args.page);
				key = args.preserveState ? key : Date.now();
				onupdate?.(new CustomEvent('inertia:page', { detail: pageData }));
				updated.forEach((c) => c(pageData));
			}
		});
		// svelte-ignore state_referenced_locally
		onupdate?.(new CustomEvent('inertia:page', { detail: pageData }));
		updated.forEach((c) => c(pageData));
	}
</script>

{#snippet layout(components: Component[], Children: Component)}
	{#if components.length > 0}
		{@const Layout = layouts[0]}
		<Layout {...pageData.props}>
			{@render layout(components.slice(1), Children)}
		</Layout>
	{:else}
		{#key key}
			<Children {...pageData.props} />
		{/key}
	{/if}
{/snippet}

{@render layout(layouts, component.default)}
