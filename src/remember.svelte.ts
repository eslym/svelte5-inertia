import { router } from '@inertiajs/core';
import { onDestroy } from 'svelte';
import { cloneDeep } from 'lodash-es';
import { BROWSER } from 'esm-env';

export function useRemember<State>(initial: State, key?: string) {
	let state = $state(BROWSER ? ((router.restore(key) as State) ?? initial) : initial);

	if (BROWSER) {
		onDestroy(() => router.remember(cloneDeep(state), key));
	}

	return {
		get value() {
			return state;
		},
		set value(value: State) {
			state = value;
		},
		restore() {
			state = BROWSER ? ((router.restore(key) as State) ?? initial) : initial;
		},
		remember() {
			if (!BROWSER) {
				console.warn(
					'Remembering state is only available in the browser. This call will be ignored.'
				);
				return;
			}
			router.remember(state, key);
		}
	};
}
