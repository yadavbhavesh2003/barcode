"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import {
  User,
  Mail,
  Shield,
  Phone,
  Building,
  MapPin,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  History,
  ShieldCheck,
  Save,
  Laptop,
} from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState(user?.department || "Retail");
  const [branch, setBranch] = useState(user?.branch || "Main Branch");

  // Password Change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setDepartment(user.department || "Retail");
      setBranch(user.branch || "Main Branch");
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = { name, phone, department, branch };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/v1/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(
          newPassword
            ? "Profile and password updated successfully!"
            : "Profile details updated successfully!"
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        await refreshUser();
      } else {
        setErrorMsg(json.error?.message || "Failed to update profile.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          My Account & Security Profile
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your personal credentials, contact information, and active security sessions.
        </p>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Card & Role Snapshot */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-indigo-500 text-2xl font-extrabold text-white shadow-lg shadow-indigo-600/30 mb-3">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                {user?.name}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                {user?.email}
              </p>

              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 ring-1 ring-indigo-500/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{user?.role?.replace(/_/g, " ") || "SUPER ADMIN"}</span>
              </div>
            </div>

            <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-zinc-400" /> Department:
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                  {user?.department || "Retail"}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" /> Outlet Branch:
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                  {user?.branch || "Main Branch"}
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-zinc-400" /> Granular Perms:
                </span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {user?.permissions?.includes("*") ? "FULL ACCESS (*)" : `${user?.permissions?.length || 0} permissions`}
                </span>
              </div>
            </div>
          </div>

          {/* Active Device Session */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
              <Laptop className="h-3.5 w-3.5 text-indigo-500" /> Active Session
            </h3>
            <div className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950/50">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-xs">
                <p className="font-bold text-zinc-900 dark:text-white">Current Browser Session</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Signed in via HTTP-only Cryptographic Token
                </p>
                <span className="mt-1 inline-block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Active Now • Authenticated
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Update Profile & Change Password Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Personal Details Section */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                Personal Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2 text-xs font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Email Address (Immutable)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2 text-xs font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Assigned Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2 text-xs font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Branch / Location
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2 text-xs font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4 text-indigo-600" />
                Change Password
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                Leave these fields blank if you do not wish to change your password.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2 text-xs font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2 text-xs font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2 text-xs font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Action Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
