import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// The 14 SKUs that were seeded as demo data — only these are ever cleared.
// Real products added by users are never touched.
const DEMO_SKUS = [
  'DELL-LAT-5540', 'LEN-TP-L14', 'HP-EB-840G10', 'DELL-OPT-7010', 'HP-ED-800G9',
  'APL-IP15P-256', 'SAM-S24-128', 'CISCO-2960X-24', 'NTGR-GS724T', 'CISCO-MR46',
  'UBNT-U6PRO', 'FTNT-FG40F', 'DELL-P2422H', 'LOGI-MK270',
]

// POST /api/admin/clear-stock?secret=<ADMIN_SECRET>
// Clears stock items, transactions, allocations and resets inventory ONLY for
// the 14 known demo product SKUs. Real products added by users are never affected.
export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'ADMIN_SECRET not configured' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Resolve demo product IDs
    const demoProducts = await prisma.product.findMany({
      where: { sku: { in: DEMO_SKUS } },
      select: { id: true },
    })
    const demoProductIds = demoProducts.map(p => p.id)

    if (demoProductIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No demo products found — nothing to clear.', cleared: {} })
    }

    // Find demo stock items
    const demoStockItems = await prisma.stockItem.findMany({
      where: { productId: { in: demoProductIds } },
      select: { id: true },
    })
    const demoStockItemIds = demoStockItems.map(s => s.id)

    // Find demo allocations
    const demoAllocations = await prisma.allocation.findMany({
      where: { productId: { in: demoProductIds } },
      select: { id: true },
    })
    const demoAllocationIds = demoAllocations.map(a => a.id)

    // Delete in FK-safe order, scoped to demo data only
    const allocationItemsDeleted = await prisma.allocationItem.deleteMany({
      where: { allocationId: { in: demoAllocationIds } },
    })
    const allocationsDeleted = await prisma.allocation.deleteMany({
      where: { id: { in: demoAllocationIds } },
    })
    const stockItemsDeleted = await prisma.stockItem.deleteMany({
      where: { id: { in: demoStockItemIds } },
    })
    const transactionsDeleted = await prisma.transaction.deleteMany({
      where: { productId: { in: demoProductIds } },
    })
    await prisma.inventory.updateMany({
      where: { productId: { in: demoProductIds } },
      data: { quantity: 0 },
    })

    return NextResponse.json({
      success: true,
      message: `Cleared demo data for ${demoProductIds.length} demo products. Real products untouched.`,
      cleared: {
        allocationItems: allocationItemsDeleted.count,
        allocations: allocationsDeleted.count,
        stockItems: stockItemsDeleted.count,
        transactions: transactionsDeleted.count,
        inventoryRowsReset: demoProductIds.length,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to clear stock'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
