"use client";

import { Check, X, RefreshCw } from "lucide-react";
import { BulkImportState } from "@/types/products/bulk_import";

interface BulkImportActionsProps {
  state: BulkImportState;
  onImport: () => void;
  onReset: () => void;
  disabled?: boolean;
}

export function BulkImportActions({
  state,
  onImport,
  onReset,
  disabled = false,
}: BulkImportActionsProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {/* Reset Button */}
      <button
        onClick={onReset}
        disabled={disabled || state === "importing"}
        className="flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className="w-5 h-5" />
        <span>Reset</span>
      </button>

      {/* Import Button */}
      <button
        onClick={onImport}
        disabled={disabled || state === "importing"}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-lg font-medium
          transition-colors
          ${
            disabled || state === "importing"
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-gray-900 text-white hover:bg-gray-800"
          }
        `}
      >
        {state === "importing" ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Importing...</span>
          </>
        ) : (
          <>
            <Check className="w-5 h-5" />
            <span>Import Products</span>
          </>
        )}
      </button>
    </div>
  );
}
