import React, { useState, useRef } from "react";
import { Upload, Camera, FileText, Package, Sparkles, Loader2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ImageUploaderProps {
  onProcess: (billBase64: string | null, materialBase64: string | null, manualPacking: string, manualQty: string) => Promise<void>;
  isProcessing: boolean;
}

export default function ImageUploader({ onProcess, isProcessing }: ImageUploaderProps) {
  const [billImage, setBillImage] = useState<string | null>(null);
  const [materialImage, setMaterialImage] = useState<string | null>(null);
  
  // Manual overrides for packing and quantity as requested
  const [manualPacking, setManualPacking] = useState("");
  const [manualQty, setManualQty] = useState("");

  const [activeTab, setActiveTab] = useState<"bill" | "material">("bill");
  const [useCamera, setUseCamera] = useState(false);
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

  const triggerCamera = async () => {
    try {
      setUseCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      alert("Could not access camera. Please upload files instead.");
      setUseCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        if (activeTab === "bill") {
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

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-sm overflow-hidden p-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Upload Photo
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Upload the bill/invoice and material label photo to extract details.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-zinc-950 rounded-xl mb-4 border border-zinc-800/40">
        <button
          onClick={() => { setActiveTab("bill"); stopCamera(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
            activeTab === "bill"
              ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <FileText className="w-4 h-4" />
          Bill / Invoice Photo
        </button>
        <button
          onClick={() => { setActiveTab("material"); stopCamera(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
            activeTab === "material"
              ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Package className="w-4 h-4" />
          Material Photo
        </button>
      </div>

      <AnimatePresence mode="wait">
        {useCamera ? (
          <motion.div
            key="camera-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative bg-black rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center mb-6"
          >
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
              <button
                onClick={capturePhoto}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2 px-4 rounded-xl shadow-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Capture
              </button>
              <button
                onClick={stopCamera}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-medium text-sm py-2 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upload-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            {activeTab === "bill" ? (
              billImage ? (
                <div className="relative group border border-zinc-800 rounded-xl overflow-hidden aspect-video bg-zinc-950 flex items-center justify-center">
                  <img src={billImage} alt="Bill Preview" className="max-h-full max-w-full object-contain" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-all duration-200">
                    <button
                      onClick={triggerCamera}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl p-2.5 shadow-sm hover:scale-105 transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Retake
                    </button>
                    <button
                      onClick={() => setBillImage(null)}
                      className="bg-red-600/90 hover:bg-red-600 text-white rounded-xl p-2.5 shadow-sm hover:scale-105 transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "bill")}
                  className="border-2 border-dashed border-zinc-800 hover:border-blue-500/50 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-zinc-950/40 cursor-pointer transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 shadow-xs group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-300">Drag & drop bill photo</p>
                    <p className="text-xs text-zinc-500 mt-1">or click to browse from device</p>
                  </div>
                  <div className="flex gap-2 mt-2 w-full max-w-xs">
                    <label className="flex-1 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 rounded-xl py-2 px-3 text-center text-xs font-semibold cursor-pointer hover:bg-zinc-700 transition-colors">
                      Browse Files
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files && handleFileChange("bill", e.target.files[0])}
                      />
                    </label>
                    <button
                      onClick={triggerCamera}
                      className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Use Camera
                    </button>
                  </div>
                </div>
              )
            ) : (
              materialImage ? (
                <div className="relative group border border-zinc-800 rounded-xl overflow-hidden aspect-video bg-zinc-950 flex items-center justify-center">
                  <img src={materialImage} alt="Material Preview" className="max-h-full max-w-full object-contain" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-all duration-200">
                    <button
                      onClick={triggerCamera}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl p-2.5 shadow-sm hover:scale-105 transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Retake
                    </button>
                    <button
                      onClick={() => setMaterialImage(null)}
                      className="bg-red-600/90 hover:bg-red-600 text-white rounded-xl p-2.5 shadow-sm hover:scale-105 transition-all flex items-center gap-2 text-xs font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "material")}
                  className="border-2 border-dashed border-zinc-800 hover:border-blue-500/50 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-zinc-950/40 cursor-pointer transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 shadow-xs group-hover:scale-110 transition-transform">
                    <Package className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-zinc-300">Drag & drop material label photo</p>
                    <p className="text-xs text-zinc-500 mt-1">or click to browse from device</p>
                  </div>
                  <div className="flex gap-2 mt-2 w-full max-w-xs">
                    <label className="flex-1 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 rounded-xl py-2 px-3 text-center text-xs font-semibold cursor-pointer hover:bg-zinc-700 transition-colors">
                      Browse Files
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files && handleFileChange("material", e.target.files[0])}
                      />
                    </label>
                    <button
                      onClick={triggerCamera}
                      className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Use Camera
                    </button>
                  </div>
                </div>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Input Overrides - REQUIRED by user's prompt */}
      <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800/80 mb-6">
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Manual Checklist Prefills (Optional)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Packing Type (e.g. 25kg Bag, 50kg Drum)
            </label>
            <input
              type="text"
              value={manualPacking}
              onChange={(e) => setManualPacking(e.target.value)}
              placeholder="Enter packing description"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Total Quantity (e.g. 500 kg, 20 drums)
            </label>
            <input
              type="text"
              value={manualQty}
              onChange={(e) => setManualQty(e.target.value)}
              placeholder="Enter total quantity"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
        </div>
        <p className="text-[10px] text-zinc-500 mt-2">
          * These values will override any extracted quantity or packing information if specified.
        </p>
      </div>

      <button
        onClick={handleStartProcess}
        disabled={isProcessing || (!billImage && !materialImage)}
        className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
          isProcessing
            ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            : billImage || materialImage
            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/10 cursor-pointer active:scale-98"
            : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing with Gemini AI...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Fill Automated Checklist
          </>
        )}
      </button>
    </div>
  );
}
