import { useState } from "react";
import { MaterialReceiptChecklist } from "../types";
import { Search, FileSpreadsheet, Trash2, Edit, Printer, Calendar, Database, Package } from "lucide-react";

interface ChecklistHistoryProps {
  history: MaterialReceiptChecklist[];
  onSelect: (checklist: MaterialReceiptChecklist) => void;
  onDelete: (id: string) => void;
  onPrintItem: (checklist: MaterialReceiptChecklist) => void;
}

export default function ChecklistHistory({ history, onSelect, onDelete, onPrintItem }: ChecklistHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredHistory = history.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.materialName || "").toLowerCase().includes(q) ||
      (item.grnNo || "").toLowerCase().includes(q) ||
      (item.batchNo || "").toLowerCase().includes(q) ||
      (item.supplier || "").toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm overflow-hidden p-6 h-full flex flex-col">
      <div className="border-b border-zinc-800 pb-4 mb-4">
        <h2 className="text-lg font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          Saved Checklists
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Search and manage your pharmaceutical material receipt archive.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, GRN, batch, supplier..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
        />
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[500px]">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xs font-semibold text-zinc-300">No checklists found</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {searchQuery ? "Try a different search term" : "Checklists you save will appear here"}
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              className="border border-zinc-800/80 hover:border-blue-500/30 bg-zinc-950/40 hover:bg-zinc-900/50 rounded-xl p-4 transition-all duration-200 shadow-xs flex flex-col gap-3 group relative"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/10 px-2 py-0.5 rounded-md">
                    GRN: {item.grnNo || "Pending"}
                  </span>
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(item.createdAt)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-zinc-100 line-clamp-1">
                  {item.materialName || "Unnamed Material"}
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px] text-zinc-400">
                  <p className="line-clamp-1"><strong className="text-zinc-300">Batch:</strong> {item.batchNo || "---"}</p>
                  <p className="line-clamp-1"><strong className="text-zinc-300">Vendor:</strong> {item.supplier || "---"}</p>
                  <p className="line-clamp-1"><strong className="text-zinc-300">Qty:</strong> {item.totalQtyReceived || "---"}</p>
                  <p className="line-clamp-1"><strong className="text-zinc-300">Packing:</strong> {item.packing || "---"}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 border-t border-zinc-800/60 pt-3 mt-1 justify-end">
                <button
                  onClick={() => onPrintItem(item)}
                  title="Print Report"
                  className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSelect(item)}
                  className="flex items-center gap-1 py-1 px-2 text-[10px] font-bold text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit / Load
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  title="Delete Record"
                  className="p-1.5 hover:bg-red-950/30 text-zinc-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Database Summary Section */}
      {history.length > 0 && (
        <div className="border-t border-zinc-800 pt-4 mt-4 text-[10px] text-zinc-500 flex items-center justify-between">
          <span className="font-semibold text-zinc-400">
            Archive Total: {history.length} record{history.length > 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
            Storage Synced
          </span>
        </div>
      )}
    </div>
  );
}
