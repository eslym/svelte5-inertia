import type { PollOptions, ReloadOptions } from '@inertiajs/core';
import { onDestroy, onMount } from 'svelte';
import { context } from './context';

export function usePoll(
	interval: number,
	requestOptions: ReloadOptions = {},
	options: PollOptions = {
		keepAlive: false,
		autoStart: true
	}
) {
	const router = context.get().router;
	const { stop, start } = router.poll(interval, requestOptions, {
		...options,
		autoStart: false
	});

	onMount(() => {
		if (options.autoStart ?? true) {
			start();
		}
	});

	onDestroy(() => {
		stop();
	});

	return { stop, start };
}
