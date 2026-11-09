import { useCallback, useEffect, useMemo, useState } from "react";

import api from "../api/client";
import { AuthContext } from "./context";
import { clearTokens, getAccessToken, setTokens } from "./tokens";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only show a loading state if there's a saved session to check
  const [loading, setLoading] = useState(() => Boolean(getAccessToken()));

  // Restore the session on page load
  useEffect(() => {
    if (!getAccessToken()) return;
    let cancelled = false;
    api
      .get("/auth/me/")
      .then(({ data }) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => clearTokens())
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The API client fires this when both tokens have expired
  useEffect(() => {
    const handleLogout = () => setUser(null);
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login/", { email, password });
    setTokens(data);
    setUser(data.user);
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register/", payload);
    setTokens(data);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get("/auth/me/");
    setUser(data);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}