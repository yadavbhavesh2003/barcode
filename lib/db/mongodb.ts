import mongoose from "mongoose";
import { hashPassword, DEFAULT_ROLE_PERMISSIONS } from "../auth";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/barcode_generator";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then(async (m) => {
      await initDefaultSettings();
      await syncBarcodeIndexes();
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Ensure unique index is dropped so duplicate SKUs / custom barcodes print without collision
async function syncBarcodeIndexes() {
  try {
    const collection = BarcodeModel.collection;
    const indexes = await collection.indexes();
    for (const idx of indexes) {
      if (idx.name === "barcodeValue_1" && idx.unique) {
        await collection.dropIndex("barcodeValue_1");
      }
    }
  } catch (err) {
    // Collection may not exist yet on initial boot
  }
}

// ----------------------------------------------------
// MongoDB Schemas & Models (Enterprise System 2.0)
// ----------------------------------------------------

// 1. Roles & Permissions Master
const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);
export const RoleModel = mongoose.models.Role || mongoose.model("Role", RoleSchema);

// 2. Users & RBAC
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, default: "BILLING_OPERATOR" },
    customRoleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
    permissions: [{ type: String }],
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending"],
      default: "active",
      index: true,
    },
    phone: { type: String },
    department: { type: String, default: "Retail" },
    branch: { type: String, default: "Main Branch" },
    avatar: { type: String },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);
if (mongoose.models.User) {
  delete (mongoose.models as any).User;
}
export const UserModel = mongoose.model("User", UserSchema);

// 3. Notifications
const NotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["info", "warning", "error", "success"], default: "info" },
    category: { type: String, enum: ["stock", "invoice", "system", "security"], default: "system" },
    isRead: { type: Boolean, default: false, index: true },
    link: { type: String },
    userId: { type: String },
  },
  { timestamps: true }
);
export const NotificationModel =
  mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

// 4. Product Master
const ProductSchema = new mongoose.Schema(
  {
    itemNumber: { type: String, required: true, unique: true, index: true },
    sku: { type: String, index: true },
    name: { type: String, required: true, index: true },
    shortName: { type: String },
    description: { type: String },
    category: { type: String, default: "General", index: true },
    subcategory: { type: String },
    brand: { type: String, default: "Generic", index: true },
    hsnSac: { type: String, default: "9503" },
    unitOfMeasure: { type: String, default: "PCS" },

    // Pricing
    mrp: { type: Number, required: true },
    costPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, required: true },
    discountPct: { type: Number, default: 0 },
    gstRate: { type: Number, default: 5 },
    isTaxInclusive: { type: Boolean, default: true },

    // Inventory
    openingStock: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    reservedStock: { type: Number, default: 0 },
    availableStock: { type: Number, default: 0 },
    minStock: { type: Number, default: 5 },
    reorderLevel: { type: Number, default: 10 },
    maxStock: { type: Number, default: 1000 },

    // Primary Barcode Link
    barcodeNumber: { type: String, index: true },
    barcodeType: { type: String, default: "CODE128" },
    barcodeSource: { type: String, default: "INTERNAL_CUSTOM" },

    images: [{ type: String }],
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
    createdBy: { type: String, default: "Admin" },
    updatedBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);
export const ProductModel = mongoose.models.Product || mongoose.model("Product", ProductSchema);

// 5. Service Management Master
const ServiceSchema = new mongoose.Schema(
  {
    serviceCode: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    sacCode: { type: String, default: "998313" },
    category: { type: String, default: "Barcode Services", index: true },
    pricingType: {
      type: String,
      enum: ["FIXED", "HOURLY", "PER_UNIT", "RECURRING"],
      default: "FIXED",
    },
    price: { type: Number, required: true },
    gstRate: { type: Number, default: 18 },
    isTaxInclusive: { type: Boolean, default: true },
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
    description: { type: String },
    turnaroundHours: { type: Number, default: 24 },
    totalOrdersCount: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    createdBy: { type: String, default: "Admin" },
    updatedBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);
export const ServiceModel = mongoose.models.Service || mongoose.model("Service", ServiceSchema);

// 6. Barcode Master
const BarcodeSchema = new mongoose.Schema(
  {
    barcodeNumber: { type: String, required: true, unique: true, index: true },
    barcodeType: {
      type: String,
      enum: ["CUSTOM", "CODE128", "CODE39", "EAN13", "EAN8", "UPCA", "ITF14", "QR"],
      default: "CODE128",
    },
    source: {
      type: String,
      enum: ["INTERNAL_CUSTOM", "EXISTING_GS1", "GS1_GTIN"],
      default: "INTERNAL_CUSTOM",
    },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productName: { type: String },
    status: { type: String, enum: ["active", "inactive", "replaced", "archived"], default: "active" },
    assignmentDate: { type: Date, default: Date.now },
    assignedBy: { type: String, default: "Admin" },
    printCount: { type: Number, default: 0 },
    lastPrintedAt: { type: Date },
  },
  { timestamps: true }
);
export const BarcodeModel = mongoose.models.Barcode || mongoose.model("Barcode", BarcodeSchema);

// 7. Generation Batches
const GenerationBatchSchema = new mongoose.Schema(
  {
    batchNumber: { type: String, required: true, unique: true },
    fileName: { type: String, required: true },
    totalProducts: { type: Number, required: true },
    totalLabels: { type: Number, required: true },
    startBarcode: { type: String, required: true },
    endBarcode: { type: String, required: true },
    status: { type: String, default: "completed" },
    createdBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);
export const GenerationBatchModel =
  mongoose.models.GenerationBatch || mongoose.model("GenerationBatch", GenerationBatchSchema);

// 8. Immutable Inventory Transaction Ledger
const InventoryTransactionSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productName: { type: String },
    itemNumber: { type: String },
    type: {
      type: String,
      enum: [
        "OPENING_STOCK",
        "PURCHASE",
        "SALE",
        "RETURN",
        "ADJUSTMENT_ADD",
        "ADJUSTMENT_SUBTRACT",
        "DAMAGE",
        "TRANSFER",
      ],
      required: true,
    },
    quantity: { type: Number, required: true },
    stockBefore: { type: Number, required: true },
    stockAfter: { type: Number, required: true },
    referenceId: { type: String },
    reason: { type: String },
    createdBy: { type: String, default: "Admin" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
export const InventoryTransactionModel =
  mongoose.models.InventoryTransaction ||
  mongoose.model("InventoryTransaction", InventoryTransactionSchema);

// 9. Customers
const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true, index: true },
    email: { type: String },
    address: { type: String },
    gstin: { type: String },
    companyName: { type: String },
    notes: { type: String },
    totalSpend: { type: Number, default: 0 },
    totalInvoices: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const CustomerModel = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);

// 10. Invoices & Historical Snapshot
const InvoiceItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.Mixed },
    barcodeNumber: { type: String, default: "N/A" },
    productName: { type: String, required: true },
    hsnSac: { type: String, default: "9503" },
    mrp: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    discountPct: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    gstRate: { type: Number, required: true },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    totalGst: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
    itemType: { type: String, enum: ["PRODUCT", "SERVICE"], default: "PRODUCT" },
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    financialYear: { type: String, required: true },
    sequenceNumber: { type: Number, required: true },
    customer: {
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
      name: { type: String, default: "Walk-in Customer" },
      mobile: { type: String },
      email: { type: String },
      gstin: { type: String },
      address: { type: String },
    },
    items: [InvoiceItemSchema],
    itemsCount: { type: Number, required: true },
    totalQuantity: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    totalGst: { type: Number, required: true },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },

    payments: [
      {
        method: {
          type: String,
          enum: ["CASH", "CARD", "UPI", "BANK_TRANSFER", "SPLIT", "OTHER"],
          default: "CASH",
        },
        amount: { type: Number, required: true },
        reference: { type: String },
        status: { type: String, default: "PAID" },
        date: { type: Date, default: Date.now },
      },
    ],
    paymentStatus: {
      type: String,
      enum: ["PAID", "PARTIAL", "PENDING", "FAILED", "REFUNDED"],
      default: "PAID",
      index: true,
    },
    paymentMethod: { type: String, default: "CASH" },
    paidAmount: { type: Number, required: true },
    balanceAmount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["ACTIVE", "CANCELLED", "VOID", "REFUNDED"],
      default: "ACTIVE",
      index: true,
    },
    cancelReason: { type: String },
    notes: { type: String },
    termsAndConditions: { type: String },

    billedBy: { type: String, default: "Operator" },
    invoiceDate: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);
if (mongoose.models.Invoice) {
  delete (mongoose.models as any).Invoice;
}
export const InvoiceModel = mongoose.model("Invoice", InvoiceSchema);

// 11. Payments
const PaymentSchema = new mongoose.Schema(
  {
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    invoiceNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ["CASH", "CARD", "UPI", "BANK_TRANSFER", "SPLIT", "OTHER"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PAID", "PARTIAL", "PENDING", "FAILED", "REFUNDED"],
      default: "PAID",
    },
    reference: { type: String },
    notes: { type: String },
    recordedBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);
export const PaymentModel = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);

// 12. Print Presets
const PrintPresetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    isDefault: { type: Boolean, default: false },
    type: { type: String, enum: ["roll", "sheet"], default: "roll" },
    widthMm: { type: Number, default: 35.56 },
    heightMm: { type: Number, default: 25.4 },
    marginTopMm: { type: Number, default: 3 },
    marginLeftMm: { type: Number, default: 3 },
    gapXMm: { type: Number, default: 3 },
    gapYMm: { type: Number, default: 3 },
    columns: { type: Number, default: 1 },
    rows: { type: Number, default: 1 },

    barcodeType: { type: String, default: "CODE128" },
    showCompanyName: { type: Boolean, default: true },
    showProductName: { type: Boolean, default: true },
    showMrp: { type: Boolean, default: true },
    showSellingPrice: { type: Boolean, default: true },
    showGst: { type: Boolean, default: true },
    showHsn: { type: Boolean, default: true },
    showSku: { type: Boolean, default: false },
    showNetQuantity: { type: Boolean, default: true },
    showBorder: { type: Boolean, default: false },
    customText: { type: String, default: "" },
    barcodeHeightMm: { type: Number, default: 8 },
    fontSizePt: { type: Number, default: 7 },
    rotation: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const PrintPresetModel =
  mongoose.models.PrintPreset || mongoose.model("PrintPreset", PrintPresetSchema);

// 13. Audit Logs
const AuditLogSchema = new mongoose.Schema(
  {
    userId: { type: String },
    userName: { type: String, default: "System" },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    requestId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
export const AuditLogModel = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

// 14. System Settings
const SystemSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  category: { type: String, default: "GENERAL" },
});
export const SystemSettingModel =
  mongoose.models.SystemSetting || mongoose.model("SystemSetting", SystemSettingSchema);

// 15. Sequence Tracker
const SequenceTrackerSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  currentVal: { type: Number, default: 0 },
});
export const SequenceTrackerModel =
  mongoose.models.SequenceTracker || mongoose.model("SequenceTracker", SequenceTrackerSchema);

// Seed Default Configurations, Roles, Initial Users & Services
async function initDefaultSettings() {
  const defaultSettings: Record<string, any> = {
    website: "https://runrkids.in/",
    net_quantity: "1U",
    label_width_mm: "50",
    label_height_mm: "25",
    show_border: "false",
    show_hri: "true",
    printer_offset_x_mm: "0",
    printer_offset_y_mm: "0",
    printer_scale_pct: "100",
    currency: "INR",
    currency_symbol: "₹",
    barcode_height_mm: "6.5",
    barcode_rotation: "0",
    layout_preset: "standard",
    a4_margin_top_mm: "10",
    a4_margin_left_mm: "10",
    a4_gap_x_mm: "2",
    a4_gap_y_mm: "2",
    a4_columns: "4",
    a4_rows: "10",
    store_name: "RUNR KIDS",
    company_name: "RUNR KIDS RETAIL PVT LTD",
    company_tagline: "Quality Kids Wear & Toys",
    company_address: "Shop 12-14, Galleria Mall, Sector 21",
    company_phone: "+91 9737998216",
    company_email: "support@runrkids.in",
    company_website: "https://runrkids.in/",
    company_gstin: "27AABCU9603R1ZM",
    invoice_prefix: "INV",
    invoice_terms: "1. Goods once sold will only be exchanged within 7 days. 2. No cash refund.",
    allow_negative_stock: false,
    whatsapp_mode: "direct", // "direct" (wa.me) | "cloud_api" (Meta Cloud API) | "both"
    whatsapp_phone_number_id: "",
    whatsapp_access_token: "",
    whatsapp_template_name: "bill_receipt",
    whatsapp_template_lang: "en",
    whatsapp_default_country_code: "91",
    whatsapp_custom_greeting: "Thank you for shopping at *RUNR KIDS*!",
    whatsapp_custom_footer: "🧸 *RUNR KIDS* — Visit us again at https://runrkids.in/",
    whatsapp_auto_send: "false",
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await SystemSettingModel.updateOne(
      { key },
      { $setOnInsert: { key, value } },
      { upsert: true }
    );
  }

  // 1. Seed Roles
  const rolesToSeed = [
    {
      name: "Super Administrator",
      slug: "SUPER_ADMIN",
      description: "Full unconstrained administrative access to entire platform.",
      permissions: DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN,
      isSystem: true,
      status: "active",
    },
    {
      name: "Administrator",
      slug: "ADMIN",
      description: "Administrative access across operations, inventory, and users.",
      permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN,
      isSystem: true,
      status: "active",
    },
    {
      name: "Store Manager",
      slug: "MANAGER",
      description: "Store operations, catalog management, inventory, and billing.",
      permissions: DEFAULT_ROLE_PERMISSIONS.MANAGER,
      isSystem: true,
      status: "active",
    },
    {
      name: "Billing Operator",
      slug: "BILLING_OPERATOR",
      description: "Cashier terminal, POS transactions, customer checkout, invoices.",
      permissions: DEFAULT_ROLE_PERMISSIONS.BILLING_OPERATOR,
      isSystem: true,
      status: "active",
    },
    {
      name: "Inventory Manager",
      slug: "INVENTORY_MANAGER",
      description: "Stock reconciliations, purchase entries, and inventory audit.",
      permissions: DEFAULT_ROLE_PERMISSIONS.INVENTORY_MANAGER,
      isSystem: true,
      status: "active",
    },
    {
      name: "Barcode Operator",
      slug: "BARCODE_OPERATOR",
      description: "Barcode label generation, printing batches, thermal configuration.",
      permissions: DEFAULT_ROLE_PERMISSIONS.BARCODE_OPERATOR,
      isSystem: true,
      status: "active",
    },
    {
      name: "Read-Only Viewer",
      slug: "VIEWER",
      description: "Read-only visibility for auditing, analytics, and accounting.",
      permissions: DEFAULT_ROLE_PERMISSIONS.VIEWER,
      isSystem: true,
      status: "active",
    },
  ];

  for (const r of rolesToSeed) {
    await RoleModel.updateOne(
      { slug: r.slug },
      { $setOnInsert: r },
      { upsert: true }
    );
  }

  // 2. Seed Default Administrative Users
  const usersToSeed = [
    {
      name: "Bhavesh Yadav (Super Admin)",
      email: "admin@runrkids.in",
      passwordHash: hashPassword("Admin@12345"),
      role: "SUPER_ADMIN",
      department: "Executive Management",
      branch: "HQ / Galleria Mall",
      status: "active" as const,
    },
    {
      name: "Store Manager",
      email: "manager@runrkids.in",
      passwordHash: hashPassword("Manager@12345"),
      role: "MANAGER",
      department: "Retail Operations",
      branch: "Sector 21 Outlet",
      status: "active" as const,
    },
    {
      name: "POS Cashier",
      email: "pos@runrkids.in",
      passwordHash: hashPassword("Pos@12345"),
      role: "BILLING_OPERATOR",
      department: "Checkout & Sales",
      branch: "Main Counter 01",
      status: "active" as const,
    },
  ];

  for (const u of usersToSeed) {
    const existing = await UserModel.findOne({ email: u.email });
    if (!existing) {
      await UserModel.create(u);
    } else if (!existing.passwordHash || !existing.passwordHash.includes(":")) {
      existing.passwordHash = u.passwordHash;
      existing.role = u.role;
      existing.status = "active";
      await existing.save();
    }
  }

  // 3. Seed Initial Notification
  const existingNotification = await NotificationModel.findOne();
  if (!existingNotification) {
    await NotificationModel.create({
      title: "Enterprise Admin Panel Initialized",
      message: "System 2.0 Enterprise Admin Panel is online with RBAC and secure authentication.",
      type: "success",
      category: "system",
      isRead: false,
    });
  }

  await SequenceTrackerModel.updateOne(
    { _id: "barcode_counter" },
    { $setOnInsert: { _id: "barcode_counter", currentVal: 100000 } },
    { upsert: true }
  );

  const currentYear = new Date().getFullYear();
  const nextYearShort = String(currentYear + 1).slice(-2);
  const fyKey = `invoice_${currentYear}-${nextYearShort}`;
  await SequenceTrackerModel.updateOne(
    { _id: fyKey },
    { $setOnInsert: { _id: fyKey, currentVal: 0 } },
    { upsert: true }
  );

  await PrintPresetModel.updateOne(
    { name: "Standard 1-Up Roll (1.4 x 1.0 in)" },
    {
      $setOnInsert: {
        name: "Standard 1-Up Roll (1.4 x 1.0 in)",
        isDefault: true,
        type: "roll",
        widthMm: 35.56,
        heightMm: 25.4,
        marginTopMm: 3,
        marginLeftMm: 3,
        gapXMm: 3,
        gapYMm: 3,
        columns: 1,
        rows: 1,
        barcodeType: "CODE128",
        showCompanyName: true,
        showProductName: true,
        showMrp: true,
        showSellingPrice: true,
        showGst: true,
        showHsn: true,
        showSku: false,
        showNetQuantity: true,
        showBorder: false,
        barcodeHeightMm: 8,
        fontSizePt: 7,
        rotation: 0,
      },
    },
    { upsert: true }
  );

  // Seed default core service offerings
  const defaultServices = [
    {
      serviceCode: "SRV-1001",
      name: "Custom Barcode Label Design",
      sacCode: "998313",
      category: "Barcode Services",
      pricingType: "FIXED",
      price: 499,
      gstRate: 18,
      turnaroundHours: 12,
      description: "Custom tailored 1-Up roll or sheet barcode artwork design with GS1/Code128 compliance.",
    },
    {
      serviceCode: "SRV-1002",
      name: "Thermal Printer Maintenance & Calibration",
      sacCode: "998717",
      category: "Maintenance",
      pricingType: "FIXED",
      price: 799,
      gstRate: 18,
      turnaroundHours: 24,
      description: "Hardware head cleaning, sensor calibration, dark level adjustment, and printhead inspection.",
    },
    {
      serviceCode: "SRV-1003",
      name: "Bulk Inventory Tagging & Barcode Affixing",
      sacCode: "998599",
      category: "Operations",
      pricingType: "PER_UNIT",
      price: 2.5,
      gstRate: 18,
      turnaroundHours: 48,
      description: "On-site physical barcode sticker pasting, batch scanning, and digital inventory reconciliation.",
    },
  ];

  for (const s of defaultServices) {
    await ServiceModel.updateOne(
      { serviceCode: s.serviceCode },
      { $setOnInsert: s },
      { upsert: true }
    );
  }
}
