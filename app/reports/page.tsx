"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  Receipt,
  PieChart,
  Banknote,
  Smartphone,
  CreditCard,
  Package,
} from "lucide-react";

export default function ReportsPage() {
  const [reportType, setReportType] = useState<"sales_summary" | "payment_breakdown" | "product_sales">(
    "sales_summary"
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: reportType,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });

      const res = await fetch(`/api/v1/reports?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setReportData(json.data.data);
      }
    } catch (e) {
      console.error("Report fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    let csvContent = "data:text/csv;charset=utf-8,";

    if (reportType === "sales_summary" && Array.isArray(reportData)) {
      csvContent += "Date,Bills Count,Units Sold,Discounts Given,Grand Sales Total\n";
      reportData.forEach((row: any) => {
        csvContent += `${row._id},${row.billsCount},${row.itemsSold},${row.totalDiscount || 0},${row.totalSales}\n`;
      });
    } else if (reportType === "product_sales" && Array.isArray(reportData)) {
      csvContent += "Product Name,Barcode,HSN,Quantity Sold,Unit Price,Total Revenue\n";
      reportData.forEach((row: any) => {
        csvContent += `"${row.productName}",${row.barcodeNumber},${row.hsnSac || "N/A"},${row.totalQuantitySold},${row.unitPrice || 0},${row.totalRevenue}\n`;
      });
    } else if (reportType === "payment_breakdown") {
      csvContent += "Total Turnover,Cash Revenue,UPI Revenue,Card Revenue,Total Invoices,Total Units\n";
      csvContent += `${reportData.totalTurnover || 0},${reportData.cashRevenue || 0},${reportData.upiRevenue || 0},${reportData.cardRevenue || 0},${reportData.totalInvoices || 0},${reportData.totalUnits || 0}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/50 p-4 sm:p-6 lg:p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Sales & Financial Reporting
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Daily sales summaries, payment channel breakdowns, and top performing product metrics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={!reportData || loading}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <Download className="h-4 w-4 text-indigo-500" />
              Export to CSV
            </button>
          </div>
        </div>

        {/* Filter Controls & Report Selector */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto">
            {[
              { id: "sales_summary", label: "Daily Sales Summary", icon: TrendingUp },
              { id: "payment_breakdown", label: "Payment Channels Breakdown", icon: Banknote },
              { id: "product_sales", label: "Top Product Sales", icon: PieChart },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setReportType(tab.id as any)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all shrink-0 ${
                    reportType === tab.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-zinc-200 p-2 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
            <span className="text-zinc-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-zinc-200 p-2 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
            <button
              onClick={fetchReport}
              className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500"
            >
              Filter
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 p-4 sm:p-6">
          {loading ? (
            <div className="py-16 text-center text-xs text-zinc-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Generating report...
            </div>
          ) : !reportData ? (
            <div className="py-16 text-center text-xs text-zinc-400">No data found.</div>
          ) : (
            <>
              {/* 1. SALES SUMMARY TABLE */}
              {reportType === "sales_summary" && Array.isArray(reportData) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/70 font-semibold uppercase text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40">
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3 text-center">Bills Generated</th>
                        <th className="py-3 px-3 text-center">Units Sold</th>
                        <th className="py-3 px-3 text-right">Discounts Given</th>
                        <th className="py-3 px-3 text-right">Net Sales Turnover</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {reportData.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                          <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-white">
                            {row._id}
                          </td>
                          <td className="py-3 px-3 text-center font-bold">{row.billsCount}</td>
                          <td className="py-3 px-3 text-center font-bold">{row.itemsSold} units</td>
                          <td className="py-3 px-3 text-right text-zinc-500 font-mono">
                            {formatCurrency(row.totalDiscount || 0)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                            {formatCurrency(row.totalSales)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 2. PAYMENT BREAKDOWN CARDS */}
              {reportType === "payment_breakdown" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Turnover */}
                    <div className="rounded-2xl border border-indigo-200 p-5 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/40">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Total Sales Turnover</p>
                        <TrendingUp className="h-4 w-4 text-indigo-600" />
                      </div>
                      <p className="text-2xl font-black text-indigo-950 dark:text-indigo-200 mt-2 font-mono">
                        {formatCurrency(reportData.totalTurnover)}
                      </p>
                      <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-semibold">
                        {reportData.totalInvoices || 0} bills • {reportData.totalUnits || 0} units sold
                      </p>
                    </div>

                    {/* Cash */}
                    <div className="rounded-2xl border border-emerald-200 p-5 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/40">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">Cash Collected</p>
                        <Banknote className="h-4 w-4 text-emerald-600" />
                      </div>
                      <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2 font-mono">
                        {formatCurrency(reportData.cashRevenue)}
                      </p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                        {reportData.cashCount || 0} cash transactions
                      </p>
                    </div>

                    {/* UPI / QR */}
                    <div className="rounded-2xl border border-indigo-200 p-5 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/40">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-indigo-700 dark:text-indigo-400 font-bold uppercase tracking-wider">UPI / QR Online</p>
                        <Smartphone className="h-4 w-4 text-indigo-600" />
                      </div>
                      <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2 font-mono">
                        {formatCurrency(reportData.upiRevenue)}
                      </p>
                      <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-semibold">
                        {reportData.upiCount || 0} UPI transactions
                      </p>
                    </div>

                    {/* Card */}
                    <div className="rounded-2xl border border-purple-200 p-5 bg-purple-50/50 dark:border-purple-900 dark:bg-purple-950/40">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-purple-700 dark:text-purple-400 font-bold uppercase tracking-wider">Card / POS</p>
                        <CreditCard className="h-4 w-4 text-purple-600" />
                      </div>
                      <p className="text-2xl font-black text-zinc-900 dark:text-white mt-2 font-mono">
                        {formatCurrency(reportData.cardRevenue)}
                      </p>
                      <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-semibold">
                        {reportData.cardCount || 0} card transactions
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. PRODUCT SALES TABLE */}
              {reportType === "product_sales" && Array.isArray(reportData) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/70 font-semibold uppercase text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40">
                        <th className="py-3 px-3">Product Name</th>
                        <th className="py-3 px-3">Barcode / Item #</th>
                        <th className="py-3 px-3">HSN Code</th>
                        <th className="py-3 px-3 text-center">Units Sold</th>
                        <th className="py-3 px-3 text-right">Selling Price</th>
                        <th className="py-3 px-3 text-right">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {reportData.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                          <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-white">
                            {p.productName}
                          </td>
                          <td className="py-3 px-3 font-mono text-zinc-400">#{p.barcodeNumber}</td>
                          <td className="py-3 px-3 font-mono text-zinc-400">{p.hsnSac || "9503"}</td>
                          <td className="py-3 px-3 text-center font-bold">
                            {p.totalQuantitySold} units
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-500 font-mono">
                            {formatCurrency(p.unitPrice || (p.totalRevenue / Math.max(1, p.totalQuantitySold)))}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-zinc-900 dark:text-white font-mono">
                            {formatCurrency(p.totalRevenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
