import type { Component } from 'svelte';
import type { ComponentResolver } from './app.svelte';

export type HierarchyLayoutModule = {
	default: Component;
	layout?: Promise<HierarchyLayoutModule> | HierarchyLayoutModule;
};

export type HierarchyLayoutResolver = (
	name: string
) => Promise<HierarchyLayoutModule> | HierarchyLayoutModule;

/**
 * Converts a hierarchy layout resolver into a component resolver.
 * This layout resolution strategy is closer to human understanding of inheritance.
 * This can avoid errors but there is a high chance of causing waterfall loading.
 *
 * ```svelte
 * <script lang="ts" module>
 *   export const layout = import('@/layouts/layout.svelte');
 * </script>
 * ```
 * or
 * ```svelte
 * <script lang="ts" module>
 *   export * as layout from '@/layouts/layout.svelte';
 * </script>
 * ```
 * @param resolver - The hierarchy layout resolver function that resolves a component name to a module.
 * @returns A component resolver function that returns a component and its layout.
 */
export function hierarchyLayout(resolver: HierarchyLayoutResolver): ComponentResolver {
	return async (name: string) => {
		const module = await resolver(name);
		const layout: Component[] = [];
		const resolved = new Set<Component>([module.default]);
		for (let current = await next(module); current; current = await next(current)) {
			if (resolved.has(current.default)) {
				throw new Error('Circular layout detected in component: ' + name);
			}
			layout.unshift(current.default);
		}
		return {
			default: module.default,
			layout
		};
	};
}

async function next(module: HierarchyLayoutModule): Promise<HierarchyLayoutModule | undefined> {
	if (module.layout instanceof Promise) {
		return await module.layout;
	} else {
		return module.layout;
	}
}
