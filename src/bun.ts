///<reference types="bun" />

import type { InertiaAppResponse, Page } from '@inertiajs/core';

type ServeOptions = (
	| {
			hostname?: string;
			port?: number;
			reusePort?: boolean;
			unix?: undefined;
	  }
	| {
			hostname?: undefined;
			port?: undefined;
			reusePort?: undefined;
			unix: string;
	  }
) & {
	render(page: Page, request: Request): InertiaAppResponse;
	showError?: boolean;
};

export function createBunServer({
	hostname,
	port = 13714,
	unix,
	reusePort,
	showError = false,
	render
}: ServeOptions): Bun.Server {
	if (Bun.semver.satisfies(Bun.version, '<1.2.3')) {
		throw new Error('Bun version 1.2.3 or higher is required to use this function.');
	}
	const headers = new Headers({
		Server: 'Inertia.js SSR (with Bun)'
	});
	const server = Bun.serve({
		hostname: unix ? undefined : hostname,
		port: unix ? undefined : port,
		reusePort: unix ? undefined : reusePort,
		unix,
		routes: {
			'/health': () => Response.json({ status: 'OK', timestamp: Date.now() }, { headers }),
			'/render': async (req) => Response.json(await render(await req.json(), req), { headers }),
			'/shutdown': () => process.exit(0)
		},
		fetch() {
			return Response.json(
				{
					status: 'NOT_FOUND',
					timestamp: Date.now()
				},
				{ status: 404, headers }
			);
		},
		error(err) {
			console.error(err);
			return Response.json(
				{ status: 'ERROR', error: showError ? `${err}` : undefined, timestamp: Date.now() },
				{ status: 500, headers }
			);
		}
	});
	console.log(`Listening on ${server.url.href}`);
	return server;
}
