## Role

Act as a **Senior FAANG-level Software Architect, Full-Stack Engineer, Product Engineer, QA Engineer, Security Engineer, and Award-Winning UI/UX Designer**.

Use the **UI/UX Pro Max** design methodology and approach this as a real production product that will be used by non-technical users every day.

First, **deeply explore and understand the entire existing project** before making any changes. Do not assume the architecture, business logic, data models, APIs, components, or workflows. Inspect the actual codebase and understand how everything currently works.

---

# 1. Full Project Audit

Analyze the complete project, including:

* Frontend architecture
* Backend architecture
* Database structure
* API architecture
* Authentication and authorization
* User roles and permissions
* Existing barcode functionality
* Barcode generation logic
* Printing logic
* Label/sticker configuration
* Product management
* Inventory/product data flow
* Existing UI/UX
* State management
* Form handling
* Validation
* Error handling
* File generation
* PDF generation
* Scanner-related functionality
* Billing/invoice-related functionality
* History/audit functionality
* Reusable components
* Utilities/helpers
* Services
* Controllers
* Models/schemas
* Routes
* Middleware
* Configuration/environment variables
* Logging
* Security
* Performance
* Testing
* Deployment configuration
* Build configuration
* Code quality
* Dependency management

Trace the complete flow from:

**UI → API → Business Logic → Database → Response → UI**

and identify any architectural or business-logic problems.

Do not rewrite working functionality unnecessarily.

---

# 2. Production-Readiness Review

After understanding the existing system, provide a detailed assessment of what is required to make it **production-ready and FAANG-level**.

Identify:

### Architecture

* Poor separation of concerns
* Tight coupling
* Duplicate logic
* Missing service layers
* Missing reusable abstractions
* Incorrect component responsibilities
* API design problems
* Database design problems

### Code Quality

* Duplicate code
* Large components/functions
* Hardcoded values
* Poor naming
* Missing types
* Unsafe type casting
* Unhandled promises
* Poor error handling
* Dead code
* Unnecessary dependencies
* Inconsistent coding patterns

### Database

Review:

* Schema design
* Indexes
* Relationships
* Unique constraints
* Duplicate prevention
* Query performance
* Pagination
* Aggregation performance
* Transaction requirements
* Historical data strategy

### Security

Review and improve:

* Authentication
* Authorization
* Role-based access control
* Input validation
* Injection prevention
* XSS
* CSRF where applicable
* Rate limiting
* API abuse protection
* Sensitive data exposure
* File upload security
* Invoice access
* Barcode manipulation
* Audit logging
* Secrets/environment variables

### Performance

Analyze:

* API response times
* Database queries
* Rendering performance
* Large barcode batches
* Large invoice histories
* Scanner performance
* PDF generation
* Print generation
* Pagination
* Caching
* Background jobs where required

### Reliability

Add recommendations for:

* Retry handling
* Idempotency
* Transaction safety
* Failure recovery
* Logging
* Monitoring
* Error tracking
* Audit trails
* Data consistency

---

# 3. New Feature #1 — Default Sticker / Label Printing Configuration

Implement a professional default printing configuration.

### Default configuration

**Sticker Type**

* 1-Up Roll Sticker

**Sticker Size**

* Width: `1.4 inch`
* Height: `1.0 inch`

**Barcode Position**

* Top

**Barcode Orientation**

* Vertical

**Vertical Gap**

* `3 mm`

**Top Margin**

* `3 mm`

**Horizontal Gap**

* `3 mm`

**Border**

* OFF

These should become the **default system settings**, but users should still be able to customize them when required.

Create a proper:

### Print Settings

Allow users to configure:

* Sticker type
* Roll / sheet
* Width
* Height
* Unit
* Top margin
* Bottom margin
* Left margin
* Right margin
* Horizontal gap
* Vertical gap
* Barcode position
* Barcode orientation
* Barcode width
* Barcode height
* Barcode scale
* Human-readable number
* Product name
* MRP
* Sale price
* SKU
* Quantity
* Border
* Font size
* Alignment

Add:

**Live Preview**

The preview must update instantly when settings change.

Add:

**Print Test Label**

so users can verify printer alignment before printing hundreds of labels.

Add:

**Save as Default**

and allow users to create reusable print presets.

Important:

Do not blindly apply barcode dimensions that could make scanning unreliable. Barcode size, quiet zones, X-dimension, and print quality should be validated according to the selected barcode symbology and scanning environment. GS1 explicitly notes that barcode dimensions and specifications depend on the scanning environment and printing process.

---

# 4. New Feature #2 — Custom Barcode Generator

Build a complete **Custom Barcode Generator**.

The user should be able to generate a barcode without requiring a predefined sheet/template.

### Barcode Number

Allow users to:

* Enter custom barcode number
* Generate automatically
* Generate sequential numbers
* Generate random numbers
* Generate a batch
* Define prefix
* Define suffix
* Define starting number
* Define ending number
* Define quantity
* Prevent duplicates
* Validate barcode numbers

### Barcode Types

Design the architecture so additional barcode types can easily be added.

Support appropriate symbologies such as:

* Code 128
* Code 39
* EAN-13
* EAN-8
* UPC-A
* ITF-14
* QR Code

Do not treat all barcode types as interchangeable.

For example, EAN/UPC is designed for retail POS environments, while GS1-128 and ITF-14 have different logistics/distribution use cases.

For EAN/UPC and other standards-based formats:

* Validate digit length
* Validate check digit
* Validate allowed ranges
* Preserve quiet zones
* Validate minimum dimensions
* Prevent invalid barcode generation

### Custom Label

Allow the user to configure:

* Barcode
* Barcode number
* Product name
* SKU
* MRP
* Selling price
* Quantity
* Custom text
* Logo
* Font
* Alignment
* Label size
* Barcode size

### Output

Allow:

* Preview
* Print
* Download PDF
* Download PNG
* Generate multiple labels
* Save template
* Reuse template

The barcode generator should be independent from the sheet-printing workflow.

---

# 5. New Feature #3 — Barcode Scanner

Create a professional barcode scanning module.

The scanner should support:

### Camera Scanner

* Mobile camera
* Laptop camera where supported
* Continuous scanning
* Single scanning
* Auto-focus
* Scan feedback
* Success animation
* Error feedback
* Duplicate scan handling

### Hardware Scanner

Support keyboard-based USB/Bluetooth barcode scanners where they behave as HID keyboard input.

The system should automatically recognize scanned barcode values and retrieve the corresponding product.

### Scanner Workflow

Example:

**Scan → Identify Product → Add to Cart → Update Quantity → Calculate Total**

When a barcode is scanned:

1. Validate barcode
2. Find product
3. Retrieve product details
4. Check availability
5. Add product to billing cart
6. Increase quantity if already scanned
7. Recalculate totals
8. Show visual confirmation

If barcode is not found:

Show:

**Product Not Found**

with actions:

* Create Product
* Add Barcode
* Search Product
* Scan Again

---

# 6. New Feature #4 — Billing / POS System

Build a complete professional billing workflow.

### Billing Screen

Create a clean POS-style interface.

Main areas:

**Left / Main Area**

* Scanner
* Product search
* Product results
* Recently scanned products

**Right / Billing Area**

* Cart
* Product
* SKU
* Barcode
* Quantity
* Price
* Discount
* Tax
* Line total
* Remove
* Increase/decrease quantity

### Customer Details

Allow:

* Customer name
* Mobile number
* Email
* Address
* GSTIN if applicable
* Company name

### Invoice Details

Support:

* Invoice number
* Invoice date
* Due date
* Payment method
* Payment status
* Salesperson
* Notes

### Pricing

Support:

* MRP
* Selling price
* Discount
* Tax
* Subtotal
* Grand total
* Round-off

Do not hardcode tax logic. Make it configurable according to the application's business requirements.

---

# 7. Invoice Generation

Generate a professional invoice.

Include:

* Company logo
* Company name
* Address
* Contact details
* GST information where applicable
* Invoice number
* Invoice date
* Customer information
* Product details
* SKU
* Barcode
* Quantity
* Unit price
* Discount
* Tax
* Total
* Payment information
* Terms & conditions
* Authorized signature

Provide:

* Preview
* Print
* PDF download
* Reprint
* Share/export where supported

Invoice numbering must be reliable and collision-safe.

---

# 8. Billing History

Create a complete **Billing History** module.

Display:

* Invoice number
* Customer
* Date
* Amount
* Payment status
* Payment method
* Created by
* Status

Filters:

* Date range
* Customer
* Invoice number
* Payment status
* Payment method
* Amount range
* User/salesperson

Actions:

* View
* Reprint
* Download PDF
* Duplicate
* Cancel/void according to business rules
* View audit history

Add pagination and server-side filtering.

---

# 9. Barcode History

Create a separate barcode history.

Track:

* Barcode
* Product
* Barcode type
* Generated by
* Generated date
* Print quantity
* Print configuration
* Template
* Status

Prevent accidental duplicate barcode assignment.

---

# 10. Audit Log

Implement an audit system for important actions.

Track:

* User
* Action
* Entity
* Entity ID
* Previous value
* New value
* Timestamp
* IP/device information where appropriate

Examples:

* Barcode generated
* Barcode edited
* Product created
* Product updated
* Invoice created
* Invoice cancelled
* Invoice reprinted
* Price changed
* Print configuration changed

---

# 11. UI/UX — UI/UX Pro Max + Award-Level Design

Redesign the product with a **clean, premium, professional SaaS/POS experience**.

Do not make it visually complicated.

Design principles:

* Minimal
* Fast
* Clear
* Consistent
* Professional
* Accessible
* Responsive
* Keyboard-friendly
* Scanner-friendly
* Production-focused

Use:

* Clear visual hierarchy
* Consistent spacing
* Strong typography
* Professional data tables
* Excellent empty states
* Helpful error states
* Loading skeletons
* Confirmation dialogs
* Toast notifications
* Smart filters
* Search everywhere appropriate
* Keyboard shortcuts
* Responsive layouts

The application should feel like a polished commercial product rather than an internal CRUD application.

---

# 12. Important UX Flows

Optimize these flows heavily:

### Flow A — Generate Barcode

Product → Barcode → Customize → Preview → Generate → Print

### Flow B — Bulk Barcode

Select Product → Quantity → Generate Numbers → Preview → Print

### Flow C — Scan & Bill

Open Billing → Scan → Product Added → Quantity → Payment → Generate Invoice

### Flow D — Existing Invoice

Billing History → Search → Invoice → View → Reprint / Download

### Flow E — Unknown Barcode

Scan → Not Found → Create Product / Assign Barcode → Continue Billing

Every workflow should require the minimum number of clicks.

---

# 13. Keyboard Shortcuts

For a professional POS experience, support shortcuts such as:

* `F2` — Search product
* `F4` — Start scanner
* `F8` — Payment
* `Ctrl + P` — Print
* `Esc` — Close modal
* `Enter` — Confirm
* `+ / -` — Quantity adjustment

Make shortcuts configurable if the architecture supports it.

---

# 14. API Architecture

Create clean APIs for:

### Barcode

* Create barcode
* Validate barcode
* Generate barcode
* Bulk generate
* Get barcode
* Search barcode
* Barcode history

### Printing

* Get print settings
* Update print settings
* Save preset
* Get presets
* Generate preview
* Generate print PDF

### Scanner

* Resolve barcode
* Validate barcode
* Get product by barcode

### Billing

* Create invoice
* Get invoice
* Search invoices
* Update invoice
* Cancel invoice
* Generate invoice PDF
* Reprint invoice

### History

* Billing history
* Barcode history
* Audit history

Follow the existing project's API conventions where they are sound. Do not introduce a completely different architecture simply for the sake of changing it.

---

# 15. Database Design

Review the existing database and introduce only the necessary entities.

Potential entities:

* Product
* Barcode
* BarcodeTemplate
* PrintPreset
* Invoice
* InvoiceItem
* Customer
* Payment
* AuditLog

Design proper:

* Indexes
* Unique constraints
* References
* Soft-delete strategy where appropriate
* Created/updated timestamps
* Status fields
* Audit fields

Use transactions where multiple records must remain consistent.

For example:

**Invoice creation → Invoice items → Payment → Inventory update**

should not leave the system in a partially completed state.

---

# 16. Inventory Integration

If the existing project contains product/inventory functionality, integrate billing with it.

When an invoice is successfully completed:

**Sale → Inventory deduction → Transaction history**

Avoid directly modifying inventory from the frontend.

All inventory changes must happen through validated backend business logic.

---

# 17. Error Handling

Create professional error handling.

Examples:

* Invalid barcode
* Duplicate barcode
* Product not found
* Printer unavailable
* PDF generation failed
* Invoice creation failed
* Payment failed
* Network error
* Database error
* Unauthorized action

Errors should be:

* Human-readable
* Actionable
* Logged
* Traceable

Never expose raw backend/database errors to users.

---

# 18. Testing

Add proper automated testing.

### Unit Tests

Test:

* Barcode validation
* Check-digit calculation
* Invoice calculations
* Tax calculations
* Discount calculations
* Quantity calculations
* Invoice numbering
* Duplicate prevention

### Integration Tests

Test:

* Barcode → Product lookup
* Scanner → Cart
* Cart → Invoice
* Invoice → Inventory
* Invoice → Payment
* Invoice → PDF

### E2E Tests

Test complete user flows:

**Generate barcode → Print**

**Scan → Bill → Payment → Invoice**

**Search history → Reprint invoice**

---

# 19. Production Security

Implement:

* RBAC
* API authorization
* Input validation
* Rate limiting
* Secure headers
* Request size limits
* Audit logging
* Secure PDF access
* Secure file handling
* Environment-based secrets
* No secrets in frontend
* No sensitive information in logs

Users should only be able to access invoices, products, billing records, and settings that their role permits.

---

# 20. Observability

Add production-grade observability:

* Structured logging
* Request IDs
* Error IDs
* API timing
* Database query monitoring
* Failed invoice tracking
* Failed barcode generation tracking
* Printer failures
* Scanner failures

Create an admin/system-health section if appropriate.

---

# 21. Performance Requirements

The system should remain responsive when handling:

* Thousands of products
* Thousands of barcodes
* Thousands of invoices
* Large billing history
* Bulk barcode generation
* Bulk printing

Use:

* Server-side pagination
* Proper database indexes
* Debounced search
* Lazy loading
* Virtualized tables where necessary
* Background processing for heavy PDF/batch jobs
* Caching where appropriate

Do not load entire datasets into the frontend.

---

# 22. Important Barcode Standard Considerations

Do not design the barcode system purely around visual appearance.

Barcode reliability depends on:

* Symbology
* X-dimension
* Height
* Quiet zone
* Print resolution
* Printer quality
* Scanning environment
* Contrast

GS1 specifically emphasizes proper symbol sizing, quiet zones, print quality, and selecting the barcode based on the intended scanning environment.

Therefore, the UI should prevent users from selecting physically invalid combinations where possible.

---

# 23. Architecture Principle

Keep the system modular:

```text
Product
   ↓
Barcode
   ↓
Printing
   ↓
Scanner
   ↓
Billing
   ↓
Payment
   ↓
Invoice
   ↓
History
   ↓
Audit
```

Each module should have clear responsibilities.

Do not create a giant controller, giant component, or giant service containing the entire business logic.

---

# 24. Implementation Strategy

Do not immediately start changing random files.

Follow this sequence:

### Phase 1 — Discovery

Understand the complete existing application.

### Phase 2 — Architecture Audit

Document:

* Current architecture
* Current workflows
* Existing reusable functionality
* Problems
* Technical debt
* Risks

### Phase 3 — Production Hardening

Fix:

* Security
* Validation
* Database issues
* API issues
* Error handling
* Performance problems
* Code quality

### Phase 4 — Barcode Improvements

Implement:

* Default print settings
* Custom barcode generation
* Barcode validation
* Templates
* Presets
* Print preview

### Phase 5 — Scanner

Implement:

* Camera scanner
* Hardware scanner
* Barcode lookup
* Unknown barcode flow

### Phase 6 — Billing

Implement:

* Cart
* Customer
* Pricing
* Tax
* Payment
* Invoice

### Phase 7 — History & Audit

Implement:

* Invoice history
* Barcode history
* Audit logs

### Phase 8 — Testing

Implement:

* Unit
* Integration
* E2E
* Performance
* Security testing

### Phase 9 — UX Polish

Perform a complete UI/UX Pro Max review and polish every screen.

### Phase 10 — Production Deployment

Validate:

* Build
* Environment variables
* Database migrations
* Indexes
* Logging
* Monitoring
* Backup
* Rollback
* Security
* Performance

---

# 25. Final Deliverable

After exploring the project, provide a comprehensive report containing:

1. **Current architecture**
2. **Current project structure**
3. **Existing functionality**
4. **Existing barcode workflow**
5. **Existing printing workflow**
6. **Existing product workflow**
7. **Existing database structure**
8. **Existing API structure**
9. **Problems found**
10. **Security issues**
11. **Performance issues**
12. **UX problems**
13. **Technical debt**
14. **Recommended architecture**
15. **Required database changes**
16. **Required API changes**
17. **Required frontend changes**
18. **New barcode generator architecture**
19. **Scanner architecture**
20. **Billing architecture**
21. **Invoice architecture**
22. **History/audit architecture**
23. **Testing strategy**
24. **Production-readiness checklist**
25. **Detailed implementation roadmap**
26. **Priority of every change: P0 / P1 / P2 / P3**
27. **Files that need to be modified**
28. **New files that should be created**
29. **Potential breaking changes**
30. **Migration requirements**

---

# Critical Rules

* **First understand the existing codebase completely.**
* Do not guess.
* Do not blindly rewrite working code.
* Reuse existing architecture and components where appropriate.
* Do not introduce unnecessary dependencies.
* Do not duplicate existing functionality.
* Follow existing coding conventions unless they are clearly problematic.
* Maintain backward compatibility wherever possible.
* Keep business logic on the backend.
* Keep the frontend focused on presentation and interaction.
* Validate everything on the server.
* Make the system scalable.
* Make the UI extremely easy for non-technical users.
* Optimize specifically for barcode printing, scanning, and POS workflows.
* Treat billing and invoice data as financially important records.
* Ensure invoice and barcode operations are auditable.
* Do not consider the work complete until the entire flow is tested end-to-end.

The final result should be a **complete, reliable, secure, scalable, production-ready barcode + printing + scanner + billing + invoice management system**, with a polished UI/UX that feels like a premium commercial product.
