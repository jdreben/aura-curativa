// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			// The claim wizard's step, so the browser back button moves between steps.
			step?: string;
		}
		// interface Platform {}
	}
}

export {};
