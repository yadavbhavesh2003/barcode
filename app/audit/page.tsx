"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Eye,
  FileCode,
} from "lucide-react";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: "50",
        ...(entityFilter !== "ALL" ? { entity: entityFilter } : {}),
      });
      const res = await fetch(`/api/v1/audit?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
      }
    } catch (e) {
      console.error("Audit logs fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/50 p-4 sm:p-6 lg:p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              System Audit & Compliance Log
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Immutable ledger recording every critical system action, pricing changes, and stock adjustments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="ALL">All Entities</option>
              <option value="Product">Products</option>
              <option value="Invoice">Invoices</option>
              <option value="Barcode">Barcodes</option>
              <option value="SystemSettings">Settings</option>
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-semibold uppercase text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity</th>
                <th className="py-3.5 px-4">Entity ID</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                    <td className="py-3.5 px-4 text-zinc-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                      {log.userName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">{log.entity}</td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-zinc-400">
                      {log.entityId || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-zinc-700 dark:text-indigo-400"
                      >
                        View Diff
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diff Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 max-h-[85vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                Audit Event: {selectedLog.action}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            {selectedLog.oldValue && (
              <div>
                <p className="font-semibold text-rose-600 dark:text-rose-400 mb-1">Old State:</p>
                <pre className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl overflow-x-auto text-[11px] font-mono">
                  {JSON.stringify(selectedLog.oldValue, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.newValue && (
              <div>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                  New State / Payload:
                </p>
                <pre className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl overflow-x-auto text-[11px] font-mono">
                  {JSON.stringify(selectedLog.newValue, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
