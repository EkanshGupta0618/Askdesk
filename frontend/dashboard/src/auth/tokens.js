// Tokens live in localStorage so a page refresh keeps you logged in.
// Trade-off: any script running on the page can read them, so the dashboard
// must never render untrusted HTML. httpOnly cookies avoid this, at the cost
// of CSRF handling; a reasonable upgrade for production.

const ACCESS_KEY = "askdesk_access";
const REFRESH_KEY = "askdesk_refresh";

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}