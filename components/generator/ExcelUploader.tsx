"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, Download, AlertCircle, Loader2 } from "lucide-react";

interface ExcelUploaderProps {
  onFileParsed: (parseResult: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function ExcelUploader({ onFileParsed, isLoading, setIsLoading }: ExcelUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (file: File) => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/excel/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to parse file.");
      }

      onFileParsed(data.result);
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while parsing the file.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            Upload Products Excel File
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Import product names, MRP, sales price, and label quantities.
          </p>
        </div>

        <a
          href="/api/template"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white transition-all"
        >
          <Download className="h-3.5 w-3.5" />
          Download Excel Template
        </a>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver
            ? "border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/30"
            : "border-zinc-300 hover:border-indigo-400 hover:bg-zinc-50/50 dark:border-zinc-700 dark:hover:border-indigo-500 dark:hover:bg-zinc-800/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Parsing and validating Excel data...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-105 dark:bg-indigo-950/60 dark:text-indigo-400 transition-all">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                Click to upload or drag & drop file
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Supported formats: <span className="font-mono font-medium">.xlsx, .xls, .csv</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
