import { Context } from 'runed';
import type { GlobalEvent, GlobalEventNames, Page, Router, VisitOptions } from '@inertiajs/core';
import type { ActionReturn } from 'svelte/action';
import { BROWSER } from 'esm-env';
import { noop, pick } from 'lodash-es';
import { on } from 'svelte/events';

export type ActionOptions = {
	prefetch?: boolean | 'hover' | 'click';
	cacheFor?: number;
} & Omit<VisitOptions, 'prefetch'>;

export type InertiaContext = {
	readonly page: Page;
	readonly router: Router;
	readonly link: InertiaAction;
};

type EventsAttributes<K extends GlobalEventNames> = {
	[P in `onvisit${K}`]?: P extends `onvisit${infer E extends GlobalEventNames}`
		? (event: GlobalEvent<E>) => void
		: never;
};

export type InertiaAction = {
	(
		node: HTMLAnchorElement,
		options?: ActionOptions
	): ActionReturn<ActionOptions, { href: string } & EventsAttributes<TriggerEvents>>;
	(
		node: HTMLElement,
		options: { href: string } & ActionOptions
	): ActionReturn<{ href: string } & ActionOptions, EventsAttributes<TriggerEvents>>;
};

type TriggerEvents =
	| 'start'
	| 'progress'
	| 'success'
	| 'error'
	| 'finish'
	| 'prefetched'
	| 'prefetching';

export const context = new Context<InertiaContext>('inertia');

function is_anchor(target: EventTarget): target is HTMLAnchorElement {
	return target instanceof HTMLElement && target.tagName === 'A';
}

function shouldIntercept(
	event: Pick<
		MouseEvent,
		| 'altKey'
		| 'ctrlKey'
		| 'defaultPrevented'
		| 'target'
		| 'currentTarget'
		| 'metaKey'
		| 'shiftKey'
		| 'button'
	>
): boolean {
	const isLink = (event.currentTarget as HTMLElement).tagName.toLowerCase() === 'a';

	return !(
		(event.target && (event?.target as HTMLElement).isContentEditable) ||
		event.defaultPrevented ||
		(isLink && event.altKey) ||
		(isLink && event.ctrlKey) ||
		(isLink && event.metaKey) ||
		(isLink && event.shiftKey) ||
		(isLink && 'button' in event && event.button !== 0)
	);
}

export function createLink(router: Router): InertiaAction {
	if (!BROWSER) {
		return noop as InertiaAction;
	}
	function inertia(node: HTMLElement, options: { href?: string } & ActionOptions = {}) {
		const offprefetch: (() => void)[] = [];
		let opts: { href?: string } & ActionOptions = {};

		let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

		function get_href() {
			const href = is_anchor(node) ? node.href : opts.href;
			if (!href) {
				throw new Error('Missing href');
			}
			return href;
		}

		function params() {
			return pick(
				opts,
				'method',
				'data',
				'only',
				'replace',
				'preserveScroll',
				'preserveState',
				'except',
				'async'
			);
		}

		function prefetch() {
			const url = new URL(get_href(), window.location.href);
			if (url.origin !== location.origin) {
				return;
			}
			router.prefetch(
				url,
				{
					...params(),
					onPrefetching(visit) {
						node.dispatchEvent(new CustomEvent('visitprefetching', { detail: { visit } }));
						opts.onPrefetching?.(visit);
					},
					onPrefetched(response, visit) {
						node.dispatchEvent(
							new CustomEvent('visitprefetched', {
								detail: {
									response,
									visit,
									fetchedAt: Date.now()
								}
							})
						);
						opts.onPrefetched?.(response, visit);
					}
				},
				{
					cacheFor: opts.cacheFor ?? (opts.prefetch ? 0 : 30_000)
				}
			);
		}

		function update(val: { href?: string } & ActionOptions = {}) {
			if (val.prefetch !== options.prefetch) {
				offprefetch.forEach((c) => c());
				offprefetch.splice(0, offprefetch.length);
				switch (val.prefetch) {
					case 'hover':
					case true:
						offprefetch.push(
							on(node, 'mouseenter', () => {
								hoverTimeout = setTimeout(prefetch, 75);
							})
						);
						offprefetch.push(
							on(node, 'mouseleave', () => {
								if (hoverTimeout) {
									clearTimeout(hoverTimeout);
									hoverTimeout = null;
								}
							})
						);
						break;
					case 'click':
						offprefetch.push(on(node, 'mousedown', prefetch));
						break;
				}
			}
			opts = val;
		}

		const offclick = on(node, 'click', (e) => {
			if (!shouldIntercept(e)) return;
			const url = new URL(get_href(), window.location.href);
			if (url.origin !== location.origin) {
				return;
			}
			e.preventDefault();
			router.visit(url, {
				...params(),
				...pick(opts, 'onBefore', 'onCancel', 'onCancelToken'),
				onStart(visit) {
					node.dispatchEvent(new CustomEvent('visitstart', { detail: { visit } }));
					opts.onStart?.(visit);
				},
				onProgress(progress) {
					node.dispatchEvent(new CustomEvent('visitprogress', { detail: { progress } }));
					opts.onProgress?.(progress);
				},
				onSuccess(page) {
					node.dispatchEvent(new CustomEvent('visitsuccess', { detail: { page } }));
					opts.onSuccess?.(page);
				},
				onError(errors) {
					node.dispatchEvent(new CustomEvent('visiterror', { detail: { errors } }));
					opts.onError?.(errors);
				},
				onFinish(visit) {
					node.dispatchEvent(new CustomEvent('visitfinish', { detail: { visit } }));
					opts.onFinish?.(visit);
				}
			});
		});

		return {
			update,
			destroy() {
				offclick();
				offprefetch.forEach((c) => c());
			}
		};
	}
	return inertia;
}

export function useInertia(): InertiaContext {
	return context.get();
}

/** @deprecated */
export function usePage(): Page {
	return context.get().page;
}

/** @deprecated */
export function useRouter(): Router {
	return context.get().router;
}

/** @deprecated */
export function useLink(): InertiaAction {
	return context.get().link;
}
