"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";
import {
  Barcode,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  KeyRound,
  UserCheck,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await login(email, password);
      if (res.success) {
        router.push(redirectUrl);
      } else {
        setError(res.error || "Authentication failed. Please verify your credentials.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-zinc-100 via-zinc-50 to-indigo-50/40 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950/20">
      <div className="w-full max-w-md">
        {/* Brand Card */}
        <div className="rounded-3xl border border-zinc-200/80 bg-white/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/95">
          {/* Logo & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 mb-3">
              <Barcode className="h-8 w-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              SYSTEM 2.0 ENTERPRISE
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
              Enterprise POS, Inventory & Barcode Administration
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@runrkids.in"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-10 pr-4 py-2.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-10 pr-10 py-2.5 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                  Remember this device
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Switcher */}
          <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-center mb-3">
              One-Click Role Demo Switcher
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoCredentials("admin@runrkids.in", "Admin@12345")}
                className="flex flex-col items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50/50 p-2 text-center text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors"
              >
                <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Super Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials("manager@runrkids.in", "Manager@12345")}
                className="flex flex-col items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2 text-center text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
              >
                <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Manager</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials("pos@runrkids.in", "Pos@12345")}
                className="flex flex-col items-center gap-1 rounded-xl border border-amber-200 bg-amber-50/50 p-2 text-center text-[10px] font-bold text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300 transition-colors"
              >
                <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>POS Cashier</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="mt-6 text-center text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>256-bit Cryptographic HMAC Session Security & Granular RBAC</span>
        </div>
      </div>
    </div>
  );
}
