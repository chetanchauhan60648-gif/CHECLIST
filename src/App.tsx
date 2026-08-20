import { useState, useEffect } from "react";
import { MaterialReceiptChecklist } from "./types";
import ImageUploader from "./components/ImageUploader";
import ChecklistForm from "./components/ChecklistForm";
import ChecklistHistory from "./components/ChecklistHistory";
import { Sparkles, FileText, CheckCircle, Database, LayoutGrid, Info, Loader2, AlertCircle } from "lucide-react";

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
        grossWeightObserved: "25.55",
        diffQty: "0.55",
        remark: "NOT OK"
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
        setInfoMessage("Demo Mode Active: Using simulated document extraction because GEMINI_API_KEY is not configured in settings.");
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
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Something went wrong while connecting to Gemini AI.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = (updated: MaterialReceiptChecklist) => {
    // Check if item is already in history to update, otherwise insert new
    let newHistory = [...history];
    const existingIndex = history.findIndex((item) => item.id === updated.id);

    if (existingIndex >= 0) {
      newHistory[existingIndex] = {
        ...updated,
        createdAt: new Date().toISOString(), // update saved timestamp
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
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this checklist?")) {
      const filtered = history.filter((item) => item.id !== id);
      setHistory(filtered);
      localStorage.setItem("material_receipt_history", JSON.stringify(filtered));
      
      // If we deleted the active checklist, set back to sample
      if (activeChecklist.id === id) {
        setActiveChecklist(getSampleChecklist());
      }
    }
  };

  const handleSelect = (selected: MaterialReceiptChecklist) => {
    setActiveChecklist(selected);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintSpecific = (checklist: MaterialReceiptChecklist) => {
    setActiveChecklist(checklist);
    // Let state apply, then call print
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased selection:bg-blue-600 selection:text-white pb-16 print:bg-white print:text-black">
      {/* Screen Layout */}
      <div>
        {/* Navigation Bar */}
        <header className="no-print sticky top-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/10">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                  Material Receipt Checklist AI
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-md font-bold tracking-wide uppercase">
                    v1.2
                  </span>
                </h1>
                <p className="text-[10px] text-zinc-500 font-medium">West-Coast Pharmaceutical Works Ltd. Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Gemini 3.5 Active
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-12 gap-8 print:mt-0 print:px-0">
          
          {/* Left Column: Uploaders and Saved History Archive */}
          <div className="no-print col-span-12 lg:col-span-4 space-y-8">
            {/* Uploader Section */}
            <ImageUploader onProcess={handleProcess} isProcessing={isProcessing} />

            {/* Error Notification Alert */}
            {errorMessage && (
              <div className="bg-red-950/40 border border-red-900/50 text-red-400 rounded-2xl p-4 flex gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Analysis Failed</h4>
                  <p className="text-xs text-red-300 mt-1">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Demo Mode / Info Alert */}
            {infoMessage && (
              <div className="bg-amber-950/40 border border-amber-900/50 text-amber-400 rounded-2xl p-4 flex gap-3 shadow-xs">
                <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">Demo Mode Active</h4>
                  <p className="text-xs text-amber-300 mt-1">{infoMessage}</p>
                </div>
              </div>
            )}

            {/* Application Overview Info Card */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 shadow-xs">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-zinc-400" />
                How It Works
              </h3>
              <div className="space-y-3.5">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-xs flex items-center justify-center shrink-0">1</span>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Upload or snap a photo of the <strong>Bill/Invoice</strong> and the <strong>Material Container/Label</strong>.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-xs flex items-center justify-center shrink-0">2</span>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Optionally insert the <strong>Packing Type</strong> and <strong>Total Quantity</strong> manually to pre-populate them.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-xs flex items-center justify-center shrink-0">3</span>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Click <strong>Fill Automated Checklist</strong> to query Gemini AI, which extracts all invoice dates, batch numbers, PO details, and compiles the form.
                  </p>
                </div>
              </div>
            </div>

            {/* Saved Checklists sidebar */}
            <ChecklistHistory
              history={history}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onPrintItem={handlePrintSpecific}
            />
          </div>

          {/* Right Column: Editable Checklist Form */}
          <div className="col-span-12 lg:col-span-8 print:col-span-12 print:w-full print:p-0">
            <ChecklistForm
              checklist={activeChecklist}
              onSave={handleSave}
              onPrint={handlePrint}
            />
          </div>

        </main>
      </div>
    </div>
  );
}
