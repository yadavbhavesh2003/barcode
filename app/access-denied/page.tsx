"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";
import { ShieldAlert, ArrowLeft, LayoutDashboard, Lock, UserCheck } from "lucide-react";

export default function AccessDeniedPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-zinc-100 via-zinc-50 to-rose-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-rose-950/20">
      <div className="w-full max-w-md text-center">
        <div className="rounded-3xl border border-zinc-200/80 bg-white/95 p-8 shadow-2xl backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-900/95">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 mb-4 ring-8 ring-rose-500/5">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <span className="inline-block rounded-full bg-rose-100 dark:bg-rose-950/80 px-3 py-1 text-[11px] font-mono font-bold text-rose-700 dark:text-rose-400 mb-2">
            HTTP 403 • FORBIDDEN
          </span>

          <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Access Restricted
          </h1>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
            Your current account role (
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {user?.role?.replace(/_/g, " ") || "Restricted User"}
            </span>
            ) does not have sufficient granular permissions to access this enterprise module or perform this action.
          </p>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3.5 text-left text-xs dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
              <Lock className="h-3.5 w-3.5 text-amber-500" />
              <span>Need elevated access?</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Contact your enterprise administrator or store supervisor to request role adjustments.
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-2">
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Go to Dashboard</span>
            </Link>
            <button
              onClick={() => window.history.back()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
