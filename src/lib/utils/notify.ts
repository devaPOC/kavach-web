// Simple client-side notification shim.
// Centralizes user feedback so we can swap in a toast system later without touching call sites.
export const notify = {
	success(message: string) {
		if (typeof window !== 'undefined') {
			// Temporary: use alert; replace with toast UI later
			window.alert(message);
		}
	},
	error(message: string) {
		if (typeof window !== 'undefined') {
			// Temporary: use alert; replace with toast UI later
			window.alert(message);
		}
	}
};
