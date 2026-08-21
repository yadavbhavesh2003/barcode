"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get("email")) setEmail(searchParams.get("email") || "");
    if (searchParams.get("token")) setToken(searchParams.get("token") || "");
  }, [searchParams]);

  const hasLength = newPassword.length >= 6;
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !newPassword) {
      setError("Please complete all required fields.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
      } else {
        setError(json.error?.message || "Failed to reset password.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-zinc-100 via-zinc-50 to-indigo-50/40 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950/20">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-zinc-200/80 bg-white/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/95">
          <div className="text-center mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-3">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Set New Password
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
              Create a secure password for your account
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Account Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2.5 text-xs font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-10 pr-10 py-2.5 text-xs font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
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

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-10 pr-4 py-2.5 text-xs font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Password Requirement Chips */}
              <div className="space-y-1 py-1 text-[11px]">
                <div className={`flex items-center gap-1.5 ${hasLength ? "text-emerald-600 font-semibold" : "text-zinc-400"}`}>
                  <Check className="h-3.5 w-3.5" />
                  <span>At least 6 characters long</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-600 font-semibold" : "text-zinc-400"}`}>
                  <Check className="h-3.5 w-3.5" />
                  <span>Contains numbers / letters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-600 font-semibold" : "text-zinc-400"}`}>
                  <Check className="h-3.5 w-3.5" />
                  <span>Passwords match</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !hasLength || !passwordsMatch}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save New Password & Log In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                <h3 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                  Password Updated Successfully
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  You can now log in to the enterprise admin panel with your new password.
                </p>
              </div>

              <Link
                href="/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500"
              >
                <span>Go to Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
