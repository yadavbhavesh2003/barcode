"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  Edit2,
  RefreshCw,
  Phone,
  Mail,
  Receipt,
  X,
} from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    gstin: "",
    companyName: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async (query: string = "") => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/customers?query=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data || []);
      }
    } catch (e) {
      console.error("Customers fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.mobile) return;
    try {
      const res = await fetch("/api/v1/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setForm({
          name: "",
          mobile: "",
          email: "",
          gstin: "",
          companyName: "",
          address: "",
          notes: "",
        });
        fetchCustomers();
      } else {
        alert(json.error?.message || "Failed to save customer");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/50 p-4 sm:p-6 lg:p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Customer Directory
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage client contact details, GSTIN tax identifiers, purchase records, and lifetime spend.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </button>
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, mobile, or GSTIN..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchCustomers(e.target.value);
              }}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2 text-xs outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>
        </div>

        {/* Customers Table */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-semibold uppercase text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40">
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Mobile</th>
                <th className="py-3.5 px-4">GSTIN / Company</th>
                <th className="py-3.5 px-4 text-center">Invoices</th>
                <th className="py-3.5 px-4 text-right">Lifetime Spend</th>
                <th className="py-3.5 px-4 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-zinc-900 dark:text-white">{c.name}</p>
                      {c.email && <p className="text-[10px] text-zinc-400">{c.email}</p>}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                      {c.mobile}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                        {c.gstin || "—"}
                      </p>
                      {c.companyName && (
                        <p className="text-[10px] text-zinc-400">{c.companyName}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      {c.totalInvoices || 0}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-zinc-900 dark:text-white">
                      {formatCurrency(c.totalSpend)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-zinc-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add Customer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Add Customer</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 27AABCU9603R1ZM"
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="ramesh@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-500"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
