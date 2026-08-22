// System 2.0 Domain Type Definitions

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "BILLING_OPERATOR"
  | "INVENTORY_MANAGER"
  | "BARCODE_OPERATOR"
  | "VIEWER"
  | string;

export type UserStatus = "active" | "inactive" | "suspended" | "pending";

export type PermissionModule =
  | "dashboard"
  | "pos"
  | "products"
  | "services"
  | "inventory"
  | "customers"
  | "invoices"
  | "scanner"
  | "barcodes"
  | "reports"
  | "audit"
  | "users"
  | "roles"
  | "settings";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "manage";

export type GranularPermission = `${PermissionModule}.${PermissionAction}` | "*";

export interface IRole {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  status: "active" | "inactive";
  userCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  customRoleId?: string;
  permissions?: string[];
  status: UserStatus;
  phone?: string;
  department?: string;
  branch?: string;
  avatar?: string;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  department?: string;
  branch?: string;
  avatar?: string;
}

export interface INotification {
  _id?: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  category: "stock" | "invoice" | "system" | "security" | "sales" | "inventory" | string;
  isRead: boolean;
  link?: string;
  createdAt: Date;
}

export type BarcodeType =
  | "CUSTOM"
  | "CODE128"
  | "CODE39"
  | "EAN13"
  | "EAN8"
  | "UPCA"
  | "ITF14"
  | "QR";

export type BarcodeSource =
  | "INTERNAL_CUSTOM"
  | "EXISTING_GS1"
  | "GS1_GTIN";

export type BarcodeStatus = "active" | "inactive" | "replaced" | "archived";

export type ProductStatus = "active" | "inactive" | "archived";

export type ServiceStatus = "active" | "inactive" | "archived";

export type PricingType = "FIXED" | "HOURLY" | "PER_UNIT" | "RECURRING";

export type InventoryTransactionType =
  | "OPENING_STOCK"
  | "PURCHASE"
  | "SALE"
  | "RETURN"
  | "ADJUSTMENT_ADD"
  | "ADJUSTMENT_SUBTRACT"
  | "DAMAGE"
  | "TRANSFER";

export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "UPI"
  | "BANK_TRANSFER"
  | "SPLIT"
  | "OTHER";

export type PaymentStatus =
  | "PAID"
  | "PARTIAL"
  | "PENDING"
  | "FAILED"
  | "REFUNDED";

export type InvoiceStatus = "ACTIVE" | "CANCELLED" | "VOID" | "REFUNDED";

export interface IProduct {
  _id?: string;
  itemNumber: string; // e.g. "14378278"
  sku?: string;
  name: string;
  shortName?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  hsnSac?: string;
  unitOfMeasure?: string; // Default 'PCS' or '1U'
  
  // Pricing
  mrp: number;
  costPrice?: number;
  sellingPrice: number;
  discountPct?: number;
  gstRate: number; // e.g. 5, 12, 18, 28
  isTaxInclusive: boolean;
  
  // Inventory
  openingStock: number;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minStock: number;
  reorderLevel?: number;
  maxStock?: number;
  
  // Primary Barcode
  barcodeId?: string;
  barcodeNumber?: string;
  barcodeType?: BarcodeType;
  barcodeSource?: BarcodeSource;
  
  images?: string[];
  status: ProductStatus;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IService {
  _id?: string;
  serviceCode: string; // e.g. "SRV-1001"
  name: string;
  sacCode: string; // Services Accounting Code, e.g. "998313"
  category: string; // e.g. "Barcode Services", "Maintenance", "Printing"
  pricingType: PricingType;
  price: number;
  gstRate: number; // e.g. 18, 12, 5
  isTaxInclusive: boolean;
  status: ServiceStatus;
  description?: string;
  turnaroundHours?: number;
  totalOrdersCount?: number;
  totalRevenue?: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBarcode {
  _id?: string;
  barcodeNumber: string;
  barcodeType: BarcodeType;
  source: BarcodeSource;
  productId: string;
  productName?: string;
  status: BarcodeStatus;
  assignmentDate?: Date;
  assignedBy?: string;
  printCount: number;
  lastPrintedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInventoryTransaction {
  _id?: string;
  productId: string;
  productName?: string;
  itemNumber?: string;
  type: InventoryTransactionType;
  quantity: number; // positive for addition, negative for deduction
  stockBefore: number;
  stockAfter: number;
  referenceId?: string; // e.g. Invoice Number or Batch ID
  reason?: string;
  createdBy?: string;
  createdAt?: Date;
}

export interface ICustomer {
  _id?: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  gstin?: string;
  companyName?: string;
  notes?: string;
  totalSpend?: number;
  totalInvoices?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInvoiceItem {
  productId: string;
  barcodeNumber: string;
  productName: string;
  hsnSac: string;
  mrp: number;
  unitPrice: number;
  quantity: number;
  discountPct: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGst: number;
  lineTotal: number;
  itemType?: "PRODUCT" | "SERVICE";
}

export interface IPaymentRecord {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  status: PaymentStatus;
  date?: Date;
}

export interface IInvoice {
  _id?: string;
  invoiceNumber: string;
  financialYear: string;
  sequenceNumber: number;
  customer?: {
    customerId?: string;
    name: string;
    mobile?: string;
    email?: string;
    gstin?: string;
    address?: string;
  };
  items: IInvoiceItem[];
  itemsCount: number;
  totalQuantity: number;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGst: number;
  roundOff: number;
  grandTotal: number;
  
  payments: IPaymentRecord[];
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  balanceAmount: number;
  
  status: InvoiceStatus;
  cancelReason?: string;
  notes?: string;
  termsAndConditions?: string;
  
  billedBy: string;
  invoiceDate: Date;
  
  // Revision & Audit Traceability
  revisionCount?: number;
  isRevised?: boolean;
  revisedAt?: Date;
  revisedBy?: string;
  revisions?: IInvoiceRevision[];
  
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInvoiceRevision {
  revisionNumber: number;
  revisedAt: Date;
  revisedBy: string;
  reason?: string;
  previousItems: IInvoiceItem[];
  previousSubtotal: number;
  previousDiscount: number;
  previousGrandTotal: number;
  previousTotalQuantity: number;
  stockAdjustments?: {
    productId: string;
    productName: string;
    oldQuantity: number;
    newQuantity: number;
    deltaQuantity: number;
  }[];
}

export interface IPrintPreset {
  _id?: string;
  name: string;
  isDefault: boolean;
  type: "roll" | "sheet";
  widthMm: number;
  heightMm: number;
  marginTopMm: number;
  marginLeftMm: number;
  gapXMm: number;
  gapYMm: number;
  columns: number;
  rows: number;
  
  barcodeType: BarcodeType;
  showCompanyName: boolean;
  showProductName: boolean;
  showMrp: boolean;
  showSellingPrice: boolean;
  showGst: boolean;
  showHsn: boolean;
  showSku: boolean;
  showNetQuantity: boolean;
  showBorder: boolean;
  customText?: string;
  barcodeHeightMm: number;
  fontSizePt: number;
  rotation: 0 | 90 | 180 | 270;
  createdAt?: Date;
}

export interface IAuditLog {
  _id?: string;
  userId?: string;
  userName: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  createdAt?: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  requestId?: string;
}
