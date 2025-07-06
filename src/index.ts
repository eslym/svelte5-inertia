import type { Page, Router } from '@inertiajs/core';
import AppComponent, {
	type ComponentModule,
	type ComponentResolver,
	type InertiaAppProps
} from './app.svelte';
import { BROWSER } from 'esm-env';
import type { render } from 'svelte/server';
import { e } from './escape';

export { default as WhenVisible } from './when-visible.svelte';
export { default as Deferred } from './deferred.svelte';
export { default as Link } from './link.svelte';
export { default as InertiaContext } from './inertia-context.svelte';

export { context as inertiaContext, useInertia, useLink, usePage, useRouter } from './context';

export {
	useForm,
	useFormDerived,
	FormProcessingError,
	FormCanceledError,
	FormValidationError,
	type InertiaForm,
	type InertiaFormWithRemember,
	type FormDataType
} from './form.svelte';

export { useRemember } from './remember.svelte';
export { usePoll } from './poll';
export { usePrefetch } from './prefetch.svelte';
export * from './layout';

type SvelteRenderResult = ReturnType<typeof render>;

type CreateInertiaAppOptions = {
	id?: string;
	resolve: ComponentResolver;
	setup(params: {
		el: HTMLElement | null;
		App: typeof AppComponent;
		props: Pick<
			InertiaAppProps,
			'initialComponent' | 'initialPage' | 'resolveComponent' | 'router'
		>;
	}): void | AppComponent | SvelteRenderResult;
	progress?:
		| false
		| {
				delay?: number;
				color?: string;
				includeCSS?: boolean;
				showSpinner?: boolean;
		  };
	page?: Page;
};

export async function createInertiaApp({
	id = 'app',
	resolve,
	setup,
	progress,
	page
}: CreateInertiaAppOptions) {
	const resolveComponent = (name: string) => Promise.resolve(resolve(name));
	if (BROWSER) {
		const { router, setupProgress } = await import('@inertiajs/core');
		const target = document.getElementById(id);
		const initialPage = page ?? JSON.parse(target?.dataset.page ?? '{}');
		const [initialComponent] = await Promise.all([
			resolveComponent(initialPage.component),
			router.decryptHistory().catch(() => {})
		]);

		setup({
			el: target,
			App: AppComponent,
			props: {
				initialPage,
				initialComponent,
				resolveComponent,
				router
			}
		});

		if (progress) {
			setupProgress(progress);
		}
	} else {
		const initialComponent = await resolveComponent(page!.component);
		const result = setup({
			el: null,
			App: AppComponent,
			props: {
				initialPage: page!,
				initialComponent,
				resolveComponent,
				router: null!
			}
		}) as SvelteRenderResult;

		return {
			body: `<div id="${e(id)}" data-page="${e(JSON.stringify(page))}" data-server-rendered="true">${result.body}</div>`,
			head: [result.head]
		};
	}
}

export { type ComponentResolver, type ComponentModule, type Page, type Router };
