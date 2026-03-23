import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lowStock = searchParams.get('lowStock') === 'true'

    const inventory = await prisma.inventory.findMany({
      include: {
        product: {
          include: { category: true },
        },
      },
      orderBy: {
        product: { name: 'asc' },
      },
    })

    if (lowStock) {
      return NextResponse.json(
        inventory.filter(i => i.quantity <= i.product.reorderPoint)
      )
    }

    return NextResponse.json(inventory)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}
