import { useState, useEffect } from "react";
import { MaterialReceiptChecklist } from "./types";
import ImageUploader from "./components/ImageUploader";
import ChecklistForm from "./components/ChecklistForm";
import ChecklistHistory from "./components/ChecklistHistory";
import { 
  Sparkles, 
  FileText, 
  CheckCircle, 
  Database, 
  LayoutGrid, 
  Info, 
  Loader2, 
  AlertCircle,
  Plus,
  RotateCcw,
  Printer,
  ShieldCheck,
  Package,
  Layers,
  Building,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Calendar,
  Eye,
  SlidersHorizontal,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const getSampleChecklist = (): MaterialReceiptChecklist => {
  const today = new Date().toISOString().split("T")[0];
  return {
    id: "sample-demo",
    createdAt: new Date().toISOString(),
    grnNo: "GRN-2026-9812",
    materialReceivedDate: today,
    materialInwardNo: "IWD-8841",
    challanNo: "CH-55201-A",
    challanDate: today,
    batchNo: "BCH-ASP-774",
    materialName: "Aspirin Active Pharmaceutical Ingredient (API) Powder",
    mfgDate: "2026-02-15",
    expDate: "2028-02-14",
    poNumber: "PO-440912",
    poDate: "2026-07-01",
    packing: "25 kg Fibre Drums",
    availableShelfLife: "19 Months",
    totalQtyReceived: "500 kg",
    challanQty: "500 kg",
    supplier: "Global Chemical Synthetics Ltd.",
    mfgBy: "Alps Pharma Labs Pvt. Ltd.",
    mfgLicNo: "MFG-LIC-ALPS-2025/99",
    receivedFromApprovedVendor: "Yes",
    coaReceivedFromMfg: "Yes",
    vehicleCondition: "Satisfactory",
    qrCodeAvailability: "Yes",
    damage: "No",
    labelCondition: "Satisfactory",
    seal: "Satisfactory",
    packingCondition: "Satisfactory",
    waterPenetration: "No",
    coaReceived: "Yes",
    allowedWtVariationApi: "Limit: ± 0.5",
    allowedWtVariationExcipients: "Limit: ± 1.0",
    weightChecks: [
      {
        containerNo: "1",
        grossWeightOnLabel: "25.00",
        grossWeightObserved: "25.10",
        diffQty: "0.10",
        remark: "OK"
      },
      {
        containerNo: "2",
        grossWeightOnLabel: "25.00",
        grossWeightObserved: "24.95",
        diffQty: "-0.05",
        remark: "OK"
      },
      {
        containerNo: "3",
        grossWeightOnLabel: "25.00",
        grossWeightObserved: "25.05",
        diffQty: "0.05",
        remark: "OK"
      }
    ]
  };
};

const getBlankChecklist = (): MaterialReceiptChecklist => {
  const today = new Date().toISOString().split("T")[0];
  return {
    id: "new-" + Date.now(),
    createdAt: new Date().toISOString(),
    grnNo: "",
    materialReceivedDate: today,
    materialInwardNo: "",
    challanNo: "",
    challanDate: today,
    batchNo: "",
    materialName: "",
    mfgDate: "",
    expDate: "",
    poNumber: "",
    poDate: today,
    packing: "25 kg Fibre Drum",
    availableShelfLife: "",
    totalQtyReceived: "",
    challanQty: "",
    supplier: "",
    mfgBy: "",
    mfgLicNo: "",
    receivedFromApprovedVendor: "Yes",
    coaReceivedFromMfg: "Yes",
    vehicleCondition: "Satisfactory",
    qrCodeAvailability: "Yes",
    damage: "No",
    labelCondition: "Satisfactory",
    seal: "Satisfactory",
    packingCondition: "Satisfactory",
    waterPenetration: "No",
    coaReceived: "Yes",
    allowedWtVariationApi: "Limit: ± 0.5",
    allowedWtVariationExcipients: "Limit: ± 1.0",
    weightChecks: [
      {
        containerNo: "1",
        grossWeightOnLabel: "",
        grossWeightObserved: "",
        diffQty: "",
        remark: ""
      }
    ]
  };
};

export default function App() {
  const [activeChecklist, setActiveChecklist] = useState<MaterialReceiptChecklist>(getSampleChecklist());
  const [history, setHistory] = useState<MaterialReceiptChecklist[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [saveSuccessNotification, setSaveSuccessNotification] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"workspace" | "checklist" | "archive">("workspace");
  const [showGuide, setShowGuide] = useState(false);

  // Load history from localStorage on startup
  useEffect(() => {
    const saved = localStorage.getItem("material_receipt_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to parse history from local storage:", err);
      }
    }
  }, []);

  const handleProcess = async (
    billBase64: string | null,
    materialBase64: string | null,
    manualPacking: string,
    manualQty: string
  ) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const response = await fetch("/api/process-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billImage: billBase64,
          materialImage: materialBase64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze document with Gemini AI.");
      }

      const extractedData = await response.json();

      if (extractedData._isSimulated) {
        setInfoMessage("Demo Extraction Mode: Simulating document extraction fields.");
      }

      // Create new checklist with extracted details
      const today = new Date().toISOString().split("T")[0];
      const newChecklist: MaterialReceiptChecklist = {
        id: "active-draft-" + Date.now(),
        createdAt: new Date().toISOString(),
        grnNo: extractedData.grnNo || "",
        materialReceivedDate: extractedData.materialReceivedDate || today,
        materialInwardNo: extractedData.materialInwardNo || "",
        challanNo: extractedData.challanNo || "",
        challanDate: extractedData.challanDate || today,
        batchNo: extractedData.batchNo || "",
        materialName: extractedData.materialName || "",
        mfgDate: extractedData.mfgDate || "",
        expDate: extractedData.expDate || "",
        poNumber: extractedData.poNumber || "",
        poDate: extractedData.poDate || "",
        
        // Manual override or extracted packing
        packing: manualPacking || extractedData.packing || "25 kg Bag",
        availableShelfLife: extractedData.availableShelfLife || "",
        
        // Manual override or extracted quantity
        totalQtyReceived: manualQty || extractedData.totalQtyReceived || "",
        challanQty: manualQty || extractedData.challanQty || "",
        
        supplier: extractedData.supplier || "",
        mfgBy: extractedData.mfgBy || "",
        mfgLicNo: extractedData.mfgLicNo || "",
        
        receivedFromApprovedVendor: extractedData.receivedFromApprovedVendor === "No" ? "No" : "Yes",
        coaReceivedFromMfg: extractedData.coaReceivedFromMfg === "No" ? "No" : "Yes",
        vehicleCondition: extractedData.vehicleCondition === "Not satisfactory" ? "Not satisfactory" : "Satisfactory",
        qrCodeAvailability: extractedData.qrCodeAvailability === "No" ? "No" : "Yes",
        
        damage: extractedData.damage === "Yes" ? "Yes" : "No",
        labelCondition: extractedData.labelCondition === "Not satisfactory" ? "Not satisfactory" : "Satisfactory",
        seal: extractedData.seal === "Not satisfactory" ? "Not satisfactory" : "Satisfactory",
        packingCondition: extractedData.packingCondition === "Not satisfactory" ? "Not satisfactory" : "Satisfactory",
        waterPenetration: extractedData.waterPenetration === "Yes" ? "Yes" : "No",
        coaReceived: extractedData.coaReceived === "No" ? "No" : "Yes",
        
        allowedWtVariationApi: extractedData.allowedWtVariationApi || "Limit: ± 0.5",
        allowedWtVariationExcipients: extractedData.allowedWtVariationExcipients || "Limit: ± 1.0",
        
        weightChecks: (extractedData.weightChecks && extractedData.weightChecks.length > 0)
          ? extractedData.weightChecks
          : [
              {
                containerNo: "1",
                grossWeightOnLabel: "",
                grossWeightObserved: "",
                diffQty: "",
                remark: ""
              }
            ]
      };

      setActiveChecklist(newChecklist);
      setSaveSuccessNotification("Checklist populated from AI scan successfully!");
      setTimeout(() => setSaveSuccessNotification(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Something went wrong while connecting to Gemini AI.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = (updated: MaterialReceiptChecklist) => {
    let newHistory = [...history];
    const existingIndex = history.findIndex((item) => item.id === updated.id);

    if (existingIndex >= 0) {
      newHistory[existingIndex] = {
        ...updated,
        createdAt: new Date().toISOString(),
      };
    } else {
      newHistory = [
        {
          ...updated,
          id: "checklist-" + Date.now(),
          createdAt: new Date().toISOString(),
        },
        ...newHistory,
      ];
    }

    setHistory(newHistory);
    localStorage.setItem("material_receipt_history", JSON.stringify(newHistory));
    setSaveSuccessNotification(`Saved "${updated.materialName || 'Checklist'}" to archive.`);
    setTimeout(() => setSaveSuccessNotification(null), 3500);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this checklist from archive?")) {
      const filtered = history.filter((item) => item.id !== id);
      setHistory(filtered);
      localStorage.setItem("material_receipt_history", JSON.stringify(filtered));
      
      if (activeChecklist.id === id) {
        setActiveChecklist(getSampleChecklist());
      }
    }
  };

  const handleSelect = (selected: MaterialReceiptChecklist) => {
    setActiveChecklist(selected);
    setActiveView("workspace");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintSpecific = (checklist: MaterialReceiptChecklist) => {
    setActiveChecklist(checklist);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleNewChecklist = () => {
    if (confirm("Create a blank new checklist? Any unsaved edits on current form will be reset.")) {
      setActiveChecklist(getBlankChecklist());
      setActiveView("workspace");
    }
  };

  const handleLoadSample = () => {
    setActiveChecklist(getSampleChecklist());
    setActiveView("workspace");
  };

  // Quick calculations for the KPI ribbon
  const totalWeightContainers = activeChecklist.weightChecks?.length || 0;
  const okContainers = activeChecklist.weightChecks?.filter(w => w.remark === "OK").length || 0;
  const notOkContainers = activeChecklist.weightChecks?.filter(w => w.remark === "NOT OK").length || 0;
  const isCompliant = activeChecklist.damage === "No" && 
                      activeChecklist.waterPenetration === "No" && 
                      activeChecklist.seal === "Satisfactory" && 
                      activeChecklist.receivedFromApprovedVendor === "Yes";

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased selection:bg-blue-600 selection:text-white pb-20 print:bg-white print:text-black print:pb-0">
      
      {/* TOP COMMAND HEADER */}
      <header className="no-print sticky top-0 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/90 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight truncate">
                    West-Coast QA & Material Receipt
                  </h1>
                  <span className="hidden sm:inline-block text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    AI Automated
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-medium truncate">
                  West-Coast Pharmaceutical Works Ltd. • SOP/QA/001 Checklist
                </p>
              </div>
            </div>

            {/* Navigation Switchers */}
            <div className="hidden md:flex items-center bg-zinc-900/90 p-1 rounded-xl border border-zinc-800/80">
              <button
                onClick={() => setActiveView("workspace")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === "workspace"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Workspace
              </button>
              <button
                onClick={() => setActiveView("checklist")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === "checklist"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Full Document
              </button>
              <button
                onClick={() => setActiveView("archive")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeView === "archive"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Archive ({history.length})
              </button>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleNewChecklist}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                title="Create blank new checklist"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                New Blank
              </button>

              <button
                onClick={handleLoadSample}
                className="hidden lg:flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                title="Load sample Aspirin API demo data"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                Sample Demo
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 print:mt-0 print:px-0">
        
        {/* EXECUTIVE KPI / STATUS SUMMARY STRIP */}
        <div className="no-print mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Active Material */}
          <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800/80 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-400" />
                Active Material
              </span>
              <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                {activeChecklist.grnNo || "Draft"}
              </span>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-zinc-100 line-clamp-1">
                {activeChecklist.materialName || "No Material Named"}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                Batch: {activeChecklist.batchNo || "---"} • Inward: {activeChecklist.materialInwardNo || "---"}
              </p>
            </div>
          </div>

          {/* Card 2: Quantity & Containers */}
          <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800/80 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-indigo-400" />
                Quantity & Packing
              </span>
              <span className="text-[10px] text-zinc-400">
                {totalWeightContainers} Checked
              </span>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-zinc-100 line-clamp-1">
                {activeChecklist.totalQtyReceived || activeChecklist.challanQty || "---"}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                Packing: {activeChecklist.packing || "---"}
              </p>
            </div>
          </div>

          {/* Card 3: Quality Compliance */}
          <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800/80 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                QC Verification
              </span>
              {isCompliant ? (
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> OK
                </span>
              ) : (
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Flagged
                </span>
              )}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-zinc-100 line-clamp-1">
                Seal: {activeChecklist.seal} • Damage: {activeChecklist.damage}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                Approved Vendor: {activeChecklist.receivedFromApprovedVendor} • Water: {activeChecklist.waterPenetration}
              </p>
            </div>
          </div>

          {/* Card 4: Supplier & Manufacturing */}
          <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800/80 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-purple-400" />
                Manufacturer / Vendor
              </span>
              <span className="text-[10px] text-zinc-500">
                PO: {activeChecklist.poNumber || "---"}
              </span>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-zinc-100 line-clamp-1">
                {activeChecklist.supplier || activeChecklist.mfgBy || "---"}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                Mfg: {activeChecklist.mfgDate || "---"} • Exp: {activeChecklist.expDate || "---"}
              </p>
            </div>
          </div>
        </div>

        {/* ALERTS & NOTIFICATIONS */}
        <div className="no-print space-y-3 mb-6">
          <AnimatePresence>
            {saveSuccessNotification && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 rounded-xl p-3.5 flex items-center justify-between shadow-lg"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-medium">{saveSuccessNotification}</span>
                </div>
                <button
                  onClick={() => setSaveSuccessNotification(null)}
                  className="text-emerald-400/60 hover:text-emerald-300 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-950/50 border border-red-900/60 text-red-400 rounded-xl p-4 flex gap-3 shadow-lg"
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider">Analysis Failed</h4>
                  <p className="text-xs text-red-300 mt-1">{errorMessage}</p>
                </div>
                <button onClick={() => setErrorMessage(null)} className="text-red-400/60 hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {infoMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-amber-950/50 border border-amber-900/60 text-amber-400 rounded-xl p-4 flex gap-3 shadow-lg"
              >
                <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider">System Information</h4>
                  <p className="text-xs text-amber-300 mt-1">{infoMessage}</p>
                </div>
                <button onClick={() => setInfoMessage(null)} className="text-amber-400/60 hover:text-amber-300">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* WORKSPACE VIEW (SPLIT LAYOUT) */}
        {activeView === "workspace" && (
          <div className="grid grid-cols-12 gap-6 print:grid-cols-12 print:gap-0">
            {/* Left Column: AI Document Scanner & Archives */}
            <div className="no-print col-span-12 lg:col-span-4 space-y-6">
              
              {/* Document Scanner */}
              <ImageUploader onProcess={handleProcess} isProcessing={isProcessing} />

              {/* Quick Operation Guide (Collapsible) */}
              <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800/80 p-4 shadow-sm">
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="w-full flex items-center justify-between text-xs font-bold text-zinc-300 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-400" />
                    How It Works (3 Steps)
                  </span>
                  <span className="text-[10px] text-zinc-500">{showGuide ? "Hide" : "Show"}</span>
                </button>

                {showGuide && (
                  <div className="mt-3.5 space-y-3 pt-3 border-t border-zinc-800/80 text-xs text-zinc-300">
                    <div className="flex gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                      <p className="text-zinc-300 leading-relaxed text-[11px]">
                        Upload or snap photos of the <strong>Bill/Invoice</strong> and the <strong>Container Label</strong>.
                      </p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                      <p className="text-zinc-300 leading-relaxed text-[11px]">
                        Optionally pick a quick prefill for <strong>Packing Type</strong> or <strong>Quantity</strong>.
                      </p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                      <p className="text-zinc-300 leading-relaxed text-[11px]">
                        Click <strong>Fill Automated Checklist</strong> to extract data, calculate drum weights, and generate official print/PDF.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Saved Archives Card */}
              <ChecklistHistory
                history={history}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onPrintItem={handlePrintSpecific}
              />
            </div>

            {/* Right Column: Editable Live West Coast Checklist */}
            <div className="col-span-12 lg:col-span-8 print:col-span-12 print:w-full print:p-0">
              <ChecklistForm
                checklist={activeChecklist}
                onSave={handleSave}
                onPrint={handlePrint}
              />
            </div>
          </div>
        )}

        {/* FOCUSED CHECKLIST DOCUMENT VIEW */}
        {activeView === "checklist" && (
          <div className="max-w-5xl mx-auto">
            <ChecklistForm
              checklist={activeChecklist}
              onSave={handleSave}
              onPrint={handlePrint}
            />
          </div>
        )}

        {/* FOCUSED ARCHIVE VAULT VIEW */}
        {activeView === "archive" && (
          <div className="max-w-5xl mx-auto">
            <ChecklistHistory
              history={history}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onPrintItem={handlePrintSpecific}
            />
          </div>
        )}

      </main>
    </div>
  );
}
