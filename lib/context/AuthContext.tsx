"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthUser, PermissionModule, PermissionAction } from "../types";
import { hasPermission as checkPermission } from "../permissions";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (module: PermissionModule, action?: PermissionAction) => boolean;
  canAccessRoute: (pathname: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Route to required permission module mapping
const ROUTE_PERMISSION_MAP: Record<string, { module: PermissionModule; action: PermissionAction }> = {
  "/": { module: "dashboard", action: "view" },
  "/pos": { module: "pos", action: "view" },
  "/products": { module: "products", action: "view" },
  "/services": { module: "services", action: "view" },
  "/inventory": { module: "inventory", action: "view" },
  "/invoices": { module: "invoices", action: "view" },
  "/customers": { module: "customers", action: "view" },
  "/scanner": { module: "scanner", action: "view" },
  "/barcodes": { module: "barcodes", action: "view" },
  "/reports": { module: "reports", action: "view" },
  "/audit": { module: "audit", action: "view" },
  "/users": { module: "users", action: "view" },
  "/roles": { module: "roles", action: "view" },
  "/settings": { module: "settings", action: "view" },
};

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password", "/access-denied"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/me");
      const json = await res.json();
      if (json.success && json.data?.user) {
        setUser(json.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.success && json.data?.user) {
        setUser(json.data.user);
        return { success: true };
      } else {
        return { success: false, error: json.error?.message || "Login failed" };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      router.push("/login");
    }
  };

  const hasPermission = useCallback(
    (module: PermissionModule, action: PermissionAction = "view") => {
      return checkPermission(user, module, action);
    },
    [user]
  );

  const canAccessRoute = useCallback(
    (path: string) => {
      if (PUBLIC_ROUTES.includes(path)) return true;
      if (!user) return false;
      if (user.role === "SUPER_ADMIN") return true;

      // Find matched route
      const matched = Object.entries(ROUTE_PERMISSION_MAP).find(([route]) => {
        if (route === "/") return path === "/";
        return path.startsWith(route);
      });

      if (!matched) return true; // Default allow if unmapped authenticated route
      const { module, action } = matched[1];
      return checkPermission(user, module, action);
    },
    [user]
  );

  // Client-side route protection
  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

    if (!user && !isPublic) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (user && isPublic && pathname !== "/access-denied") {
      router.push("/");
    } else if (user && !canAccessRoute(pathname)) {
      router.push("/access-denied");
    }
  }, [user, isLoading, pathname, canAccessRoute, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshUser,
        hasPermission,
        canAccessRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
