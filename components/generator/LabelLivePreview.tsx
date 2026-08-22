"use client";

import { useState, useEffect, useRef } from "react";
import bwipjs from "bwip-js";
import { ZoomIn, ZoomOut, RotateCcw, Globe } from "lucide-react";
import { formatAmount } from "@/lib/utils";

interface LabelLivePreviewProps {
  productName?: string;
  mrp?: number;
  salesPrice?: number;
  netQuantity?: string;
  sampleBarcode?: string;
  website?: string;
  showHri?: boolean;
  showBorder?: boolean;
  onToggleShowHri?: (val: boolean) => void;
  onToggleShowBorder?: (val: boolean) => void;
  barcodeRotation?: 0 | 90 | 180 | 270;
  layoutPreset?: "standard" | "barcode_bottom" | "vertical_left" | "vertical_right";
}

export function LabelLivePreview({
  productName = "2.4 WIRELESS VIDEOGAME BLUE 9503",
  mrp = 4999,
  salesPrice = 1499,
  netQuantity = "1U",
  sampleBarcode = "14378278",
  website = "https://runrkids.in/",
  showHri = true, // Default enabled per user request
  showBorder = false,
  onToggleShowHri,
  onToggleShowBorder,
  barcodeRotation = 0,
  layoutPreset = "standard",
}: LabelLivePreviewProps) {
  const [zoom, setZoom] = useState(1.8);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      try {
        let rotCode: "N" | "R" | "I" | "L" = "N";
        if (barcodeRotation === 90) rotCode = "R";
        else if (barcodeRotation === 180) rotCode = "I";
        else if (barcodeRotation === 270) rotCode = "L";

        bwipjs.toCanvas(canvasRef.current, {
          bcid: "code128",
          text: sampleBarcode,
          scale: 3,
          height: 10,
          rotate: rotCode,
          includetext: false,
          backgroundcolor: "FFFFFF",
        });
      } catch (err) {
        console.error("Barcode preview canvas error:", err);
      }
    }
  }, [sampleBarcode, barcodeRotation]);

  const renderBarcodeBlock = () => (
    <div className="flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        className={
          barcodeRotation === 90 || barcodeRotation === 270
            ? "max-h-[60px] max-w-[28px]"
            : "max-h-[26px] max-w-[85%]"
        }
      />
      {showHri && (
        <span className="font-mono text-[9px] font-bold tracking-[0.2em] text-black leading-none mt-1.5">
          {sampleBarcode.split("").join(" ")}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Real-time Label Preview
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Dimensions: <span className="font-mono font-medium">50 mm × 25 mm</span> | Layout:{" "}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
              {layoutPreset.replace("_", " ")} ({barcodeRotation}°)
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Barcode Number Toggle Button */}
          {onToggleShowHri && (
            <button
              type="button"
              onClick={() => onToggleShowHri(!showHri)}
              className={`rounded-lg px-2 py-1 text-[11px] font-semibold border transition-all ${
                showHri
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
              }`}
              title="Click to toggle barcode number below barcode"
            >
              Number: {showHri ? "ON (Default)" : "OFF"}
            </button>
          )}

          {/* Border Toggle Button */}
          {onToggleShowBorder && (
            <button
              type="button"
              onClick={() => onToggleShowBorder(!showBorder)}
              className={`rounded-lg px-2 py-1 text-[11px] font-semibold border transition-all ${
                showBorder
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300"
                  : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
              }`}
              title="Click to toggle outer border outline"
            >
              Border: {showBorder ? "ON" : "OFF (Default)"}
            </button>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-950">
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
              className="rounded p-1 text-zinc-600 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="rounded p-1 text-zinc-600 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom(1.8)}
              className="rounded p-1 text-zinc-600 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              title="Reset Zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-[240px] items-center justify-center overflow-auto rounded-xl border border-dashed border-zinc-300 bg-zinc-100 p-6 dark:border-zinc-700 dark:bg-zinc-950/60">
        {/* Physical 50mm x 25mm Label Container (2.0" x 1.0" Roll) */}
        <div
          style={{
            width: `${50 * 3.78 * zoom}px`,
            height: `${25 * 3.78 * zoom}px`,
          }}
          className={`relative flex rounded-xl bg-white p-2 text-black shadow-lg transition-all ${
            showBorder ? "border-2 border-black" : "border border-dashed border-zinc-300"
          }`}
        >
          {layoutPreset === "vertical_left" ? (
            <div className="flex w-full h-full items-center">
              {/* Barcode Left */}
              <div className="flex items-center justify-center pr-2 border-r border-zinc-300">
                {renderBarcodeBlock()}
              </div>

              {/* Text Right */}
              <div className="flex flex-1 flex-col justify-between h-full pl-2">
                <div className="text-center font-extrabold tracking-tight uppercase leading-none text-[10px] line-clamp-1">
                  {productName}
                </div>
                <div className="flex items-center justify-between text-black">
                  <span className="font-bold text-[10px]">SALE PRICE:</span>
                  <span className="font-extrabold text-[14px] tracking-tight leading-none">
                    ₹{formatAmount(salesPrice)}
                  </span>
                </div>
                <div className="w-full border-t border-zinc-400" />
                <div className="flex items-center justify-between text-black">
                  <span className="font-bold text-[10px]">MRP:</span>
                  <span className="font-bold text-[11px]">
                    ₹{formatAmount(mrp)}
                  </span>
                </div>
                <div className="w-full border-t border-zinc-400" />
                <div className="flex items-center justify-between text-[7.5px] leading-none">
                  <span className="font-bold">NET QTY: {netQuantity}</span>
                  <span className="text-zinc-800 flex items-center gap-0.5">
                    <Globe className="h-2 w-2 inline" />
                    {website}
                  </span>
                </div>
              </div>
            </div>
          ) : layoutPreset === "vertical_right" ? (
            <div className="flex w-full h-full items-center">
              {/* Text Left */}
              <div className="flex flex-1 flex-col justify-between h-full pr-2">
                <div className="text-center font-extrabold tracking-tight uppercase leading-none text-[10px] line-clamp-1">
                  {productName}
                </div>
                <div className="flex items-center justify-between text-black">
                  <span className="font-bold text-[10px]">SALE PRICE:</span>
                  <span className="font-extrabold text-[14px] tracking-tight leading-none">
                    ₹{formatAmount(salesPrice)}
                  </span>
                </div>
                <div className="w-full border-t border-zinc-400" />
                <div className="flex items-center justify-between text-black">
                  <span className="font-bold text-[10px]">MRP:</span>
                  <span className="font-bold text-[11px]">
                    ₹{formatAmount(mrp)}
                  </span>
                </div>
                <div className="w-full border-t border-zinc-400" />
                <div className="flex items-center justify-between text-[7.5px] leading-none">
                  <span className="font-bold">NET QTY: {netQuantity}</span>
                  <span className="text-zinc-800 flex items-center gap-0.5">
                    <Globe className="h-2 w-2 inline" />
                    {website}
                  </span>
                </div>
              </div>

              {/* Barcode Right */}
              <div className="flex items-center justify-center pl-2 border-l border-zinc-300">
                {renderBarcodeBlock()}
              </div>
            </div>
          ) : layoutPreset === "barcode_bottom" ? (
            <div className="flex w-full flex-col justify-between h-full">
              <div className="text-center font-extrabold tracking-tight uppercase leading-none text-[11px] line-clamp-1">
                {productName}
              </div>
              <div className="flex items-center justify-between text-black my-0.5 px-0.5">
                <span className="font-bold text-[11px]">SALE PRICE:</span>
                <span className="font-extrabold text-[16px] tracking-tight leading-none">
                  ₹{formatAmount(salesPrice)}
                </span>
              </div>
              <div className="w-full border-t border-zinc-400" />
              <div className="flex items-center justify-between text-black px-0.5">
                <span className="font-bold text-[11px]">MRP:</span>
                <span className="font-bold text-[12px]">
                  ₹{formatAmount(mrp)}
                </span>
              </div>
              <div className="w-full border-t border-zinc-400" />
              {renderBarcodeBlock()}
              <div className="flex items-center justify-between text-[8px] leading-none">
                <span className="font-bold">NET QTY: {netQuantity}</span>
                <span className="text-zinc-800 flex items-center gap-0.5">
                  <Globe className="h-2 w-2 inline" />
                  {website}
                </span>
              </div>
            </div>
          ) : (
            // standard (Barcode top centered - Clean Reverted Design)
            <div className="flex w-full flex-col justify-between h-full">
              <div className="text-center font-extrabold tracking-tight uppercase leading-none text-[11px] line-clamp-1">
                {productName}
              </div>
              {renderBarcodeBlock()}
              <div className="flex items-center justify-center gap-1 text-black my-0.5">
                <span className="font-bold text-[11px]">SALE PRICE:</span>
                <span className="font-extrabold text-[16px] tracking-tight leading-none">
                  {formatAmount(salesPrice)}
                </span>
              </div>
              <div className="w-full border-t border-zinc-400" />
              <div className="text-center font-bold text-[11px] text-black">
                MRP: {formatAmount(mrp)}
              </div>
              <div className="w-full border-t border-zinc-400" />
              <div className="flex items-center justify-between text-[8px] leading-none px-0.5">
                <span className="font-bold">NET QTY: {netQuantity}</span>
                <span className="text-zinc-800 font-semibold">{website}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
