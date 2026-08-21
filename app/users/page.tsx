"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import {
  UserCog,
  Plus,
  Search,
  Filter,
  MoreVertical,
  KeyRound,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  Loader2,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Building,
  MapPin,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { IUser, IRole } from "@/lib/types";

export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth();

  const [users, setUsers] = useState<IUser[]>([]);
  const [roles, setRoles] = useState<IRole[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);

  // Forms
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "BILLING_OPERATOR",
    department: "Retail",
    branch: "Main Branch",
    phone: "",
    status: "active",
  });
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchUsers = useCallback(
    async (page: number = 1, query: string = "", role: string = "All", status: string = "All") => {
      try {
        setIsLoading(true);
        const roleParam = role !== "All" ? `&role=${encodeURIComponent(role)}` : "";
        const statusParam = status !== "All" ? `&status=${encodeURIComponent(status)}` : "";
        const res = await fetch(
          `/api/v1/users?page=${page}&limit=10&query=${encodeURIComponent(query)}${roleParam}${statusParam}`
        );
        const json = await res.json();
        if (json.success) {
          setUsers(json.data || []);
          if (json.pagination) setPagination(json.pagination);
        }
      } catch (err) {
        console.error("Users fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/v1/roles");
      const json = await res.json();
      if (json.success) {
        setRoles(json.data || []);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchUsers(pagination.page, searchQuery, roleFilter, statusFilter);
    fetchRoles();
  }, [fetchUsers, pagination.page, roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, searchQuery, roleFilter, statusFilter);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`User ${formData.name} created successfully.`);
        setIsCreateModalOpen(false);
        setFormData({
          name: "",
          email: "",
          password: "",
          role: "BILLING_OPERATOR",
          department: "Retail",
          branch: "Main Branch",
          phone: "",
          status: "active",
        });
        fetchUsers(1, searchQuery, roleFilter, statusFilter);
      } else {
        setActionError(json.error?.message || "Failed to create user.");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?._id) return;
    setActionError(null);
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/users/${selectedUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`User ${formData.name} updated successfully.`);
        setIsEditModalOpen(false);
        setSelectedUser(null);
        fetchUsers(pagination.page, searchQuery, roleFilter, statusFilter);
      } else {
        setActionError(json.error?.message || "Failed to update user.");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?._id || !newPassword) return;
    setActionError(null);
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/users/${selectedUser._id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(json.data?.message || "Password reset successfully.");
        setIsResetPasswordModalOpen(false);
        setNewPassword("");
        setSelectedUser(null);
      } else {
        setActionError(json.error?.message || "Failed to reset password.");
      }
    } catch (err: any) {
      setActionError(err.message || "Network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user: IUser) => {
    if (!user._id) return;
    const nextStatus = user.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/v1/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`User ${user.name} marked as ${nextStatus}.`);
        fetchUsers(pagination.page, searchQuery, roleFilter, statusFilter);
      } else {
        alert(json.error?.message || "Failed to change user status.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const openEditModal = (u: IUser) => {
    setSelectedUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      department: u.department || "Retail",
      branch: u.branch || "Main Branch",
      phone: u.phone || "",
      status: u.status,
    });
    setIsEditModalOpen(true);
  };

  const openResetPasswordModal = (u: IUser) => {
    setSelectedUser(u);
    setNewPassword("");
    setIsResetPasswordModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <UserCog className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>Enterprise User Management</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage system operators, assign enterprise roles, oversee department access, and monitor user statuses.
          </p>
        </div>

        {hasPermission("users", "create") && (
          <button
            onClick={() => {
              setFormData({
                name: "",
                email: "",
                password: "",
                role: "BILLING_OPERATOR",
                department: "Retail",
                branch: "Main Branch",
                phone: "",
                status: "active",
              });
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add New User</span>
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

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone, or department..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-10 pr-4 py-2 text-xs font-medium text-zinc-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 focus:outline-hidden"
            >
              <option value="All">All Roles</option>
              <option value="SUPER_ADMIN">Super Administrator</option>
              <option value="ADMIN">Administrator</option>
              <option value="MANAGER">Store Manager</option>
              <option value="BILLING_OPERATOR">Billing Operator</option>
              <option value="INVENTORY_MANAGER">Inventory Manager</option>
              <option value="BARCODE_OPERATOR">Barcode Operator</option>
              <option value="VIEWER">Read-Only Viewer</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 focus:outline-hidden"
            >
              <option value="All">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              type="submit"
              className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Users Data Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/80 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Role & Access</th>
                <th className="px-5 py-3.5">Department / Branch</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Last Login</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading users directory...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <UserX className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No users found</p>
                    <p className="text-xs text-zinc-400 mt-1">Try adjusting your search criteria or add a new user.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-900 dark:text-white truncate">{u.name}</p>
                          <p className="text-[11px] text-zinc-500 font-mono truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 ring-1 ring-indigo-500/20">
                        <ShieldCheck className="h-3 w-3" />
                        <span>{u.role?.replace(/_/g, " ")}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300">
                      <p className="font-medium">{u.department || "Retail"}</p>
                      <p className="text-[11px] text-zinc-400">{u.branch || "Main Branch"}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          u.status === "active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 ring-1 ring-rose-500/20"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            u.status === "active" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <span className="capitalize">{u.status}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 text-[11px]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never logged in"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {hasPermission("users", "edit") && (
                          <button
                            onClick={() => openEditModal(u)}
                            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
                            title="Edit User Details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {hasPermission("users", "manage") && (
                          <button
                            onClick={() => openResetPasswordModal(u)}
                            className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 transition-colors"
                            title="Force Reset Password"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {hasPermission("users", "delete") && u._id !== currentUser?.id && (
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`rounded-lg p-1.5 transition-colors ${
                              u.status === "active"
                                ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            }`}
                            title={u.status === "active" ? "Deactivate User" : "Activate User"}
                          >
                            {u.status === "active" ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200/80 bg-zinc-50/50 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
          <span>
            Showing <span className="font-bold text-zinc-900 dark:text-white">{users.length}</span> of{" "}
            <span className="font-bold text-zinc-900 dark:text-white">{pagination.total}</span> users
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 font-semibold text-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Previous
            </button>
            <span className="px-2 text-xs font-bold text-zinc-900 dark:text-white">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 font-semibold text-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs" onClick={() => setIsCreateModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 z-10 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800 mb-4">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-indigo-600" /> Add New Enterprise User
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="rahul@runrkids.in"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Enterprise Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  >
                    <option value="BILLING_OPERATOR">Billing Operator</option>
                    <option value="MANAGER">Store Manager</option>
                    <option value="INVENTORY_MANAGER">Inventory Manager</option>
                    <option value="BARCODE_OPERATOR">Barcode Operator</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="VIEWER">Read-Only Viewer</option>
                    <option value="SUPER_ADMIN">Super Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Branch Location</label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
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
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 z-10 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800 mb-4">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-indigo-600" /> Edit User ({selectedUser.name})
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Enterprise Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  >
                    <option value="BILLING_OPERATOR">Billing Operator</option>
                    <option value="MANAGER">Store Manager</option>
                    <option value="INVENTORY_MANAGER">Inventory Manager</option>
                    <option value="BARCODE_OPERATOR">Barcode Operator</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="VIEWER">Read-Only Viewer</option>
                    <option value="SUPER_ADMIN">Super Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Branch Location</label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Force Reset Password Modal */}
      {isResetPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs" onClick={() => setIsResetPasswordModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 z-10 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800 mb-4">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2 text-amber-600">
                <KeyRound className="h-4 w-4" /> Reset Password for {selectedUser.name}
              </h2>
              <button onClick={() => setIsResetPasswordModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <p className="text-zinc-500 dark:text-zinc-400">
                As an enterprise administrator, you are setting a new temporary or permanent password for this account.
              </p>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">New Account Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || newPassword.length < 6}
                  className="rounded-xl bg-amber-600 px-5 py-2 font-bold text-white hover:bg-amber-500 disabled:opacity-50"
                >
                  {isSubmitting ? "Resetting..." : "Confirm Password Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
