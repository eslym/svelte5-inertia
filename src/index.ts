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

export {
	context as inertiaContext,
	context as Inertia,
	useInertia,
	useLink,
	usePage,
	useRouter,
	type InertiaAction
} from './context';

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
	useScriptElementForInitialPage?: boolean;
};

export async function createInertiaApp({
	id = 'app',
	resolve,
	setup,
	progress,
	page,
	useScriptElementForInitialPage = false
}: CreateInertiaAppOptions) {
	const resolveComponent = (name: string) => Promise.resolve(resolve(name));
	if (BROWSER) {
		const { router, setupProgress } = await import('@inertiajs/core');
		const target = document.getElementById(id);
		const initialPage = useScriptElementForInitialPage
			? JSON.parse(
					document.querySelector(`script[data-page="${e(id)}"][type="application/json"]`)!
						.textContent
				)
			: JSON.parse(target!.getAttribute('data-page')!);
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

		const body = `<div id="${e(id)}"${useScriptElementForInitialPage ? '' : ` data-page="${e(JSON.stringify(page))}"`} data-server-rendered="true">${result.body}</div>`;
		const head = [result.head];

		if (useScriptElementForInitialPage) {
			head.push(
				`<script type="application/json" data-page="${e(id)}">${JSON.stringify(page)
					.replace(/</g, '\\u003C')
					.replace(/\u2028/g, '\\u2028')
					.replace(/\u2029/g, '\\u2029')}</script>`
			);
		}

		return {
			body,
			head
		};
	}
}

export { type ComponentResolver, type ComponentModule, type Page, type Router };
