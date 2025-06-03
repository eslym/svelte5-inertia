import { router } from '@inertiajs/core';
import { onDestroy } from 'svelte';
import { cloneDeep } from 'lodash-es';

export function useRemember<State>(initial: State, key?: string) {
	let state = $state((router.restore(key) as State) ?? initial);

	onDestroy(() => router.remember(cloneDeep(state), key));

	return {
		get value() {
			return state;
		},
		set value(value: State) {
			state = value;
		},
		restore() {
			state = (router.restore(key) as State) ?? initial;
		},
		remember() {
			router.remember(state, key);
		}
	};
}
