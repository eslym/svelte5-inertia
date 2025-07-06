import { onDestroy } from 'svelte';
import { cloneDeep } from 'lodash-es';
import { BROWSER } from 'esm-env';
import { context } from './context';

export function useRemember<State>(initial: State, key?: string) {
	const router = context.get().router;
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
