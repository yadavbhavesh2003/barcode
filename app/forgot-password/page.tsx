"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Barcode,
  Mail,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; resetToken?: string; userEmail?: string } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
      } else {
        setError(json.error?.message || "Failed to process request.");
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
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Password Recovery
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Enter your email to receive recovery instructions
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@runrkids.in"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-10 pr-4 py-2.5 text-xs font-medium text-zinc-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing Request...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Instructions</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {result.message}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                  Target: <span className="font-mono font-bold">{result.userEmail || email}</span>
                </p>
              </div>

              <Link
                href={`/reset-password?email=${encodeURIComponent(result.userEmail || email)}&token=${result.resetToken || "demo"}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500"
              >
                <span>Proceed to Set New Password</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          <div className="mt-6 border-t border-zinc-100 pt-4 text-center dark:border-zinc-800">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
