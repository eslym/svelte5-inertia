import type { Method, Page, Progress, VisitOptions } from '@inertiajs/core';
import { BROWSER } from 'esm-env';
import { cloneDeep, isEqual, noop } from 'lodash-es';
import { onDestroy, untrack } from 'svelte';
import type { ActionReturn } from 'svelte/action';
import { on } from 'svelte/events';
import { context } from './context';

export type FormDataType = Record<string, any>;
type FormOptions = Omit<VisitOptions, 'data'>;
type FormActionOptions = { method?: Method; url?: string | URL } & FormOptions;

export class FormValidationError extends Error {
	constructor(public errors: Record<string, string | undefined>) {
		super('The given data was invalid.');
	}
}

export class FormCanceledError extends Error {
	constructor() {
		super('The form was canceled.');
	}
}

export class FormProcessingError extends Error {
	constructor() {
		super('The form is still processing.');
	}
}

export interface InertiaForm<Data extends FormDataType> {
	readonly dirty: boolean;
	readonly processing: boolean;
	readonly progress: Progress | null;

	readonly wasSuccessful: boolean;
	readonly wasFailed: boolean;

	data: Data;
	default: Data;
	errors: Record<string, string | string[] | undefined>;

	allErrors(filter?: string | { test(key: string): boolean }): string[];

	errorsWhere(
		filter: string | { test(key: string): boolean }
	): Record<string, string | string[] | undefined>;

	transform(callback: (data: Data) => object): this;

	reset(...fields: (keyof Data)[]): this;

	action(node: HTMLFormElement, options?: FormActionOptions): ActionReturn<FormActionOptions>;

	submit(method: Method, url: string | URL, options?: FormOptions): Promise<Page>;

	get(url: string | URL, options?: FormOptions): Promise<Page>;

	post(url: string | URL, options?: FormOptions): Promise<Page>;

	put(url: string | URL, options?: FormOptions): Promise<Page>;

	patch(url: string | URL, options?: FormOptions): Promise<Page>;

	delete(url: string | URL, options?: FormOptions): Promise<Page>;

	cancel(): this;
}

export interface InertiaFormWithRemember<Data extends FormDataType> extends InertiaForm<Data> {
	remember(callback: (data: Data) => Data): this;

	restore(): this;

	store(): this;
}

export function useForm<Data extends FormDataType>(defaultData: Data): InertiaForm<Data>;
export function useForm<Data extends FormDataType>(
	defaultData: Data,
	rememberKey: string
): InertiaFormWithRemember<Data>;
export function useForm(defaultData: any, rememberKey?: string) {
	let val = defaultData;

	const defaults = createDefaults(
		() => val,
		(value) => (val = value)
	);

	return use_form(defaults, rememberKey);
}

export function useFormDerived<Data extends FormDataType>(
	derivedDefaults: () => Data
): InertiaForm<Data>;
export function useFormDerived<Data extends FormDataType>(
	derivedDefaults: () => Data,
	rememberKey: string
): InertiaFormWithRemember<Data>;
export function useFormDerived(derivedDefaults: () => any, rememberKey?: string) {
	let val = $derived.by(derivedDefaults);

	const defaults = createDefaults(() => val);

	return use_form(defaults, rememberKey);
}

function use_form(defaults: { value: any }, rememberKey?: string) {
	const router = context.get().router;
	let data = $state(cloneDeep(defaults.value));
	let errors = $state<Record<string, string | string[] | undefined>>({});
	let processing = $state(false);
	let progress = $state<Progress | null>(null);

	let wasSuccessful = $state(false);
	let wasFailed = $state(false);

	let cancelToken: { cancel: () => void } | null = null;

	let transform: (data: any) => object = (data: any) => data;

	let dirty = $derived(!isEqual(data, defaults.value));

	function allErrors(filter?: string | { test(key: string): boolean }) {
		if (typeof filter === 'string') {
			const prefix = filter;
			filter = { test: (key: string) => key.startsWith(prefix) };
		} else if (!filter) {
			filter = { test: () => true };
		}
		return Object.entries(errors)
			.filter(([key]) => filter.test(key))
			.map(([_, value]) => value!)
			.flat();
	}

	function errorsWhere(
		filter: string | { test(key: string): boolean }
	): Record<string, string | string[] | undefined> {
		if (typeof filter === 'string') {
			const prefix = filter;
			filter = { test: (key: string) => key.startsWith(prefix) };
		} else if (!filter) {
			filter = { test: () => true };
		}
		return Object.fromEntries(Object.entries(errors).filter(([key]) => filter.test(key)));
	}

	function submit(method: Method, url: string | URL, options: FormOptions = {}) {
		if (!BROWSER) throw new Error('Form can only submit in a browser environment.');
		if (processing) throw new FormProcessingError();
		form.store?.();
		return new Promise<Page>((resolve, reject) => {
			const payload = transform(cloneDeep(untrack(() => data)));
			const opts: Omit<VisitOptions, 'method'> = {
				...options,
				preserveState: options.preserveState ?? 'errors',
				onCancelToken(token) {
					cancelToken = token;
					options.onCancelToken?.(token);
				},
				onCancel() {
					processing = false;
					reject(new FormCanceledError());
					options.onCancel?.();
				},
				onBefore(visit) {
					wasSuccessful = wasFailed = false;
					errors = {};
					progress = null;
					options.onBefore?.(visit);
				},
				onStart(visit) {
					processing = true;
					options.onStart?.(visit);
				},
				onProgress(prog) {
					progress = prog ?? null;
					options.onProgress?.(prog);
				},
				onSuccess(page) {
					processing = false;
					wasSuccessful = true;
					wasFailed = false;
					progress = null;
					errors = {};
					options.onSuccess?.(page);
					resolve(page);
				},
				onError(err) {
					errors = err;
					processing = false;
					wasSuccessful = false;
					wasFailed = true;
					progress = null;
					options.onError?.(err);
					reject(new FormValidationError(err));
				},
				onFinish(visit) {
					processing = false;
					progress = null;
					cancelToken = null;
					options.onFinish?.(visit);
				}
			};
			if (method === 'delete') {
				router.delete(url, {
					...opts,
					data: payload as any
				});
			} else {
				router[method](url, payload as any, opts);
			}
		});
	}

	function action(node: HTMLFormElement, { url, method, ...options }: FormActionOptions = {}) {
		const destroy = on(node, 'submit', (ev: SubmitEvent) => {
			ev.preventDefault();
			const targetUrl = url || node.action;
			const targetMethod = method || ((node.method.toLowerCase() || 'get') as Method);
			form.submit(targetMethod, targetUrl, options);
		});

		function update({ url: u, method: m, ...opts }: FormActionOptions) {
			url = u;
			method = m;
			options = opts;
		}

		return {
			update,
			destroy
		};
	}

	const form: InertiaFormWithRemember<any> = {
		get dirty() {
			return dirty;
		},
		get processing() {
			return processing;
		},
		get progress() {
			return progress;
		},
		get wasSuccessful() {
			return wasSuccessful;
		},
		get wasFailed() {
			return wasFailed;
		},
		get data() {
			return data;
		},
		set data(value: any) {
			data = value;
		},
		get default() {
			return defaults.value;
		},
		set default(value: any) {
			defaults.value = value;
		},
		get errors() {
			return errors;
		},
		set errors(value: Record<string, string | string[] | undefined>) {
			errors = value;
		},
		get allErrors() {
			errors; // Trigger reactivity
			return allErrors;
		},
		get errorsWhere() {
			errors; // Trigger reactivity
			return errorsWhere;
		},
		transform(callback: (data: any) => object) {
			transform = callback;
			return form;
		},
		reset(...fields: string[]) {
			if (fields.length) {
				fields.forEach((field) => (data[field] = cloneDeep(defaults.value[field])));
			} else {
				data = cloneDeep(defaults.value);
			}
			return form;
		},
		action,
		submit,
		get: submit.bind(null, 'get'),
		post: submit.bind(null, 'post'),
		put: submit.bind(null, 'put'),
		patch: submit.bind(null, 'patch'),
		delete: submit.bind(null, 'delete'),
		cancel() {
			cancelToken?.cancel();
			return form;
		},
		remember: undefined!,
		store: undefined!,
		restore: undefined!
	};

	if (rememberKey) {
		let remember = (data: any) => data;
		form.remember = (callback: (data: any) => any) => {
			remember = callback;
			return form;
		};
		form.store = () => {
			if (!BROWSER) return form;
			router.remember({ data: remember(cloneDeep(data)), errors: cloneDeep(errors) }, rememberKey);
			return form;
		};
		form.restore = () => {
			if (!BROWSER) return form;
			const restored = router.restore(rememberKey) as
				| {
						data: any;
						errors: Record<string, string | undefined>;
				  }
				| undefined;
			if (restored) {
				data = cloneDeep(restored.data);
				errors = restored.errors;
			}
			return form;
		};
		form.restore();
		onDestroy(form.store);
	}

	return form;
}

function createDefaults(getter: () => any, setter: (val: any) => void = noop) {
	return Object.defineProperties(
		{},
		{
			value: {
				get: getter,
				set: setter
			}
		}
	) as { value: any };
}
