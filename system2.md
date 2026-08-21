You are a Principal Software Architect, FAANG-level Full-Stack Engineer,
Product Engineer, Database Architect, Security Engineer, DevOps Engineer,
QA Engineer, Performance Engineer, POS Architect, and Award-Winning UI/UX Designer.

You are responsible for designing and implementing SYSTEM 2.0 from the ground up.

This is not a simple CRUD application.

Build a production-grade:

PRODUCT MANAGEMENT
+
BARCODE MANAGEMENT
+
BARCODE GENERATION
+
LABEL PRINTING
+
INVENTORY
+
BARCODE SCANNER
+
POS BILLING
+
PAYMENTS
+
INVOICE MANAGEMENT
+
CUSTOMER MANAGEMENT
+
REPORTING
+
AUDIT LOGGING
+
SETTINGS
+
USER/RBAC
+
SYSTEM ADMINISTRATION

platform.

The final application must feel like a polished commercial SaaS/POS product,
not an internal admin panel.

Use UI/UX Pro Max principles and design the application with a premium,
modern, clean, extremely usable interface.

============================================================
1. CORE PRINCIPLE
============================================================

DO NOT START CODING RANDOMLY.

First deeply understand the requirements and produce the architecture.

Before implementation:

1. Define modules.
2. Define entities.
3. Define relationships.
4. Define business rules.
5. Define API architecture.
6. Define database architecture.
7. Define frontend architecture.
8. Define authentication/authorization.
9. Define barcode architecture.
10. Define printing architecture.
11. Define billing architecture.
12. Define inventory architecture.
13. Define invoice architecture.
14. Define audit architecture.
15. Define testing strategy.
16. Define deployment strategy.

Then implement systematically.

Never create unnecessary complexity.

Do not use microservices unless there is a strong architectural reason.

For System 2.0, prefer a well-structured modular monolith initially,
with clear domain boundaries so services can be extracted later if required.

============================================================
2. PRODUCT VISION
============================================================

The system should allow a business to:

1. Import products from Excel/CSV.
2. Create products manually.
3. Assign existing barcodes.
4. Generate custom barcodes.
5. Generate standard barcode formats.
6. Guarantee barcode uniqueness.
7. Generate barcode labels.
8. Customize label templates.
9. Print labels.
10. Scan products.
11. Add scanned products to cart.
12. Create bills.
13. Apply discounts.
14. Calculate GST.
15. Accept payments.
16. Generate invoices.
17. Save invoice history.
18. Track inventory.
19. Track barcode history.
20. Track product history.
21. Track user actions.
22. Generate reports.
23. Manage customers.
24. Manage users and permissions.
25. Configure system settings.
26. Monitor system health.

============================================================
3. PRODUCT MASTER
============================================================

Product Master is the central source of truth.

Each product must support:

Identity:
- Internal Product ID
- Item Number
- SKU
- Product Name
- Short Name
- Description
- Category
- Subcategory
- Brand
- HSN/SAC
- Unit of Measure

Pricing:
- MRP
- Cost Price
- Selling Price
- Discount
- GST Rate
- GST Amount
- Tax Inclusive/Exclusive
- Effective Price

Inventory:
- Opening Stock
- Current Stock
- Reserved Stock
- Available Stock
- Minimum Stock
- Reorder Level
- Maximum Stock

Barcode:
- Barcode ID
- Barcode Number
- Barcode Type
- Barcode Source
- Barcode Status
- Assignment Date
- Assigned By

Audit:
- Created By
- Updated By
- Created At
- Updated At

Images:
- Product Image
- Multiple Images if required

Status:
- Active
- Inactive
- Archived

============================================================
4. BARCODE ARCHITECTURE
============================================================

Barcode is a first-class entity.

Do NOT make barcodeNumber the primary database identity.

Use:

Product
  ↓
Barcode
  ↓
Barcode Assignment
  ↓
Print Job
  ↓
Print History

Support:

- Custom
- Code 128
- Code 39
- EAN-13
- EAN-8
- UPC-A
- ITF-14
- QR Code
- Future barcode types

Design the system so new symbologies can be added without rewriting
the entire barcode module.

============================================================
5. ABSOLUTE BARCODE UNIQUENESS
============================================================

THIS IS A CRITICAL BUSINESS RULE.

A barcode number must never be duplicated within the system's barcode namespace.

Example:

14378278

can belong to only one active barcode assignment.

Never allow:

Product A → 14378278
Product B → 14378278

Frontend validation is NOT sufficient.

Implement:

1. Frontend validation.
2. Backend validation.
3. Database unique constraint/index.
4. Race-condition-safe creation.
5. Transaction-safe bulk generation.

If a duplicate is attempted:

Return a structured error:

BARCODE_ALREADY_EXISTS

with:

- Barcode
- Existing product
- Existing product ID
- Existing barcode type
- Created date

============================================================
6. CUSTOM BARCODE
============================================================

Allow users to manually enter a barcode.

Example:

Barcode Type:
Custom

Barcode:
14378278

Before saving:

- Validate format.
- Check uniqueness.
- Check reserved values.
- Check database.
- Confirm assignment.

If already exists:

Show:

"Barcode 14378278 is already assigned to
2.4 WIRELESS VIDEOGAME BLUE 9503."

Do not allow saving.

============================================================
7. STANDARD BARCODE TYPES
============================================================

Barcode types must have their own validation strategies.

Example:

EAN-13:
- 13 digits
- Valid check digit
- Correct structure

EAN-8:
- 8 digits
- Valid check digit

UPC-A:
- Correct length
- Valid check digit

Code 128:
- Support alphanumeric data

Code 39:
- Validate supported characters

ITF-14:
- Validate correct structure/check digit

QR:
- Support configurable data payload

Do not treat all barcode types as the same.

============================================================
8. GS1 SEPARATION
============================================================

Create a clear distinction:

INTERNAL CUSTOM BARCODE

versus

GS1 / GTIN IDENTIFIER

Do not claim that an arbitrary internally generated number is a globally
valid GS1 GTIN.

GS1 GTINs use formal allocation rules and check digits.
GS1 explains that a GTIN identifies a trade item and that one GTIN is
assigned to one product. :contentReference[oaicite:1]{index=1}

UI:

Barcode Source:

[ Internal Custom ]
[ Existing GS1 / EAN / UPC ]
[ GS1 Identifier ]

If GS1 functionality is implemented, require the appropriate
company prefix/configuration.

Do not invent fake GS1 numbers.

============================================================
9. BARCODE GENERATOR
============================================================

Create a professional barcode generator.

Modes:

A. Single Barcode
B. Bulk Barcode
C. Product Barcode
D. Custom Barcode
E. Sequential Barcode
F. Imported Barcode

Allow:

- Prefix
- Suffix
- Starting number
- Ending number
- Quantity
- Random generation
- Sequential generation
- Product-based generation

Example:

Prefix:
TOY

Start:
100001

Quantity:
100

Generate:

TOY100001
TOY100002
...
TOY100100

Before saving:

CHECK EVERY GENERATED BARCODE AGAINST DATABASE.

============================================================
10. BARCODE LABEL DESIGNER
============================================================

Create a professional label designer.

Default:

Print Standard:
1-Up Roll Sticker

Sticker:
1.4 × 1.0 inch

Barcode:
Top

Orientation:
Vertical

Vertical Gap:
3 mm

Top Margin:
3 mm

Horizontal Gap:
3 mm

Border:
OFF

Allow customization:

- Label width
- Label height
- Margins
- Gaps
- Barcode position
- Barcode size
- Barcode orientation
- Barcode number
- Product name
- MRP
- Selling price
- GST
- HSN
- SKU
- Logo
- Custom text
- Font
- Alignment
- Border
- Padding

Provide:

LIVE PREVIEW

and:

PRINT TEST LABEL

============================================================
11. BARCODE QUALITY
============================================================

Do not optimize barcode labels only for appearance.

Preserve:

- Quiet zone
- Correct symbol proportions
- Appropriate X-dimension
- Correct height
- Contrast
- Print resolution
- Scanner compatibility

GS1 specifically recommends considering the scanning environment,
printing process, symbol size, quiet zones and barcode quality. :contentReference[oaicite:2]{index=2}

Do not allow arbitrary UI settings to silently create an invalid or
unreliably scannable barcode.

Provide warnings where appropriate.

============================================================
12. PRODUCT IMPORT
============================================================

Support:

- XLSX
- XLS
- CSV

Expected fields:

Item Number
Item Name
HSN/SAC
MRP
Quantity
Price/Unit
GST Amount
GST Rate
Amount

Example:

14378278
2.4 WIRELESS VIDEOGAME BLUE 9503
9503
4999
2
1499
285.62
5%
2998

14378082
4IN1 GAMES
9503
399
15
249
285
5%
3735

============================================================
13. IMPORT ENGINE
============================================================

Build a professional import wizard.

Step 1:
Upload file.

Step 2:
Detect columns.

Step 3:
Map columns.

Step 4:
Validate rows.

Step 5:
Preview.

Step 6:
Import.

Step 7:
Show final result.

Display:

Total Rows
Valid Rows
Invalid Rows
Duplicate Rows
Existing Products
New Products
Updated Products

Example:

1,250 total

1,190 valid
35 invalid
15 duplicate
10 existing

Allow:

Import Valid Rows

Download Error Report

============================================================
14. IMPORT VALIDATION
============================================================

Validate:

- Barcode
- Product name
- HSN/SAC
- MRP
- Quantity
- Price
- GST
- Amount
- Duplicate barcode
- Existing barcode
- Invalid values

Do not silently import invalid data.

============================================================
15. FINANCIAL CALCULATIONS
============================================================

All financial calculations must be handled through centralized
backend business logic.

Do not trust frontend calculations.

Calculate:

Quantity × Unit Price = Amount

Then:

Subtotal
Discount
GST
Round-off
Grand Total

Use a proper monetary/decimal strategy.

Avoid unsafe floating-point arithmetic.

All invoice calculations must be reproducible.

============================================================
16. INVENTORY
============================================================

Build inventory as a proper domain.

Track:

- Opening Stock
- Purchase
- Sale
- Return
- Adjustment
- Damage
- Transfer
- Closing Stock

Create an immutable inventory transaction ledger.

Example:

SALE:

Product:
14378278

Quantity:
2

Stock:

Before: 10
After: 8

Do not simply overwrite quantity without recording the transaction.

============================================================
17. SCANNER
============================================================

Support:

1. Camera scanner
2. USB barcode scanner
3. Bluetooth scanner
4. Keyboard/HID scanner

Scanner workflow:

SCAN
 ↓
VALIDATE
 ↓
FIND BARCODE
 ↓
FIND PRODUCT
 ↓
ADD TO CART

Barcode lookup must be highly optimized.

Exact barcode search should use an indexed database field.

============================================================
18. UNKNOWN BARCODE
============================================================

If barcode does not exist:

Show:

"Barcode Not Found"

Actions:

[Create Product]
[Assign Barcode]
[Search Product]
[Scan Again]

Do not simply show a generic error.

============================================================
19. POS BILLING
============================================================

Create a professional POS screen.

Layout:

LEFT:
- Scanner
- Search
- Product results
- Categories

RIGHT:
- Cart
- Quantity
- Price
- Discount
- GST
- Total

Bottom:
- Payment
- Customer
- Generate Invoice

Optimize for speed.

The operator should be able to complete a bill with minimal clicks.

============================================================
20. CART
============================================================

Cart item:

- Product ID
- Barcode
- Product name
- HSN/SAC
- MRP
- Selling price
- Quantity
- Discount
- GST
- Line total

If the same barcode is scanned repeatedly:

Increase quantity.

Do not create unnecessary duplicate lines.

============================================================
21. CUSTOMER
============================================================

Customer fields:

- Customer ID
- Name
- Mobile
- Email
- Address
- GSTIN
- Company Name
- Notes

Allow:

- Quick customer
- Existing customer
- Walk-in customer

============================================================
22. PAYMENT
============================================================

Support configurable payment methods:

- Cash
- Card
- UPI
- Bank Transfer
- Other

Payment record:

- Amount
- Method
- Status
- Reference
- Date
- Created By

Support:

Paid
Partial
Pending
Failed
Refunded

Do not mark a payment successful merely because the frontend says so.

============================================================
23. INVOICE
============================================================

Generate professional invoices.

Include:

- Company logo
- Company name
- Address
- Contact
- GST information
- Invoice number
- Invoice date
- Customer
- Items
- HSN/SAC
- Quantity
- Unit price
- Discount
- GST
- Total
- Payment method
- Payment status
- Terms
- Authorized signature

Support:

- Preview
- Print
- PDF
- Download
- Reprint

============================================================
24. INVOICE NUMBERING
============================================================

Invoice numbering must be:

- Unique
- Collision-safe
- Sequential according to configured rules
- Transaction-safe

Never generate invoice numbers purely in frontend JavaScript.

Support configurable:

Prefix
Financial year
Sequence

Example:

INV/2026-27/000001

============================================================
25. HISTORICAL SNAPSHOT
============================================================

Invoice items must store a snapshot.

Do NOT dynamically retrieve old invoice prices from Product Master.

Example:

Invoice created:

Product:
4IN1 GAMES

Price:
249

Later product price becomes:

299

Old invoice must still show:

249

Store historical invoice item values.

============================================================
26. BILLING HISTORY
============================================================

Create:

Billing History

Columns:

Invoice Number
Date
Customer
Items
Amount
Payment Status
Payment Method
Created By
Status

Filters:

- Date
- Customer
- Invoice
- Payment status
- Payment method
- Amount
- User

Actions:

View
Print
Download
Reprint
Cancel/Void
Audit

============================================================
27. BARCODE HISTORY
============================================================

Track:

Barcode
Product
Barcode Type
Source
Created By
Created At
Print Count
Last Printed
Status

Never destroy important barcode history.

============================================================
28. AUDIT LOG
============================================================

Create immutable audit logs.

Track:

User
Action
Entity
Entity ID
Old Value
New Value
Timestamp
IP where appropriate
Request ID

Track:

- Product creation
- Product update
- Barcode creation
- Barcode replacement
- Barcode deletion/deactivation
- Price changes
- GST changes
- Inventory adjustments
- Invoice creation
- Invoice cancellation
- Payment changes
- Print operations
- Settings changes
- User/role changes

============================================================
29. USER MANAGEMENT
============================================================

Implement RBAC.

Roles:

SUPER_ADMIN
ADMIN
MANAGER
BILLING_OPERATOR
INVENTORY_MANAGER
BARCODE_OPERATOR
VIEWER

Permissions should be granular.

Examples:

product:create
product:update
product:delete

barcode:create
barcode:print
barcode:delete

billing:create
billing:cancel

invoice:view
invoice:download

inventory:update

report:view

settings:update

============================================================
30. SECURITY
============================================================

Security must be Secure-by-Design.

Follow OWASP secure-by-design principles rather than adding security
at the end of development. :contentReference[oaicite:3]{index=3}

Implement:

- Authentication
- Authorization
- RBAC
- Input validation
- Output encoding
- Rate limiting
- Secure headers
- CORS configuration
- Request size limits
- API abuse protection
- Audit logging
- Secret management
- Secure cookies/token handling
- Password hashing
- Session management
- File validation
- Upload limits

Never expose:

- Database errors
- Stack traces
- Secrets
- Tokens
- Internal paths
- Sensitive information

============================================================
31. DATABASE ARCHITECTURE
============================================================

Use a properly normalized domain model.

Core entities:

User
Role
Permission

Product
ProductCategory
Brand

Barcode
BarcodeAssignment
BarcodeTemplate
PrintPreset
PrintJob

InventoryTransaction
StockAdjustment

Customer

Cart
Invoice
InvoiceItem
Payment

AuditLog

SystemSetting

Use:

- Proper indexes
- Unique constraints
- Foreign keys/references
- Transactions
- Soft delete where appropriate
- CreatedAt
- UpdatedAt

============================================================
32. DATABASE INDEXES
============================================================

At minimum evaluate indexes for:

barcodeNumber
SKU
itemNumber
productName
invoiceNumber
customerId
invoiceDate
paymentStatus
productId
createdAt

Do not add indexes blindly.

Review query patterns first.

============================================================
33. API ARCHITECTURE
============================================================

Use consistent REST APIs or the existing project's API convention.

Example:

/api/v1/products
/api/v1/barcodes
/api/v1/barcode-templates
/api/v1/print
/api/v1/scanner
/api/v1/inventory
/api/v1/customers
/api/v1/cart
/api/v1/invoices
/api/v1/payments
/api/v1/reports
/api/v1/audit
/api/v1/settings
/api/v1/users

Use:

- Request validation
- Response schemas
- Pagination
- Filtering
- Sorting
- Authorization
- Consistent errors

============================================================
34. API ERROR FORMAT
============================================================

Every API error should have a predictable structure.

Example:

{
  "success": false,
  "error": {
    "code": "BARCODE_ALREADY_EXISTS",
    "message": "Barcode already assigned",
    "details": {}
  },
  "requestId": "..."
}

Do not return random error structures from different APIs.

============================================================
35. IDEMPOTENCY
============================================================

Financial and state-changing operations should be idempotent where
appropriate.

Especially:

- Invoice creation
- Payment creation
- Inventory transactions
- Bulk barcode generation

Prevent duplicate invoice creation due to:

- Double click
- Network retry
- Request retry
- Browser refresh

============================================================
36. TRANSACTIONS
============================================================

Use database transactions for operations that must remain atomic.

Example:

CREATE INVOICE

must safely coordinate:

Invoice
+
Invoice Items
+
Payment
+
Inventory Transaction

If one critical operation fails, do not leave inconsistent records.

============================================================
37. FRONTEND ARCHITECTURE
============================================================

Build reusable components.

Avoid:

- Giant components
- Giant pages
- Business logic inside UI
- Duplicate forms
- Duplicate tables
- Duplicate API logic

Create reusable:

DataTable
Search
Filter
Modal
Drawer
Form
CurrencyInput
BarcodePreview
BarcodeDesigner
ProductSelector
Scanner
Cart
PaymentDialog
InvoicePreview
PrintPreview

============================================================
38. UI DESIGN
============================================================

Use UI/UX Pro Max principles.

Visual direction:

Premium
Minimal
Professional
Fast
Clean
Modern
Commercial

Avoid:

- Excessive gradients
- Excessive animations
- Huge cards
- Unnecessary decoration
- Too many colors
- Cluttered dashboards

Focus on:

Hierarchy
Spacing
Typography
Accessibility
Consistency
Speed

============================================================
39. DESIGN SYSTEM
============================================================

Create a proper design system.

Define:

- Colors
- Typography
- Spacing
- Radius
- Shadows
- Buttons
- Inputs
- Tables
- Badges
- Modals
- Dropdowns
- Toasts
- Empty states
- Loading states
- Error states

Use design tokens.

Do not hardcode random styles throughout the application.

============================================================
40. DASHBOARD
============================================================

Create a useful operational dashboard.

Show:

Today's Sales
Today's Bills
Today's Revenue
Pending Payments
Low Stock
Top Products
Recent Bills
Recent Barcode Activity
Inventory Value
Sales Trend

Do not create meaningless charts.

Every metric should help the user make a decision.

============================================================
41. REPORTING
============================================================

Create reports:

Sales Report
Product Sales
GST Report
Inventory Report
Stock Movement
Barcode Report
Payment Report
Customer Report
Profit Report if cost data exists

Support:

Date range
Export
CSV
Excel
PDF where appropriate

============================================================
42. SEARCH
============================================================

Global search should support:

Barcode
Product
SKU
Item number
Invoice
Customer

Barcode search must be exact and fast.

Product search can support fuzzy/partial search.

============================================================
43. KEYBOARD-FIRST POS
============================================================

Support:

F2 Search
F4 Scanner
F8 Payment
Ctrl+P Print
Esc Close
Enter Confirm

Allow customization later.

POS should work efficiently without constant mouse usage.

============================================================
44. RESPONSIVE DESIGN
============================================================

Support:

Desktop
Laptop
Tablet
Mobile

POS desktop should be optimized for:

1366×768
1440×900
1920×1080

Do not simply shrink desktop UI for mobile.

============================================================
45. ACCESSIBILITY
============================================================

Follow accessibility best practices.

Support:

Keyboard navigation
Focus states
Screen reader labels
Accessible forms
Color contrast
Error announcements
ARIA where required

============================================================
46. PERFORMANCE
============================================================

The system must remain fast with:

10,000+ products
100,000+ barcodes
100,000+ invoices
Large inventory history

Use:

- Pagination
- Server-side filtering
- Indexed queries
- Debounced search
- Lazy loading
- Virtualized tables when needed
- Background processing
- Efficient PDF generation

Never load the entire database into the frontend.

============================================================
47. OBSERVABILITY
============================================================

Implement production-grade observability.

Include:

- Structured logs
- Request ID
- Error ID
- API timing
- Database timing
- Failed operations
- Audit logs

Every production error should be traceable.

============================================================
48. BACKGROUND JOBS
============================================================

Use background jobs when operations become expensive.

Examples:

Bulk barcode generation
Large PDF generation
Large invoice export
Excel export
Report generation
Large print jobs

Do not block API requests unnecessarily.

============================================================
49. CACHING
============================================================

Use caching only where justified.

Potential candidates:

Product lookup
Settings
Barcode templates
Categories
Brands

Do not introduce Redis or another cache simply because it is popular.

Measure/query first.

============================================================
50. TESTING
============================================================

Build a serious testing strategy.

Unit tests:

- Barcode validation
- Check digits
- Price calculation
- GST
- Discount
- Invoice totals
- Inventory calculations
- Invoice numbering

Integration:

- Product → Barcode
- Barcode → Scanner
- Scanner → Cart
- Cart → Invoice
- Invoice → Payment
- Invoice → Inventory

E2E:

1. Import product
2. Assign barcode
3. Generate label
4. Print
5. Scan
6. Add to cart
7. Pay
8. Generate invoice
9. Search invoice
10. Reprint

============================================================
51. FAILURE TESTING
============================================================

Test:

- Duplicate barcode
- Duplicate invoice
- Duplicate payment
- Invalid GST
- Invalid product
- Unknown barcode
- Network failure
- Database failure
- PDF failure
- Printer failure
- Scanner failure
- Concurrent billing
- Concurrent barcode generation

============================================================
52. DATA MIGRATION
============================================================

If an older system exists:

Do NOT blindly replace the database.

Create:

- Migration scripts
- Data validation
- Backup
- Rollback strategy
- Duplicate detection
- Mapping
- Migration report

Before migration:

BACKUP DATABASE

After migration:

VERIFY:

Product count
Barcode count
Duplicate count
Invoice count
Inventory count

============================================================
53. PRINT ENGINE
============================================================

Create a dedicated print engine.

Support:

- Roll labels
- Sheet labels
- PDF
- Browser printing
- Printer-specific settings where possible

Default:

1-Up
1.4 × 1.0 inch

But architecture must support future sizes.

============================================================
54. PRINT PRESETS
============================================================

Users can save:

"My 1.4x1 Roll"
"My Retail Label"
"My Toy Label"
"My Warehouse Label"

Preset contains:

- Dimensions
- Margins
- Gaps
- Barcode settings
- Product fields
- Typography
- Border
- Alignment

============================================================
55. BILLING UX
============================================================

Optimize the most common flow:

SCAN
↓
PRODUCT
↓
QUANTITY
↓
TOTAL
↓
PAYMENT
↓
INVOICE

This should be extremely fast.

Use visual confirmation after successful scans.

Example:

✓ 4IN1 GAMES added

Qty: 2

Total: ₹498

============================================================
56. INVENTORY SAFETY
============================================================

Do not allow stock to become negative unless explicitly configured.

If stock is insufficient:

Show:

"Only 3 units available."

Allow:

[Cancel]
[Sell Anyway]

only if the user's permission allows it.

============================================================
57. RETURNS
============================================================

Architect for future returns.

Support:

Invoice
↓
Return
↓
Refund
↓
Inventory Restock

Do not implement irreversible financial logic that prevents future return support.

============================================================
58. VOID/CANCEL
============================================================

Invoices should not simply be deleted.

Use:

ACTIVE
CANCELLED
VOID
REFUNDED

with audit history.

Financial records should remain traceable.

============================================================
59. SETTINGS
============================================================

Create centralized Settings.

Categories:

General
Company
Tax
Barcode
Printing
Invoice
Payment
Inventory
Users
Security

Do not hardcode business configuration.

============================================================
60. COMPANY SETTINGS
============================================================

Allow:

Company Name
Logo
Address
Phone
Email
Website
GSTIN
Tax details
Invoice prefix
Invoice numbering
Terms
Signature

============================================================
61. SECURITY SETTINGS
============================================================

Support:

Session timeout
Password policies
Login protection
Role permissions
Audit retention
API access policies

============================================================
62. EXPORT
============================================================

Support export:

Products
Barcodes
Inventory
Invoices
Payments
Customers
Reports

Formats:

CSV
XLSX
PDF where useful

Large exports should use background jobs.

============================================================
63. BACKUP & RECOVERY
============================================================

Production must include:

Database backup
Backup verification
Restore procedure
Retention policy
Disaster recovery plan

Never consider backup complete until restore has been tested.

============================================================
64. DEPLOYMENT
============================================================

Prepare:

Development
UAT
Production

Environment configuration:

.env
.env.example

Never commit secrets.

Use:

- CI/CD
- Automated tests
- Build validation
- Database migration process
- Rollback process

============================================================
65. CI/CD
============================================================

Pipeline:

Lint
↓
Type Check
↓
Unit Tests
↓
Integration Tests
↓
Build
↓
Security Scan
↓
Deploy UAT
↓
Smoke Tests
↓
Production Approval
↓
Production Deploy

============================================================
66. DOCUMENTATION
============================================================

Create:

README
Architecture Documentation
API Documentation
Database Documentation
Deployment Guide
Environment Variables
Migration Guide
Barcode Guide
Printing Guide
Billing Guide
Troubleshooting Guide

============================================================
67. PROJECT STRUCTURE
============================================================

Use a clean modular structure.

Example:

src/

  modules/

    auth/
    users/

    products/
    categories/
    brands/

    barcodes/
    barcode-templates/

    printing/
    scanner/

    inventory/

    customers/

    cart/
    billing/
    invoices/
    payments/

    reports/
    audit/

    settings/

  shared/

    components/
    services/
    utils/
    validators/
    constants/
    types/

  infrastructure/

    database/
    logging/
    queues/
    storage/

Keep modules independent.

Do not create a giant utils folder containing unrelated business logic.

============================================================
68. CODE QUALITY
============================================================

Enforce:

Strong typing
Clear naming
Small functions
Small components
Reusable abstractions
Consistent error handling
No dead code
No unnecessary dependencies
No duplicated business logic
No magic numbers
No hardcoded secrets

============================================================
69. BUSINESS LOGIC LOCATION
============================================================

Frontend:

UI
Interaction
Presentation
Client state

Backend:

Validation
Pricing
GST
Inventory
Barcode uniqueness
Invoice numbering
Payments
Authorization
Business rules

Database:

Persistence
Constraints
Indexes

Never trust frontend calculations for financial operations.

============================================================
70. API VERSIONING
============================================================

Use:

/api/v1/

Prepare architecture for:

/api/v2/

without breaking clients.

============================================================
71. FUTURE EXTENSIBILITY
============================================================

Design architecture to support future:

Multi-store
Multi-warehouse
Multi-company
Multi-user
Multi-currency
Multi-language
Purchase orders
Suppliers
Stock transfers
Returns
Credit notes
Debit notes
Accounting integration
WhatsApp invoice sharing
Email invoices
Online payments
E-commerce integration
Marketplace integration
GS1 integration
2D barcode support

Do not implement all of these now unless required.

But do not architect the current system in a way that makes them impossible.

============================================================
72. IMPORTANT BARCODE STANDARD RULE
============================================================

The barcode system must support both:

INTERNAL BUSINESS IDENTIFIERS

and

STANDARDIZED IDENTIFIERS.

GS1 describes UPC/EAN as common retail barcodes and GS1-128/ITF-14
for distribution/logistics use cases. Select symbologies according to
actual business/scanning requirements. :contentReference[oaicite:4]{index=4}

Do not call every generated barcode a "GS1 barcode".

============================================================
73. UI PAGES
============================================================

Create:

Dashboard

Products
 ├── Product List
 ├── Add Product
 ├── Edit Product
 ├── Product Details
 ├── Import Products
 └── Product History

Barcodes
 ├── Barcode List
 ├── Generate Barcode
 ├── Bulk Generate
 ├── Barcode Designer
 ├── Templates
 └── Print History

Scanner

Billing / POS

Customers

Invoices
 ├── Invoice List
 ├── Invoice Details
 └── Invoice Preview

Inventory
 ├── Stock
 ├── Stock Movement
 ├── Adjustments
 └── Low Stock

Reports

Users

Audit Logs

Settings

============================================================
74. DASHBOARD UX
============================================================

Do not make dashboard decorative.

Show operational information:

Today's Revenue
Today's Bills
Pending Payments
Low Stock
Top Products
Recent Invoices
Barcode Activity
Inventory Alerts

Allow quick actions:

[New Product]
[Generate Barcode]
[Scan]
[New Bill]
[Import Products]

============================================================
75. EMPTY STATES
============================================================

Every page needs a useful empty state.

Example:

No Products

"Import your product sheet or create your first product."

[Import Products]
[Create Product]

============================================================
76. LOADING STATES
============================================================

Never leave users staring at blank screens.

Use:

Skeletons
Progress indicators
Upload progress
PDF generation progress
Bulk generation progress

============================================================
77. ERROR STATES
============================================================

Every error must explain:

What happened
Why it happened
What the user can do

Bad:

"Error 500"

Good:

"Invoice could not be generated because the PDF service failed.
Please retry."

============================================================
78. CONFIRMATION
============================================================

Dangerous actions require confirmation.

Examples:

Delete Product
Deactivate Barcode
Cancel Invoice
Stock Adjustment
Delete Template

Show consequences.

============================================================
79. SEARCH AND FILTER EXPERIENCE
============================================================

Search should feel instant.

Filters should be:

- Clear
- Persistent
- Shareable where useful
- Resettable

Support saved filters if useful.

============================================================
80. RESPONSIVENESS
============================================================

Do not sacrifice usability for responsiveness.

Desktop:
Full POS experience.

Tablet:
Optimized touch interface.

Mobile:
Scanner, product lookup, inventory, invoice viewing.

============================================================
81. PERFORMANCE TARGET
============================================================

Target:

Fast initial load
Fast product search
Fast barcode lookup
Fast scan response
Fast cart updates
Fast invoice preview

Avoid unnecessary API requests.

Use request cancellation and debouncing where appropriate.

============================================================
82. FINAL QUALITY BAR
============================================================

The system should satisfy:

Security
Reliability
Scalability
Maintainability
Performance
Accessibility
Observability
Testability
Usability

Do not declare "production ready" simply because the application builds.

Production readiness requires:

Functional testing
Security testing
Performance testing
Failure testing
Data integrity testing
Backup/restore testing
Deployment testing

============================================================
83. IMPLEMENTATION PROCESS
============================================================

PHASE 0
Discovery

PHASE 1
Architecture

PHASE 2
Database

PHASE 3
Backend foundation

PHASE 4
Product Master

PHASE 5
Barcode Engine

PHASE 6
Print Engine

PHASE 7
Scanner

PHASE 8
Inventory

PHASE 9
POS Billing

PHASE 10
Payments

PHASE 11
Invoices

PHASE 12
History & Audit

PHASE 13
Reports

PHASE 14
Security

PHASE 15
Testing

PHASE 16
Performance

PHASE 17
UI/UX Polish

PHASE 18
CI/CD

PHASE 19
Production Deployment

============================================================
84. BEFORE CODING
============================================================

First provide:

1. System architecture
2. Module architecture
3. Database ERD
4. API architecture
5. Frontend architecture
6. User roles
7. Permission matrix
8. Product workflow
9. Barcode workflow
10. Printing workflow
11. Scanner workflow
12. Billing workflow
13. Invoice workflow
14. Inventory workflow
15. Audit workflow
16. Deployment architecture
17. Testing architecture

Then identify:

P0 — Critical
P1 — Required
P2 — Recommended
P3 — Future

============================================================
85. AFTER CODING
============================================================

Run:

Lint
Type check
Unit tests
Integration tests
E2E tests
Security checks
Build
Performance checks

Then perform a manual QA review of:

Product creation
Product import
Barcode generation
Barcode uniqueness
Barcode printing
Scanner
Billing
GST
Payment
Invoice
Inventory
History
Permissions
Audit logs

============================================================
86. FINAL ACCEPTANCE TEST
============================================================

The following complete flow MUST work:

IMPORT PRODUCT

↓

14378278
2.4 WIRELESS VIDEOGAME BLUE 9503
HSN 9503
MRP ₹4999
Qty 2
Price ₹1499
GST 5%

↓

VALIDATE

↓

ASSIGN UNIQUE BARCODE

↓

GENERATE LABEL

↓

1.4 × 1.0 INCH
1-UP ROLL
TOP BARCODE
VERTICAL
3mm VERTICAL GAP
3mm TOP MARGIN
3mm HORIZONTAL GAP
NO BORDER

↓

PRINT

↓

SCAN 14378278

↓

PRODUCT FOUND

↓

ADD TO CART

↓

QTY 2

↓

CALCULATE

₹1499 × 2 = ₹2998

↓

GST

↓

PAYMENT

↓

GENERATE INVOICE

↓

SAVE INVOICE

↓

SAVE INVENTORY TRANSACTION

↓

SAVE PAYMENT

↓

SAVE AUDIT LOG

↓

SHOW IN BILLING HISTORY

↓

ALLOW REPRINT

This complete flow must be tested end-to-end.

============================================================
87. GOLDEN RULES
============================================================

1. Never guess the business logic.
2. Never duplicate barcode numbers.
3. Never trust frontend financial calculations.
4. Never delete financial history.
5. Never expose sensitive errors.
6. Never hardcode configurable business rules.
7. Never create unnecessary architecture.
8. Never sacrifice usability for technical complexity.
9. Never sacrifice security for speed.
10. Never sacrifice data integrity for convenience.
11. Never introduce a dependency without justification.
12. Never rewrite working code without a reason.
13. Always use database constraints for critical uniqueness.
14. Always validate server-side.
15. Always maintain auditability.
16. Always test failure cases.
17. Always make the common workflow fast.
18. Always design for future extensibility.
19. Always document architectural decisions.
20. Do not call the system production-ready until it has actually passed
    functional, security, performance, data-integrity and deployment tests.

============================================================
FINAL OBJECTIVE
============================================================

Build SYSTEM 2.0 as a professional, scalable, secure, maintainable,
high-performance commercial software product.

It should not look or behave like:

"another CRUD admin panel."

It should feel like a polished:

Retail POS
+
Inventory System
+
Barcode Management Platform
+
Label Printing System
+
Billing & Invoice Platform

with enterprise-grade architecture and an exceptionally clean UX.

Think like a Principal Engineer at a top technology company.

Think about:

Architecture before code.
Data integrity before convenience.
Security before deployment.
UX before complexity.
Performance before scale problems.
Testing before claiming completion.

Build it correctly from the foundation.