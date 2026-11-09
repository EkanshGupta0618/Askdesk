import axios from "axios";

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "../auth/tokens";

const api = axios.create({ baseURL: "/api" });

// Attach the access token to every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Endpoints where a 401 means "wrong credentials", not "token expired"
const NO_REFRESH = ["/auth/login/", "/auth/register/", "/auth/refresh/"];

// One shared refresh request, even if several calls fail at the same moment
let refreshPromise = null;

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("No refresh token");
  // Plain axios, so this request skips the interceptors below
  const { data } = await axios.post("/api/auth/refresh/", { refresh });
  setTokens({ access: data.access, refresh: data.refresh });
  return data.access;
}

// When the access token expires, refresh it once and retry the original request
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const shouldRefresh =
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !NO_REFRESH.includes(original.url);

    if (shouldRefresh) {
      original._retried = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const access = await refreshPromise;
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      } catch {
        // The refresh token has expired too: sign out everywhere
        clearTokens();
        window.dispatchEvent(new Event("auth:logout"));
      }
    }
    return Promise.reject(error);
  },
);

export default api;