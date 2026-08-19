# MASTER PROMPT — FAANG-LEVEL BULK BARCODE LABEL GENERATOR

## 1. ROLE

Act as a **FAANG-level Principal Software Architect, Senior Full-Stack Engineer, Product Designer, QA Engineer, PDF/Printing Engineer, and Security Engineer**.

You are responsible for designing and implementing a production-grade web application for generating **high-accuracy printable barcode labels from Excel files**.

The application must prioritize:

1. Printing accuracy
2. Barcode scannability
3. Zero data corruption
4. Fast bulk processing
5. Excellent UX
6. Strong validation
7. Reliable PDF generation
8. Unique barcode generation
9. Audit/history
10. Maintainable architecture

Do not create a toy/demo application.

Build this as a real production-quality system.

---

# 2. PRODUCT OBJECTIVE

Build a web application called:

**Barcode Label Generator**

The application allows a user to:

1. Upload an Excel file.
2. Validate the Excel data.
3. Preview the imported products.
4. Automatically generate unique 8-digit barcode IDs.
5. Generate Code 128 barcodes.
6. Generate printable labels.
7. Export labels as a PDF.
8. Print labels accurately at physical size.
9. Track generated batches.
10. Reprint previously generated labels.
11. Search previously generated barcode records.
12. Download/import Excel templates.
13. Configure label and branding settings.

Primary label size:

**50 mm width × 25 mm height**

---

# 3. REFERENCE DESIGN

Use the uploaded reference image as the visual and functional inspiration.

The reference label contains approximately:

* Product name at the top
* Barcode in the center
* Unique product/barcode number
* Net Quantity
* MRP
* Sales Price
* Website/contact information
* Compact retail packaging label design

Do NOT blindly copy the image.

Create a cleaner, sharper, professionally typeset version while preserving the same information hierarchy.

The output must be optimized for:

* small physical labels
* barcode scanning
* readability
* thermal/label printers
* standard PDF printing

---

# 4. DEFAULT LABEL SPECIFICATION

Label:

```text
Width: 50 mm
Height: 25 mm
```

Orientation:

```text
Landscape
```

Default layout:

```text
┌──────────────────────────────────────────┐
│ PRODUCT NAME                              │
│                                          │
│           BARCODE                        │
│           58310472                       │
│                                          │
│ NET QUANTITY: 1U     MRP: ₹1599/-        │
│ SALES PRICE: ₹1020/-                     │
│ https://runrkids.in/                     │
└──────────────────────────────────────────┘
```

The exact typography and spacing should be optimized to fit within the 50 × 25 mm physical boundary.

No content may overflow.

---

# 5. BARCODE REQUIREMENT

Use:

**Code 128**

The barcode value must be an exactly:

```text
8-digit numeric code
```

Examples:

```text
00000001
00000002
00000003
58310472
29481763
73190524
```

The human-readable 8-digit value must appear below the barcode.

The barcode and displayed number must always match exactly.

Never generate a barcode whose displayed value differs from the encoded value.

---

# 6. UNIQUE BARCODE GENERATION

Implement a robust unique ID system.

NEVER use insecure random generation alone.

The system must guarantee uniqueness.

Requirements:

* 8 digits
* Numeric only
* Leading zeros allowed
* Never reuse previously issued IDs
* Database-level uniqueness constraint
* Safe concurrent generation
* Transaction-safe generation
* No duplicate codes even if two users generate labels simultaneously

Preferred implementation:

```text
Atomic database sequence/counter
```

converted to an 8-digit zero-padded number.

Example:

```text
1       → 00000001
25      → 00000025
12345   → 00012345
```

If the system reaches:

```text
99999999
```

stop generation and show a clear error.

Never silently wrap around to:

```text
00000000
```

---

# 7. EXCEL INPUT

Support:

```text
.xlsx
.xls
.csv
```

Initial recommended Excel columns:

```text
Product Name
MRP
Sales Price
Quantity
```

Example:

| Product Name       |  MRP | Sales Price | Quantity |
| ------------------ | ---: | ----------: | -------: |
| Steering Wheel 868 | 1599 |        1020 |       10 |
| Racing Car 505     | 1499 |        1199 |       20 |
| Remote Car 202     |  999 |         799 |        5 |

---

# 8. QUANTITY BEHAVIOR

Quantity represents:

**number of labels to generate**

Example:

```text
Steering Wheel 868
MRP: 1599
Sales Price: 1020
Quantity: 3
```

must generate:

```text
Steering Wheel 868 → Barcode A
Steering Wheel 868 → Barcode B
Steering Wheel 868 → Barcode C
```

Every physical label must have a unique barcode.

Do not reuse the same barcode for multiple labels unless the user explicitly selects a future "duplicate barcode" mode.

Default behavior:

**Every label gets a unique barcode.**

---

# 9. EXCEL VALIDATION

Do not immediately generate a PDF after upload.

Use this workflow:

```text
Upload
↓
Parse
↓
Validate
↓
Show Preview
↓
User Confirmation
↓
Reserve Barcode IDs
↓
Generate PDF
```

Validate:

### Product Name

* Required
* String
* Trim whitespace
* Reject empty values
* Maximum sensible character length
* Handle Unicode safely

### MRP

* Required
* Numeric
* Must be greater than 0

### Sales Price

* Required
* Numeric
* Must be greater than 0
* Should normally be <= MRP
* If Sales Price > MRP, show warning/error according to configuration

### Quantity

* Required
* Integer
* Greater than 0
* Apply configurable maximum batch limit

---

# 10. VALIDATION UI

If validation fails, show a clear error report.

Example:

```text
3 errors found

Row 12
Sales Price is missing

Row 18
MRP must be greater than 0

Row 24
Quantity must be a positive integer
```

Allow:

```text
Download Error Report
```

Do not generate a PDF when fatal validation errors exist.

---

# 11. EXCEL TEMPLATE

Provide:

**Download Excel Template**

Template:

```text
Product Name | MRP | Sales Price | Quantity
```

Also provide one example row.

The template should include instructions explaining each column.

---

# 12. DASHBOARD

Create a clean modern dashboard.

Show:

```text
Total Labels Generated
Today's Labels
Total Products
Total Barcodes Issued
Recent Batches
```

Example cards:

```text
12,540
Total Labels

1,240
Today

438
Products

12,540
Barcodes Issued
```

Keep the dashboard minimal.

Avoid unnecessary charts.

---

# 13. MAIN GENERATION PAGE

The primary screen should be extremely simple.

Layout:

```text
Barcode Generator

[ Upload Excel ]

or

Drag & Drop Excel File Here

Supported:
.xlsx .xls .csv

[ Download Template ]
```

After upload:

```text
File: products.xlsx

Rows: 152
Products: 152
Labels to Generate: 2,480

Valid: 2,475
Warnings: 5
Errors: 0

[ Preview Labels ]
[ Generate PDF ]
```

---

# 14. PRODUCT PREVIEW

Before PDF generation show a table:

| Row | Product            |   MRP | Sale Price | Qty | Labels | Status |
| --- | ------------------ | ----: | ---------: | --: | -----: | ------ |
| 1   | Steering Wheel 868 | ₹1599 |      ₹1020 |  10 |     10 | Valid  |

Provide:

* Search
* Filter
* Sort
* Pagination
* Error highlighting

---

# 15. LABEL PREVIEW

Create a real-time label preview.

Show the actual:

```text
50 mm × 25 mm
```

proportionally.

The preview must represent the final PDF layout.

Do not use a fake approximation.

Allow:

```text
Zoom +
Zoom -
Fit
100%
```

---

# 16. LABEL CONTENT

Default label content:

### Line 1

Product Name

### Center

Code 128 barcode

### Below barcode

8-digit barcode number

### Information row

```text
NET QUANTITY: 1U
MRP: ₹1599/-
```

### Next line

```text
SALES PRICE: ₹1020/-
```

### Footer

```text
https://runrkids.in/
```

---

# 17. NET QUANTITY

Default:

```text
1U
```

The application should make this configurable.

Possible future Excel column:

```text
Net Quantity
```

If no value is provided:

```text
1U
```

must be used.

---

# 18. WEBSITE

Default:

```text
https://runrkids.in/
```

Do not hard-code the value throughout the codebase.

Store it in configuration/settings.

Allow administrators to change it.

---

# 19. PRICE FORMATTING

Input:

```text
1599
```

Output:

```text
MRP: ₹1599/-
```

Input:

```text
1020
```

Output:

```text
SALES PRICE: ₹1020/-
```

Handle:

```text
1599.00
1599
1599.5
```

according to configured currency/decimal rules.

Default currency:

```text
INR
```

Use proper Unicode/font support for:

```text
₹
```

---

# 20. PDF GENERATION — CRITICAL

This is one of the most important requirements.

The PDF must use **physical dimensions**, not browser pixels.

One-label mode:

```text
PDF page width  = 50 mm
PDF page height = 25 mm
```

Every label must be exactly:

```text
50 × 25 mm
```

Do not automatically scale the label to fit an arbitrary page.

The PDF must preserve:

* exact dimensions
* barcode dimensions
* typography
* margins
* spacing
* positioning

When printed at:

```text
100% / Actual Size
```

the physical label must remain:

```text
50 × 25 mm
```

---

# 21. A4 SHEET MODE

Also support:

**A4 Multi-Label PDF**

A4:

```text
210 × 297 mm
```

Allow configuration:

```text
Top Margin
Left Margin
Horizontal Gap
Vertical Gap
Rows
Columns
```

Calculate all positions mathematically.

Never use browser screenshots to create the final PDF.

---

# 22. PRINT CALIBRATION

Create:

**Printer Calibration**

Allow:

```text
Horizontal Offset
Vertical Offset
Scale
```

Example:

```text
Horizontal: 0.0 mm
Vertical:   0.0 mm
Scale:      100%
```

Provide:

**Print Test Label**

The test page must include:

```text
50 mm
25 mm
```

measurement references.

---

# 23. PDF OPTIONS

Before generating PDF:

```text
Label Size
○ 50 × 25 mm

PDF Mode
○ One Label Per Page
○ A4 Sheet

Barcode
○ Code 128

Quantity
○ From Excel

Website
[ https://runrkids.in/ ]

Net Quantity
[ 1U ]
```

Then:

```text
[ Generate PDF ]
```

---

# 24. GENERATION PROGRESS

For large Excel files, show progress:

```text
Generating Labels...

██████████████░░░░░░ 72%

1,800 / 2,500 labels

Estimated remaining: 4 seconds
```

Do not freeze the browser.

Use streaming/chunked/batched processing where appropriate.

---

# 25. PERFORMANCE

The application must be designed for high-volume generation.

Target:

```text
1,000 labels → very fast
10,000 labels → reliable
50,000 labels → controlled/batched processing
```

Avoid loading huge datasets unnecessarily into browser memory.

Use:

* streaming where possible
* batch processing
* pagination
* background jobs for large PDF generation
* progress tracking
* memory-safe PDF generation

For large jobs:

```text
Create Job
↓
Process Background Job
↓
Update Progress
↓
Generate PDF
↓
Mark Complete
↓
Download
```

---

# 26. BATCH SYSTEM

Every generation request should create a batch.

Example:

```text
BATCH-20260819-0001
```

Batch record:

```text
Batch ID
File Name
Created By
Created At
Product Count
Label Count
First Barcode
Last Barcode
PDF Status
```

---

# 27. GENERATION HISTORY

Create:

**History**

Columns:

| Batch ID  | File          | Labels | User  | Date   | Status    | Action |
| --------- | ------------- | -----: | ----- | ------ | --------- | ------ |
| BATCH-001 | products.xlsx |    500 | Admin | 19 Aug | Completed | View   |

Actions:

```text
View
Download PDF
Download Excel
Reprint
```

---

# 28. BARCODE SEARCH

Create:

**Barcode Search**

User can enter:

```text
58310472
```

Show:

```text
Barcode
58310472

Product
Steering Wheel 868

MRP
₹1599/-

Sales Price
₹1020/-

Net Quantity
1U

Batch
BATCH-001

Created
19 Aug 2026
```

Provide:

```text
[ Reprint ]
```

---

# 29. DUPLICATE PROTECTION

Database must have:

```text
UNIQUE(barcode)
```

Never rely only on frontend validation.

Backend must enforce uniqueness.

If duplicate generation is attempted:

```text
Do not overwrite.

Generate a new unused ID.
```

---

# 30. TRANSACTION SAFETY

Barcode allocation must be atomic.

If PDF generation fails after IDs are reserved:

Do not silently reuse the IDs.

Mark them as:

```text
Reserved
Failed
```

or use a robust transactional workflow.

The system must maintain auditability.

Never create situations where the same barcode can later belong to two different products.

---

# 31. DATA MODEL

Recommended entities:

```text
User
Product
Barcode
GenerationBatch
GenerationItem
SystemSetting
AuditLog
```

Barcode:

```text
id
barcodeValue
productId
batchId
status
createdAt
createdBy
```

Product:

```text
id
name
mrp
salesPrice
netQuantity
createdAt
updatedAt
```

GenerationBatch:

```text
id
batchNumber
fileName
totalProducts
totalLabels
status
createdBy
createdAt
completedAt
pdfPath
```

---

# 32. ERROR HANDLING

Never expose technical errors directly to users.

Bad:

```text
MongoServerError E11000
```

Good:

```text
We couldn't complete barcode generation.

Your data has not been lost.

Please try again or contact the administrator.
```

Log the technical error internally.

---

# 33. SECURITY

Implement:

* Authentication
* Authorization
* Input validation
* File type validation
* File size limits
* Excel formula injection protection
* XSS protection
* CSRF protection where applicable
* Rate limiting
* Secure file storage
* Signed/private download URLs
* Audit logs
* Secure environment variables
* No secrets in frontend
* No arbitrary file execution
* Malware/file safety checks where appropriate

Never trust uploaded Excel data.

---

# 34. EXCEL SECURITY

Treat all Excel cells as untrusted input.

Prevent formula injection.

Do not allow imported values beginning with dangerous spreadsheet formulas to become executable formulas when exporting.

Sanitize:

```text
=
+
-
@
```

where appropriate.

---

# 35. UI/UX DESIGN

Design language:

**Apple-level simplicity + modern SaaS dashboard + premium enterprise utility.**

Requirements:

* clean
* minimal
* fast
* professional
* responsive
* accessible
* keyboard friendly
* excellent spacing
* clear typography
* no unnecessary animations
* no visual clutter

Primary action should always be obvious.

Use:

```text
Upload Excel
Preview
Generate PDF
```

as the primary flow.

---

# 36. DESIGN SYSTEM

Create reusable:

```text
Button
Input
Select
Dropdown
Modal
Toast
Table
Badge
Card
Empty State
Loading State
Error State
Progress Bar
File Upload
Preview
```

Do not duplicate UI implementations.

---

# 37. RESPONSIVE DESIGN

Desktop is the primary use case.

Also support:

```text
Tablet
Mobile
```

Mobile does not need full PDF editing capability but must allow:

* upload
* preview
* generation
* history
* download

---

# 38. ACCESSIBILITY

Follow WCAG principles.

Ensure:

* keyboard navigation
* focus states
* readable contrast
* screen-reader labels
* accessible error messages
* semantic HTML
* no color-only status indicators

---

# 39. API ARCHITECTURE

Create clean APIs.

Example:

```text
POST /api/import/excel
POST /api/barcodes/validate
POST /api/batches
POST /api/batches/:id/generate
GET  /api/batches
GET  /api/batches/:id
GET  /api/barcodes/:code
POST /api/barcodes/:code/reprint
GET  /api/templates/excel
GET  /api/settings
PUT  /api/settings
```

Use proper HTTP status codes.

Use consistent response structures.

---

# 40. FRONTEND ARCHITECTURE

Use:

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
```

Organize code by feature rather than creating a huge component directory.

Example:

```text
features/
  barcode/
  excel-import/
  pdf-generation/
  batches/
  history/
  settings/
```

Keep business logic outside UI components.

---

# 41. STATE MANAGEMENT

Do not over-engineer state management.

Use:

* React state for local UI state
* React Query/TanStack Query for server state
* URL parameters for filters/search where useful

Avoid unnecessary global state.

---

# 42. PDF ENGINE

Create a dedicated PDF generation service.

It should receive normalized data:

```typescript
{
  productName,
  barcode,
  mrp,
  salesPrice,
  netQuantity,
  website
}
```

and produce the final PDF.

The PDF renderer should not depend on browser screen dimensions.

---

# 43. BARCODE ENGINE

Create a dedicated barcode service.

Input:

```text
58310472
```

Output:

```text
Code 128 barcode
```

Add automated tests confirming:

```text
encoded barcode === displayed barcode
```

---

# 44. LABEL TEMPLATE ENGINE

Do not hard-code every pixel.

Create a label configuration:

```typescript
{
  width: 50,
  height: 25,
  unit: "mm",

  productName: {
    x,
    y,
    width,
    height,
    fontSize
  },

  barcode: {
    x,
    y,
    width,
    height
  },

  barcodeText: {
    x,
    y,
    fontSize
  },

  netQuantity: {...},
  mrp: {...},
  salesPrice: {...},
  website: {...}
}
```

This allows future label designs without rewriting the PDF engine.

---

# 45. PRODUCT NAME OVERFLOW

Product names can be long.

Do not allow:

```text
STEERING WHEEL WITH REMOTE CONTROL AND BATTERIES FOR CHILDREN...
```

to overflow.

Implement intelligent:

* wrapping
* truncation
* dynamic font sizing

Preferred behavior:

```text
Short product → single line
Long product → two lines
Extremely long → controlled truncation
```

Never overlap the barcode.

---

# 46. BARCODE SCANNABILITY

Optimize barcode dimensions for physical printing.

Do not make the barcode excessively small.

Maintain sufficient:

* barcode height
* bar width
* quiet zone
* contrast
* whitespace

Do not place text or graphics inside the barcode quiet zone.

---

# 47. QUALITY ASSURANCE

Create automated tests for:

### Barcode

* 8-digit validation
* uniqueness
* Code 128 encoding
* barcode/displayed number matching

### Excel

* valid Excel
* empty file
* malformed file
* missing columns
* invalid prices
* invalid quantities
* duplicate rows
* huge file

### PDF

* exact 50 × 25 mm
* correct page dimensions
* correct label count
* correct product data
* correct barcode
* no clipping
* no overflow

### Security

* malicious file
* oversized upload
* formula injection
* unauthorized batch access
* unauthorized PDF download

---

# 48. PDF INTEGRITY TEST

Automatically verify:

```text
Expected labels = PDF labels
```

Example:

```text
Excel quantity total = 2,450
PDF labels = 2,450
```

If:

```text
Expected: 2450
Generated: 2449
```

the job must fail rather than silently producing an incomplete PDF.

---

# 49. PRE-GENERATION CONFIRMATION

Before generation display:

```text
Ready to Generate

Products: 152
Labels: 2,480

Label Size:
50 × 25 mm

Barcode:
Code 128

Website:
https://runrkids.in/

Net Quantity:
1U
```

Button:

```text
Generate 2,480 Labels
```

---

# 50. POST-GENERATION RESULT

Show:

```text
✓ PDF Generated Successfully

2,480 labels generated.

Batch:
BATCH-20260819-0001

[ Download PDF ]
[ View Batch ]
[ Generate Another ]
```

---

# 51. SETTINGS

Create an admin Settings page.

Allow:

```text
Label Width
Label Height
Barcode Type
Website
Currency
Net Quantity
Product Name Font Size
Barcode Height
Barcode Width
Show Barcode Number
Show MRP
Show Sales Price
```

Protect advanced settings from normal users.

---

# 52. PRINTER SETTINGS

Allow:

```text
Printer Offset X
Printer Offset Y
Scale
A4 Margins
Label Gap
```

Save printer profiles:

```text
Warehouse Printer
Office Printer
Thermal Printer
```

---

# 53. MULTI-TEMPLATE SUPPORT

Architect the system so future templates can be added.

For example:

```text
Template A
50 × 25 mm — Current Retail Label

Template B
50 × 30 mm

Template C
70 × 35 mm

Template D
Custom
```

Do not tightly couple the system to one template.

---

# 54. DARK MODE

The application UI may support:

```text
Light
Dark
System
```

However, the actual printed label must always use a controlled print design independent of application theme.

---

# 55. PERFORMANCE TARGETS

The application should feel instant for normal operations.

Targets:

```text
Excel upload: < 2 sec for normal files
Validation: near-instant for normal files
Preview: < 1 sec where practical
PDF generation: optimized for batch size
UI interaction: no unnecessary blocking
```

Use virtualization for very large tables.

Do not render thousands of labels simultaneously in the DOM.

---

# 56. OBSERVABILITY

Implement structured logging.

Track:

```text
User
Batch
File
Label Count
Generation Duration
Success/Failure
Error
PDF Size
```

Add basic monitoring hooks.

---

# 57. AUDIT LOG

Track important actions:

```text
Excel Uploaded
Batch Created
Barcode Allocated
PDF Generated
PDF Downloaded
Label Reprinted
Settings Changed
```

---

# 58. DATA EXPORT

Allow users to export generated barcode information:

```text
Barcode
Product Name
MRP
Sales Price
Net Quantity
Batch
Created At
```

as Excel/CSV.

---

# 59. IMPORTANT BUSINESS RULES

Implement these rules strictly:

1. Every barcode must be unique.
2. Every barcode must contain exactly 8 digits.
3. Every barcode must match the human-readable number.
4. Every Excel quantity must generate exactly that many labels.
5. PDF label dimensions must be exactly 50 × 25 mm.
6. No label may overflow.
7. No barcode may be clipped.
8. MRP and Sales Price must be correctly mapped.
9. Net Quantity defaults to 1U.
10. Website defaults to https://runrkids.in/.
11. Failed generation must never silently create incomplete output.
12. Previously issued barcodes must never be reassigned.
13. Printing must be designed for 100% / Actual Size.
14. The PDF must not depend on browser zoom.
15. Uploaded Excel files must be treated as untrusted input.

---

# 60. DEVELOPMENT APPROACH

Do not build everything in one giant component.

Implement in phases.

### Phase 1

Project setup + design system.

### Phase 2

Excel upload and validation.

### Phase 3

Barcode generation.

### Phase 4

Label preview.

### Phase 5

Exact-size PDF engine.

### Phase 6

Batch/history system.

### Phase 7

Reprinting/search.

### Phase 8

Settings/printer calibration.

### Phase 9

Security hardening.

### Phase 10

Performance optimization.

### Phase 11

Automated testing.

### Phase 12

Production deployment.

---

# 61. DEFINITION OF DONE

The application is NOT considered complete until:

* Excel upload works
* Excel validation works
* Unique barcode generation works
* Code 128 works
* Preview works
* PDF generation works
* PDF has exact 50 × 25 mm labels
* A4 mode works
* Barcode scanning works
* Quantity is respected
* No duplicates occur
* History works
* Reprint works
* Settings work
* Calibration works
* Security validation works
* Automated tests pass
* Large batches are handled reliably
* UI is responsive
* No console errors remain
* No TypeScript errors remain
* No obvious accessibility issues remain

---

# 62. FINAL QUALITY STANDARD

Think like this is going to be used by a warehouse/retail operation where printing 10,000 incorrect labels could cause a significant financial loss.

Therefore:

**Correctness > speed > visual polish > extra features.**

Never make assumptions silently.

When a business rule is ambiguous, expose it as a configuration option.

Never hide errors.

Never silently discard Excel rows.

Never silently generate fewer labels than requested.

Never silently reuse a barcode.

Never silently resize the physical label.

Build a clean, production-ready, scalable system rather than a prototype.

Before implementation, create:

1. Architecture plan
2. Database schema
3. API specification
4. UI/UX flow
5. PDF rendering strategy
6. Barcode strategy
7. Validation rules
8. Testing strategy

Then implement the system feature-by-feature.

At every stage, verify the actual output against the requirements above.

Do not reuse the same barcode for multiple labels unless the user explicitly selects a future "duplicate ba

```
Upload
↓
Parse
↓
Validate
↓
Show Preview
↓
User Confirmation
↓
Reserve Barcode IDs
↓
Generate PDF
```

* Required
* Int

```
Dow
```

Al

```
12,540
Total Labels

1,240
Today

438
Products

12,540
Barcodes Issu
```

```
File: products.xlsx

Rows: 152
Products: 152
Labels to Generate:
```

#

```
Zoom +
Zoom -
Fit
100%
```

```
```

Allow administrators

```
MRP: ₹1599
```

# 20.

One-label

* exact dimensions
* barcode dimensions
* typogr

- exact dimensions
- barcode dimensions
- typography

```
Top Margin
```

```
Horizontal:
```

Before generati

```
Label Size
○ 50 × 25 mm

PDF Mode
○ One Label Per Page
○ A4 Sheet

Barcode
○ Code 128

Quantity
○ From Excel

Website
[ https://runrkids.in/ ]

Net Quant
```

The app

The applic

* streaming where possible
* batch processing
* pagination
* background jobs for large PDF generation

Every generation request should create a batc

Exa

```
Barcode
58310472
```

```
Reserved
F
```

```
id
barcodeValue
productId
batchId
status
cre
```

```
id
barcodeValue
productId
batchId
status
create
```

```
We
```

* Authentication
* Authorization
* Input validation
* File type validation
* File size limits
* E

- Authentication
- Authorization
- Input validation
- File type validation
- File size limits
- Ex

Design

* clean
* minimal
* fast
* professional
* responsive
* accessible
* keyboard friendly
* excellent spacing
* clear typogra

- clean
- minimal
- fast
- professional
- responsive
- accessible
- keyboard friendly
- excellent spacing
- clear typography

# 38.

```
POST /api/import/excel
POS
```

```
features/
  barcode/
```

* React state for

The PDF renderer should not depend on browser screen

```
{
  width: 50,
  height: 25,
  unit: "mm",

  productName: {
    x,
    y,
    width,
    height,
    fontSize
  },

  barcode: {
    x,
    y,
    width,
    h
```

```
STEERING WHEE
```

```
Short product → single line
Lon
```

# 47. QUALITY

# 47. QUALITY ASSUR

* exact 50 × 25 mm
* correct page dime

```
Excel qu
```

Save printer profiles

However, the actual printed label must always

```
Excel upload: < 2 sec for normal files
Validation: near-instant for normal files
Preview: < 1 sec where practical
PDF generation: optimized for batch size
```

```
Excel Uploaded
Batch Created
```

1. Every barcode must be unique.
2. Every barcode must contain exactly 8 digits.
3. Every barcode must match the human-readable number.
4. Every Excel quantity must generate exactly that many labels.
5. PDF label dimensio

1) Every barcode must be unique.
2) Every barcode must contain exactly 8 digits.
3) Every barcode must match the human-readable number.
4) Every Excel quantity must generate exactly that many labels.
5) PDF label dimensions must be exactly 50 × 25 mm.
6) No label may overflow.
7) No barcode may be clipped.
8) MRP and Sales Price must be correctly mapped
