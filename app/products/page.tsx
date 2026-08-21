"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Upload,
  Search,
  Filter,
  Edit2,
  Trash2,
  Barcode,
  Boxes,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Eye,
} from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 15, total: 0, pages: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState<any>({
    itemNumber: "",
    sku: "",
    name: "",
    shortName: "",
    category: "General",
    brand: "Generic",
    hsnSac: "9503",
    unitOfMeasure: "PCS",
    mrp: "",
    costPrice: "",
    sellingPrice: "",
    discountPct: "0",
    gstRate: "5",
    isTaxInclusive: true,
    openingStock: "50",
    minStock: "5",
    barcodeNumber: "",
    barcodeType: "CODE128",
    barcodeSource: "INTERNAL_CUSTOM",
  });

  // Import Wizard State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchProducts(pagination.page, searchQuery, categoryFilter);
  }, [categoryFilter]);

  const fetchProducts = async (page: number = 1, query: string = "", category: string = "All") => {
    try {
      setIsLoading(true);
      const catParam = category !== "All" ? `&category=${category}` : "";
      const res = await fetch(
        `/api/v1/products?page=${page}&limit=15&query=${encodeURIComponent(query)}${catParam}`
      );
      const json = await res.json();
      if (json.success) {
        setProducts(json.data || []);
        if (json.pagination) setPagination(json.pagination);
      }
    } catch (err) {
      console.error("Products fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(1, searchQuery, categoryFilter);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editingProduct;
      const url = isEdit ? `/api/v1/products/${editingProduct._id}` : `/api/v1/products`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        setIsAddModalOpen(false);
        setEditingProduct(null);
        fetchProducts(pagination.page, searchQuery, categoryFilter);
      } else {
        alert(json.error?.message || "Failed to save product");
      }
    } catch (err: any) {
      alert("Error saving product: " + err.message);
    }
  };

  const handleOpenEdit = (p: any) => {
    setEditingProduct(p);
    setFormData({
      itemNumber: p.itemNumber,
      sku: p.sku || p.itemNumber,
      name: p.name,
      shortName: p.shortName || "",
      category: p.category || "General",
      brand: p.brand || "Generic",
      hsnSac: p.hsnSac || "9503",
      unitOfMeasure: p.unitOfMeasure || "PCS",
      mrp: String(p.mrp),
      costPrice: String(p.costPrice || 0),
      sellingPrice: String(p.sellingPrice),
      discountPct: String(p.discountPct || 0),
      gstRate: String(p.gstRate || 5),
      isTaxInclusive: p.isTaxInclusive !== false,
      openingStock: String(p.openingStock || 0),
      minStock: String(p.minStock || 5),
      barcodeNumber: p.barcodeNumber || p.itemNumber,
      barcodeType: p.barcodeType || "CODE128",
      barcodeSource: p.barcodeSource || "INTERNAL_CUSTOM",
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive product '${name}'?`)) return;
    try {
      const res = await fetch(`/api/v1/products/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchProducts(pagination.page, searchQuery, categoryFilter);
      } else {
        alert(json.error?.message || "Failed to delete product");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  // Import Preview Flow
  const handleUploadFileForPreview = async (file: File) => {
    setImportFile(file);
    try {
      setIsImporting(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", "preview");

      const res = await fetch("/api/v1/products/import", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        setImportPreview(json.data);
      } else {
        alert(json.error?.message || "Import preview failed");
      }
    } catch (e: any) {
      alert("Import error: " + e.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importFile) return;
    try {
      setIsImporting(true);
      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("mode", "execute");

      const res = await fetch("/api/v1/products/import", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        alert(`Successfully imported ${json.data.summary.importedCount} products!`);
        setIsImportModalOpen(false);
        setImportPreview(null);
        setImportFile(null);
        fetchProducts(1, "", "All");
      } else {
        alert(json.error?.message || "Import execution failed");
      }
    } catch (e: any) {
      alert("Import error: " + e.message);
    } finally {
      setIsImporting(false);
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
        {/* Header & Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Product Master
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage product catalog, HSN/SAC codes, pricing, GST rates, and inventory thresholds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-xs"
            >
              <Upload className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Import Excel / CSV
            </button>
            <button
              onClick={() => {
                setEditingProduct(null);
                setFormData({
                  itemNumber: "",
                  sku: "",
                  name: "",
                  shortName: "",
                  category: "General",
                  brand: "Generic",
                  hsnSac: "9503",
                  unitOfMeasure: "PCS",
                  mrp: "",
                  costPrice: "",
                  sellingPrice: "",
                  discountPct: "0",
                  gstRate: "5",
                  isTaxInclusive: true,
                  openingStock: "50",
                  minStock: "5",
                  barcodeNumber: "",
                  barcodeType: "CODE128",
                  barcodeSource: "INTERNAL_CUSTOM",
                });
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              New Product
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, SKU, or barcode..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2 text-xs outline-none focus:border-indigo-600 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-zinc-400 font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {["All", "General", "Apparel", "Toys", "Footwear", "Stationery", "Accessories"].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-semibold uppercase text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <th className="py-3.5 px-4">Item Code</th>
                  <th className="py-3.5 px-4">Product Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">HSN</th>
                  <th className="py-3.5 px-4 text-right">Selling Price</th>
                  <th className="py-3.5 px-4 text-center">GST</th>
                  <th className="py-3.5 px-4 text-center">Stock</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-zinc-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading catalog...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      No products found. Add your first product or import from Excel.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {p.itemNumber || p.barcodeNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-xs text-zinc-900 dark:text-white">
                          {p.name}
                        </p>
                        {p.shortName && (
                          <p className="text-[10px] text-zinc-400">{p.shortName}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-600 dark:text-zinc-300">
                        {p.category}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-zinc-400">
                        {p.hsnSac || "9503"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-zinc-900 dark:text-white">
                        {formatCurrency(p.sellingPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {p.gstRate}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            p.currentStock <= p.minStock
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400"
                          }`}
                        >
                          {p.currentStock} {p.unitOfMeasure || "PCS"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="Edit Product"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p._id, p.name)}
                            className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                            title="Archive Product"
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

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>
              Showing {products.length} of {pagination.total} products (Page {pagination.page} of{" "}
              {pagination.pages})
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchProducts(pagination.page - 1, searchQuery, categoryFilter)}
                className="rounded-lg border border-zinc-200 px-3 py-1 font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchProducts(pagination.page + 1, searchQuery, categoryFilter)}
                className="rounded-lg border border-zinc-200 px-3 py-1 font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL 1: Add / Edit Product                          */}
      {/* ==================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                {editingProduct ? "Edit Product" : "Create New Product"}
              </h2>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Row 1: Item Number & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Item Number / SKU (Leave blank for auto)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 14378278"
                    value={formData.itemNumber}
                    onChange={(e) => setFormData({ ...formData, itemNumber: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Barcode Number (Defaults to Item No)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 14378278"
                    value={formData.barcodeNumber}
                    onChange={(e) => setFormData({ ...formData, barcodeNumber: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Row 2: Product Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Product Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2.4 WIRELESS VIDEOGAME BLUE 9503"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="General"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Row 3: Pricing & GST */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    MRP (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="4999"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1499"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    GST Rate (%)
                  </label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    HSN/SAC Code
                  </label>
                  <input
                    type="text"
                    placeholder="9503"
                    value={formData.hsnSac}
                    onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Row 4: Stock Thresholds */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Opening Stock Units
                  </label>
                  <input
                    type="number"
                    value={formData.openingStock}
                    onChange={(e) => setFormData({ ...formData, openingStock: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Min Stock Threshold
                  </label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    placeholder="PCS"
                    value={formData.unitOfMeasure}
                    onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                >
                  {editingProduct ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: Excel / CSV Import Wizard                   */}
      {/* ==================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-indigo-600">
                <FileSpreadsheet className="h-5 w-5" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Bulk Product Import Wizard
                </h2>
              </div>
              <button onClick={() => setIsImportModalOpen(false)}>
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            {/* File Upload Box */}
            <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 text-center space-y-2">
              <Upload className="h-8 w-8 text-indigo-500 mx-auto" />
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Upload your Product Catalog Sheet (.xlsx, .xls, or .csv)
              </p>
              <p className="text-[11px] text-zinc-400">
                Supported columns: Item Number, Item Name, HSN/SAC, MRP, Price/Unit, Quantity, GST Rate
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleUploadFileForPreview(e.target.files[0]);
                  }
                }}
                className="mx-auto block text-xs mt-2"
              />
            </div>

            {/* Import Preview Results */}
            {importPreview && (
              <div className="space-y-4">
                {/* Stats Summary */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-3 text-center">
                    <p className="text-xs text-zinc-400">Total Rows</p>
                    <p className="text-base font-bold text-zinc-900 dark:text-white">
                      {importPreview.summary.totalRows}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-center">
                    <p className="text-xs text-emerald-600">Valid Rows</p>
                    <p className="text-base font-bold text-emerald-600">
                      {importPreview.summary.validCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3 text-center">
                    <p className="text-xs text-amber-600">Duplicate / Exists</p>
                    <p className="text-base font-bold text-amber-600">
                      {importPreview.summary.duplicateCount + importPreview.summary.existingInDbCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 text-center">
                    <p className="text-xs text-rose-600">Invalid Rows</p>
                    <p className="text-base font-bold text-rose-600">
                      {importPreview.summary.invalidCount}
                    </p>
                  </div>
                </div>

                {/* Valid Sample Table */}
                <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-800">
                      <tr>
                        <th className="p-2">Item No</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">MRP</th>
                        <th className="p-2">Price</th>
                        <th className="p-2">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {importPreview.validRows.map((r: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2 font-mono text-indigo-500">{r.itemNumber}</td>
                          <td className="p-2 truncate max-w-xs">{r.name}</td>
                          <td className="p-2">₹{r.mrp}</td>
                          <td className="p-2">₹{r.sellingPrice}</td>
                          <td className="p-2">{r.openingStock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Execute Button */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteImport}
                    disabled={isImporting || importPreview.summary.validCount === 0}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {isImporting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Import {importPreview.summary.validCount} Valid Products
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
