-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "barcode" TEXT,
    "serialNumber" TEXT,
    "assetTag" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "notes" TEXT,
    "receivedRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AllocationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allocationId" TEXT NOT NULL,
    "stockItemId" TEXT,
    "serialNumber" TEXT,
    "assetTag" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllocationItem_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AllocationItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AllocationItem" ("allocationId", "assetTag", "createdAt", "id", "notes", "serialNumber", "updatedAt") SELECT "allocationId", "assetTag", "createdAt", "id", "notes", "serialNumber", "updatedAt" FROM "AllocationItem";
DROP TABLE "AllocationItem";
ALTER TABLE "new_AllocationItem" RENAME TO "AllocationItem";
CREATE UNIQUE INDEX "AllocationItem_stockItemId_key" ON "AllocationItem"("stockItemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_barcode_key" ON "StockItem"("barcode");
