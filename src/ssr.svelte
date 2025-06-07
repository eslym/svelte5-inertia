<script lang="ts">
	import type { Page } from '@inertiajs/core';

	let { id, page, html }: { id: string; page: Page; html: string } = $props();
</script>

<div {id} data-page={JSON.stringify(page)} data-server-rendered="true">{@html html}</div>
