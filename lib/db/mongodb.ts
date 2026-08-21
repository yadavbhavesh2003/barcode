import mongoose from "mongoose";

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
// MongoDB Schemas & Models
// ----------------------------------------------------

// 1. System Settings
const SystemSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
});
export const SystemSettingModel =
  mongoose.models.SystemSetting || mongoose.model("SystemSetting", SystemSettingSchema);

// 2. Sequence Tracker (Atomic 8-digit unique code allocation)
const SequenceTrackerSchema = new mongoose.Schema({
  _id: { type: String, default: "barcode_counter" },
  currentVal: { type: Number, default: 0 },
});
export const SequenceTrackerModel =
  mongoose.models.SequenceTracker || mongoose.model("SequenceTracker", SequenceTrackerSchema);

// 3. Products
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mrp: { type: Number, required: true },
  salesPrice: { type: Number, required: true },
  netQuantity: { type: String, default: "1U" },
  customBarcode: { type: String },
  hsn: { type: String },
  gstAmount: { type: Number },
  gstRate: { type: String },
  amount: { type: Number },
  createdAt: { type: Date, default: Date.now },
});
export const ProductModel =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);

// 4. Generation Batches
const GenerationBatchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true, unique: true },
  fileName: { type: String, required: true },
  totalProducts: { type: Number, required: true },
  totalLabels: { type: Number, required: true },
  startBarcode: { type: String, required: true },
  endBarcode: { type: String, required: true },
  status: { type: String, default: "completed" },
  createdBy: { type: String, default: "Admin" },
  pdfOptions: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});
export const GenerationBatchModel =
  mongoose.models.GenerationBatch || mongoose.model("GenerationBatch", GenerationBatchSchema);

// 5. Barcodes
const BarcodeSchema = new mongoose.Schema({
  barcodeValue: { type: String, required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: "GenerationBatch", required: true },
  status: { type: String, default: "active" },
  createdAt: { type: Date, default: Date.now },
});
export const BarcodeModel =
  mongoose.models.Barcode || mongoose.model("Barcode", BarcodeSchema);

// 6. Invoices / Bills
const InvoiceItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  barcode: { type: String, required: true },
  productName: { type: String, required: true },
  hsn: { type: String, default: "9503" },
  mrp: { type: Number, required: true },
  salesPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  gstRate: { type: String, default: "5.00%" },
  gstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
});

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  customerName: { type: String, default: "Walk-in Customer" },
  customerPhone: { type: String, default: "" },
  items: [InvoiceItemSchema],
  totalItems: { type: Number, required: true },
  totalQuantity: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  totalGst: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentMode: { type: String, default: "Cash" }, // Cash, UPI, Card
  pdfFormat: { type: String, default: "a4" }, // a4, thermal
  status: { type: String, default: "paid" },
  createdAt: { type: Date, default: Date.now },
});
export const InvoiceModel =
  mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);

// 7. Audit Logs
const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  details: { type: String },
  createdAt: { type: Date, default: Date.now },
});
export const AuditLogModel =
  mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

// Default settings seeder
async function initDefaultSettings() {
  const defaultSettings: Record<string, string> = {
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
    barcode_height_mm: "6.5",
    barcode_rotation: "0",
    layout_preset: "standard",
    a4_margin_top_mm: "10",
    a4_margin_left_mm: "10",
    a4_gap_x_mm: "2",
    a4_gap_y_mm: "2",
    a4_columns: "4",
    a4_rows: "10",
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await SystemSettingModel.updateOne(
      { key },
      { $setOnInsert: { key, value } },
      { upsert: true }
    );
  }

  await SequenceTrackerModel.updateOne(
    { _id: "barcode_counter" },
    { $setOnInsert: { _id: "barcode_counter", currentVal: 0 } },
    { upsert: true }
  );
}
