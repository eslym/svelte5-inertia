export function e(str: string): string {
	return str.replace(
		/[&<>"']/g,
		(match) =>
			({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;'
			})[match]!
	);
}
