"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/lib/context/ToastContext";
import {
  Wrench,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Clock,
  Tag,
  Receipt,
  X,
  FileText,
  Boxes,
  AlertTriangle,
} from "lucide-react";

export default function ServicesPage() {
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 15, total: 0, pages: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceToDelete, setServiceToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({
    serviceCode: "",
    name: "",
    sacCode: "998313",
    category: "Barcode Services",
    pricingType: "FIXED",
    price: "",
    gstRate: "18",
    isTaxInclusive: true,
    turnaroundHours: "24",
    description: "",
  });

  const categories = ["All", "Barcode Services", "Maintenance", "Operations", "Consulting", "Printing"];

  useEffect(() => {
    fetchServices();
  }, [categoryFilter]);

  const fetchServices = async (page: number = 1, query: string = "") => {
    try {
      setLoading(true);
      const catParam = categoryFilter !== "All" ? `&category=${encodeURIComponent(categoryFilter)}` : "";
      const res = await fetch(
        `/api/v1/services?page=${page}&limit=15&query=${encodeURIComponent(query)}${catParam}`
      );
      const json = await res.json();
      if (json.success) {
        setServices(json.data || []);
        if (json.pagination) setPagination(json.pagination);
      }
    } catch (e) {
      console.error("Services fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingService(null);
    setForm({
      serviceCode: "",
      name: "",
      sacCode: "998313",
      category: "Barcode Services",
      pricingType: "FIXED",
      price: "",
      gstRate: "18",
      isTaxInclusive: true,
      turnaroundHours: "24",
      description: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (srv: any) => {
    setEditingService(srv);
    setForm({
      serviceCode: srv.serviceCode,
      name: srv.name,
      sacCode: srv.sacCode || "998313",
      category: srv.category || "Barcode Services",
      pricingType: srv.pricingType || "FIXED",
      price: String(srv.price),
      gstRate: String(srv.gstRate || 18),
      isTaxInclusive: srv.isTaxInclusive !== false,
      turnaroundHours: String(srv.turnaroundHours || 24),
      description: srv.description || "",
    });
    setIsModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    try {
      const isEdit = !!editingService;
      const url = isEdit ? `/api/v1/services/${editingService._id}` : `/api/v1/services`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setEditingService(null);
        fetchServices(pagination.page, searchQuery);
      } else {
        alert(json.error?.message || "Failed to save service");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleDeleteService = (id: string, name: string) => {
    setServiceToDelete({ id, name });
  };

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/v1/services/${serviceToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(`Archived '${serviceToDelete.name}' successfully`, "Service Archived");
        setServiceToDelete(null);
        fetchServices(pagination.page, searchQuery);
      } else {
        toast.error(json.error?.message || "Failed to delete service");
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/50 p-4 sm:p-6 lg:p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Service Management
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage billable barcode artwork design, hardware maintenance, tagging contracts, and SAC codes.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add New Service
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by service name or code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchServices(1, e.target.value);
              }}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2 text-xs outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-zinc-400 font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Services Table */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-semibold uppercase text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40">
                <th className="py-3.5 px-4">Service Code</th>
                <th className="py-3.5 px-4">Service Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">SAC Code</th>
                <th className="py-3.5 px-4 text-center">Turnaround</th>
                <th className="py-3.5 px-4 text-right">Service Charge</th>
                <th className="py-3.5 px-4 text-center">GST Rate</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading services catalog...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    No services found. Add your first service offering.
                  </td>
                </tr>
              ) : (
                services.map((s) => (
                  <tr key={s._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {s.serviceCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-zinc-900 dark:text-white">{s.name}</p>
                      {s.description && (
                        <p className="text-[10px] text-zinc-400 line-clamp-1">{s.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300">{s.category}</td>
                    <td className="py-3.5 px-4 font-mono text-zinc-400">{s.sacCode}</td>
                    <td className="py-3.5 px-4 text-center text-zinc-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {s.turnaroundHours}h
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-zinc-900 dark:text-white">
                      {formatCurrency(s.price)}
                      <span className="text-[9px] text-zinc-400 block font-normal">
                        ({s.pricingType})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {s.gstRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                          title="Edit Service"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(s._id, s.name)}
                          className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                          title="Archive Service"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add / Edit Service */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {editingService ? "Edit Service" : "Add New Service Offering"}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Service Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SRV-1004"
                    value={form.serviceCode}
                    onChange={(e) => setForm({ ...form, serviceCode: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 font-mono outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    SAC Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="998313"
                    value={form.sacCode}
                    onChange={(e) => setForm({ ...form, sacCode: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 font-mono outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Service Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Thermal Printer Maintenance AMC"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="Barcode Services">Barcode Services</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Operations">Operations</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Printing">Printing</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Base Charge (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="499"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    GST Rate (%)
                  </label>
                  <select
                    value={form.gstRate}
                    onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="18">18% (Standard Service)</option>
                    <option value="12">12%</option>
                    <option value="5">5%</option>
                    <option value="0">0% (Nil)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Service Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Details of the service fulfillment scope..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                >
                  {editingService ? "Save Changes" : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Archive Service Confirmation */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Archive Service
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Are you sure you want to archive <strong className="text-zinc-900 dark:text-white">&ldquo;{serviceToDelete.name}&rdquo;</strong>?
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 leading-relaxed">
              This service item will be hidden from the active services catalog. Historical invoices will remain intact.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setServiceToDelete(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteService}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all active:scale-95"
              >
                {isDeleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {isDeleting ? "Archiving..." : "Yes, Archive Service"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
