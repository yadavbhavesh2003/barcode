import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "barcode_generator.db");
  dbInstance = new Database(dbPath);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("foreign_keys = ON");

  initTables(dbInstance);
  return dbInstance;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sequence_tracker (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_val INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mrp REAL NOT NULL,
      sales_price REAL NOT NULL,
      net_quantity TEXT NOT NULL DEFAULT '1U',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS generation_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_number TEXT UNIQUE NOT NULL,
      file_name TEXT NOT NULL,
      total_products INTEGER NOT NULL,
      total_labels INTEGER NOT NULL,
      start_barcode TEXT NOT NULL,
      end_barcode TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_by TEXT DEFAULT 'Admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      pdf_path TEXT
    );

    CREATE TABLE IF NOT EXISTS barcodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode_value TEXT UNIQUE NOT NULL,
      product_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (batch_id) REFERENCES generation_batches(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Initialize sequence tracker if empty
  const seqCheck = db.prepare("SELECT current_val FROM sequence_tracker WHERE id = 1").get();
  if (!seqCheck) {
    db.prepare("INSERT INTO sequence_tracker (id, current_val) VALUES (1, 0)").run();
  }

  // Initialize default settings if not set
  const defaultSettings: Record<string, string> = {
    website: "https://runrkids.in/",
    net_quantity: "1U",
    label_width_mm: "50",
    label_height_mm: "25",
    printer_offset_x_mm: "0",
    printer_offset_y_mm: "0",
    printer_scale_pct: "100",
    currency: "INR",
    barcode_height_mm: "8",
    barcode_rotation: "0",
    layout_preset: "standard",
    a4_margin_top_mm: "10",
    a4_margin_left_mm: "10",
    a4_gap_x_mm: "2",
    a4_gap_y_mm: "2",
    a4_columns: "4",
    a4_rows: "10",
  };

  const insertSetting = db.prepare(
    "INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)"
  );
  const insertMany = db.transaction((settings: Record<string, string>) => {
    for (const [key, value] of Object.entries(settings)) {
      insertSetting.run(key, value);
    }
  });

  insertMany(defaultSettings);
}
