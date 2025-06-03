<script lang="ts" module>
	import { type Page, router } from '@inertiajs/core';
	import type { Component } from 'svelte';

	export type ComponentModule = {
		default: Component;
		layout?: Component | Component[];
		layoutProps?: Map<Component, Record<string, any>>;
	};
	export type ComponentResolver = (name: string) => ComponentModule | Promise<ComponentModule>;

	export interface InertiaAppProps {
		initialComponent: ComponentModule;
		initialPage: Page;
		resolveComponent: ComponentResolver;
	}

	type InertiaSveltePage = Readonly<Page> & {
		readonly onUpdated: (listener: (page: InertiaSveltePage) => void) => () => void;
	};

	let pageData: Page = $state({} as any);

	let updated = new Set<(page: InertiaSveltePage) => void>();

	export const page: InertiaSveltePage = {
		get component() {
			return pageData.component;
		},
		get props() {
			return pageData.props;
		},
		get url() {
			return pageData.url;
		},
		get version() {
			return pageData.version;
		},
		get clearHistory() {
			return pageData.clearHistory;
		},
		get encryptHistory() {
			return pageData.encryptHistory;
		},
		get deferredProps() {
			return pageData.deferredProps;
		},
		get rememberedState() {
			return pageData.rememberedState;
		},
		onUpdated(listener: (page: InertiaSveltePage) => void) {
			updated.add(listener);
			return () => updated.delete(listener);
		}
	};
</script>

<script lang="ts">
	import { cloneDeep } from 'lodash-es';

	let { initialComponent, initialPage, resolveComponent }: InertiaAppProps = $props();

	let component: ComponentModule = $state.raw(initialComponent);
	let key: number | null = $state(null);

	let layouts = $derived(
		Array.isArray(component.layout) ? component.layout : component.layout ? [component.layout] : []
	);

	if (typeof globalThis.window !== 'undefined') {
		router.init({
			initialPage,
			resolveComponent,
			swapComponent: async (args) => {
				component = args.component as ComponentModule;
				pageData = cloneDeep(args.page);
				key = args.preserveState ? key : Date.now();
				updated.forEach((c) => c(page));
			}
		});
	}

	pageData = initialPage;
	updated.forEach((c) => c(page));
</script>

{#snippet layout(components: Component[], Children: Component)}
	{#if components.length > 0}
		{@const Layout = layouts[0]}
		{@const layoutProps = component.layoutProps?.get(Layout!) ?? {}}
		<Layout {...pageData.props} {...layoutProps}>
			{@render layout(components.slice(1), Children)}
		</Layout>
	{:else}
		{#key key}
			<Children {...pageData.props} />
		{/key}
	{/if}
{/snippet}

{@render layout(layouts, component.default)}
