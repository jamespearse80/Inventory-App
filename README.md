# Atech Stock Manager

A full-stack IT asset inventory management web application built for Atech Cloud. Deployed on Microsoft Azure with Microsoft Entra ID (Azure AD) authentication.

**Live URL:** https://atech-stock-manager.azurewebsites.net

---

## Features

| Area | Capabilities |
|---|---|
| **Products** | Create and manage products with SKU, barcode, category, manufacturer, model, unit cost and reorder point |
| **Inventory** | Real-time stock levels per product with low-stock alerts |
| **Goods In** | Record incoming stock — scan or enter individual device barcodes/serial numbers in bulk |
| **Goods Out** | Record outgoing stock dispatches linked to customers |
| **Customers** | Customer directory with contact details and account manager assignment |
| **Allocations** | Allocate specific devices to customers; track status through PENDING → ALLOCATED → DISPATCHED → RETURNED |
| **Stock Take** | Per-device counting worksheet with printable output |
| **Dashboard** | Live KPIs: total products, stock value, low-stock count, recent transactions |
| **Barcode Scanning** | Camera-based barcode/QR scanning on mobile and desktop |
| **Authentication** | Microsoft Entra ID (Azure AD) — only users in your tenant can sign in |

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.7 |
| Language | TypeScript | 5.x |
| UI | React | 19.2.3 |
| Styling | Tailwind CSS | 4.x |
| Icons | Lucide React | latest |
| Charts | Recharts | 3.x |
| Barcode Scanning | html5-qrcode | 2.3.8 |
| ORM | Prisma | 6.x |
| Database | Azure SQL (SQL Server) | — |
| Authentication | NextAuth.js v5 + Microsoft Entra ID | 5.0.0-beta |
| Runtime | Node.js | 22 LTS |
| Hosting | Azure App Service (Linux, B1) | UK West |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│               Browser / Mobile                  │
│         Next.js App (React, Tailwind)           │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────┐
│         Azure App Service (UK West)             │
│         Node.js 22 / Next.js 16                 │
│                                                 │
│  ┌─────────────┐   ┌─────────────────────────┐  │
│  │  App Router │   │  API Routes             │  │
│  │  Pages/UI   │   │  /api/products          │  │
│  └─────────────┘   │  /api/transactions      │  │
│                    │  /api/customers         │  │
│                    │  /api/allocations       │  │
│                    │  /api/stock-items       │  │
│                    │  /api/scan              │  │
│                    └──────────┬──────────────┘  │
└─────────────────────────────┬─┘                 │
                              │                   │
┌─────────────────────────────▼───────────────────┐
│              Prisma ORM (v6)                    │
└─────────────────────────────┬───────────────────┘
                              │
┌─────────────────────────────▼───────────────────┐
│        Azure SQL Database (UK South)            │
│        sql-atech-stock-mgr.database.windows.net │
└─────────────────────────────────────────────────┘

Authentication:
Browser → /api/auth/* (NextAuth) → Microsoft Entra ID → JWT session
```

### Key Design Decisions

- **App Router** — all pages use Next.js 15+ App Router with server components where possible; interactive pages are `'use client'`
- **API Routes** — all data access goes through typed REST API routes under `app/api/`, never direct DB access from the client
- **Prisma 6** — used over Prisma 7 because Azure SQL Server doesn't yet have a driver adapter for the new Wasm engine; v6 uses the native library engine which has full SQL Server support
- **Enums as strings** — Azure SQL Server doesn't support Prisma enums, so `TransactionType`, `AllocationStatus` and `StockItemStatus` are stored as plain strings
- **NextAuth v5** — the auth layer uses `auth()` in server components and `signOut()` from `next-auth/react` in the client nav

---

## Project Structure

```
inventory-app/
├── app/
│   ├── api/                  # REST API routes
│   │   ├── allocations/
│   │   ├── categories/
│   │   ├── customers/
│   │   ├── inventory/
│   │   ├── products/
│   │   ├── scan/             # Barcode/SKU lookup endpoint
│   │   ├── stock-items/
│   │   └── transactions/
│   ├── allocations/          # Allocations UI
│   ├── customers/            # Customer directory UI
│   ├── dashboard/            # Dashboard with KPIs
│   ├── goods-in/             # Record incoming stock
│   ├── goods-out/            # Record outgoing dispatches
│   ├── inventory/            # Stock level overview
│   ├── products/             # Product catalogue
│   ├── settings/             # App settings
│   ├── stock-take/           # Stock counting worksheet
│   ├── layout.tsx            # Root layout (nav + session)
│   └── globals.css
├── components/
│   ├── BarcodeScanner.tsx    # Camera barcode/QR scanner
│   ├── Navigation.tsx        # Sidebar + top bar with user
│   └── StockLevelBadge.tsx
├── lib/
│   └── db.ts                 # Prisma client singleton
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── seed.ts               # Category and reference data seed
│   └── migrations/
├── auth.ts                   # NextAuth configuration
├── middleware.ts             # Route protection (all routes)
└── .github/workflows/
    └── azure.yml             # CI/CD pipeline
```

---

## Database Schema

The core models are:

- **Category** — product categories (Laptops, Switches, etc.)
- **Product** — product definitions with SKU, barcode, category, cost
- **Inventory** — current stock quantity per product
- **StockItem** — individual physical devices (barcode, serial, asset tag, status)
- **Transaction** — goods-in/goods-out events
- **Customer** — customer records with account manager
- **Allocation** — assignment of devices to a customer
- **AllocationItem** — links a specific `StockItem` to an `Allocation`
- **Settings** — key/value store for application settings

---

## CI/CD Pipeline

Every push to `main` triggers the GitHub Actions workflow (`.github/workflows/azure.yml`):

1. **Checkout** code
2. **Install** dependencies (`npm ci`)
3. **Generate** Prisma client (`prisma generate`)
4. **Push** schema to Azure SQL (`prisma db push`)
5. **Seed** reference data (`tsx prisma/seed.ts`)
6. **Build** Next.js production bundle (`next build`)
7. **Deploy** to Azure App Service via publish profile

---

## Environment Variables

| Variable | Where Set | Description |
|---|---|---|
| `DATABASE_URL` | GitHub Secret + Azure App Service | Azure SQL connection string |
| `AZURE_CLIENT_ID` | GitHub Secret + Azure App Service | Entra app registration client ID |
| `AZURE_CLIENT_SECRET` | GitHub Secret + Azure App Service | Entra app registration client secret |
| `AZURE_TENANT_ID` | GitHub Secret + Azure App Service | Entra tenant ID |
| `AUTH_SECRET` | GitHub Secret + Azure App Service | NextAuth signing secret |
| `NEXTAUTH_URL` | Azure App Service | `https://atech-stock-manager.azurewebsites.net` |

---

## Local Development

> Requires Node.js 22 at `C:\Tools\node-v22.14.0-win-arm64` (ARM64 Windows) or standard PATH on other systems.

```powershell
# Windows ARM64 — set PATH first
$env:PATH = "C:\Tools\node-v22.14.0-win-arm64;$env:PATH"

# Install dependencies
npm install

# Copy and fill in environment variables
copy .env.local.example .env.local

# Push schema to your local/dev database
npx prisma db push

# Seed categories
npm run seed

# Start development server
npm run dev
```

Open http://localhost:3000.

---

## Azure Infrastructure

| Resource | Name | Region |
|---|---|---|
| Resource Group | `rg-atech-stock-manager` | UK South |
| SQL Server | `sql-atech-stock-mgr.database.windows.net` | UK South |
| SQL Database | `stock-manager` | UK South |
| App Service Plan | `plan-atech-stock` (B1 Linux) | UK West |
| App Service | `Atech-Stock-Manager` | UK West |

---

## Authentication

Sign-in is handled by Microsoft Entra ID. Only users within the configured tenant (`5b6e60f0-f6fe-49c5-a085-0296faadce46`) can authenticate. The signed-in user's name and a sign-out button are displayed in the top navigation bar.

The Entra app registration requires:
- **Redirect URI:** `https://atech-stock-manager.azurewebsites.net/api/auth/callback/microsoft-entra-id`
- **API permissions:** `User.Read` (delegated)

---

## Using the Application

### Adding a Product
1. Go to **Products → Add New Product**
2. Enter the name, SKU, and select a category
3. Optionally scan the product barcode using the camera icon
4. Set unit cost and reorder point

### Recording Goods In
1. Go to **Goods In**
2. Select the product from the dropdown or scan its barcode
3. In the "Device Barcodes" section, tap **Scan barcodes** to open the camera
4. Scan each individual device — barcodes are added to the list automatically
5. Fill in the reference/PO number and tap **Record Goods In**

### Recording Goods Out
1. Go to **Goods Out**
2. Select the product and customer
3. Enter quantity or scan individual devices
4. Submit to record the dispatch and update stock levels

### Allocations
1. Go to **Allocations → New Allocation**
2. Select product and customer
3. Assign individual `StockItem` records (by barcode/serial)
4. Update status as devices move through the workflow

### Stock Take
1. Go to **Stock Take**
2. Work through the device list, confirming each item present
3. Print the worksheet for physical records

