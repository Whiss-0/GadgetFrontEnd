import { createContext, useContext, useState, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import { authApi } from "../api/client";

const AuthContext = createContext(null);

function decodeUser(token) {
  try {
    const claims = jwtDecode(token);
    // ASP.NET Core JWT uses ClaimTypes.Name → serialised as the long URI or "unique_name"
    const username =
      claims["unique_name"] ||
      claims["name"] ||
      claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
      "";
    // ClaimTypes.NameIdentifier → "nameid" or the long URI
    const id =
      claims["nameid"] ||
      claims["sub"] ||
      claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
      "";
    // The API sets a custom claim "user_role_id" with value "1" (Admin), "2" (Mod), "3" (User)
    const roleId = claims["user_role_id"] ?? null;
    return { username, id, roleId };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("gs_token"));
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem("gs_token");
    return t ? decodeUser(t) : null;
  });

  const login = useCallback(async (username, password) => {
    const res = await authApi.login({ username, password });
    const newToken = res.data.token || res.data.accessToken || res.data.access_token;
    if (!newToken) throw new Error("Login succeeded but no token was returned by the API.");
    localStorage.setItem("gs_token", newToken);
    setToken(newToken);
    setUser(decodeUser(newToken));
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("gs_token");
    setToken(null);
    setUser(null);
  }, []);

  // role_id "1" = Admin, "2" = Moderator, "3" = User
  const isAdmin = user?.roleId === "1" || user?.roleId === 1;
  const isMod = isAdmin || user?.roleId === "2" || user?.roleId === 2;

  return (
    <AuthContext.Provider
      value={{ token, user, isAuthenticated: !!token, isAdmin, isMod, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
