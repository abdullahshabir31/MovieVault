// Backs the Supabase auth session onto localStorage (persists across
// browser restarts) or sessionStorage (cleared when the tab/browser
// closes), depending on whether the user checked "Remember me" at
// sign-in. This is a real Supabase `auth.storage` adapter — Supabase's
// own session/token handling still does all the work, we're only
// choosing where it's allowed to persist.
const REMEMBER_KEY = "movievault-remember-me";

function hasWindow() {
  return typeof window !== "undefined";
}

// Defaults to "remembered" (localStorage) before the user has ever
// made an explicit choice, e.g. a session restored from a previous
// version of the app.
function isRemembered() {
  if (!hasWindow()) return true;
  return window.localStorage.getItem(REMEMBER_KEY) !== "false";
}

/** Call right before signInWithPassword/signUp with the checkbox state. */
export function setRememberMe(remember) {
  if (!hasWindow()) return;
  window.localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
}

export const authStorage = {
  getItem(key) {
    if (!hasWindow()) return null;
    const primary = isRemembered() ? window.localStorage : window.sessionStorage;
    const fallback = isRemembered() ? window.sessionStorage : window.localStorage;
    // Prefer the storage matching the current preference, but fall back
    // to the other one so a session already on disk isn't dropped just
    // because the flag changed since it was written.
    return primary.getItem(key) ?? fallback.getItem(key);
  },
  setItem(key, value) {
    if (!hasWindow()) return;
    const target = isRemembered() ? window.localStorage : window.sessionStorage;
    const other = isRemembered() ? window.sessionStorage : window.localStorage;
    target.setItem(key, value);
    other.removeItem(key);
  },
  removeItem(key) {
    if (!hasWindow()) return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};
