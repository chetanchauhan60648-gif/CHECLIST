import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with 50mb limit for base64 images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route for processing images
  app.post("/api/process-receipt", async (req, res) => {
    try {
      const { billImage, materialImage } = req.body;

      if (!billImage && !materialImage) {
        return res.status(400).json({ error: "At least one image (Bill or Material) is required." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("GEMINI_API_KEY is missing. Returning high-quality simulated mock extraction data.");
        const today = new Date().toISOString().split("T")[0];
        const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const prevMonth = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        
        return res.json({
          grnNo: "GRN-2026-4412",
          materialReceivedDate: today,
          materialInwardNo: "IWD-1205",
          challanNo: "CH-9921-X",
          challanDate: prevMonth,
          batchNo: "BCH-PARA-559",
          materialName: "Paracetamol Active Pharmaceutical Ingredient (API) Powder",
          mfgDate: prevMonth,
          expDate: nextYear,
          poNumber: "PO-77810",
          poDate: prevMonth,
          packing: "25 kg Fibre Drums",
          availableShelfLife: "11 Months",
          totalQtyReceived: "250 kg",
          challanQty: "250 kg",
          supplier: "Aurobindo Pharma Organics Ltd.",
          mfgBy: "Aurobindo Chemical Labs",
          mfgLicNo: "MFG-LIC-AURO-2026/12",
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
              grossWeightObserved: "25.02",
              diffQty: "0.02",
              remark: "OK"
            },
            {
              containerNo: "2",
              grossWeightOnLabel: "25.00",
              grossWeightObserved: "24.98",
              diffQty: "-0.02",
              remark: "OK"
            }
          ],
          _isSimulated: true
        });
      }

      // Initialize GoogleGenAI on each request to safely handle any runtime key changes
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are an expert material receipt and quality control inspector.
Analyze the uploaded image(s):
1. Bill / Invoice photo (if uploaded)
2. Material label / container photo (if uploaded)

Extract all relevant fields to fill out the "MATERIAL RECEIPT CHECK-LIST" from the company WEST-COAST Pharmaceutical Works Ltd.

If any field is not found in the documents, leave it as an empty string "" or set it to a logical default:
- Received from approved vendor: default to "Yes" or "No" based on the supplier/manufacturer on the bill.
- Vehicle condition: default to "Satisfactory".
- QR Code Availability: "Yes" if you see a QR code or barcode on the material container label, else "No".
- Damage: default to "No".
- Label condition: default to "Satisfactory".
- Seal: default to "Satisfactory".
- Packing condition: default to "Satisfactory".
- Water penetration: default to "No".
- COA received: default to "Yes" or "No".
- Allowed Wt. Variation for API: default to "Limit: ± 0.5".
- Allowed Wt. Variation for Excipients: default to "Limit: ± 1.0".

If a label photo is uploaded, try to parse its weight (e.g., Gross Weight or Net Weight) and add an item to the weightChecks array with containerNo "1", the extracted weight as grossWeightOnLabel, and default others.

Ensure to parse dates (e.g. Challan date, Mfg date, Exp date, PO Date) into standard YYYY-MM-DD format if possible, otherwise use the format found.

Provide the response strictly matching the specified JSON schema.`;

      const parts: any[] = [];

      if (billImage) {
        // Clean base64 string
        const base64Data = billImage.replace(/^data:image\/\w+;base64,/, "");
        const mimeType = billImage.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      if (materialImage) {
        const base64Data = materialImage.replace(/^data:image\/\w+;base64,/, "");
        const mimeType = materialImage.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              grnNo: { type: Type.STRING },
              materialReceivedDate: { type: Type.STRING },
              materialInwardNo: { type: Type.STRING },
              challanNo: { type: Type.STRING },
              challanDate: { type: Type.STRING },
              batchNo: { type: Type.STRING },
              materialName: { type: Type.STRING },
              mfgDate: { type: Type.STRING },
              expDate: { type: Type.STRING },
              poNumber: { type: Type.STRING },
              poDate: { type: Type.STRING },
              packing: { type: Type.STRING },
              availableShelfLife: { type: Type.STRING },
              totalQtyReceived: { type: Type.STRING },
              challanQty: { type: Type.STRING },
              supplier: { type: Type.STRING },
              mfgBy: { type: Type.STRING },
              mfgLicNo: { type: Type.STRING },
              
              receivedFromApprovedVendor: { type: Type.STRING },
              coaReceivedFromMfg: { type: Type.STRING },
              vehicleCondition: { type: Type.STRING },
              qrCodeAvailability: { type: Type.STRING },
              
              damage: { type: Type.STRING },
              labelCondition: { type: Type.STRING },
              seal: { type: Type.STRING },
              packingCondition: { type: Type.STRING },
              waterPenetration: { type: Type.STRING },
              coaReceived: { type: Type.STRING },
              allowedWtVariationApi: { type: Type.STRING },
              allowedWtVariationExcipients: { type: Type.STRING },
              
              weightChecks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    containerNo: { type: Type.STRING },
                    grossWeightOnLabel: { type: Type.STRING },
                    grossWeightObserved: { type: Type.STRING },
                    diffQty: { type: Type.STRING },
                    remark: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const extractedText = response.text;
      if (!extractedText) {
        throw new Error("No response text received from Gemini.");
      }

      const extractedData = JSON.parse(extractedText);
      res.json(extractedData);
    } catch (error: any) {
      console.error("Error processing documents with Gemini:", error);
      res.status(500).json({ error: error.message || "Failed to process documents." });
    }
  });

  // Serve static client assets in production, or mount Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
