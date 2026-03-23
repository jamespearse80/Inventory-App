import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, notes } = body

    const stockItemStatusMap: Record<string, 'AVAILABLE' | 'ALLOCATED' | 'DISPATCHED' | 'RETURNED'> = {
      DISPATCHED: 'DISPATCHED',
      RETURNED: 'AVAILABLE',
      CANCELLED: 'AVAILABLE',
    }

    const allocation = await prisma.$transaction(async (tx) => {
      const updated = await tx.allocation.update({
        where: { id },
        data: {
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
        },
        include: {
          product: true,
          customer: true,
          items: { orderBy: { createdAt: 'asc' } },
        },
      })

      // Cascade status to linked StockItems
      if (status && stockItemStatusMap[status]) {
        const linkedItemIds = await tx.allocationItem.findMany({
          where: { allocationId: id, stockItemId: { not: null } },
          select: { stockItemId: true },
        })
        const stockItemIds = linkedItemIds.map(i => i.stockItemId!)
        if (stockItemIds.length > 0) {
          await tx.stockItem.updateMany({
            where: { id: { in: stockItemIds } },
            data: { status: stockItemStatusMap[status] },
          })
        }
      }

      return updated
    })

    return NextResponse.json(allocation)
  } catch {
    return NextResponse.json({ error: 'Failed to update allocation' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await prisma.allocation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete allocation' }, { status: 500 })
  }
}
