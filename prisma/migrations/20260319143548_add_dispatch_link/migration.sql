-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StockItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "barcode" TEXT,
    "serialNumber" TEXT,
    "assetTag" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "notes" TEXT,
    "receivedRef" TEXT,
    "dispatchedTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockItem_dispatchedTransactionId_fkey" FOREIGN KEY ("dispatchedTransactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StockItem" ("assetTag", "barcode", "createdAt", "id", "location", "notes", "productId", "receivedRef", "serialNumber", "status", "updatedAt") SELECT "assetTag", "barcode", "createdAt", "id", "location", "notes", "productId", "receivedRef", "serialNumber", "status", "updatedAt" FROM "StockItem";
DROP TABLE "StockItem";
ALTER TABLE "new_StockItem" RENAME TO "StockItem";
CREATE UNIQUE INDEX "StockItem_barcode_key" ON "StockItem"("barcode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
