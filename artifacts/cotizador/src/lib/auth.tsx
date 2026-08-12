import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveUser {
  id: number;
  nombre: string;
  correo: string;
  rol?: string;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const AUTH_TOKEN_KEY = "cotizador.authToken";
const ACTIVE_USER_KEY = "cotizador.activeUser";

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getStoredUser(): ActiveUser | null {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY);
    return raw ? (JSON.parse(raw) as ActiveUser) : null;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(ACTIVE_USER_KEY);
}

// ─── Auth Context ─────────────────────────────────────────────────────────────

interface AuthCtx {
  user: ActiveUser | null;
  login: (user: ActiveUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ActiveUser | null>(() => getStoredUser());

  // Refrescar el rol desde el servidor para sesiones guardadas antes de que
  // existiera el campo `rol` (evita tener que volver a iniciar sesión).
  useEffect(() => {
    const token = getAuthToken();
    if (!token || !user) return;
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((me: ActiveUser | null) => {
        if (me && me.rol && me.rol !== user.rol) {
          const updated = { ...user, rol: me.rol };
          localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(updated));
          setUser(updated);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback((u: ActiveUser, token: string) => {
    setAuthToken(token);
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  return useContext(AuthContext);
}
