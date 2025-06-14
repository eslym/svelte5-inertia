<script lang="ts" module>
	import type { ActionReturn } from 'svelte/action';
	import type { Router, GlobalEvent, GlobalEventNames, VisitOptions } from '@inertiajs/core';
	import { on } from 'svelte/events';
	import { noop, pick } from 'lodash-es';

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

	type EventsAttributes<K extends GlobalEventNames> = {
		[P in `onvisit${K}`]?: P extends `onvisit${infer E extends GlobalEventNames}`
			? (event: GlobalEvent<E>) => void
			: never;
	};

	type InertiaAction = {
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

	export type ActionOptions = {
		prefetch?: boolean | 'hover' | 'click';
		cacheFor?: number;
	} & Omit<VisitOptions, 'prefetch'>;

	function is_anchor(target: EventTarget): target is HTMLAnchorElement {
		return target instanceof HTMLElement && target.tagName === 'A';
	}

	const actions = new WeakMap<Router, InertiaAction>();

	export function useLink(): InertiaAction {
		if (!BROWSER) {
			return noop as InertiaAction;
		}
		const router = useRouter();
		if (actions.has(router)) {
			return actions.get(router)!;
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
		actions.set(router, inertia);
		return inertia;
	}
</script>

<script lang="ts">
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { useRouter } from './app.svelte';
	import { BROWSER } from 'esm-env';

	const inertia = useLink();

	let {
		href,
		children,
		as: tag = 'a',
		attrs = {},
		element = $bindable(null),
		...options
	}: { href: string; children: Snippet } & (
		| {
				as?: 'a';
				attrs?: Omit<HTMLAnchorAttributes, 'href'>;
				element?: HTMLAnchorElement | null;
		  }
		| {
				as: 'button';
				attrs?: HTMLButtonAttributes;
				element?: HTMLButtonElement | null;
		  }
	) &
		ActionOptions = $props();

	let hrefAttr = $derived(tag === 'a' ? href : null);
</script>

<svelte:element
	this={tag}
	bind:this={element}
	use:inertia={{
		href,
		...options
	} as any}
	{...attrs as any}
	href={hrefAttr}
	{children}
/>
