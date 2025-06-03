import { type Page, router, setupProgress } from '@inertiajs/core';
import escape from 'html-escape';
import AppComponent, {
	type ComponentModule,
	type ComponentResolver,
	type InertiaAppProps,
	page
} from './app.svelte';
import { BROWSER } from 'esm-env';

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

type SvelteRenderResult = { html: string; head: string; css?: { code: string } };

type CreateInertiaAppOptions = {
	id?: string;
	resolve: ComponentResolver;
	setup(params: {
		el: HTMLElement | null;
		App: typeof AppComponent;
		props: InertiaAppProps;
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

	if (!BROWSER) {
		const { html, head, css } = svelteApp as SvelteRenderResult;

		return {
			body: `<div data-server-rendered="true" id="${id}" data-page="${escape(JSON.stringify(initialPage))}">${html}</div>`,
			head: [head, css ? `<style data-vite-css>${css.code}</style>` : '']
		};
	}

	if (progress) {
		setupProgress(progress);
	}
}

export { router, page, type ComponentResolver, type ComponentModule };
