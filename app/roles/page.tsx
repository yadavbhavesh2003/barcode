"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { ALL_MODULE_ACTIONS } from "@/lib/permissions";
import { IRole, PermissionModule, PermissionAction } from "@/lib/types";
import {
  KeyRound,
  Plus,
  Shield,
  ShieldCheck,
  Check,
  Edit2,
  Trash2,
  Copy,
  Users,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Layers,
  Lock,
  Save,
} from "lucide-react";

export default function RolesPage() {
  const { hasPermission } = useAuth();

  const [roles, setRoles] = useState<IRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<IRole | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: "", description: "" });

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/roles");
      const json = await res.json();
      if (json.success && json.data) {
        setRoles(json.data);
        if (!selectedRole && json.data.length > 0) {
          setSelectedRole(json.data[0]);
          setEditedPermissions(json.data[0].permissions || []);
        } else if (selectedRole) {
          const updated = json.data.find((r: IRole) => r._id === selectedRole._id);
          if (updated) {
            setSelectedRole(updated);
            setEditedPermissions(updated.permissions || []);
          }
        }
      }
    } catch (err) {
      console.error("Roles fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleSelectRole = (role: IRole) => {
    setSelectedRole(role);
    setEditedPermissions(role.permissions || []);
    setActionSuccess(null);
    setActionError(null);
  };

  const handleTogglePermission = (targetPerm: string) => {
    if (selectedRole?.slug === "SUPER_ADMIN") return; // Super Admin has wildcard full access

    setEditedPermissions((prev) => {
      if (prev.includes(targetPerm)) {
        return prev.filter((p) => p !== targetPerm);
      } else {
        return [...prev, targetPerm];
      }
    });
  };

  const handleToggleModuleAll = (moduleKey: string, actions: { key: string }[]) => {
    if (selectedRole?.slug === "SUPER_ADMIN") return;

    const modulePerms = actions.map((a) => `${moduleKey}.${a.key}`);
    const allSelected = modulePerms.every((p) => editedPermissions.includes(p));

    if (allSelected) {
      // Uncheck all in module
      setEditedPermissions((prev) => prev.filter((p) => !modulePerms.includes(p)));
    } else {
      // Check all in module
      setEditedPermissions((prev) => Array.from(new Set([...prev, ...modulePerms])));
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole?._id) return;
    setActionError(null);
    try {
      setIsSaving(true);
      const res = await fetch(`/api/v1/roles/${selectedRole._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: editedPermissions }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Permissions for role "${selectedRole.name}" updated successfully!`);
        fetchRoles();
      } else {
        setActionError(json.error?.message || "Failed to update permissions.");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleForm.name) return;
    setActionError(null);
    try {
      setIsSaving(true);
      const res = await fetch("/api/v1/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoleForm.name,
          description: newRoleForm.description,
          permissions: ["dashboard.view"],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Role "${newRoleForm.name}" created successfully.`);
        setIsCreateModalOpen(false);
        setNewRoleForm({ name: "", description: "" });
        await fetchRoles();
        if (json.data) handleSelectRole(json.data);
      } else {
        setActionError(json.error?.message || "Failed to create role.");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateRole = async (role: IRole) => {
    try {
      const copyName = `${role.name} (Copy)`;
      const res = await fetch("/api/v1/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: copyName,
          description: `Cloned from ${role.name}`,
          permissions: role.permissions || [],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Duplicated role "${copyName}" successfully.`);
        await fetchRoles();
        if (json.data) handleSelectRole(json.data);
      } else {
        setActionError(json.error?.message || "Failed to duplicate role.");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error.");
    }
  };

  const handleDeleteRole = async (role: IRole) => {
    if (!confirm(`Are you sure you want to permanently delete custom role "${role.name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/roles/${role._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Role "${role.name}" deleted.`);
        fetchRoles();
      } else {
        setActionError(json.error?.message || "Failed to delete role.");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <KeyRound className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>Roles & Granular Permissions Matrix</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Configure role access levels, define custom roles, and fine-tune action-level permissions across all system modules.
          </p>
        </div>

        {hasPermission("roles", "create") && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Custom Role</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Role Selector Tabs */}
        <div className="lg:col-span-4 space-y-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 mb-3 flex items-center justify-between">
              <span>Configured Roles ({roles.length})</span>
            </h2>

            <div className="space-y-2">
              {roles.map((role) => {
                const isSelected = selectedRole?._id === role._id;
                return (
                  <div
                    key={role._id}
                    onClick={() => handleSelectRole(role)}
                    className={`group relative flex items-center justify-between rounded-xl p-3 text-xs cursor-pointer border transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/70 text-indigo-950 dark:border-indigo-500/60 dark:bg-indigo-950/40 dark:text-white shadow-xs font-bold"
                        : "border-zinc-200/80 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{role.name}</span>
                        {role.isSystem && (
                          <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 text-[9px] font-bold text-zinc-500">
                            SYSTEM
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-normal truncate mt-0.5">
                        {role.description || role.slug}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                        <Users className="h-3 w-3" />
                        <span>{role.userCount || 0}</span>
                      </span>

                      {!role.isSystem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(role);
                          }}
                          className="opacity-0 group-hover:opacity-100 rounded p-1 text-zinc-400 hover:text-rose-600 transition-opacity"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Permission Matrix */}
        <div className="lg:col-span-8 space-y-4">
          {selectedRole ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
              {/* Active Role Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                      {selectedRole.name}
                    </h2>
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      {selectedRole.slug}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {selectedRole.description || "Custom enterprise permission configuration"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDuplicateRole(selectedRole)}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    title="Clone as new custom role"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Duplicate</span>
                  </button>

                  {selectedRole.slug !== "SUPER_ADMIN" && hasPermission("roles", "edit") && (
                    <button
                      onClick={handleSaveRolePermissions}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          <span>Save Permissions</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Super Admin Notice */}
              {selectedRole.slug === "SUPER_ADMIN" ? (
                <div className="my-6 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 text-center dark:border-indigo-900/50 dark:bg-indigo-950/30">
                  <ShieldCheck className="h-10 w-10 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                  <h3 className="text-sm font-extrabold text-indigo-950 dark:text-indigo-200">
                    Unconstrained Global Super Admin Access (*)
                  </h3>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1 max-w-md mx-auto">
                    The Super Administrator role automatically inherits all current and future module actions across the entire enterprise platform.
                  </p>
                </div>
              ) : (
                /* Granular Module Permission Matrix */
                <div className="mt-6 space-y-4">
                  {Object.entries(ALL_MODULE_ACTIONS).map(([modKey, modConfig]) => {
                    const modulePerms = modConfig.actions.map((a) => `${modKey}.${a.key}`);
                    const isAllSelected = modulePerms.every((p) => editedPermissions.includes(p));

                    return (
                      <div
                        key={modKey}
                        className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-4 dark:border-zinc-800/80 dark:bg-zinc-950/40"
                      >
                        <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2.5 dark:border-zinc-800/60 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-zinc-900 dark:text-white">
                              {modConfig.label}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">({modKey})</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleModuleAll(modKey, modConfig.actions)}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
                          >
                            {isAllSelected ? "Deselect All" : "Select All"}
                          </button>
                        </div>

                        {/* Action Checkboxes */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {modConfig.actions.map((act) => {
                            const permKey = `${modKey}.${act.key}`;
                            const isChecked =
                              editedPermissions.includes(permKey) ||
                              editedPermissions.includes(`${modKey}.*`) ||
                              editedPermissions.includes("*");

                            return (
                              <label
                                key={permKey}
                                className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? "border-indigo-300 bg-indigo-50/60 text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-white font-medium"
                                    : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-400"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(permKey)}
                                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <span className="truncate">{act.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <KeyRound className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Select a role to configure permissions</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Custom Role Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs" onClick={() => setIsCreateModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 z-10 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800 mb-4">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-indigo-600" /> Create Custom Enterprise Role
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  value={newRoleForm.name}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                  placeholder="e.g. Regional Auditor / Returns Specialist"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Role Description</label>
                <textarea
                  rows={3}
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  placeholder="Describe the operational responsibilities of this custom role..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSaving ? "Creating..." : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
