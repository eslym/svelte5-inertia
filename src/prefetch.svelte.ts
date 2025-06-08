import type { VisitOptions } from '@inertiajs/core';
import { BROWSER } from 'esm-env';
import { onMount } from 'svelte';
import { useRouter } from './app.svelte';

export function usePrefetch(options: VisitOptions = {}) {
	const router = useRouter();
	const cached =
		typeof window === 'undefined' ? null : router.getCached(window.location.pathname, options);
	const inFlight =
		typeof window === 'undefined' ? null : router.getPrefetching(window.location.pathname, options);

	let isPrefetched = $state(cached !== null);
	let isPrefetching = $state(inFlight !== null);
	let lastUpdatedAt: number | null = $state(cached?.staleTimestamp ?? null);

	if (BROWSER) {
		onMount(() => {
			const cleanupPrefetching = router.on('prefetching', ({ detail }) => {
				if (detail.visit.url.pathname === window.location.pathname) {
					isPrefetching = true;
				}
			});
			const cleanupPrefetched = router.on('prefetched', ({ detail }) => {
				if (detail.visit.url.pathname === window.location.pathname) {
					isPrefetched = true;
					isPrefetching = false;
				}
			});

			return () => {
				cleanupPrefetching();
				cleanupPrefetched();
			};
		});
	}

	return {
		get isPrefetched() {
			return isPrefetched;
		},
		get isPrefetching() {
			return isPrefetching;
		},
		get lastUpdatedAt() {
			return lastUpdatedAt;
		},
		flush() {
			router.flush(window.location.pathname, options);
		}
	};
}
