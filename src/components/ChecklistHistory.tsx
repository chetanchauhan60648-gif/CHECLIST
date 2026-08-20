import { useState } from "react";
import { MaterialReceiptChecklist } from "../types";
import { 
  Search, 
  Trash2, 
  Edit3, 
  Printer, 
  Calendar, 
  Database, 
  Package, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  FileCheck2,
  Download,
  Filter,
  ArrowUpDown
} from "lucide-react";

interface ChecklistHistoryProps {
  history: MaterialReceiptChecklist[];
  onSelect: (checklist: MaterialReceiptChecklist) => void;
  onDelete: (id: string) => void;
  onPrintItem: (checklist: MaterialReceiptChecklist) => void;
}

export default function ChecklistHistory({ history, onSelect, onDelete, onPrintItem }: ChecklistHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "approved" | "issues">("all");

  const filteredHistory = history.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (item.materialName || "").toLowerCase().includes(q) ||
      (item.grnNo || "").toLowerCase().includes(q) ||
      (item.batchNo || "").toLowerCase().includes(q) ||
      (item.supplier || "").toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterType === "approved") {
      return item.receivedFromApprovedVendor === "Yes" && item.damage === "No";
    }
    if (filterType === "issues") {
      return item.damage === "Yes" || item.waterPenetration === "Yes" || item.receivedFromApprovedVendor === "No";
    }

    return true;
  });

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="checklist-history-card" className="bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-zinc-800/90 shadow-xl overflow-hidden p-5 sm:p-6 flex flex-col transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
                Receipts Archive
              </h2>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                {history.length} Record{history.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Saved West-Coast QA checklists & GRN records
            </p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by material, GRN, batch, supplier..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 mb-3.5">
        <button
          onClick={() => setFilterType("all")}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
            filterType === "all"
              ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
          }`}
        >
          All ({history.length})
        </button>
        <button
          onClick={() => setFilterType("approved")}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
            filterType === "approved"
              ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
              : "text-zinc-500 hover:text-emerald-400 hover:bg-zinc-900"
          }`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Compliant
        </button>
        <button
          onClick={() => setFilterType("issues")}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
            filterType === "issues"
              ? "bg-amber-950/60 text-amber-300 border border-amber-800/60"
              : "text-zinc-500 hover:text-amber-400 hover:bg-zinc-900"
          }`}
        >
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          Deviations
        </button>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[440px] custom-scrollbar">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/40">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center mb-2 border border-zinc-800">
              <Package className="w-5 h-5 text-zinc-500" />
            </div>
            <p className="text-xs font-semibold text-zinc-300">No matching records</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {searchQuery ? "Try refining your search keyword" : "Saved checklists will be archived here"}
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => {
            const hasDiscrepancy = item.damage === "Yes" || item.waterPenetration === "Yes";
            return (
              <div
                key={item.id}
                className="border border-zinc-800/90 hover:border-blue-500/40 bg-zinc-950/60 hover:bg-zinc-950 rounded-xl p-3.5 transition-all shadow-xs flex flex-col gap-2.5 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                      {item.grnNo ? `GRN: ${item.grnNo}` : "GRN: Pending"}
                    </span>
                    <div className="flex items-center gap-2">
                      {hasDiscrepancy ? (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                          Deviations
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          Passed
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.materialReceivedDate || item.createdAt)}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-zinc-100 line-clamp-1 group-hover:text-blue-300 transition-colors">
                    {item.materialName || "Unnamed Material"}
                  </h3>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-[10px] text-zinc-400 bg-zinc-900/60 p-2 rounded-lg border border-zinc-850">
                    <p className="line-clamp-1">
                      <strong className="text-zinc-300">Batch:</strong> {item.batchNo || "---"}
                    </p>
                    <p className="line-clamp-1">
                      <strong className="text-zinc-300">Qty:</strong> {item.totalQtyReceived || "---"}
                    </p>
                    <p className="line-clamp-1 col-span-2">
                      <strong className="text-zinc-300">Vendor:</strong> {item.supplier || item.mfgBy || "---"}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2 mt-0.5">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {item.weightChecks?.length || 0} drums verified
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onPrintItem(item)}
                      title="Print Report"
                      className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onSelect(item)}
                      className="flex items-center gap-1 py-1 px-2.5 text-[10px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      Load Checklist
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      title="Delete Record"
                      className="p-1.5 hover:bg-red-950/40 text-zinc-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Synced Badge */}
      <div className="border-t border-zinc-800/80 pt-3.5 mt-3 text-[10px] text-zinc-500 flex items-center justify-between">
        <span className="font-semibold text-zinc-400">
          Local Storage Persistence Active
        </span>
        <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
          Ready & Secure
        </span>
      </div>
    </div>
  );
}
