export type BillMode = 'GST' | 'NON_GST';
export type TaxMode = 'INTRA' | 'INTER';
export type PaymentStatus = 'Successful' | 'Pending';

export interface CompanySettings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  state: string;
  stateCode: string;
  pan: string;
  bankHolder: string;
  bankName: string;
  accountNo: string;
  branch: string;
  ifsc: string;
  jurisdiction: string;
  logoImage: string;
  logoDriveFileId: string;
  stampImage: string;
  stampDriveFileId: string;
  stampDriveFolderId: string;
  googleDriveUploadUrl: string;
}

export interface Party {
  name: string;
  address: string;
  contact: string;
  gstin: string;
  state: string;
  stateCode: string;
}

export interface Product {
  id: string;
  name: string;
  hsn: string;
  unit: string;
  rate: number;
  costPrice?: number;
  gstRate: number;
  category: string;
  active: boolean;
}

export interface Item {
  id: string;
  productId?: string;
  description: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  costPrice?: number;
  gstRate: number;
}

export interface InvoiceMeta {
  invoiceNo: string;
  date: string;
  deliveryNote: string;
  paymentTerms: string;
  termsOfPayment: string;
  referenceNo: string;
  referenceDate: string;
  otherReferences: string;
  buyerOrderNo: string;
  buyerOrderDate: string;
  dispatchDocNo: string;
  deliveryNoteDate: string;
  dispatchedThrough: string;
  destination: string;
  termsOfDelivery: string;
  termsAndConditions: string[];
}

export interface Invoice {
  id: string;
  mode: BillMode;
  taxMode: TaxMode;
  meta: InvoiceMeta;
  consignee: Party;
  buyer: Party;
  buyerSameAsConsignee: boolean;
  items: Item[];
  roundOff: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export interface Customer extends Party {
  id: string;
}

export type LedgerEntryType = 'Receipt' | 'Manual Due';
export type LedgerPaymentMode = 'Cash' | 'UPI' | 'Bank' | 'Cheque' | 'Other';

export interface LedgerEntry {
  id: string;
  date: string;
  type: LedgerEntryType;
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNo: string;
  amount: number;
  paymentMode: LedgerPaymentMode;
  reference: string;
  notes: string;
  createdAt: string;
}


export type InventoryItemType = "RAW_MATERIAL" | "FINISHED_PRODUCT";
export type InventoryTransactionType = "IN" | "OUT" | "ADJUSTMENT";

export interface InventoryItem {
  id: string;
  name: string;
  type: InventoryItemType;
  category: string;
  unit: string;
  openingStock: number;
  minStock: number;
  costRate: number;
  location: string;
  supplier: string;
  batchNo: string;
  linkedProductId: string;
  active: boolean;
  notes: string;
  createdAt: string;
}

export interface InventoryTransaction {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  itemType: InventoryItemType;
  transactionType: InventoryTransactionType;
  quantity: number;
  unit: string;
  rate: number;
  referenceNo: string;
  source: string;
  party: string;
  batchNo: string;
  location: string;
  notes: string;
  createdAt: string;
}

export interface ProductionRecord {
  id: string;
  date: string;
  outputItemId: string;
  outputItemName: string;
  outputQuantity: number;
  unit: string;
  batchNo: string;
  referenceNo: string;
  notes: string;
  rawMaterials: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
  }>;
  createdAt: string;
}


export type LeadSource =
  | "Justdial"
  | "IndiaMART"
  | "WhatsApp"
  | "Customer Referral"
  | "Google / Website"
  | "Facebook / Instagram"
  | "Walk-in"
  | "Existing Customer"
  | "Contractor / Builder"
  | "Other";

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Follow-up"
  | "Quoted"
  | "Won"
  | "Lost";

export type LeadPriority = "Hot" | "Warm" | "Cold";
export type LeadType = "Homeowner" | "Contractor" | "Builder" | "Dealer" | "Institution" | "Other";

export interface Lead {
  id: string;
  leadDate: string;
  source: LeadSource;
  sourceDetail: string;
  customerName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  sitePlace: string;
  leadType: LeadType;
  productInterest: string;
  requirement: string;
  expectedQuantity: number;
  estimatedValue: number;
  status: LeadStatus;
  priority: LeadPriority;
  nextFollowUpDate: string;
  remarks: string;
  lostReason: string;
  convertedInvoiceNo: string;
  createdAt: string;
  updatedAt: string;
}


export type WorkerType = "LABOUR" | "STAFF";
export type WageType = "DAILY" | "MONTHLY" | "HOURLY";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE";

export interface Worker {
  id: string;
  name: string;
  phone: string;
  type: WorkerType;
  role: string;
  wageType: WageType;
  wageRate: number;
  joiningDate: string;
  active: boolean;
  notes: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  workerId: string;
  workerName: string;
  workerType: WorkerType;
  status: AttendanceStatus;
  inTime: string;
  outTime: string;
  breakMinutes: number;
  totalHours: number;
  overtimeHours: number;
  site: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}


export type ServiceProviderCategory = "Truck" | "IT Service" | "WiFi Service" | "Water Supply" | "Electrician" | "Plumber" | "Other";
export interface ServiceProvider {
  id: string; name: string; category: ServiceProviderCategory; phone: string; alternatePhone: string; address: string; serviceDetails: string; vehicleNumber: string; rate: number; paymentTerms: string; notes: string; active: boolean; createdAt: string; updatedAt: string;
}
export interface PurchaseRecord {
  id: string; date: string; itemName: string; category: string; quantity: number; unit: string; unitPrice: number; totalAmount: number; paidAmount: number; supplierName: string; supplierPhone: string; invoiceNumber: string; paymentStatus: "Paid" | "Pending" | "Partial"; paymentMode: string; remarks: string; createdAt: string; updatedAt: string;
}
