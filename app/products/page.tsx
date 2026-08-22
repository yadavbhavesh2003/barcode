"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/lib/context/ToastContext";
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
  Loader2,
} from "lucide-react";

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 15, total: 0, pages: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const [isDragOver, setIsDragOver] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  // Live Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1, searchQuery, categoryFilter);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, categoryFilter]);

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
    const mrp = Number(formData.mrp) || 0;
    const sellingPrice = Number(formData.sellingPrice) || 0;

    if (mrp <= 0) {
      toast.error("MRP must be a valid amount greater than ₹0.", "Invalid MRP", 5000);
      return;
    }
    if (sellingPrice <= 0) {
      toast.error("Selling Price must be a valid amount greater than ₹0.", "Invalid Selling Price", 5000);
      return;
    }
    if (sellingPrice > mrp) {
      toast.error(
        `Selling Price (₹${sellingPrice.toLocaleString()}) cannot exceed Maximum Retail Price (MRP ₹${mrp.toLocaleString()}).`,
        "Pricing Violation",
        6000
      );
      return;
    }

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
        toast.success(isEdit ? "Product updated successfully!" : "Product created successfully!", isEdit ? "Product Updated" : "Product Created");
        fetchProducts(pagination.page, searchQuery, categoryFilter);
      } else {
        toast.error(
          json.error?.message || "Failed to save product",
          json.error?.code === "BARCODE_ALREADY_EXISTS" ? "Duplicate Barcode" : "Validation Error",
          6000
        );
      }
    } catch (err: any) {
      toast.error("Error saving product: " + err.message, "System Error", 6000);
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
      openingStock: String(p.currentStock !== undefined ? p.currentStock : (p.openingStock || 0)),
      minStock: String(p.minStock || 5),
      barcodeNumber: p.barcodeNumber || p.itemNumber,
      barcodeType: p.barcodeType || "CODE128",
      barcodeSource: p.barcodeSource || "INTERNAL_CUSTOM",
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteProduct = (id: string, name: string) => {
    setProductToDelete({ id, name });
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/v1/products/${productToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(`Archived '${productToDelete.name}' successfully`, "Product Archived");
        setProductToDelete(null);
        fetchProducts(pagination.page, searchQuery, categoryFilter);
      } else {
        toast.error(json.error?.message || "Failed to delete product");
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setIsDeleting(false);
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
        toast.error(json.error?.message || "Import preview failed");
      }
    } catch (e: any) {
      toast.error("Import error: " + e.message);
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
        toast.success(
          `Successfully processed ${json.data.summary.importedCount} products (${json.data.summary.newCreatedCount || 0} New, ${json.data.summary.refilledCount || 0} Refilled)`,
          "Catalog Updated"
        );
        setIsImportModalOpen(false);
        setImportPreview(null);
        setImportFile(null);
        fetchProducts(1, "", "All");
      } else {
        toast.error(json.error?.message || "Import execution failed");
      }
    } catch (e: any) {
      toast.error("Import error: " + e.message);
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

  const formatGstRate = (rate: any) => {
    if (rate === undefined || rate === null || rate === "") return "5%";
    const num = typeof rate === "string" ? parseFloat(rate.replace(/%/g, "")) : Number(rate);
    if (isNaN(num)) return "5%";
    if (num > 0 && num < 1) {
      return `${Math.round(num * 100)}%`;
    }
    return `${num}%`;
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
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-lg">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Live search by name, item code, SKU, or barcode..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-9 py-2 text-xs outline-none focus:border-indigo-600 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 transition-colors"
                  title="Clear Search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>

            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600 shrink-0" />
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <span className="text-xs text-zinc-400 font-medium">
              Total: <strong className="text-zinc-700 dark:text-zinc-200 font-mono">{pagination.total}</strong> products
            </span>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 focus:border-indigo-600"
              >
                {["All", "General", "Toys", "Board Games", "Action Figures", "Puzzles", "Apparel", "Footwear", "Stationery", "Accessories"].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </div>
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
                  <th className="py-3.5 px-4 text-right">MRP</th>
                  <th className="py-3.5 px-4 text-right">Selling Price</th>
                  <th className="py-3.5 px-4 text-center">GST</th>
                  <th className="py-3.5 px-4 text-center">Stock</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-zinc-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading catalog...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-400">
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
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-zinc-400">
                        {Number(p.mrp) > 0 ? formatCurrency(p.mrp) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-xs text-zinc-900 dark:text-white font-mono">
                        {formatCurrency(p.sellingPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {formatGstRate(p.gstRate)}
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
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-zinc-900 p-7 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  {editingProduct ? "Edit Product" : "Create New Product"}
                </h2>
                <p className="text-xs text-zinc-400">
                  Configure barcode, pricing, GST classification, and stock thresholds.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Row 1: Single Unified Barcode / Item Code */}
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Barcode / Item Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 14378138"
                  value={formData.barcodeNumber || formData.itemNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      barcodeNumber: val,
                      itemNumber: val,
                      sku: val,
                    });
                  }}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-mono font-medium"
                />
              </div>

              {/* Row 2: Product Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8">
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
                <div className="sm:col-span-4">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="General">General</option>
                    <option value="Toys & Games">Toys & Games</option>
                    <option value="Puzzles & Board Games">Puzzles & Board Games</option>
                    <option value="Ride-ons & RC Cars">Ride-ons & RC Cars</option>
                    <option value="Dolls & Playsets">Dolls & Playsets</option>
                    <option value="Kids Apparel">Kids Apparel</option>
                    <option value="Footwear">Footwear</option>
                    <option value="Baby Care">Baby Care</option>
                    <option value="Stationery">Stationery & Learning</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Pricing & Tax (3 Balanced Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Selling Price (₹) *
                    </label>
                    {Number(formData.mrp) > 0 && Number(formData.sellingPrice) > Number(formData.mrp) && (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        &gt; MRP!
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1499"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className={`w-full rounded-xl border p-2.5 outline-none font-mono font-bold transition-colors ${
                      Number(formData.mrp) > 0 && Number(formData.sellingPrice) > Number(formData.mrp)
                        ? "border-rose-500 bg-rose-50/40 text-rose-700 focus:border-rose-600 dark:bg-rose-950/30 dark:text-rose-300"
                        : "border-zinc-200 focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    }`}
                  />
                  {Number(formData.mrp) > 0 && Number(formData.sellingPrice) > Number(formData.mrp) && (
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
                      ⚠️ Selling Price cannot exceed MRP (₹{Number(formData.mrp).toLocaleString()})
                    </p>
                  )}
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
                    <option value="5">5% (Standard Rate)</option>
                    <option value="12">12%</option>
                    <option value="18">18% (Electronics)</option>
                    <option value="28">28% (Luxury)</option>
                    <option value="0">0% (Nil / Exempt)</option>
                  </select>
                </div>
              </div>

              {/* Row 4: HSN & Inventory Classification (3 Balanced Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    HSN/SAC Code
                  </label>
                  <select
                    value={formData.hsnSac}
                    onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-mono"
                  >
                    <option value="9503">9503 (Toys & Puzzles)</option>
                    <option value="9504">9504 (Games & Consoles)</option>
                    <option value="9505">9505 (Festive & Party)</option>
                    <option value="9506">9506 (Sports & Outdoor)</option>
                    <option value="6111">6111 (Baby Garments)</option>
                    <option value="6209">6209 (Kids Clothing)</option>
                    <option value="6402">6402 (Footwear)</option>
                    <option value="4901">4901 (Learning Books)</option>
                    <option value="9983">9983 (Services)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Unit of Measure (Net Qty)
                  </label>
                  <select
                    value={formData.unitOfMeasure}
                    onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-mono"
                  >
                    <option value="1U">1U (Unit)</option>
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="SET">SET (Set / Kit)</option>
                    <option value="BOX">BOX (Box Pack)</option>
                    <option value="PKT">PKT (Packet)</option>
                    <option value="PAIR">PAIR (Pair)</option>
                    <option value="DOZ">DOZ (Dozen)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Stock Quantity (Units)
                  </label>
                  <input
                    type="number"
                    value={formData.openingStock}
                    onChange={(e) => setFormData({ ...formData, openingStock: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Real-time Calculation Summary Card */}
              {Number(formData.sellingPrice) > 0 && (
                <>
                  {Number(formData.mrp) > 0 && Number(formData.sellingPrice) > Number(formData.mrp) ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 dark:border-rose-900/60 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 flex items-center gap-2.5 text-xs font-semibold">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>
                        Invalid Pricing: Selling Price (₹{Number(formData.sellingPrice).toLocaleString()}) cannot exceed MRP (₹{Number(formData.mrp).toLocaleString()}). By retail regulations, selling above MRP is not permitted.
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-950/60 dark:bg-indigo-950/20 grid grid-cols-3 gap-3 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-medium">Est. GST Amount</span>
                        <strong className="text-indigo-700 dark:text-indigo-300 font-mono text-sm">
                          ₹{((Number(formData.sellingPrice) * Number(formData.gstRate || 5)) / (100 + Number(formData.gstRate || 5))).toFixed(2)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-medium">Batch Stock Value</span>
                        <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                          ₹{(Number(formData.sellingPrice) * Number(formData.openingStock || 1)).toLocaleString()}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-medium">Customer Discount</span>
                        <strong className="text-zinc-700 dark:text-zinc-300 font-mono text-sm">
                          {Number(formData.mrp) > Number(formData.sellingPrice)
                            ? `${Math.round(((Number(formData.mrp) - Number(formData.sellingPrice)) / Number(formData.mrp)) * 100)}% OFF`
                            : "0%"}
                        </strong>
                      </div>
                    </div>
                  )}
                </>
              )}

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
                  disabled={Number(formData.mrp) > 0 && Number(formData.sellingPrice) > Number(formData.mrp)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {Number(formData.mrp) > 0 && Number(formData.sellingPrice) > Number(formData.mrp) ? (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Selling Price &gt; MRP
                    </>
                  ) : editingProduct ? (
                    "Save Changes"
                  ) : (
                    "Create Product"
                  )}
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

            {/* File Upload Box (Drag & Drop + Click to browse) */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const file = e.dataTransfer.files[0];
                  setImportFile(file);
                  handleUploadFileForPreview(file);
                }
              }}
              onClick={() => importFileInputRef.current?.click()}
              className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                isDragOver
                  ? "border-indigo-500 bg-indigo-50/60 dark:border-indigo-400 dark:bg-indigo-950/40 ring-4 ring-indigo-500/20 scale-[1.01]"
                  : "border-zinc-300 hover:border-indigo-400 hover:bg-zinc-50/60 dark:border-zinc-700 dark:hover:border-indigo-500 dark:hover:bg-zinc-800/50"
              }`}
            >
              <input
                ref={importFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0];
                    setImportFile(file);
                    handleUploadFileForPreview(file);
                  }
                }}
              />

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 dark:bg-indigo-950/60 dark:text-indigo-400 transition-transform">
                <Upload className="h-6 w-6" />
              </div>

              <div className="mt-3">
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {isDragOver ? "Drop your Excel / CSV file here!" : "Click to browse or drag & drop sheet"}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Supported formats: <span className="font-mono font-semibold">.xlsx, .xls, .csv</span>
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  Supports columns: <span className="font-medium">#, Item name, HSN/SAC, MRP, Price/Unit, Quantity, GST Rate</span>
                </p>
              </div>

              {isImporting && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <span className="h-3 w-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                  Analyzing and validating sheet rows...
                </div>
              )}
            </div>

            {/* Import Preview Results */}
            {importPreview && (
              <div className="space-y-4">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-3 text-center border border-zinc-100 dark:border-zinc-700">
                    <p className="text-[10px] uppercase font-bold text-zinc-400">Total Rows</p>
                    <p className="text-base font-black text-zinc-900 dark:text-white">
                      {importPreview.summary.totalRows}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-center border border-emerald-100 dark:border-emerald-900/60">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Valid Rows</p>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {importPreview.summary.validCount}
                    </p>
                    <p className="text-[9px] text-emerald-700 dark:text-emerald-300 font-medium">
                      {importPreview.summary.newProductsCount || 0} New + {importPreview.summary.refillStockCount || 0} Refill
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3 text-center border border-amber-100 dark:border-amber-900/60">
                    <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Duplicate Codes</p>
                    <p className="text-base font-black text-amber-600 dark:text-amber-400">
                      {importPreview.summary.duplicateCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 text-center border border-rose-100 dark:border-rose-900/60">
                    <p className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">Invalid Rows</p>
                    <p className="text-base font-black text-rose-600 dark:text-rose-400">
                      {importPreview.summary.invalidCount}
                    </p>
                  </div>
                </div>

                {/* Invalid / Error Rows Alert if any */}
                {importPreview.invalidRows && importPreview.invalidRows.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900/60 dark:bg-rose-950/30 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400 mb-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{importPreview.invalidRows.length} Invalid Rows Found (Will be skipped):</span>
                    </div>
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1 font-mono text-[11px] text-rose-600 dark:text-rose-300">
                      {importPreview.invalidRows.map((inv: any, i: number) => (
                        <div key={i} className="flex justify-between border-b border-rose-100 dark:border-rose-900/40 pb-0.5">
                          <span>Row #{inv.rowIndex}: {inv.name || "(Missing Name)"}</span>
                          <span className="font-semibold text-rose-700 dark:text-rose-400">{inv.errors.join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Valid Sample Table */}
                <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0 font-semibold text-zinc-500">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">Item / Barcode</th>
                        <th className="p-2">Product Name</th>
                        <th className="p-2">MRP</th>
                        <th className="p-2">Price</th>
                        <th className="p-2">Stock Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {importPreview.validRows.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <td className="p-2 font-mono text-zinc-400">#{r.rowIndex}</td>
                          <td className="p-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">{r.itemNumber || "AUTO"}</td>
                          <td className="p-2 truncate max-w-xs font-medium text-zinc-800 dark:text-zinc-200">{r.name}</td>
                          <td className="p-2 font-mono">₹{r.mrp}</td>
                          <td className="p-2 font-mono font-bold text-emerald-600">₹{r.sellingPrice}</td>
                          <td className="p-2">
                            {r.isRefill ? (
                              <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                Refill (+{r.openingStock})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                New (+{r.openingStock})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Execute Button */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportPreview(null);
                    }}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={isImporting || importPreview.summary.validCount === 0}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isImporting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Confirm & Import {importPreview.summary.validCount} Valid Products
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Archive Product Confirmation */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Archive Product
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Are you sure you want to archive <strong className="text-zinc-900 dark:text-white">&ldquo;{productToDelete.name}&rdquo;</strong>?
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 leading-relaxed">
              This product will be archived and hidden from active sales and inventory counts. Existing historical sales and invoices will remain intact.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProductToDelete(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteProduct}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all active:scale-95"
              >
                {isDeleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {isDeleting ? "Archiving..." : "Yes, Archive Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
