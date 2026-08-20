export interface WeightCheckRecord {
  containerNo: string;
  grossWeightOnLabel: string;
  grossWeightObserved: string;
  diffQty: string;
  remark: "OK" | "NOT OK" | "";
}

export interface MaterialReceiptChecklist {
  id: string; // Saved history ID
  createdAt: string; // ISO string

  // Header Details
  grnNo: string;
  materialReceivedDate: string;
  materialInwardNo: string;
  challanNo: string;
  challanDate: string;
  batchNo: string;
  materialName: string;
  mfgDate: string;
  expDate: string;
  poNumber: string;
  poDate: string;
  packing: string;
  availableShelfLife: string;
  totalQtyReceived: string;
  challanQty: string;
  supplier: string;
  mfgBy: string;
  mfgLicNo: string;

  // Checklist options (Yes/No/NA/Satisfactory/Not satisfactory)
  receivedFromApprovedVendor: "Yes" | "No" | "NA";
  coaReceivedFromMfg: "Yes" | "No" | "NA";
  vehicleCondition: "Satisfactory" | "Not satisfactory" | "NA";
  qrCodeAvailability: "Yes" | "No" | "NA";

  // Condition of Goods
  damage: "Yes" | "No" | "NA";
  labelCondition: "Satisfactory" | "Not satisfactory" | "NA";
  seal: "Satisfactory" | "Not satisfactory" | "NA";
  packingCondition: "Satisfactory" | "Not satisfactory" | "NA";
  waterPenetration: "Yes" | "No" | "NA";
  coaReceived: "Yes" | "No" | "NA";
  allowedWtVariationApi: string;
  allowedWtVariationExcipients: string;

  // Weight Records
  weightChecks: WeightCheckRecord[];
}
