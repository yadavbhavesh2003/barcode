import { AuthUser, PermissionModule, PermissionAction } from "./types";

// 1. Default Granular Permissions Map per Role
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["*"],
  ADMIN: [
    "dashboard.view",
    "dashboard.manage",
    "pos.view",
    "pos.create",
    "pos.manage",
    "products.view",
    "products.create",
    "products.edit",
    "products.delete",
    "products.export",
    "products.manage",
    "services.view",
    "services.create",
    "services.edit",
    "services.delete",
    "services.manage",
    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.export",
    "inventory.manage",
    "customers.view",
    "customers.create",
    "customers.edit",
    "customers.delete",
    "customers.export",
    "customers.manage",
    "invoices.view",
    "invoices.create",
    "invoices.edit",
    "invoices.delete",
    "invoices.export",
    "invoices.manage",
    "scanner.view",
    "scanner.manage",
    "barcodes.view",
    "barcodes.create",
    "barcodes.edit",
    "barcodes.export",
    "barcodes.manage",
    "reports.view",
    "reports.export",
    "reports.manage",
    "audit.view",
    "audit.export",
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
    "users.manage",
    "roles.view",
    "settings.view",
    "settings.edit",
    "settings.manage",
  ],
  MANAGER: [
    "dashboard.view",
    "pos.view",
    "pos.create",
    "pos.manage",
    "products.view",
    "products.create",
    "products.edit",
    "products.export",
    "services.view",
    "services.create",
    "services.edit",
    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.export",
    "customers.view",
    "customers.create",
    "customers.edit",
    "customers.export",
    "invoices.view",
    "invoices.create",
    "invoices.edit",
    "invoices.export",
    "scanner.view",
    "scanner.manage",
    "barcodes.view",
    "barcodes.create",
    "barcodes.edit",
    "barcodes.export",
    "reports.view",
    "reports.export",
    "audit.view",
    "settings.view",
  ],
  BILLING_OPERATOR: [
    "dashboard.view",
    "pos.view",
    "pos.create",
    "pos.manage",
    "products.view",
    "services.view",
    "customers.view",
    "customers.create",
    "customers.edit",
    "invoices.view",
    "invoices.create",
    "invoices.export",
    "scanner.view",
    "barcodes.view",
  ],
  INVENTORY_MANAGER: [
    "dashboard.view",
    "products.view",
    "products.create",
    "products.edit",
    "products.export",
    "products.manage",
    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.export",
    "inventory.manage",
    "barcodes.view",
    "barcodes.create",
    "barcodes.edit",
    "barcodes.export",
    "scanner.view",
    "reports.view",
    "reports.export",
  ],
  BARCODE_OPERATOR: [
    "dashboard.view",
    "barcodes.view",
    "barcodes.create",
    "barcodes.edit",
    "barcodes.export",
    "scanner.view",
    "products.view",
    "inventory.view",
  ],
  VIEWER: [
    "dashboard.view",
    "products.view",
    "services.view",
    "inventory.view",
    "customers.view",
    "invoices.view",
    "reports.view",
  ],
};

// 2. Client-safe Permission Checker Utility
export function hasPermission(
  user: AuthUser | null | undefined,
  module: PermissionModule,
  action: PermissionAction = "view"
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;

  const perms = user.permissions || [];
  if (perms.includes("*")) return true;

  // Check specific module.action or wildcard module.*
  const target = `${module}.${action}`;
  const wildcardModule = `${module}.*`;
  const wildcardManage = `${module}.manage`;

  if (perms.includes(target) || perms.includes(wildcardModule) || (action !== "delete" && perms.includes(wildcardManage))) {
    return true;
  }

  // Fallback to default role perms if user.permissions is empty
  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
  if (defaultPerms.includes("*")) return true;
  if (defaultPerms.includes(target) || defaultPerms.includes(wildcardModule) || defaultPerms.includes(wildcardManage)) {
    return true;
  }

  return false;
}

// 3. Complete Permissions Directory for UI Matrix
export const ALL_MODULE_ACTIONS: Record<PermissionModule, { label: string; actions: { key: PermissionAction; label: string }[] }> = {
  dashboard: {
    label: "Dashboard & Metrics",
    actions: [
      { key: "view", label: "View Analytics" },
      { key: "manage", label: "Manage Widgets & Restock" },
    ],
  },
  pos: {
    label: "POS Billing",
    actions: [
      { key: "view", label: "Access Terminal" },
      { key: "create", label: "Process Sales" },
      { key: "manage", label: "Apply Custom Discounts / Overrides" },
    ],
  },
  products: {
    label: "Products Catalog",
    actions: [
      { key: "view", label: "View Products" },
      { key: "create", label: "Add Product" },
      { key: "edit", label: "Edit Details & Pricing" },
      { key: "delete", label: "Archive / Delete" },
      { key: "export", label: "Export Excel" },
      { key: "manage", label: "Bulk Import & Manage" },
    ],
  },
  services: {
    label: "Services Master",
    actions: [
      { key: "view", label: "View Services" },
      { key: "create", label: "Create Service" },
      { key: "edit", label: "Edit Pricing / SAC" },
      { key: "delete", label: "Archive / Delete" },
    ],
  },
  inventory: {
    label: "Inventory & Stock",
    actions: [
      { key: "view", label: "View Stock Levels" },
      { key: "create", label: "Add Stock / Purchase" },
      { key: "edit", label: "Adjust Stock / Ledger" },
      { key: "export", label: "Export Valuation" },
      { key: "manage", label: "Bulk Stock Reconcile" },
    ],
  },
  customers: {
    label: "Customers",
    actions: [
      { key: "view", label: "View Customers" },
      { key: "create", label: "Add Customer" },
      { key: "edit", label: "Edit Profile" },
      { key: "delete", label: "Delete Customer" },
      { key: "export", label: "Export List" },
    ],
  },
  invoices: {
    label: "Invoices & Sales",
    actions: [
      { key: "view", label: "View Invoices" },
      { key: "create", label: "Create Invoice" },
      { key: "edit", label: "Edit / Add Payment" },
      { key: "delete", label: "Cancel / Void" },
      { key: "export", label: "Download PDF / Export" },
    ],
  },
  scanner: {
    label: "Barcode Scanner",
    actions: [
      { key: "view", label: "Scan & Lookup" },
      { key: "manage", label: "Trigger Stock Actions" },
    ],
  },
  barcodes: {
    label: "Labels & Codes Generator",
    actions: [
      { key: "view", label: "View Designer" },
      { key: "create", label: "Generate Barcodes" },
      { key: "edit", label: "Configure Presets" },
      { key: "export", label: "Print & Download PDF" },
    ],
  },
  reports: {
    label: "Reports & Analytics",
    actions: [
      { key: "view", label: "View Reports" },
      { key: "export", label: "Export Sales & Tax CSV" },
    ],
  },
  audit: {
    label: "Audit & Security Logs",
    actions: [
      { key: "view", label: "View Trail" },
      { key: "export", label: "Export Audit Log" },
    ],
  },
  users: {
    label: "User Management",
    actions: [
      { key: "view", label: "View Users" },
      { key: "create", label: "Invite / Create User" },
      { key: "edit", label: "Edit / Assign Role" },
      { key: "delete", label: "Deactivate / Suspend" },
      { key: "manage", label: "Reset Passwords" },
    ],
  },
  roles: {
    label: "Roles & Permissions",
    actions: [
      { key: "view", label: "View Roles" },
      { key: "create", label: "Create Custom Role" },
      { key: "edit", label: "Modify Permissions" },
      { key: "delete", label: "Delete Custom Role" },
    ],
  },
  settings: {
    label: "System & Business Settings",
    actions: [
      { key: "view", label: "View Settings" },
      { key: "edit", label: "Update Configuration" },
      { key: "manage", label: "System Maintenance" },
    ],
  },
};
