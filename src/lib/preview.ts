/**
 * Dev-only "preview session": every real screen renders from sample data, with
 * auth, sync, the API and the local cache switched off. Used to check UI work
 * without signing in. Started from /dev/preview in `next dev`; it can never be
 * on in a production build.
 */

const KEY = "tally-preview";

/** True only in development, in a tab where a preview session was started. */
export function isPreviewSession(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Turn preview on for this tab (sessionStorage, so it ends with the tab). */
export function startPreviewSession(): void {
  if (process.env.NODE_ENV === "production") return;
  window.sessionStorage.setItem(KEY, "1");
}

export function stopPreviewSession(): void {
  window.sessionStorage.removeItem(KEY);
}
