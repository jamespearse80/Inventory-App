import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/admin/clear-stock?secret=<ADMIN_SECRET>
// Deletes all transactions, stock items, allocations and resets inventory to 0.
// Protected by a secret token — set ADMIN_SECRET in environment variables.
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
    const [allocationItems, allocations, stockItems, transactions, inventoryRows] =
      await prisma.$transaction([
        prisma.allocationItem.count(),
        prisma.allocation.count(),
        prisma.stockItem.count(),
        prisma.transaction.count(),
        prisma.inventory.count(),
      ])

    await prisma.$transaction([
      prisma.allocationItem.deleteMany(),
      prisma.allocation.deleteMany(),
      prisma.stockItem.deleteMany(),
      prisma.transaction.deleteMany(),
      prisma.inventory.updateMany({ data: { quantity: 0 } }),
    ])

    return NextResponse.json({
      success: true,
      cleared: { allocationItems, allocations, stockItems, transactions, inventoryRowsReset: inventoryRows },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to clear stock'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
