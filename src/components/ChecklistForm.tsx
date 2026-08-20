import { useState, useEffect } from "react";
import { MaterialReceiptChecklist, WeightCheckRecord } from "../types";
import { Plus, Trash2, Printer, Save, CheckCircle, HelpCircle, FileText, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ChecklistFormProps {
  checklist: MaterialReceiptChecklist;
  onSave: (updatedChecklist: MaterialReceiptChecklist) => void;
  onPrint: () => void;
}

export default function ChecklistForm({ checklist, onSave, onPrint }: ChecklistFormProps) {
  const [formData, setFormData] = useState<MaterialReceiptChecklist>(checklist);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);
  const [variationType, setVariationType] = useState<"api" | "excipient">("api");

  useEffect(() => {
    setFormData(checklist);
  }, [checklist]);

  const handleFieldChange = (key: keyof MaterialReceiptChecklist, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleWeightCheckChange = (index: number, key: keyof WeightCheckRecord, value: string) => {
    const updatedWeightChecks = [...formData.weightChecks];
    const item = { ...updatedWeightChecks[index], [key]: value };

    // Auto calculate Diff Qty and Remark
    if (key === "grossWeightOnLabel" || key === "grossWeightObserved") {
      const labelWt = parseFloat(item.grossWeightOnLabel || "0");
      const obsWt = parseFloat(item.grossWeightObserved || "0");
      
      if (!isNaN(labelWt) && !isNaN(obsWt) && labelWt > 0 && obsWt > 0) {
        const diff = obsWt - labelWt;
        item.diffQty = diff.toFixed(2);
        
        const limit = variationType === "api" ? 0.5 : 1.0;
        if (Math.abs(diff) <= limit) {
          item.remark = "OK";
        } else {
          item.remark = "NOT OK";
        }
      } else {
        item.diffQty = "";
        item.remark = "";
      }
    }

    updatedWeightChecks[index] = item;
    handleFieldChange("weightChecks", updatedWeightChecks);
  };

  // Recalculate all remarks when variation type changes
  useEffect(() => {
    const updatedWeightChecks = formData.weightChecks.map((item) => {
      const labelWt = parseFloat(item.grossWeightOnLabel || "0");
      const obsWt = parseFloat(item.grossWeightObserved || "0");
      
      if (!isNaN(labelWt) && !isNaN(obsWt) && labelWt > 0 && obsWt > 0) {
        const diff = obsWt - labelWt;
        const limit = variationType === "api" ? 0.5 : 1.0;
        return {
          ...item,
          diffQty: diff.toFixed(2),
          remark: Math.abs(diff) <= limit ? "OK" as const : "NOT OK" as const,
        };
      }
      return item;
    });

    setFormData((prev) => ({
      ...prev,
      weightChecks: updatedWeightChecks,
    }));
  }, [variationType]);

  const addWeightRow = () => {
    const newRow: WeightCheckRecord = {
      containerNo: (formData.weightChecks.length + 1).toString(),
      grossWeightOnLabel: "",
      grossWeightObserved: "",
      diffQty: "",
      remark: "",
    };
    handleFieldChange("weightChecks", [...formData.weightChecks, newRow]);
  };

  const removeWeightRow = (index: number) => {
    const updated = formData.weightChecks.filter((_, i) => i !== index).map((row, i) => ({
      ...row,
      containerNo: (i + 1).toString(),
    }));
    handleFieldChange("weightChecks", updated);
  };

  const [autoTotalQty, setAutoTotalQty] = useState("");
  const [autoContainersCount, setAutoContainersCount] = useState("");
  const [tareWeight, setTareWeight] = useState("2.0");

  const parseQty = (val: string) => {
    const m = val.match(/([\d.]+)/);
    return m ? parseFloat(m[1]) : 0;
  };

  useEffect(() => {
    if (checklist.totalQtyReceived) {
      const parsedQty = parseQty(checklist.totalQtyReceived);
      if (parsedQty > 0) {
        setAutoTotalQty(parsedQty.toString());
        
        let guessedCount = 10;
        const matchDrums = checklist.packing.match(/(\d+)\s*(?:drums|drum|bag|bags|nos|container|containers|box|boxes|pkg|pkgs|drums|nos)/i);
        if (matchDrums) {
          guessedCount = parseInt(matchDrums[1], 10);
        } else {
          const numbersInPacking = checklist.packing.match(/\d+(\.\d+)?/g);
          if (numbersInPacking) {
            for (const numStr of numbersInPacking) {
              const num = parseFloat(numStr);
              if (num > 0 && num < parsedQty) {
                const possibleCount = Math.round(parsedQty / num);
                if (possibleCount > 1 && possibleCount <= 200) {
                  guessedCount = possibleCount;
                  break;
                }
              }
            }
          }
        }
        setAutoContainersCount(guessedCount.toString());
      }
    }
  }, [checklist]);

  const detectFromForm = () => {
    const parsedQty = parseQty(formData.totalQtyReceived);
    if (parsedQty > 0) {
      setAutoTotalQty(parsedQty.toString());
      
      let guessedCount = 10;
      const matchDrums = formData.packing.match(/(\d+)\s*(?:drums|drum|bag|bags|nos|container|containers|box|boxes|pkg|pkgs|drums|nos)/i);
      if (matchDrums) {
        guessedCount = parseInt(matchDrums[1], 10);
      } else {
        const numbersInPacking = formData.packing.match(/\d+(\.\d+)?/g);
        if (numbersInPacking) {
          for (const numStr of numbersInPacking) {
            const num = parseFloat(numStr);
            if (num > 0 && num < parsedQty) {
              const possibleCount = Math.round(parsedQty / num);
              if (possibleCount > 1 && possibleCount <= 200) {
                guessedCount = possibleCount;
                break;
              }
            }
          }
        }
      }
      setAutoContainersCount(guessedCount.toString());
    } else {
      alert("Could not detect numeric quantity from 'Total Qty' in the form.");
    }
  };

  const handleAutoGenerateRows = () => {
    const total = parseFloat(autoTotalQty);
    const count = parseInt(autoContainersCount, 10);
    if (isNaN(total) || isNaN(count) || count <= 0) {
      alert("Please enter a valid Total Qty and number of containers.");
      return;
    }

    const netPerUnit = total / count;
    const tare = parseFloat(tareWeight) || 0;
    const grossPerUnit = (netPerUnit + tare).toFixed(2);

    const newRows: WeightCheckRecord[] = Array.from({ length: count }, (_, i) => {
      return {
        containerNo: (i + 1).toString(),
        grossWeightOnLabel: grossPerUnit,
        grossWeightObserved: grossPerUnit,
        diffQty: "0.00",
        remark: "OK" as const,
      };
    });

    handleFieldChange("weightChecks", newRows);
  };

  const totalVal = parseFloat(autoTotalQty);
  const countVal = parseInt(autoContainersCount, 10);
  const calculatedNetPerUnit = (!isNaN(totalVal) && !isNaN(countVal) && countVal > 0) 
    ? (totalVal / countVal).toFixed(2) 
    : "";
  const calculatedGrossPerUnit = (!isNaN(totalVal) && !isNaN(countVal) && countVal > 0) 
    ? ((totalVal / countVal) + (parseFloat(tareWeight) || 0)).toFixed(2) 
    : "";

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Allow 500ms for React to render the fixed/visible pdf-export-element
      await new Promise((resolve) => setTimeout(resolve, 500));

      const element = document.getElementById("pdf-export-element");
      if (!element) {
        throw new Error("PDF export element not found.");
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      // Sanitize the material name to make a safe and clean filename, defaulting to "Material" if empty
      const sanitizedMaterialName = (formData.materialName || "Material").trim().replace(/[/\\?%*:|"<>\s]+/g, "_") || "Material";
      const fileName = `${sanitizedMaterialName}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSaveClick = () => {
    onSave(formData);
    setIsSavedSuccessfully(true);
    setTimeout(() => setIsSavedSuccessfully(false), 3000);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm overflow-hidden p-6 md:p-8 relative print-card">
      {/* Header Actions - hidden on print */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5 mb-6 no-print">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Automated Fill Active
          </span>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight mt-1">Review Receipt Checklist</h2>
          <p className="text-xs text-zinc-400">
            Verify and adjust the values parsed from your documents below.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold text-sm py-2 px-3.5 rounded-xl border border-blue-500 transition-colors cursor-pointer"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Download PDF
              </>
            )}
          </button>
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm py-2 px-3.5 rounded-xl border border-zinc-700 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Checklist
          </button>
          <button
            onClick={handleSaveClick}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSavedSuccessfully ? "Saved!" : "Save to History"}
          </button>
        </div>
      </div>

      {isSavedSuccessfully && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute top-20 right-8 bg-emerald-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg z-50 no-print"
        >
          <CheckCircle className="w-5 h-5" />
          <span className="text-xs font-semibold">Checklist saved to history successfully!</span>
        </motion.div>
      )}

      {isGeneratingPDF && (
        <div className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">Generating High-Quality PDF</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs px-4">
            Preparing print-ready layout and rendering document checks...
          </p>
        </div>
      )}

      {/* Actual Checklist Layout replicating the West Coast template */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950 text-zinc-100 text-[11px] font-sans print:border-gray-300 print:bg-white print:text-black">
        {/* WEST COAST Logo and Header block */}
        <div className="grid grid-cols-12 border-b border-zinc-800 print:border-b-gray-300">
          <div className="col-span-8 p-3 border-r border-zinc-800 flex flex-col justify-center print:border-r-gray-300">
            <div className="font-bold text-[9px] tracking-wider text-zinc-500 uppercase mb-1 print:text-gray-500">MASTER COPY</div>
            <div className="text-[10px] text-zinc-400 leading-tight print:text-gray-600">
              17& 16/5, Meldi Estate, B/s Meldi Mata Temple, Near Gota Railway Crossing, At & Post Gota, Ahmedabad 382 481
            </div>
          </div>
          <div className="col-span-4 p-3 flex flex-col items-center justify-center text-center select-none font-sans bg-white rounded-md m-1 print:m-0 print:rounded-none">
            <div className="flex items-center justify-center gap-0.5">
              <span className="text-sm md:text-base font-extrabold tracking-tight" style={{ color: "#1e297a" }}>WEST-</span>
              <span className="text-sm md:text-base font-extrabold tracking-tight" style={{ color: "#00a1e4" }}>COAST</span>
            </div>
            <div className="w-full mt-1 flex flex-col gap-[1px]">
              <div className="h-[2px] w-full" style={{ backgroundColor: "#1e297a" }}></div>
              <div className="h-[1px] w-full" style={{ backgroundColor: "#00a1e4" }}></div>
            </div>
            <span className="text-[7px] md:text-[8px] font-bold text-gray-700 uppercase tracking-wider mt-1 block">
              Pharmaceutical Works Ltd.
            </span>
          </div>
        </div>

        {/* Form Title */}
        <div className="text-center py-2 bg-zinc-900 border-b border-zinc-800 font-bold text-xs uppercase tracking-wider text-zinc-300 print:bg-gray-50 print:border-b-gray-300 print:text-gray-800">
          MATERIAL RECEIPT CHECK-LIST
        </div>

        {/* General Information Grid */}
        <div className="grid grid-cols-12 border-b border-zinc-800 bg-zinc-950 print:border-b-gray-300 print:bg-white">
          <div className="col-span-12 md:col-span-6 grid grid-cols-3 border-r border-zinc-800 print:border-r-gray-300">
            <div className="p-2 border-b border-zinc-850 font-semibold text-zinc-400 flex items-center print:border-b-gray-200 print:text-gray-600">G.R.N. No.</div>
            <div className="p-1.5 border-b border-zinc-850 col-span-2 flex items-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.grnNo || "---"}</span>
              <input
                type="text"
                value={formData.grnNo}
                onChange={(e) => handleFieldChange("grnNo", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
                placeholder="---"
              />
            </div>

            <div className="p-2 border-b border-zinc-850 font-semibold text-zinc-400 flex items-center print:border-b-gray-200 print:text-gray-600">Material inward no.</div>
            <div className="p-1.5 border-b border-zinc-850 col-span-2 flex items-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.materialInwardNo || "---"}</span>
              <input
                type="text"
                value={formData.materialInwardNo}
                onChange={(e) => handleFieldChange("materialInwardNo", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
                placeholder="---"
              />
            </div>

            <div className="p-2 border-b border-zinc-850 font-semibold text-zinc-400 flex items-center print:border-b-gray-200 print:text-gray-600">Challan date</div>
            <div className="p-1.5 border-b border-zinc-850 col-span-2 flex items-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.challanDate || "---"}</span>
              <input
                type="date"
                value={formData.challanDate}
                onChange={(e) => handleFieldChange("challanDate", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 grid grid-cols-3 bg-zinc-950 print:bg-white">
            <div className="p-2 border-b border-zinc-850 font-semibold text-zinc-400 flex items-center print:border-b-gray-200 print:text-gray-600">Material received date</div>
            <div className="p-1.5 border-b border-zinc-850 col-span-2 flex items-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.materialReceivedDate || "---"}</span>
              <input
                type="date"
                value={formData.materialReceivedDate}
                onChange={(e) => handleFieldChange("materialReceivedDate", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
              />
            </div>

            <div className="p-2 border-b border-zinc-850 font-semibold text-zinc-400 flex items-center print:border-b-gray-200 print:text-gray-600">Challan no.</div>
            <div className="p-1.5 border-b border-zinc-850 col-span-2 flex items-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.challanNo || "---"}</span>
              <input
                type="text"
                value={formData.challanNo}
                onChange={(e) => handleFieldChange("challanNo", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
                placeholder="---"
              />
            </div>

            <div className="p-2 border-b border-zinc-850 font-semibold text-zinc-400 flex items-center col-span-1 print:border-b-gray-200 print:text-gray-600">Batch no.</div>
            <div className="p-1.5 border-b border-zinc-850 col-span-2 flex items-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.batchNo || "---"}</span>
              <input
                type="text"
                value={formData.batchNo}
                onChange={(e) => handleFieldChange("batchNo", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
                placeholder="---"
              />
            </div>
          </div>

          <div className="col-span-12 grid grid-cols-12 border-b border-zinc-850 print:border-b-gray-200 bg-zinc-950 print:bg-white">
            <div className="col-span-3 p-2 font-semibold text-zinc-400 border-r border-zinc-800 flex items-center print:border-r-gray-300 print:text-gray-600">Material name</div>
            <div className="col-span-9 p-1.5 flex items-center">
              <span className="hidden print:inline-block text-[11px] font-semibold text-black">{formData.materialName || "---"}</span>
              <input
                type="text"
                value={formData.materialName}
                onChange={(e) => handleFieldChange("materialName", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-semibold focus:ring-0 text-zinc-100 print:hidden"
                placeholder="---"
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 grid grid-cols-3 border-r border-zinc-800 print:border-r-gray-300 bg-zinc-950 print:bg-white">
            <div className="p-2 border-b border-zinc-850 font-semibold text-zinc-400 flex items-center print:border-b-gray-200 print:text-gray-600">Mfg. date</div>
            <div className="p-1.5 border-b border-zinc-850 col-span-2 flex items-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.mfgDate || "---"}</span>
              <input
                type="date"
                value={formData.mfgDate}
                onChange={(e) => handleFieldChange("mfgDate", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
              />
            </div>

            <div className="p-2 border-b border-zinc-850 font-semibold text-zinc-400 flex items-center print:border-b-gray-200 print:text-gray-600">PO number</div>
            <div className="p-1.5 border-b border-zinc-850 col-span-2 flex items-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.poNumber || "---"}</span>
              <input
                type="text"
                value={formData.poNumber}
                onChange={(e) => handleFieldChange("poNumber", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
                placeholder="---"
              />
            </div>

            <div className="p-2 border-b border-zinc-850 font-semibold text-zinc-300 flex items-center bg-blue-500/5 print:bg-yellow-50/50 print:border-b-gray-200 print:text-gray-600">Packing (Type)</div>
            <div className="p-1.5 border-b border-zinc-850 col-span-2 flex items-center bg-blue-500/5 font-bold print:bg-yellow-50/50 print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-bold text-black">{formData.packing || "---"}</span>
              <input
                type="text"
                value={formData.packing}
                onChange={(e) => handleFieldChange("packing", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-bold focus:ring-0 text-blue-400 print:hidden placeholder-zinc-600"
                placeholder="e.g. 25 kg Drum"
              />
            </div>

            <div className="p-2 border-b border-zinc-850 font-semibold text-zinc-300 flex items-center bg-blue-500/5 print:bg-yellow-50/50 print:border-b-gray-200 print:text-gray-600">Total qty. received</div>
            <div className="p-1.5 border-b border-zinc-850 col-span-2 flex items-center bg-blue-500/5 font-bold print:bg-yellow-50/50 print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-bold text-black">{formData.totalQtyReceived || "---"}</span>
              <input
                type="text"
                value={formData.totalQtyReceived}
                onChange={(e) => handleFieldChange("totalQtyReceived", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-bold focus:ring-0 text-blue-400 print:hidden placeholder-zinc-600"
                placeholder="e.g. 500 kg"
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 grid grid-cols-3 bg-zinc-950 print:bg-white">
            <div className="p-2 border-b border-zinc-850 font-semibold text-zinc-400 flex items-center print:border-b-gray-200 print:text-gray-600">Exp. Date</div>
            <div className="p-1.5 border-b border-zinc-850 col-span-2 flex items-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.expDate || "---"}</span>
              <input
                type="date"
                value={formData.expDate}
                onChange={(e) => handleFieldChange("expDate", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
              />
            </div>

            <div className="p-2 border-b border-zinc-850 font-semibold text-zinc-400 flex items-center print:border-b-gray-200 print:text-gray-600">PO Date</div>
            <div className="p-1.5 border-b border-zinc-850 col-span-2 flex items-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.poDate || "---"}</span>
              <input
                type="date"
                value={formData.poDate}
                onChange={(e) => handleFieldChange("poDate", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
              />
            </div>

            <div className="p-2 border-b border-zinc-850 font-semibold text-zinc-400 flex items-center print:border-b-gray-200 print:text-gray-600">Available self-life</div>
            <div className="p-1.5 border-b border-zinc-850 col-span-2 flex items-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.availableShelfLife || "---"}</span>
              <input
                type="text"
                value={formData.availableShelfLife}
                onChange={(e) => handleFieldChange("availableShelfLife", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
                placeholder="---"
              />
            </div>

            <div className="p-2 border-b border-zinc-850 font-semibold text-zinc-400 flex items-center print:border-b-gray-200 print:text-gray-600">Challan qty.</div>
            <div className="p-1.5 border-b border-zinc-850 col-span-2 flex items-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.challanQty || "---"}</span>
              <input
                type="text"
                value={formData.challanQty}
                onChange={(e) => handleFieldChange("challanQty", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
                placeholder="---"
              />
            </div>
          </div>

          <div className="col-span-12 grid grid-cols-12 border-b border-zinc-850 print:border-b-gray-200 bg-zinc-950 print:bg-white">
            <div className="col-span-3 p-2 font-semibold text-zinc-400 border-r border-zinc-800 flex items-center print:border-r-gray-300 print:text-gray-600">Supplier</div>
            <div className="col-span-9 p-1.5 flex items-center">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.supplier || "---"}</span>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => handleFieldChange("supplier", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
                placeholder="---"
              />
            </div>
          </div>

          <div className="col-span-12 grid grid-cols-12 border-b border-zinc-850 print:border-b-gray-200 bg-zinc-950 print:bg-white">
            <div className="col-span-3 p-2 font-semibold text-zinc-400 border-r border-zinc-800 flex items-center print:border-r-gray-300 print:text-gray-600">Mfg. by</div>
            <div className="col-span-9 p-1.5 flex items-center">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.mfgBy || "---"}</span>
              <input
                type="text"
                value={formData.mfgBy}
                onChange={(e) => handleFieldChange("mfgBy", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
                placeholder="---"
              />
            </div>
          </div>

          <div className="col-span-12 grid grid-cols-12 bg-zinc-950 print:bg-white">
            <div className="col-span-3 p-2 font-semibold text-zinc-400 border-r border-zinc-800 flex items-center print:border-r-gray-300 print:text-gray-600">Mfg. Lic. No.</div>
            <div className="col-span-9 p-1.5 flex items-center">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.mfgLicNo || "---"}</span>
              <input
                type="text"
                value={formData.mfgLicNo}
                onChange={(e) => handleFieldChange("mfgLicNo", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden"
                placeholder="---"
              />
            </div>
          </div>
        </div>

        {/* Yes/No Checklists block */}
        <div className="grid grid-cols-12 border-b border-zinc-800 bg-zinc-950/20 print:border-b-gray-300 print:bg-gray-50/30">
          <div className="col-span-12 md:col-span-6 grid grid-cols-12 border-r border-zinc-800 border-t border-zinc-800 print:border-r-gray-300 print:border-t-gray-300">
            <div className="col-span-8 p-2 font-semibold text-zinc-300 border-r border-zinc-850 border-b border-zinc-850 flex items-center print:border-r-gray-200 print:border-b-gray-200 print:text-gray-700">
              Received from approved vendor
            </div>
            <div className="col-span-4 p-1.5 border-b border-zinc-850 flex items-center justify-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-bold text-black">{formData.receivedFromApprovedVendor || "---"}</span>
              <select
                value={formData.receivedFromApprovedVendor}
                onChange={(e) => handleFieldChange("receivedFromApprovedVendor", e.target.value)}
                className="bg-zinc-900 border-0 p-1 rounded text-[11px] font-bold focus:ring-0 text-zinc-100 cursor-pointer print:hidden"
              >
                <option value="Yes" className="bg-zinc-900 text-zinc-100">Yes</option>
                <option value="No" className="bg-zinc-900 text-zinc-100">No</option>
                <option value="NA" className="bg-zinc-900 text-zinc-100">NA</option>
              </select>
            </div>

            <div className="col-span-8 p-2 font-semibold text-zinc-300 border-r border-zinc-850 flex items-center print:border-r-gray-200 print:text-gray-700">
              Vehicle condition
            </div>
            <div className="col-span-4 p-1.5 flex items-center justify-center">
              <span className="hidden print:inline-block text-[11px] font-bold text-black">{formData.vehicleCondition || "---"}</span>
              <select
                value={formData.vehicleCondition}
                onChange={(e) => handleFieldChange("vehicleCondition", e.target.value)}
                className="bg-zinc-900 border-0 p-1 rounded text-[11px] font-bold focus:ring-0 text-zinc-100 cursor-pointer print:hidden"
              >
                <option value="Satisfactory" className="bg-zinc-900 text-zinc-100">Satisfactory</option>
                <option value="Not satisfactory" className="bg-zinc-900 text-zinc-100">Not satisfactory</option>
                <option value="NA" className="bg-zinc-900 text-zinc-100">NA</option>
              </select>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 grid grid-cols-12 border-t border-zinc-800 print:border-t-gray-300">
            <div className="col-span-8 p-2 font-semibold text-zinc-300 border-r border-zinc-850 border-b border-zinc-850 flex items-center print:border-r-gray-200 print:border-b-gray-200 print:text-gray-700">
              COA received from mfg.
            </div>
            <div className="col-span-4 p-1.5 border-b border-zinc-850 flex items-center justify-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-bold text-black">{formData.coaReceivedFromMfg || "---"}</span>
              <select
                value={formData.coaReceivedFromMfg}
                onChange={(e) => handleFieldChange("coaReceivedFromMfg", e.target.value)}
                className="bg-zinc-900 border-0 p-1 rounded text-[11px] font-bold focus:ring-0 text-zinc-100 cursor-pointer print:hidden"
              >
                <option value="Yes" className="bg-zinc-900 text-zinc-100">Yes</option>
                <option value="No" className="bg-zinc-900 text-zinc-100">No</option>
                <option value="NA" className="bg-zinc-900 text-zinc-100">NA</option>
              </select>
            </div>

            <div className="col-span-8 p-2 font-semibold text-zinc-300 border-r border-zinc-850 flex items-center print:border-r-gray-200 print:text-gray-700">
              QR Code Availability
            </div>
            <div className="col-span-4 p-1.5 flex items-center justify-center">
              <span className="hidden print:inline-block text-[11px] font-bold text-black">{formData.qrCodeAvailability || "---"}</span>
              <select
                value={formData.qrCodeAvailability}
                onChange={(e) => handleFieldChange("qrCodeAvailability", e.target.value)}
                className="bg-zinc-900 border-0 p-1 rounded text-[11px] font-bold focus:ring-0 text-zinc-100 cursor-pointer print:hidden"
              >
                <option value="Yes" className="bg-zinc-900 text-zinc-100">Yes</option>
                <option value="No" className="bg-zinc-900 text-zinc-100">No</option>
                <option value="NA" className="bg-zinc-900 text-zinc-100">NA</option>
              </select>
            </div>
          </div>
        </div>

        {/* Condition of Goods Section */}
        <div className="bg-zinc-900 py-1.5 px-3 font-bold border-b border-zinc-800 text-[11px] text-zinc-300 uppercase tracking-wider print:bg-gray-100/50 print:border-b-gray-300 print:text-gray-700">
          Condition of Goods
        </div>

        <div className="grid grid-cols-12 border-b border-zinc-800 print:border-b-gray-300 bg-zinc-950 print:bg-white">
          <div className="col-span-12 md:col-span-6 grid grid-cols-12 border-r border-zinc-800 print:border-r-gray-300">
            <div className="col-span-8 p-2 font-semibold text-zinc-300 border-r border-zinc-850 border-b border-zinc-850 flex items-center print:border-r-gray-200 print:border-b-gray-200 print:text-gray-700">Damage</div>
            <div className="col-span-4 p-1.5 border-b border-zinc-850 flex items-center justify-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-bold text-black">{formData.damage || "---"}</span>
              <select
                value={formData.damage}
                onChange={(e) => handleFieldChange("damage", e.target.value)}
                className="bg-zinc-900 border-0 p-1 rounded text-[11px] font-bold focus:ring-0 text-zinc-100 cursor-pointer print:hidden"
              >
                <option value="Yes" className="bg-zinc-900 text-zinc-100">Yes</option>
                <option value="No" className="bg-zinc-900 text-zinc-100">No</option>
                <option value="NA" className="bg-zinc-900 text-zinc-100">NA</option>
              </select>
            </div>

            <div className="col-span-8 p-2 font-semibold text-zinc-300 border-r border-zinc-850 border-b border-zinc-850 flex items-center print:border-r-gray-200 print:border-b-gray-200 print:text-gray-700">Seal</div>
            <div className="col-span-4 p-1.5 border-b border-zinc-850 flex items-center justify-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-bold text-black">{formData.seal || "---"}</span>
              <select
                value={formData.seal}
                onChange={(e) => handleFieldChange("seal", e.target.value)}
                className="bg-zinc-900 border-0 p-1 rounded text-[11px] font-bold focus:ring-0 text-zinc-100 cursor-pointer print:hidden"
              >
                <option value="Satisfactory" className="bg-zinc-900 text-zinc-100">Satisfactory</option>
                <option value="Not satisfactory" className="bg-zinc-900 text-zinc-100">Not satisfactory</option>
                <option value="NA" className="bg-zinc-900 text-zinc-100">NA</option>
              </select>
            </div>

            <div className="col-span-8 p-2 font-semibold text-zinc-300 border-r border-zinc-850 border-b border-zinc-850 flex items-center print:border-r-gray-200 print:border-b-gray-200 print:text-gray-700">Water penetration</div>
            <div className="col-span-4 p-1.5 border-b border-zinc-850 flex items-center justify-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-bold text-black">{formData.waterPenetration || "---"}</span>
              <select
                value={formData.waterPenetration}
                onChange={(e) => handleFieldChange("waterPenetration", e.target.value)}
                className="bg-zinc-900 border-0 p-1 rounded text-[11px] font-bold focus:ring-0 text-zinc-100 cursor-pointer print:hidden"
              >
                <option value="Yes" className="bg-zinc-900 text-zinc-100">Yes</option>
                <option value="No" className="bg-zinc-900 text-zinc-100">No</option>
                <option value="NA" className="bg-zinc-900 text-zinc-100">NA</option>
              </select>
            </div>

            <div className="col-span-8 p-2 font-semibold text-zinc-300 border-r border-zinc-850 flex items-center print:border-r-gray-200 print:text-gray-700">Allowed Wt. Variation for API</div>
            <div className="col-span-4 p-1.5 flex items-center justify-center">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.allowedWtVariationApi || "---"}</span>
              <input
                type="text"
                value={formData.allowedWtVariationApi}
                onChange={(e) => handleFieldChange("allowedWtVariationApi", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] text-center font-medium focus:ring-0 text-zinc-100 print:hidden"
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-6 grid grid-cols-12">
            <div className="col-span-8 p-2 font-semibold text-zinc-300 border-r border-zinc-850 border-b border-zinc-850 flex items-center print:border-r-gray-200 print:border-b-gray-200 print:text-gray-700">Label condition</div>
            <div className="col-span-4 p-1.5 border-b border-zinc-850 flex items-center justify-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-bold text-black">{formData.labelCondition || "---"}</span>
              <select
                value={formData.labelCondition}
                onChange={(e) => handleFieldChange("labelCondition", e.target.value)}
                className="bg-zinc-900 border-0 p-1 rounded text-[11px] font-bold focus:ring-0 text-zinc-100 cursor-pointer print:hidden"
              >
                <option value="Satisfactory" className="bg-zinc-900 text-zinc-100">Satisfactory</option>
                <option value="Not satisfactory" className="bg-zinc-900 text-zinc-100">Not satisfactory</option>
                <option value="NA" className="bg-zinc-900 text-zinc-100">NA</option>
              </select>
            </div>

            <div className="col-span-8 p-2 font-semibold text-zinc-300 border-r border-zinc-850 border-b border-zinc-850 flex items-center print:border-r-gray-200 print:border-b-gray-200 print:text-gray-700">Packing</div>
            <div className="col-span-4 p-1.5 border-b border-zinc-850 flex items-center justify-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-bold text-black">{formData.packingCondition || "---"}</span>
              <select
                value={formData.packingCondition}
                onChange={(e) => handleFieldChange("packingCondition", e.target.value)}
                className="bg-zinc-900 border-0 p-1 rounded text-[11px] font-bold focus:ring-0 text-zinc-100 cursor-pointer print:hidden"
              >
                <option value="Satisfactory" className="bg-zinc-900 text-zinc-100">Satisfactory</option>
                <option value="Not satisfactory" className="bg-zinc-900 text-zinc-100">Not satisfactory</option>
                <option value="NA" className="bg-zinc-900 text-zinc-100">NA</option>
              </select>
            </div>

            <div className="col-span-8 p-2 font-semibold text-zinc-300 border-r border-zinc-850 border-b border-zinc-850 flex items-center print:border-r-gray-200 print:border-b-gray-200 print:text-gray-700">COA received</div>
            <div className="col-span-4 p-1.5 border-b border-zinc-850 flex items-center justify-center print:border-b-gray-200">
              <span className="hidden print:inline-block text-[11px] font-bold text-black">{formData.coaReceived || "---"}</span>
              <select
                value={formData.coaReceived}
                onChange={(e) => handleFieldChange("coaReceived", e.target.value)}
                className="bg-zinc-900 border-0 p-1 rounded text-[11px] font-bold focus:ring-0 text-zinc-100 cursor-pointer print:hidden"
              >
                <option value="Yes" className="bg-zinc-900 text-zinc-100">Yes</option>
                <option value="No" className="bg-zinc-900 text-zinc-100">No</option>
                <option value="NA" className="bg-zinc-900 text-zinc-100">NA</option>
              </select>
            </div>

            <div className="col-span-8 p-2 font-semibold text-zinc-300 border-r border-zinc-850 flex items-center print:border-r-gray-200 print:text-gray-700">Allowed Wt. Variation for Excipients</div>
            <div className="col-span-4 p-1.5 flex items-center justify-center">
              <span className="hidden print:inline-block text-[11px] font-medium text-black">{formData.allowedWtVariationExcipients || "---"}</span>
              <input
                type="text"
                value={formData.allowedWtVariationExcipients}
                onChange={(e) => handleFieldChange("allowedWtVariationExcipients", e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-[11px] text-center font-medium focus:ring-0 text-zinc-100 print:hidden"
              />
            </div>
          </div>
        </div>

        {/* Weight check record header & configuration */}
        <div className="bg-zinc-900/50 py-1.5 px-3 font-bold border-b border-zinc-800 text-[11px] text-zinc-300 flex items-center justify-between print:bg-gray-100/50 print:border-b-gray-300 print:text-gray-700">
          <span className="uppercase tracking-wider">Weight check record</span>
          <div className="flex items-center gap-3 no-print">
            <span className="flex items-center gap-1">
              <span className="text-[10px] text-zinc-500 font-medium">Verify Limit for:</span>
              <select
                value={variationType}
                onChange={(e) => setVariationType(e.target.value as "api" | "excipient")}
                className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300 focus:ring-0 cursor-pointer"
              >
                <option value="api">API (±0.5)</option>
                <option value="excipient">Excipients (±1.0)</option>
              </select>
            </span>
            <button
              onClick={addWeightRow}
              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-blue-500/20"
            >
              <Plus className="w-3 h-3" />
              Add Container Row
            </button>
          </div>
        </div>

        {/* Dynamic Auto-Generator Panel */}
        <div className="no-print p-3 bg-zinc-950 border-b border-zinc-800 grid grid-cols-1 md:grid-cols-5 gap-3 items-end text-[11px]">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Qty (kg)</span>
              <button 
                onClick={detectFromForm}
                className="text-[9px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                title="Detect from total qty received and packing"
              >
                Detect
              </button>
            </div>
            <input
              type="number"
              value={autoTotalQty}
              onChange={(e) => setAutoTotalQty(e.target.value)}
              placeholder="e.g. 500"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
            />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">No. of Containers</span>
            <input
              type="number"
              value={autoContainersCount}
              onChange={(e) => setAutoContainersCount(e.target.value)}
              placeholder="e.g. 10"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
            />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Tare Drum Wt (kg)</span>
            <input
              type="number"
              value={tareWeight}
              onChange={(e) => setTareWeight(e.target.value)}
              placeholder="e.g. 2.0"
              step="0.1"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
            />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5" title="Net weight per container + Tare weight">Gross Weight / Drum</span>
            <div className="w-full bg-zinc-900/40 border border-dashed border-zinc-800 rounded-lg px-2.5 py-1 h-[32px] flex flex-col justify-center leading-none text-[11px]">
              <span className="font-bold text-zinc-200">{calculatedGrossPerUnit ? `${calculatedGrossPerUnit} kg` : "---"}</span>
              {calculatedNetPerUnit && (
                <span className="text-[8px] text-zinc-500 font-normal mt-0.5">Net: {calculatedNetPerUnit} kg</span>
              )}
            </div>
          </div>
          <div>
            <button
              onClick={handleAutoGenerateRows}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold py-1.5 px-2 rounded-lg h-[32px] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              Auto-Fill Weights
            </button>
          </div>
        </div>

        {/* Weight checks Table */}
        <div className="overflow-x-auto bg-zinc-950 print:bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 font-bold print:bg-gray-50 print:border-b-gray-300 print:text-gray-600">
                <th className="p-2 border-r border-zinc-800 text-left w-12 print:border-r-gray-300">Container no.</th>
                <th className="p-2 border-r border-zinc-800 text-left print:border-r-gray-300">Gross weight on label</th>
                <th className="p-2 border-r border-zinc-800 text-left print:border-r-gray-300">Gross weight observed</th>
                <th className="p-2 border-r border-zinc-800 text-left print:border-r-gray-300">Diff. Qty.</th>
                <th className="p-2 border-r border-zinc-800 text-left w-24 print:border-r-gray-300">Remark (OK/NOT OK)</th>
                <th className="p-2 text-center w-10 no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {formData.weightChecks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-zinc-500 italic print:text-gray-400">
                    No weight records added yet. Click &quot;Add Container Row&quot; above to start logging.
                  </td>
                </tr>
              ) : (
                formData.weightChecks.map((row, index) => (
                  <tr key={index} className="border-b border-zinc-800 hover:bg-zinc-900/30 print:border-b-gray-200 print:hover:bg-transparent">
                    <td className="p-2 border-r border-zinc-800 font-semibold text-zinc-500 print:border-r-gray-300">
                      {row.containerNo}
                    </td>
                    <td className="p-1 border-r border-zinc-800 print:border-r-gray-300">
                      <span className="hidden print:inline-block px-1 font-medium text-black">
                        {row.grossWeightOnLabel || "---"}
                      </span>
                      <input
                        type="text"
                        value={row.grossWeightOnLabel}
                        onChange={(e) => handleWeightCheckChange(index, "grossWeightOnLabel", e.target.value)}
                        placeholder="e.g. 25.0"
                        className="w-full bg-transparent border-0 p-1 text-[11px] font-medium focus:ring-0 text-zinc-100 print:hidden placeholder-zinc-700"
                      />
                    </td>
                    <td className="p-1 border-r border-zinc-800 print:border-r-gray-300">
                      <span className="hidden print:inline-block px-1 font-bold text-black">
                        {row.grossWeightObserved || "---"}
                      </span>
                      <input
                        type="text"
                        value={row.grossWeightObserved}
                        onChange={(e) => handleWeightCheckChange(index, "grossWeightObserved", e.target.value)}
                        placeholder="e.g. 25.1"
                        className="w-full bg-transparent border-0 p-1 text-[11px] font-bold focus:ring-0 text-zinc-100 print:hidden placeholder-zinc-700"
                      />
                    </td>
                    <td className="p-2 border-r border-zinc-800 font-mono text-zinc-400 print:border-r-gray-300 print:text-gray-600">
                      {row.diffQty ? (parseFloat(row.diffQty) > 0 ? `+${row.diffQty}` : row.diffQty) : "---"}
                    </td>
                    <td className="p-1 border-r border-zinc-800 print:border-r-gray-300">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          row.remark === "OK"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:bg-green-100 print:text-green-800 print:border-none"
                            : row.remark === "NOT OK"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20 print:bg-red-100 print:text-red-800 print:border-none"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700 print:bg-gray-100 print:text-gray-500 print:border-none"
                        }`}
                      >
                        {row.remark || "---"}
                      </span>
                    </td>
                    <td className="p-1 text-center no-print">
                      <button
                        onClick={() => removeWeightRow(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/40 p-1 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guide Card - hidden on print */}
      <div className="mt-6 bg-blue-500/5 rounded-xl p-4 border border-blue-500/10 no-print flex gap-3">
        <HelpCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">How weights are validated:</h4>
          <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
            The system validates the gross weight differences automatically based on the selected material classification:
          </p>
          <ul className="list-disc list-inside text-xs text-zinc-400 mt-1 space-y-0.5 pl-1">
            <li>For <strong>API</strong> products, differences must be within <strong>± 0.5 kg</strong> to pass (OK).</li>
            <li>For <strong>Excipients</strong>, differences must be within <strong>± 1.0 kg</strong> to pass (OK).</li>
          </ul>
        </div>
      </div>

      {/* Hidden container for PDF generation */}
      <div 
        style={
          isGeneratingPDF 
            ? { position: "fixed", top: 0, left: 0, width: "794px", zIndex: 100, pointerEvents: "none", background: "white" }
            : { position: "fixed", top: "5000px", left: 0, width: "794px", zIndex: -100, pointerEvents: "none" }
        }
      >
        <div id="pdf-export-element" className="bg-white text-black p-8 font-sans text-[11px] leading-tight">
          {/* Logo and Header Block */}
          <div className="border border-gray-400 rounded-md overflow-hidden bg-white text-[11px] font-sans">
            <div className="grid grid-cols-12 border-b border-gray-400">
              <div className="col-span-8 p-3 border-r border-gray-400 flex flex-col justify-center">
                <div className="font-bold text-[9px] tracking-wider text-gray-500 uppercase mb-1">MASTER COPY</div>
                <div className="text-[10px] text-gray-600 leading-tight">
                  17& 16/5, Meldi Estate, B/s Meldi Mata Temple, Near Gota Railway Crossing, At & Post Gota, Ahmedabad 382 481
                </div>
              </div>
              <div className="col-span-4 p-3 flex flex-col items-center justify-center text-center">
                <div className="flex items-center justify-center gap-0.5">
                  <span className="text-base font-extrabold tracking-tight" style={{ color: "#1e297a", fontFamily: "sans-serif" }}>WEST-</span>
                  <span className="text-base font-extrabold tracking-tight" style={{ color: "#00a1e4", fontFamily: "sans-serif" }}>COAST</span>
                </div>
                <div className="w-full mt-1 flex flex-col gap-[1px]">
                  <div className="h-[2px] w-full" style={{ backgroundColor: "#1e297a" }}></div>
                  <div className="h-[1px] w-full" style={{ backgroundColor: "#00a1e4" }}></div>
                </div>
                <span className="text-[8px] font-bold text-gray-700 uppercase tracking-wider mt-1 block" style={{ fontFamily: "sans-serif" }}>
                  Pharmaceutical Works Ltd.
                </span>
              </div>
            </div>

            {/* Form Title */}
            <div className="text-center py-2 bg-gray-50 border-b border-gray-400 font-bold text-xs uppercase tracking-wider text-gray-800">
              MATERIAL RECEIPT CHECK-LIST
            </div>

            {/* General Information Grid */}
            <div className="grid grid-cols-12 border-b border-gray-400 bg-white">
              <div className="col-span-6 grid grid-cols-3 border-r border-gray-400">
                <div className="p-2 border-b border-gray-200 font-semibold text-gray-600 flex items-center">G.R.N. No.</div>
                <div className="p-2 border-b border-gray-200 col-span-2 flex items-center text-gray-900 font-medium">
                  {formData.grnNo || "---"}
                </div>

                <div className="p-2 border-b border-gray-200 font-semibold text-gray-600 flex items-center">Material inward no.</div>
                <div className="p-2 border-b border-gray-200 col-span-2 flex items-center text-gray-900 font-medium">
                  {formData.materialInwardNo || "---"}
                </div>

                <div className="p-2 border-b border-gray-200 font-semibold text-gray-600 flex items-center">Challan date</div>
                <div className="p-2 border-b border-gray-200 col-span-2 flex items-center text-gray-900 font-medium">
                  {formData.challanDate || "---"}
                </div>
              </div>

              <div className="col-span-6 grid grid-cols-3">
                <div className="p-2 border-b border-gray-200 font-semibold text-gray-600 flex items-center">Material received date</div>
                <div className="p-2 border-b border-gray-200 col-span-2 flex items-center text-gray-900 font-medium">
                  {formData.materialReceivedDate || "---"}
                </div>

                <div className="p-2 border-b border-gray-200 font-semibold text-gray-600 flex items-center">Challan no.</div>
                <div className="p-2 border-b border-gray-200 col-span-2 flex items-center text-gray-900 font-medium">
                  {formData.challanNo || "---"}
                </div>

                <div className="p-2 border-b border-gray-200 font-semibold text-gray-600 flex items-center">Batch no.</div>
                <div className="p-2 border-b border-gray-200 col-span-2 flex items-center text-gray-900 font-medium">
                  {formData.batchNo || "---"}
                </div>
              </div>

              <div className="col-span-12 grid grid-cols-12 border-b border-gray-200 bg-white">
                <div className="col-span-3 p-2 font-semibold text-gray-600 border-r border-gray-400 flex items-center">Material name</div>
                <div className="col-span-9 p-2 text-gray-900 font-bold">
                  {formData.materialName || "---"}
                </div>
              </div>

              <div className="col-span-6 grid grid-cols-3 border-r border-gray-400">
                <div className="p-2 border-b border-gray-200 font-semibold text-gray-600 flex items-center">Mfg. date</div>
                <div className="p-2 border-b border-gray-200 col-span-2 flex items-center text-gray-900 font-medium">
                  {formData.mfgDate || "---"}
                </div>

                <div className="p-2 border-b border-gray-200 font-semibold text-gray-600 flex items-center">PO number</div>
                <div className="p-2 border-b border-gray-200 col-span-2 flex items-center text-gray-900 font-medium">
                  {formData.poNumber || "---"}
                </div>

                <div className="p-2 border-b border-gray-200 font-semibold text-gray-600 flex items-center bg-yellow-50/30">Packing (Type)</div>
                <div className="p-2 border-b border-gray-200 col-span-2 flex items-center bg-yellow-50/30 text-gray-900 font-bold">
                  {formData.packing || "---"}
                </div>

                <div className="p-2 border-b border-gray-200 font-semibold text-gray-600 flex items-center bg-yellow-50/30">Total qty. received</div>
                <div className="p-2 border-b border-gray-200 col-span-2 flex items-center bg-yellow-50/30 text-gray-900 font-bold">
                  {formData.totalQtyReceived || "---"}
                </div>
              </div>

              <div className="col-span-6 grid grid-cols-3">
                <div className="p-2 border-b border-gray-200 font-semibold text-gray-600 flex items-center">Exp. Date</div>
                <div className="p-2 border-b border-gray-200 col-span-2 flex items-center text-gray-900 font-medium">
                  {formData.expDate || "---"}
                </div>

                <div className="p-2 border-b border-gray-200 font-semibold text-gray-600 flex items-center">PO Date</div>
                <div className="p-2 border-b border-gray-200 col-span-2 flex items-center text-gray-900 font-medium">
                  {formData.poDate || "---"}
                </div>

                <div className="p-2 border-b border-gray-200 font-semibold text-gray-600 flex items-center">Available shelf-life</div>
                <div className="p-2 border-b border-gray-200 col-span-2 flex items-center text-gray-900 font-medium">
                  {formData.availableShelfLife || "---"}
                </div>

                <div className="p-2 border-b border-gray-200 font-semibold text-gray-600 flex items-center">Challan qty.</div>
                <div className="p-2 border-b border-gray-200 col-span-2 flex items-center text-gray-900 font-medium">
                  {formData.challanQty || "---"}
                </div>
              </div>

              <div className="col-span-12 grid grid-cols-12 border-b border-gray-200 bg-white">
                <div className="col-span-3 p-2 font-semibold text-gray-600 border-r border-gray-400 flex items-center">Supplier</div>
                <div className="col-span-9 p-2 text-gray-900 font-medium">
                  {formData.supplier || "---"}
                </div>
              </div>

              <div className="col-span-12 grid grid-cols-12 border-b border-gray-200 bg-white">
                <div className="col-span-3 p-2 font-semibold text-gray-600 border-r border-gray-400 flex items-center">Mfg. by</div>
                <div className="col-span-9 p-2 text-gray-900 font-medium">
                  {formData.mfgBy || "---"}
                </div>
              </div>

              <div className="col-span-12 grid grid-cols-12 bg-white">
                <div className="col-span-3 p-2 font-semibold text-gray-600 border-r border-gray-400 flex items-center">Mfg. Lic. No.</div>
                <div className="col-span-9 p-2 text-gray-900 font-medium">
                  {formData.mfgLicNo || "---"}
                </div>
              </div>
            </div>

            {/* Yes/No Checklists block */}
            <div className="grid grid-cols-12 border-b border-gray-400 bg-gray-50/20">
              <div className="col-span-6 grid grid-cols-12 border-r border-gray-400">
                <div className="col-span-8 p-2 font-semibold text-gray-700 border-r border-gray-200 border-b border-gray-200 flex items-center">
                  Received from approved vendor
                </div>
                <div className="col-span-4 p-2 border-b border-gray-200 text-center font-bold text-gray-900 flex items-center justify-center">
                  {formData.receivedFromApprovedVendor || "---"}
                </div>

                <div className="col-span-8 p-2 font-semibold text-gray-700 border-r border-gray-200 flex items-center">
                  Vehicle condition
                </div>
                <div className="col-span-4 p-2 text-center font-bold text-gray-900 flex items-center justify-center">
                  {formData.vehicleCondition || "---"}
                </div>
              </div>

              <div className="col-span-6 grid grid-cols-12">
                <div className="col-span-8 p-2 font-semibold text-gray-700 border-r border-gray-200 border-b border-gray-200 flex items-center">
                  COA received from mfg.
                </div>
                <div className="col-span-4 p-2 border-b border-gray-200 text-center font-bold text-gray-900 flex items-center justify-center">
                  {formData.coaReceivedFromMfg || "---"}
                </div>

                <div className="col-span-8 p-2 font-semibold text-gray-700 border-r border-gray-200 flex items-center">
                  QR Code Availability
                </div>
                <div className="col-span-4 p-2 text-center font-bold text-gray-900 flex items-center justify-center">
                  {formData.qrCodeAvailability || "---"}
                </div>
              </div>
            </div>

            {/* Condition of Goods Section */}
            <div className="bg-gray-100 py-1.5 px-3 font-bold border-b border-gray-400 text-[11px] text-gray-800 uppercase tracking-wider">
              Condition of Goods
            </div>

            <div className="grid grid-cols-12 border-b border-gray-400">
              <div className="col-span-6 grid grid-cols-12 border-r border-gray-400">
                <div className="col-span-8 p-2 font-semibold text-gray-700 border-r border-gray-200 border-b border-gray-200 flex items-center">Damage</div>
                <div className="col-span-4 p-2 border-b border-gray-200 text-center font-bold text-gray-900 flex items-center justify-center">
                  {formData.damage || "---"}
                </div>

                <div className="col-span-8 p-2 font-semibold text-gray-700 border-r border-gray-200 border-b border-gray-200 flex items-center">Seal</div>
                <div className="col-span-4 p-2 border-b border-gray-200 text-center font-bold text-gray-900 flex items-center justify-center">
                  {formData.seal || "---"}
                </div>

                <div className="col-span-8 p-2 font-semibold text-gray-700 border-r border-gray-200 border-b border-gray-200 flex items-center">Water penetration</div>
                <div className="col-span-4 p-2 border-b border-gray-200 text-center font-bold text-gray-900 flex items-center justify-center">
                  {formData.waterPenetration || "---"}
                </div>

                <div className="col-span-8 p-2 font-semibold text-gray-700 border-r border-gray-200 flex items-center">Allowed Wt. Variation for API</div>
                <div className="col-span-4 p-2 text-center text-gray-900 font-bold flex items-center justify-center">
                  {formData.allowedWtVariationApi || "---"}
                </div>
              </div>

              <div className="col-span-6 grid grid-cols-12">
                <div className="col-span-8 p-2 font-semibold text-gray-700 border-r border-gray-200 border-b border-gray-200 flex items-center">Label condition</div>
                <div className="col-span-4 p-2 border-b border-gray-200 text-center font-bold text-gray-900 flex items-center justify-center">
                  {formData.labelCondition || "---"}
                </div>

                <div className="col-span-8 p-2 font-semibold text-gray-700 border-r border-gray-200 border-b border-gray-200 flex items-center">Packing</div>
                <div className="col-span-4 p-2 border-b border-gray-200 text-center font-bold text-gray-900 flex items-center justify-center">
                  {formData.packingCondition || "---"}
                </div>

                <div className="col-span-8 p-2 font-semibold text-gray-700 border-r border-gray-200 border-b border-gray-200 flex items-center">COA received</div>
                <div className="col-span-4 p-2 border-b border-gray-200 text-center font-bold text-gray-900 flex items-center justify-center">
                  {formData.coaReceived || "---"}
                </div>

                <div className="col-span-8 p-2 font-semibold text-gray-700 border-r border-gray-200 flex items-center">Allowed Wt. Variation for Excipients</div>
                <div className="col-span-4 p-2 text-center text-gray-900 font-bold flex items-center justify-center">
                  {formData.allowedWtVariationExcipients || "---"}
                </div>
              </div>
            </div>

            {/* Weight check record header */}
            <div className="bg-gray-100 py-1.5 px-3 font-bold border-b border-gray-400 text-[11px] text-gray-800 uppercase tracking-wider">
              Weight check record
            </div>

            {/* Weight checks Table */}
            <table className="w-full border-collapse bg-white text-[11px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-400 text-gray-700 font-bold">
                  <th className="p-2 border-r border-gray-400 text-left w-16">Container no.</th>
                  <th className="p-2 border-r border-gray-400 text-left">Gross weight on label (kg)</th>
                  <th className="p-2 border-r border-gray-400 text-left">Gross weight observed (kg)</th>
                  <th className="p-2 border-r border-gray-400 text-left">Diff. Qty. (kg)</th>
                  <th className="p-2 text-left w-32">Remark (OK/NOT OK)</th>
                </tr>
              </thead>
              <tbody>
                {formData.weightChecks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500 italic">
                      No weight records added.
                    </td>
                  </tr>
                ) : (
                  formData.weightChecks.map((row, index) => (
                    <tr key={index} className="border-b border-gray-300">
                      <td className="p-2 border-r border-gray-400 font-semibold text-gray-700">
                        {row.containerNo}
                      </td>
                      <td className="p-2 border-r border-gray-400 text-gray-900 font-medium">
                        {row.grossWeightOnLabel || "---"}
                      </td>
                      <td className="p-2 border-r border-gray-400 text-gray-900 font-bold">
                        {row.grossWeightObserved || "---"}
                      </td>
                      <td className="p-2 border-r border-gray-400 font-mono text-gray-700">
                        {row.diffQty ? (parseFloat(row.diffQty) > 0 ? `+${row.diffQty}` : row.diffQty) : "---"}
                      </td>
                      <td className="p-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.remark === "OK"
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : row.remark === "NOT OK"
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {row.remark || "---"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer block with sign-off */}
          <div className="mt-8 grid grid-cols-2 gap-12 text-center text-[10px] text-gray-500 font-medium">
            <div className="border-t border-dashed border-gray-400 pt-3">
              <p className="font-bold text-gray-700">Prepared By (Store Executive)</p>
              <p className="mt-1 text-gray-400">Date: ____/____/________</p>
            </div>
            <div className="border-t border-dashed border-gray-400 pt-3">
              <p className="font-bold text-gray-700">Reviewed & Approved By (Quality Assurance)</p>
              <p className="mt-1 text-gray-400">Date: ____/____/________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
