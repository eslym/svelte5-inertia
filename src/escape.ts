const html_danger = /[&<>"']/g;
const html_replace = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
} as Record<string, string>;

export function e(str: string): string {
	return str.replace(html_danger, (match) => html_replace[match]!);
}
