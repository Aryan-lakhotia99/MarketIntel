"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { insforge } from "@/lib/insforge/client";
import { getCurrentInsforgeUser, logoutInsforge } from "@/app/actions/auth";

// Interface for User
export interface User {
  id: number | string; // number for FastAPI users, UUID string for InsForge OAuth users
  email: string;
  name?: string;
  profilePic?: string;
  createdAt: string;
  authProvider?: "fastapi" | "insforge"; // tracks which auth system authenticated this user
}

// Interface for Watchlist
export interface Watchlist {
  id: number;
  name: string;
  items: string[];
}

// Interface for Toast
export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (email: string, name: string, profilePic: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string | undefined>;
  resetPassword: (email: string, token: string, newPassword: string) => Promise<void>;
  
  // Watchlist states & CRUD operations
  watchlists: Watchlist[];
  activeWatchlistId: number | null;
  setActiveWatchlistId: (id: number | null) => void;
  createWatchlist: (name: string) => Promise<void>;
  addToWatchlist: (watchlistId: number, symbol: string) => Promise<void>;
  removeFromWatchlist: (watchlistId: number, symbol: string) => Promise<void>;
  fetchWatchlists: () => Promise<void>;

  // Toast utilities
  toasts: Toast[];
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";
// Watchlist operations are served by Next.js Route Handlers backed by @insforge/sdk
const WL_BASE = "/api/watchlists";

// Helper functions for cookie management
function setCookie(name: string, value: string, days = 1) {
  if (typeof window === "undefined") return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = "; expires=" + date.toUTCString();
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}

function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function eraseCookie(name: string) {
  if (typeof window === "undefined") return;
  document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const toastIdCounter = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    toastIdCounter.current += 1;
    const id = `toast-${toastIdCounter.current}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  // Check auth state on mount — supports BOTH FastAPI JWT and InsForge OAuth sessions
  useEffect(() => {
    async function checkAuth() {
      // 1. Check InsForge session first (set by OAuth callback via insforge_access_token cookie)
      try {
        const u = await getCurrentInsforgeUser();
        if (u) {
          setUser({
            id: u.id,
            email: u.email,
            name: (u.profile as any)?.name ?? u.email.split("@")[0],
            profilePic: (u.profile as any)?.avatar_url ?? undefined,
            createdAt: u.createdAt ?? new Date().toISOString(),
            authProvider: "insforge",
          });
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("getCurrentInsforgeUser error:", err);
      }

      // 2. Fall back to FastAPI JWT (email/password users)
      const token = getCookie("token") || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const userData = await res.json();
          setUser({ ...userData, authProvider: "fastapi" });
        } else {
          eraseCookie("token");
          localStorage.removeItem("token");
          setUser(null);
        }
      } catch (err) {
        console.error("Error verifying authentication token:", err);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  // Sync Watchlist database data based on user login state
  // Uses Next.js Route Handlers backed by @insforge/sdk (real InsForge Postgres)
  // Token is the FastAPI JWT (cookie/localStorage) OR the InsForge access token (cookie)
  const createDefaultWatchlist = useCallback(async (token: string) => {
    try {
      const res = await fetch(WL_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: "Default" })
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlists([data]);
        setActiveWatchlistId(data.id);
      }
    } catch (err) {
      console.error("Failed to create default watchlist:", err);
    }
  }, []);

  const fetchWatchlists = useCallback(async () => {
    // For InsForge OAuth users, the watchlist route handler reads the insforge_access_token cookie.
    // We pass it as Authorization header as well, but the Route Handler will prefer it.
    const fastapiToken = getCookie("token") || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    const insforgeToken = getCookie("insforge_access_token");
    const token = fastapiToken || insforgeToken;
    if (!token) return;
    
    try {
      const res = await fetch(WL_BASE, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.length === 0) {
          await createDefaultWatchlist(token);
        } else {
          setWatchlists(data);
          if (!activeWatchlistId || !data.some((wl: any) => wl.id === activeWatchlistId)) {
            setActiveWatchlistId(data[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load user watchlists:", err);
    }
  }, [activeWatchlistId, createDefaultWatchlist]);

  useEffect(() => {
    if (user) {
      fetchWatchlists();
    } else {
      setWatchlists([]);
      setActiveWatchlistId(null);
    }
  }, [user, fetchWatchlists]);

  // Handle route protection
  useEffect(() => {
    if (loading) return;

    const isAuthPage = ["/login", "/signup", "/forgot-password"].includes(pathname || "");
    const isAuthenticated = !!user;

    if (!isAuthenticated && !isAuthPage) {
      router.push("/login");
    } else if (isAuthenticated && isAuthPage) {
      router.push("/");
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Invalid email or password");
      }

      const token = data.accessToken;
      setCookie("token", token, 1);
      localStorage.setItem("token", token);

      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (meRes.ok) {
        const userData = await meRes.json();
        setUser(userData);
        showToast("Logged in successfully!", "success");
        router.push("/");
      } else {
        throw new Error("Could not retrieve profile info");
      }
    } catch (err: any) {
      showToast(err.message || "Login failed", "error");
      throw err;
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Signup failed");
      }

      const token = data.accessToken;
      setCookie("token", token, 1);
      localStorage.setItem("token", token);

      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (meRes.ok) {
        const userData = await meRes.json();
        setUser(userData);
        showToast("Account created successfully!", "success");
        router.push("/");
      } else {
        throw new Error("Could not retrieve profile info");
      }
    } catch (err: any) {
      showToast(err.message || "Signup failed", "error");
      throw err;
    }
  };

  const loginWithGoogle = async (email: string, name: string, profilePic: string, token: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, name, profilePic, token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Google authentication failed");
      }

      const localToken = data.accessToken;
      setCookie("token", localToken, 1);
      localStorage.setItem("token", localToken);

      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${localToken}` },
      });
      if (meRes.ok) {
        const userData = await meRes.json();
        setUser(userData);
        showToast("Logged in with Google!", "success");
        router.push("/");
      } else {
        throw new Error("Could not retrieve profile info");
      }
    } catch (err: any) {
      showToast(err.message || "Google login failed", "error");
      throw err;
    }
  };

  const logout = async () => {
    try {
      // Sign out from InsForge client memory/session
      await insforge.auth.signOut();
    } catch (err) {
      console.error("InsForge signOut error:", err);
    }
    try {
      // Clear InsForge auth cookies on the server side
      await logoutInsforge();
    } catch (err) {
      console.error("InsForge logout Server Action error:", err);
    }
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST" });
    } catch (err) {
      console.error("Backend logout cleanup error:", err);
    } finally {
      eraseCookie("token");
      localStorage.removeItem("token");
      setUser(null);
      setWatchlists([]);
      setActiveWatchlistId(null);
      showToast("Logged out successfully.", "info");
      router.push("/login");
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Password recovery request failed");
      }

      showToast("Verification code generated. Please check console.", "success");
      return data.token;
    } catch (err: any) {
      showToast(err.message || "Recovery failed", "error");
      throw err;
    }
  };

  const resetPassword = async (email: string, token: string, newPassword: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Password reset failed");
      }

      showToast("Password successfully reset! You can now log in.", "success");
      router.push("/login");
    } catch (err: any) {
      showToast(err.message || "Reset failed", "error");
      throw err;
    }
  };

  const createWatchlist = async (name: string) => {
    const token = getCookie("token") || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    if (!token) return;

    try {
      const res = await fetch(WL_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to create watchlist");
      }
      showToast(`Watchlist "${name}" created!`, "success");
      await fetchWatchlists();
      setActiveWatchlistId(data.id);
    } catch (err: any) {
      showToast(err.message || "Failed to create watchlist", "error");
      throw err;
    }
  };

  const addToWatchlist = async (watchlistId: number, symbol: string) => {
    const fastapiToken = getCookie("token") || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    const insforgeToken = getCookie("insforge_access_token");
    const token = fastapiToken || insforgeToken;
    if (!token) return;

    // Save previous state for rollback
    const previousWatchlists = [...watchlists];

    // Optimistically update local state immediately
    setWatchlists(prev => prev.map(wl => {
      if (wl.id === watchlistId) {
        if (!wl.items.includes(symbol)) {
          return { ...wl, items: [...wl.items, symbol] };
        }
      }
      return wl;
    }));

    try {
      const res = await fetch(`${WL_BASE}/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ watchlistId, symbol })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to add stock");
      }
      showToast(`Added ${symbol} to watchlist.`, "success");
    } catch (err: any) {
      // Revert to previous state
      setWatchlists(previousWatchlists);
      showToast(err.message || "Failed to add stock", "error");
      throw err;
    }
  };

  const removeFromWatchlist = async (watchlistId: number, symbol: string) => {
    const fastapiToken = getCookie("token") || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    const insforgeToken = getCookie("insforge_access_token");
    const token = fastapiToken || insforgeToken;
    if (!token) return;

    // Save previous state for rollback
    const previousWatchlists = [...watchlists];

    // Optimistically update local state immediately
    setWatchlists(prev => prev.map(wl => {
      if (wl.id === watchlistId) {
        return { ...wl, items: wl.items.filter(item => item !== symbol) };
      }
      return wl;
    }));

    try {
      const res = await fetch(`${WL_BASE}/remove`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ watchlistId, symbol })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to remove stock");
      }
      showToast(`Removed ${symbol} from watchlist.`, "info");
    } catch (err: any) {
      // Revert to previous state
      setWatchlists(previousWatchlists);
      showToast(err.message || "Failed to remove stock", "error");
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout,
        forgotPassword,
        resetPassword,
        
        // Watchlist state & CRUD
        watchlists,
        activeWatchlistId,
        setActiveWatchlistId,
        createWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        fetchWatchlists,
        
        // Toast alerts
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between min-w-[280px] max-w-[400px] p-4 rounded-xl border backdrop-blur-xl transition-all duration-300 animate-slide-in ${
              toast.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                : toast.type === "error"
                ? "bg-rose-950/40 border-rose-500/30 text-rose-300"
                : "bg-slate-900/60 border-slate-700/50 text-slate-200"
            }`}
          >
            <span className="text-sm font-medium tracking-wide">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 p-0.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white/80 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
