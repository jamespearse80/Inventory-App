import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId') || undefined
    const productId = searchParams.get('productId') || undefined
    const status = searchParams.get('status') || undefined

    const allocations = await prisma.allocation.findMany({
      where: {
        ...(customerId && { customerId }),
        ...(productId && { productId }),
        ...(status && { status: status as 'PENDING' | 'ALLOCATED' | 'DISPATCHED' | 'RETURNED' | 'CANCELLED' }),
      },
      include: {
        product: { include: { category: true } },
        customer: true,
        items: {
          orderBy: { createdAt: 'asc' },
          include: { stockItem: { select: { barcode: true, location: true } } },
        },
      },
      orderBy: { allocatedAt: 'desc' },
    })
    return NextResponse.json(allocations)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch allocations' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { productId, customerId, quantity, reference, notes, serialNumbers, stockItemIds } = body

    if (!productId || !customerId) {
      return NextResponse.json({ error: 'productId and customerId are required' }, { status: 400 })
    }

    // ── Per-device allocation using tracked StockItems ────────────────────────
    if (Array.isArray(stockItemIds) && stockItemIds.length > 0) {
      const qty = stockItemIds.length

      const stockItems = await prisma.stockItem.findMany({
        where: { id: { in: stockItemIds }, productId, status: 'AVAILABLE' },
      })
      if (stockItems.length !== qty) {
        return NextResponse.json({
          error: `${qty - stockItems.length} device(s) are no longer available`,
        }, { status: 400 })
      }

      const allocation = await prisma.$transaction(async (tx) => {
        const alloc = await tx.allocation.create({
          data: {
            productId,
            customerId,
            quantity: qty,
            reference: reference || null,
            notes: notes || null,
            status: 'ALLOCATED',
            items: {
              create: stockItems.map(si => ({
                stockItemId: si.id,
                serialNumber: si.serialNumber || si.barcode || null,
                assetTag: si.assetTag || null,
                notes: si.notes || null,
              })),
            },
          },
          include: {
            product: { include: { category: true } },
            customer: true,
            items: { orderBy: { createdAt: 'asc' } },
          },
        })

        await tx.stockItem.updateMany({
          where: { id: { in: stockItemIds } },
          data: { status: 'ALLOCATED' },
        })

        return alloc
      })

      return NextResponse.json(allocation, { status: 201 })
    }

    // ── Legacy bulk allocation ─────────────────────────────────────────────────
    if (!quantity) {
      return NextResponse.json({ error: 'quantity or stockItemIds is required' }, { status: 400 })
    }

    const qty = parseInt(quantity)
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive integer' }, { status: 400 })
    }

    // Check available stock
    const inventory = await prisma.inventory.findUnique({ where: { productId } })
    if (!inventory || inventory.quantity < qty) {
      return NextResponse.json({
        error: `Insufficient stock. Available: ${inventory?.quantity ?? 0}`,
      }, { status: 400 })
    }

    // Build per-item rows — use provided serial numbers or create blank placeholders
    const itemsData = Array.from({ length: qty }, (_, i) => {
      const raw = (serialNumbers as string[] | undefined)?.[i]?.trim() ?? ''
      return { serialNumber: raw || null, assetTag: null, notes: null }
    })

    const allocation = await prisma.allocation.create({
      data: {
        productId,
        customerId,
        quantity: qty,
        reference: reference || null,
        notes: notes || null,
        status: 'ALLOCATED',
        items: { create: itemsData },
      },
      include: {
        product: { include: { category: true } },
        customer: true,
        items: { orderBy: { createdAt: 'asc' } },
      },
    })
    return NextResponse.json(allocation, { status: 201 })
  } catch (err) {
    console.error('[POST /api/allocations]', err)
    const message = err instanceof Error ? err.message : 'Failed to create allocation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
