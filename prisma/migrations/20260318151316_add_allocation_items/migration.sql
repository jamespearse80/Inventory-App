-- CreateTable
CREATE TABLE "AllocationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "allocationId" TEXT NOT NULL,
    "serialNumber" TEXT,
    "assetTag" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllocationItem_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
