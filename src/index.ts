import { type Page, router, setupProgress } from '@inertiajs/core';
import AppComponent, {
	type ComponentModule,
	type ComponentResolver,
	type InertiaAppProps,
	usePage,
	onPageUpdated
} from './app.svelte';
import { BROWSER } from 'esm-env';
import type { render } from 'svelte/server';
import { e } from './escape';

export { default as WhenVisible } from './when-visible.svelte';
export { default as Deferred } from './deferred.svelte';
export { default as Link, inertia, type ActionOptions } from './link.svelte';

export {
	useForm,
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

type SvelteRenderResult = ReturnType<typeof render>;

type CreateInertiaAppOptions = {
	id?: string;
	resolve: ComponentResolver;
	setup(params: {
		el: HTMLElement | null;
		App: typeof AppComponent;
		props: Pick<InertiaAppProps, 'initialComponent' | 'initialPage' | 'resolveComponent'>;
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
	const target = BROWSER ? document.getElementById(id) : null;
	const initialPage = page ?? JSON.parse(target?.dataset.page ?? '{}');
	const resolveComponent = (name: string) => Promise.resolve(resolve(name));

	const [initialComponent] = await Promise.all([
		resolveComponent(initialPage.component),
		router.decryptHistory().catch(() => {})
	]);

	const props: InertiaAppProps = { initialPage, initialComponent, resolveComponent };

	const svelteApp = setup({
		el: target,
		App: AppComponent,
		props
	});

	if (BROWSER && progress) {
		setupProgress(progress);
	} else {
		const { body: html, head } = svelteApp as SvelteRenderResult;
		const body = `<div id="${e(id)}" data-page="${e(JSON.stringify(initialPage))}" data-server-rendered="true">${html}</div>`;

		return {
			body,
			head: [head]
		};
	}
}

export { router, usePage, onPageUpdated, type ComponentResolver, type ComponentModule, type Page };
