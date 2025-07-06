<script lang="ts" module>
	type omit = 'as' | 'href' | 'ref' | 'visit' | 'children';

	type AnchorProps = {
		as?: 'a';
		href: string;
		ref?: HTMLAnchorElement;
		visit?: ActionOptions;
		children?: Snippet;
	} & Omit<HTMLAnchorAttributes, omit>;

	type ButtonProps = {
		as: 'button';
		href: string;
		ref?: HTMLButtonElement;
		visit?: ActionOptions;
		children?: Snippet;
	} & Omit<HTMLButtonAttributes, omit>;

	type Props = AnchorProps | ButtonProps;
</script>

<script lang="ts">
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { context, type ActionOptions } from './context';
	import type { Snippet } from 'svelte';

	const inertia = context.get();

	let {
		href,
		children,
		as: tag = 'a',
		ref = $bindable(null!),
		visit = {},
		...attrs
	}: Props = $props();

	let hrefAttr = $derived(tag === 'a' ? href : null);
</script>

<svelte:element
	this={tag}
	bind:this={ref as any}
	use:inertia.link={{
		...(visit as any),
		href
	} as any}
	{...attrs as any}
	href={hrefAttr}
	{children}
/>
