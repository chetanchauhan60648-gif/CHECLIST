import React, { useState, useRef } from "react";
import { 
  Upload, 
  Camera, 
  FileText, 
  Package, 
  Sparkles, 
  Loader2, 
  Trash2, 
  Check, 
  Zap, 
  Eye, 
  X, 
  ShieldCheck,
  RefreshCw,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ImageUploaderProps {
  onProcess: (billBase64: string | null, materialBase64: string | null, manualPacking: string, manualQty: string) => Promise<void>;
  isProcessing: boolean;
}

const PACKING_PRESETS = [
  "25 kg Fibre Drum",
  "50 kg HDPE Drum",
  "25 kg Paper Bag",
  "50 kg Poly Bag",
  "200 kg Steel Drum"
];

const QTY_PRESETS = [
  "100 kg",
  "250 kg",
  "500 kg",
  "1000 kg",
  "2500 kg"
];

export default function ImageUploader({ onProcess, isProcessing }: ImageUploaderProps) {
  const [billImage, setBillImage] = useState<string | null>(null);
  const [materialImage, setMaterialImage] = useState<string | null>(null);
  
  // Manual overrides for packing and quantity
  const [manualPacking, setManualPacking] = useState("");
  const [manualQty, setManualQty] = useState("");

  const [activeSlot, setActiveSlot] = useState<"bill" | "material">("bill");
  const [useCamera, setUseCamera] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFileChange = (type: "bill" | "material", file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "bill") {
        setBillImage(reader.result as string);
      } else {
        setMaterialImage(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerCamera = async (slot: "bill" | "material") => {
    setActiveSlot(slot);
    try {
      setUseCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      alert("Could not access camera. Please upload file from your device.");
      setUseCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        if (activeSlot === "bill") {
          setBillImage(dataUrl);
        } else {
          setMaterialImage(dataUrl);
        }
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, type: "bill" | "material") => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(type, e.dataTransfer.files[0]);
    }
  };

  const handleStartProcess = () => {
    if (!billImage && !materialImage) return;
    onProcess(billImage, materialImage, manualPacking, manualQty);
  };

  const handleResetSlots = () => {
    setBillImage(null);
    setMaterialImage(null);
    setManualPacking("");
    setManualQty("");
  };

  return (
    <div id="image-uploader-card" className="bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-zinc-800/90 shadow-xl overflow-hidden p-5 sm:p-6 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
                AI Document Scanner
              </h2>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">
                Vision OCR
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Upload invoice and container label to auto-fill checklist fields
            </p>
          </div>
        </div>

        {(billImage || materialImage || manualPacking || manualQty) && (
          <button
            onClick={handleResetSlots}
            title="Reset uploader"
            className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200 px-2.5 py-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Dual Photo Slot Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
        {/* Slot 1: Bill / Invoice */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              1. Bill / Invoice Photo
            </span>
            {billImage && (
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Loaded
              </span>
            )}
          </div>

          {billImage ? (
            <div className="relative group border border-zinc-800 rounded-xl overflow-hidden aspect-4/3 bg-zinc-950 flex items-center justify-center">
              <img src={billImage} alt="Bill Preview" className="max-h-full max-w-full object-contain p-1" />
              <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all duration-200 backdrop-blur-2xs">
                <button
                  onClick={() => setPreviewImage(billImage)}
                  className="bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 rounded-lg p-2 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="View full"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => triggerCamera("bill")}
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg p-2 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Retake photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setBillImage(null)}
                  className="bg-red-600/90 hover:bg-red-600 text-white rounded-lg p-2 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "bill")}
              className="border border-dashed border-zinc-800 hover:border-blue-500/60 rounded-xl aspect-4/3 p-3 flex flex-col items-center justify-center gap-2 bg-zinc-950/60 hover:bg-zinc-950 transition-all text-center group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-300">Bill / Challan</p>
                <p className="text-[10px] text-zinc-500">Drop image here</p>
              </div>
              <div className="flex gap-1.5 w-full max-w-[170px] mt-1">
                <label className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-1.5 px-2 text-center text-[10px] font-semibold cursor-pointer border border-zinc-700/60 transition-colors">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileChange("bill", e.target.files[0])}
                  />
                </label>
                <button
                  onClick={() => triggerCamera("bill")}
                  className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg py-1.5 px-2 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  Cam
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Slot 2: Material / Label */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-indigo-400" />
              2. Material / Label Photo
            </span>
            {materialImage && (
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Loaded
              </span>
            )}
          </div>

          {materialImage ? (
            <div className="relative group border border-zinc-800 rounded-xl overflow-hidden aspect-4/3 bg-zinc-950 flex items-center justify-center">
              <img src={materialImage} alt="Material Preview" className="max-h-full max-w-full object-contain p-1" />
              <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all duration-200 backdrop-blur-2xs">
                <button
                  onClick={() => setPreviewImage(materialImage)}
                  className="bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 rounded-lg p-2 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="View full"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => triggerCamera("material")}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg p-2 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Retake photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setMaterialImage(null)}
                  className="bg-red-600/90 hover:bg-red-600 text-white rounded-lg p-2 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "material")}
              className="border border-dashed border-zinc-800 hover:border-indigo-500/60 rounded-xl aspect-4/3 p-3 flex flex-col items-center justify-center gap-2 bg-zinc-950/60 hover:bg-zinc-950 transition-all text-center group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-300">Material Label</p>
                <p className="text-[10px] text-zinc-500">Drop image here</p>
              </div>
              <div className="flex gap-1.5 w-full max-w-[170px] mt-1">
                <label className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg py-1.5 px-2 text-center text-[10px] font-semibold cursor-pointer border border-zinc-700/60 transition-colors">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileChange("material", e.target.files[0])}
                  />
                </label>
                <button
                  onClick={() => triggerCamera("material")}
                  className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg py-1.5 px-2 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  Cam
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Prefill Configurator */}
      <div className="bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/90 mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Quick Manual Prefill (Optional)
          </label>
          <span className="text-[10px] text-zinc-500">Overrides AI field values</span>
        </div>

        <div className="space-y-3">
          {/* Packing Input & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-zinc-400">Packing Type</span>
              <div className="flex flex-wrap gap-1">
                {PACKING_PRESETS.slice(0, 3).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setManualPacking(p)}
                    className="text-[9px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={manualPacking}
              onChange={(e) => setManualPacking(e.target.value)}
              placeholder="e.g. 25 kg Fibre Drums, 50 kg HDPE Bags"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>

          {/* Quantity Input & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-zinc-400">Total Quantity Received</span>
              <div className="flex flex-wrap gap-1">
                {QTY_PRESETS.slice(0, 4).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setManualQty(q)}
                    className="text-[9px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={manualQty}
              onChange={(e) => setManualQty(e.target.value)}
              placeholder="e.g. 500 kg, 20 Drums, 1000 kg"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* Action Processing Button */}
      <button
        id="fill-checklist-ai-btn"
        onClick={handleStartProcess}
        disabled={isProcessing || (!billImage && !materialImage)}
        className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
          isProcessing
            ? "bg-blue-900/50 text-blue-300 border border-blue-700/50 cursor-wait"
            : billImage || materialImage
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/20 hover:shadow-blue-600/30 cursor-pointer active:scale-[0.99]"
            : "bg-zinc-800 text-zinc-500 border border-zinc-700/40 cursor-not-allowed"
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-blue-300" />
            <span>Analyzing Invoice & Label with Gemini AI...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>Fill Automated Checklist Now</span>
          </>
        )}
      </button>

      {/* Live Camera Modal */}
      <AnimatePresence>
        {useCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-400" />
                  Capture {activeSlot === "bill" ? "Bill / Invoice" : "Material Container Label"}
                </span>
                <button
                  onClick={stopCamera}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                {/* Visual Viewfinder crosshair */}
                <div className="absolute inset-8 border border-white/30 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-t-2 border-l-2 border-blue-400"></span>
                    <span className="w-4 h-4 border-t-2 border-r-2 border-blue-400"></span>
                  </div>
                  <div className="text-center text-[11px] text-white/70 bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs mx-auto">
                    Align document text clearly inside frame
                  </div>
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-b-2 border-l-2 border-blue-400"></span>
                    <span className="w-4 h-4 border-b-2 border-r-2 border-blue-400"></span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-zinc-950 flex items-center justify-between">
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  Capture Photo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-3xl max-h-[85vh] p-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={previewImage} alt="Document Zoom" className="max-w-full max-h-[75vh] object-contain rounded-xl" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
