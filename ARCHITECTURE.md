# Atech Stock Manager — Build & Configuration Document

**Version:** 1.0  
**Date:** March 2026  
**Author:** Atech Cloud  
**Environment:** Windows ARM64 (Surface / Qualcomm)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Prerequisites & Runtime Requirements](#3-prerequisites--runtime-requirements)
4. [Project Structure](#4-project-structure)
5. [Environment Configuration](#5-environment-configuration)
6. [Database Schema](#6-database-schema)
7. [API Reference](#7-api-reference)
8. [Page Routes](#8-page-routes)
9. [Database Migrations](#9-database-migrations)
10. [Running the Application](#10-running-the-application)
11. [Building for Production](#11-building-for-production)
12. [Microsoft 365 Integration](#12-microsoft-365-integration)
13. [Security Considerations](#13-security-considerations)
14. [Known Limitations & Future Work](#14-known-limitations--future-work)

---

## 1. System Overview

Atech Stock Manager is a full-stack web application for IT asset inventory management. It provides:

- **Product & category management** with SKU and barcode registration
- **Goods-In / Goods-Out** stock transactions
- **Individual device tracking** — each physical device has a unique `StockItem` record with its own barcode, serial number, and asset tag
- **Customer allocation** — assign specific devices to customers, track status through ALLOCATED → DISPATCHED → RETURNED
- **Stock take** — per-device counting worksheet with printable PDF output
- **Dashboard** with live KPIs and low-stock alerts
- **Email / Teams notifications** via Microsoft Graph API when stock falls below reorder point

The application runs entirely on a single Windows machine (no external backend required). All data is stored in a local SQLite file.

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.7 |
| UI Library | React | 19.2.3 |
| Styling | Tailwind CSS | 4.x |
| Icons | Lucide React | 0.577.0 |
| Charts | Recharts | 3.8.0 |
| Barcode Scanning | html5-qrcode | 2.3.8 |
| Form Handling | React Hook Form | 7.71.2 |
| Validation | Zod | 4.3.6 |
| ORM | Prisma | 7.5.0 |
| Database | SQLite (via better-sqlite3) | 12.8.0 |
| SQLite Adapter | @prisma/adapter-better-sqlite3 | 7.5.0 |
| Email Integration | Microsoft Graph API | 3.0.7 |
| Language | TypeScript | 5.x |
| Runtime | Node.js | 22.14.0 (ARM64) |

> **Note:** A custom ARM64-compatible SQLite adapter is used (`@prisma/adapter-better-sqlite3`) instead of the default Prisma driver. This is required for the Windows ARM64 platform (Qualcomm/Surface devices).

---

## 3. Prerequisites & Runtime Requirements

### Software

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 22.14.0 | ARM64 build — `node-v22.14.0-win-arm64` |
| npm | 10.x | Bundled with Node.js |
| Git | Any | Optional, for source control |

### Node.js PATH (ARM64 Windows)

Node.js is installed at a non-standard path. Set the PATH before running any npm/npx commands:

```powershell
$env:PATH = "C:\Tools\node-v22.14.0-win-arm64;" + $env:PATH
```

To make this permanent, add `C:\Tools\node-v22.14.0-win-arm64` to System Environment Variables.

### Disk Space

| Component | Approximate Size |
|---|---|
| node_modules | ~400 MB |
| SQLite database (dev.db) | Grows with data |
| .next build cache | ~150 MB |

---

## 4. Project Structure

```
inventory-app/
├── app/                         # Next.js App Router
│   ├── api/                     # REST API route handlers
│   │   ├── allocations/         # GET, POST allocations
│   │   │   ├── [id]/            # PUT, DELETE allocation by ID
│   │   │   │   └── items/[itemId]/  # PATCH individual allocation item
│   │   ├── categories/          # GET categories
│   │   ├── customers/           # GET, POST customers
│   │   │   └── [id]/            # GET, PUT, DELETE customer
│   │   ├── dashboard/           # GET dashboard KPIs
│   │   ├── inventory/           # GET inventory levels
│   │   ├── products/            # GET, POST products
│   │   │   └── [id]/            # GET, PUT, DELETE product
│   │   ├── scan/                # GET product by barcode/SKU
│   │   ├── settings/            # GET, PUT application settings
│   │   ├── stock-items/         # GET individual device records
│   │   └── transactions/        # GET, POST stock transactions
│   ├── allocations/             # Allocations list page
│   ├── customers/               # Customers list + detail pages
│   ├── dashboard/               # Main dashboard
│   ├── goods-in/                # Receive stock (with barcode scan)
│   ├── goods-out/               # Issue stock
│   ├── inventory/               # Inventory list with per-device expand
│   ├── products/                # Products list + detail pages
│   ├── settings/                # App settings (alerts, MS365)
│   ├── stock-take/              # Stock count worksheet + print
│   ├── globals.css              # Global styles + print media rules
│   ├── layout.tsx               # Root layout (Navigation wrapper)
│   └── page.tsx                 # Root redirect → /dashboard
├── components/
│   ├── BarcodeScanner.tsx       # Camera-based barcode scanner
│   ├── Navigation.tsx           # Sidebar + top bar
│   └── StockLevelBadge.tsx      # Colour-coded stock level indicator
├── lib/
│   ├── db.ts                    # Prisma client singleton
│   └── alerts.ts                # Low-stock alert logic (Graph API)
├── prisma/
│   ├── schema.prisma            # Database schema definition
│   ├── prisma.config.ts         # Prisma configuration
│   ├── seed.ts                  # Database seed script
│   └── migrations/              # Applied migration history
│       ├── 20260318122403_init/
│       ├── 20260318151316_add_allocation_items/
│       └── 20260318172957_add_stock_items/
├── public/
│   └── Atech-Logo.png           # Brand logo (white, for dark backgrounds)
├── .env                         # Active environment variables (not committed)
├── .env.local.example           # Environment variable template
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies and scripts
```

---

## 5. Environment Configuration

### Required File: `.env`

Located at the project root. Minimum required content:

```env
DATABASE_URL="file:./dev.db"
```

### Full Configuration Template (`.env.local.example`)

```env
# Database (SQLite — auto-created on first run)
DATABASE_URL="file:./dev.db"

# Microsoft 365 Integration (Optional — required for email alerts)
# Register an app at https://portal.azure.com
# → Azure Active Directory → App Registrations → New
# Grant API permission: Microsoft Graph → Application → Mail.Send
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here
```

> **Security:** Never commit `.env` to version control. The `.gitignore` already excludes it.

---

## 6. Database Schema

The database is SQLite, located at `./dev.db` relative to the project root.

### Entity Relationship Summary

```
Category  ──1:N──  Product  ──1:1──  Inventory
                     │
                     ├──1:N──  Transaction  ──N:1──  Customer
                     │
                     ├──1:N──  Allocation   ──N:1──  Customer
                     │              │
                     │              └──1:N──  AllocationItem ──0:1── StockItem
                     │
                     └──1:N──  StockItem
```

### Tables

#### `Category`
| Column | Type | Notes |
|---|---|---|
| id | TEXT (CUID) | Primary key |
| name | TEXT UNIQUE | e.g. "Laptops", "Networking" |
| description | TEXT | Optional |
| createdAt | DATETIME | Auto |
| updatedAt | DATETIME | Auto |

#### `Product`
| Column | Type | Notes |
|---|---|---|
| id | TEXT (CUID) | Primary key |
| name | TEXT | Display name |
| sku | TEXT UNIQUE | Stock Keeping Unit |
| barcode | TEXT UNIQUE | Optional product-level barcode |
| categoryId | TEXT (FK) | → Category |
| manufacturer | TEXT | Optional |
| model | TEXT | Optional |
| unitCost | REAL | Default 0 |
| reorderPoint | INT | Default 5; triggers low-stock alerts |
| createdAt / updatedAt | DATETIME | Auto |

#### `Inventory`
| Column | Type | Notes |
|---|---|---|
| id | TEXT (CUID) | Primary key |
| productId | TEXT UNIQUE (FK) | → Product (one-to-one) |
| quantity | INT | Aggregate count — auto-updated by transactions |
| location | TEXT | Optional warehouse location |
| updatedAt | DATETIME | Auto |

> **Note:** `Inventory.quantity` is the fast-path aggregate. Individual unit tracking is via `StockItem`.

#### `Customer`
| Column | Type | Notes |
|---|---|---|
| id | TEXT (CUID) | Primary key |
| name | TEXT | Full name |
| email | TEXT | Optional |
| phone | TEXT | Optional |
| company | TEXT | Optional |
| address | TEXT | Optional |
| createdAt / updatedAt | DATETIME | Auto |

#### `Transaction`
| Column | Type | Notes |
|---|---|---|
| id | TEXT (CUID) | Primary key |
| type | ENUM | `GOODS_IN`, `GOODS_OUT`, `ADJUSTMENT`, `RETURN` |
| productId | TEXT (FK) | → Product |
| customerId | TEXT (FK) | → Customer (nullable) |
| quantity | INT | Units moved |
| reference | TEXT | PO number, reference, etc. |
| notes | TEXT | Optional |
| performedBy | TEXT | Name of person recording |
| createdAt | DATETIME | Auto |

> Transactions are append-only. They drive `Inventory.quantity` changes via atomic Prisma transactions.

#### `Allocation`
| Column | Type | Notes |
|---|---|---|
| id | TEXT (CUID) | Primary key |
| productId | TEXT (FK) | → Product |
| customerId | TEXT (FK) | → Customer |
| quantity | INT | Number of devices |
| status | ENUM | `PENDING`, `ALLOCATED`, `DISPATCHED`, `RETURNED`, `CANCELLED` |
| reference | TEXT | Optional |
| notes | TEXT | Optional |
| allocatedAt | DATETIME | Auto |
| updatedAt | DATETIME | Auto |

#### `AllocationItem`
| Column | Type | Notes |
|---|---|---|
| id | TEXT (CUID) | Primary key |
| allocationId | TEXT (FK) | → Allocation (CASCADE DELETE) |
| stockItemId | TEXT UNIQUE (FK) | → StockItem (nullable — for legacy allocations) |
| serialNumber | TEXT | Copied from StockItem on creation |
| assetTag | TEXT | Optional |
| notes | TEXT | Optional |
| createdAt / updatedAt | DATETIME | Auto |

#### `StockItem`
| Column | Type | Notes |
|---|---|---|
| id | TEXT (CUID) | Primary key |
| productId | TEXT (FK) | → Product |
| barcode | TEXT UNIQUE | Unique per-device identifier |
| serialNumber | TEXT | Optional |
| assetTag | TEXT | Optional |
| status | ENUM | `AVAILABLE`, `ALLOCATED`, `DISPATCHED`, `RETURNED`, `RETIRED` |
| location | TEXT | Physical location |
| notes | TEXT | Optional |
| receivedRef | TEXT | Reference from Goods-In transaction |
| createdAt / updatedAt | DATETIME | Auto |

> `StockItem` records are created during **Goods-In** when device barcodes are entered (one per line). Status cascades automatically when an `Allocation` status changes.

#### `Settings`
| Column | Type | Notes |
|---|---|---|
| id | TEXT | Fixed value `"global"` |
| key | TEXT UNIQUE | Setting name |
| value | TEXT | Setting value |

---

## 7. API Reference

All endpoints are under `/api/` and return JSON. Authentication is not currently implemented (internal use).

### Allocations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/allocations` | List allocations. Query: `?status=`, `?customerId=`, `?productId=` |
| POST | `/api/allocations` | Create allocation. Body: `{ productId, customerId, stockItemIds[] }` or `{ productId, customerId, quantity, serialNumbers[] }` |
| PUT | `/api/allocations/[id]` | Update status/notes. Cascades status to linked StockItems |
| DELETE | `/api/allocations/[id]` | Delete allocation (cascade deletes AllocationItems) |
| PATCH | `/api/allocations/[id]/items/[itemId]` | Edit serial/assetTag on individual AllocationItem |

### Products

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List products. Query: `?limit=`, `?search=`, `?categoryId=` |
| POST | `/api/products` | Create product |
| GET | `/api/products/[id]` | Get product by ID |
| PUT | `/api/products/[id]` | Update product |
| DELETE | `/api/products/[id]` | Delete product |

### Inventory

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/inventory` | List inventory levels. Query: `?lowStock=true` for items at/below reorder point |

### Stock Items

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stock-items` | List individual device records. Query: `?productId=`, `?status=`, `?includeProduct=true` |

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/transactions` | List transactions. Query: `?type=`, `?productId=`, `?customerId=`, `?page=`, `?limit=` |
| POST | `/api/transactions` | Record transaction. Body: `{ type, productId, quantity, reference, performedBy, deviceBarcodes[] }` |

### Customers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/customers` | List all customers |
| POST | `/api/customers` | Create customer |
| GET | `/api/customers/[id]` | Get customer with allocation history |
| PUT | `/api/customers/[id]` | Update customer |
| DELETE | `/api/customers/[id]` | Delete customer |

### Other

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/scan` | Lookup product by barcode or SKU. Query: `?barcode=` or `?sku=` |
| GET | `/api/dashboard` | KPI summary (total products, inventory value, allocation counts, recent transactions) |
| GET | `/api/categories` | List all categories |
| GET | `/api/settings` | Get all settings |
| PUT | `/api/settings` | Update a setting. Body: `{ key, value }` |

---

## 8. Page Routes

| Route | Description |
|---|---|
| `/dashboard` | KPI cards, stock chart, recent activity |
| `/inventory` | Inventory list with expandable per-device rows and Assign button |
| `/products` | Product catalogue |
| `/products/[id]` | Product detail — edit, transaction history, stock items |
| `/goods-in` | Record incoming stock; supports device barcode input (one per line) |
| `/goods-out` | Record outgoing stock / issues |
| `/allocations` | Allocation list with expandable per-device rows, status management |
| `/customers` | Customer list |
| `/customers/[id]` | Customer detail with allocation history |
| `/stock-take` | Per-device counting worksheet; Print Sheet button outputs a formatted A4 checklist |
| `/settings` | Alert thresholds, Microsoft 365 integration, Teams webhook |

---

## 9. Database Migrations

Migrations are managed by Prisma Migrate and recorded in `prisma/migrations/`.

| Migration | Date | Description |
|---|---|---|
| `20260318122403_init` | 18 Mar 2026 | Initial schema — Category, Product, Inventory, Customer, Transaction, Allocation, Settings |
| `20260318151316_add_allocation_items` | 18 Mar 2026 | Added `AllocationItem` table for per-device allocation tracking |
| `20260318172957_add_stock_items` | 18 Mar 2026 | Added `StockItem` table for unique device records; added `stockItemId` FK on AllocationItem; added `StockItemStatus` enum |

### Applying Migrations

```powershell
# Apply pending migrations to the database
npx prisma migrate deploy

# Create a new migration after schema changes (dev only)
npx prisma migrate dev --name describe_the_change

# Regenerate Prisma client after schema changes
npx prisma generate

# Reset database and re-seed (DESTRUCTIVE)
npm run db:reset
```

---

## 10. Running the Application

### First-Time Setup

```powershell
# 1. Set Node.js PATH (ARM64 Windows)
$env:PATH = "C:\Tools\node-v22.14.0-win-arm64;" + $env:PATH

# 2. Navigate to project
Set-Location "C:\Projects\inventory-app"

# 3. Install dependencies
npm install

# 4. Configure environment
Copy-Item .env.local.example .env
# Edit .env and set DATABASE_URL (default is fine for local use)

# 5. Apply migrations and generate Prisma client
npx prisma migrate deploy
npx prisma generate

# 6. (Optional) Seed with example data
npm run seed

# 7. Start development server
npm run dev
```

Access the app at **http://localhost:3000**

### Subsequent Starts

```powershell
$env:PATH = "C:\Tools\node-v22.14.0-win-arm64;" + $env:PATH
Set-Location "C:\Projects\inventory-app"
npm run dev
```

### Available Scripts

| Script | Command | Description |
|---|---|---|
| Development server | `npm run dev` | Hot-reload dev server on port 3000 |
| Production build | `npm run build` | Compile and optimise for production |
| Production server | `npm run start` | Serve production build |
| Lint | `npm run lint` | Run ESLint |
| Seed database | `npm run seed` | Populate with example products/customers |
| Reset database | `npm run db:reset` | **Destructive** — drops all data and re-seeds |

---

## 11. Building for Production

```powershell
$env:PATH = "C:\Tools\node-v22.14.0-win-arm64;" + $env:PATH
Set-Location "C:\Projects\inventory-app"

# Build
npm run build

# Start production server (port 3000 by default)
npm run start

# Or on a custom port
$env:PORT = "8080"; npm run start
```

> For always-on operation, consider running behind **PM2** or as a **Windows Service** using NSSM.

### PM2 Example

```powershell
npm install -g pm2
pm2 start npm --name "atech-stock" -- start
pm2 save
pm2 startup
```

---

## 12. Microsoft 365 Integration

Used for low-stock email alerts sent via Microsoft Graph API.

### Azure App Registration Steps

1. Go to [https://portal.azure.com](https://portal.azure.com)
2. Navigate to **Azure Active Directory → App registrations → New registration**
3. Name: `Atech Stock Manager`, Supported account types: *Single tenant*
4. After creation, note the **Application (client) ID** and **Directory (tenant) ID**
5. Go to **Certificates & secrets → New client secret**, copy the value
6. Go to **API permissions → Add a permission → Microsoft Graph → Application permissions**
7. Add `Mail.Send`, then click **Grant admin consent**

### Environment Variables

```env
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=your-secret-value
```

### Teams Webhook

The Teams webhook URL is configured via the **Settings** page in the app UI (stored in the `Settings` database table) — no environment variable needed.

### Alert Trigger

Low-stock alerts fire automatically after any **Goods-Out** or **Allocation** transaction that causes a product's quantity to fall to or below its `reorderPoint`.

---

## 13. Security Considerations

| Area | Current State | Recommendation |
|---|---|---|
| Authentication | None — open access on localhost | Add NextAuth.js or Azure AD SSO before exposing externally |
| Network exposure | Bound to `localhost:3000` | Do not expose directly to internet without a reverse proxy + TLS |
| Secrets management | `.env` file | Use Azure Key Vault or Windows DPAPI for production |
| Database | SQLite file on disk | Ensure `dev.db` is excluded from backups sent off-site without encryption |
| HTTPS | Not configured | Use Nginx or Caddy as reverse proxy with Let's Encrypt for LAN-wide deployment |
| Input validation | Zod schemas on API routes | All external inputs validated — no raw SQL queries |

---

## 14. Known Limitations & Future Work

| Item | Notes |
|---|---|
| **No user authentication** | All features accessible to anyone on the network. Planned: Azure AD SSO |
| **SQLite single-writer** | Suitable for single-user / small team. For concurrent multi-user, migrate to PostgreSQL (change Prisma adapter only) |
| **No audit log** | Transactions provide partial history but there is no user-attributed audit trail |
| **Inventory quantity sync** | `Inventory.quantity` is updated by transactions but not by direct `StockItem` status changes — they should remain consistent via the allocation workflow |
| **No mobile app** | Responsive web UI works on mobile browsers; a dedicated PWA or native app is a potential future enhancement |
| **Barcode printing** | The system tracks barcodes but does not currently generate/print barcode labels |
| **Reporting / exports** | No CSV/Excel export yet for allocations, transaction history, or stock valuation |

---

*Document generated: March 2026 — Atech Cloud*
