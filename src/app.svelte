<script lang="ts" module>
	import { type Page, type PageProps, type Router } from '@inertiajs/core';
	import type { Component } from 'svelte';

	export type ComponentModule = {
		default: Component;
		layout?: Component | Component[];
	};
	export type ComponentResolver = (name: string) => ComponentModule | Promise<ComponentModule>;

	export interface InertiaAppProps {
		initialComponent: ComponentModule;
		initialPage: Page;
		resolveComponent: ComponentResolver;
		router: Router;
		onupdate?: (event: CustomEvent<{ page: Page; router: Router }>) => void;
		wrap?: Component<PageProps>;
	}

	function pageProxy(getter: () => Page): Page {
		if (BROWSER) {
			const err = () => {
				throw new Error('Page object is immutable and cannot be modified.');
			};
			return new Proxy({} as any, {
				get(_, prop) {
					return Reflect.get(getter(), prop);
				},
				has(_, prop) {
					return Reflect.has(getter(), prop);
				},
				ownKeys() {
					return Reflect.ownKeys(getter());
				},
				getOwnPropertyDescriptor(_, prop) {
					return Reflect.getOwnPropertyDescriptor(getter(), prop);
				},
				isExtensible() {
					return false;
				},
				// immutable
				set: err,
				defineProperty: err,
				deleteProperty: err,
				setPrototypeOf: err,
				preventExtensions: err
			});
		}
		return getter();
	}
</script>

<script lang="ts">
	import { BROWSER } from 'esm-env';
	import { context, createLink } from './context';

	let {
		initialComponent,
		initialPage,
		resolveComponent,
		router,
		onupdate = undefined,
		wrap = undefined
	}: InertiaAppProps = $props();

	let component: ComponentModule = $state.raw(initialComponent);
	let key: number | null = $state(null);

	let layouts = $derived.by(() => {
		const layouts = [];
		if (wrap) layouts.push(wrap);
		if (component.layout) {
			if (Array.isArray(component.layout)) {
				layouts.push(...component.layout);
			} else {
				layouts.push(component.layout);
			}
		}
		return layouts;
	});

	let pageData = $state.raw(initialPage);
	const proxy = pageProxy(() => pageData);

	const link = createLink(router);
	const ctx = {
		get router() {
			return router;
		},
		get page() {
			return proxy;
		},
		get link() {
			return link;
		}
	};

	context.set(ctx);

	if (BROWSER) {
		// svelte-ignore state_referenced_locally
		router.init({
			initialPage,
			resolveComponent,
			swapComponent: async (args) => {
				component = args.component as ComponentModule;
				pageData = args.page;
				key = args.preserveState ? key : Date.now();
				onupdate?.(new CustomEvent('inertia:page', { detail: { page: pageData, router } }));
			}
		});
		onupdate?.(new CustomEvent('inertia:page', { detail: { page: initialPage, router } }));
	}
</script>

{#snippet layout(components: Component[], Children: Component)}
	{@const _ = console.log(components)}
	{#if components.length > 0}
		{@const [Layout, ...rest] = components}
		<Layout {...pageData.props}>
			{@render layout(rest, Children)}
		</Layout>
	{:else}
		{#key key}
			<Children {...pageData.props} />
		{/key}
	{/if}
{/snippet}

{@render layout(layouts, component.default)}
