import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventory: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { customer: true },
        },
        allocations: {
          include: { customer: true },
          orderBy: { allocatedAt: 'desc' },
        },
      },
    })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    return NextResponse.json(product)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, sku, barcode, description, categoryId, manufacturer, model, unitCost, reorderPoint } = body

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        sku,
        barcode: barcode || null,
        description: description || null,
        categoryId,
        manufacturer: manufacturer || null,
        model: model || null,
        unitCost: unitCost ? parseFloat(unitCost) : 0,
        reorderPoint: reorderPoint ? parseInt(reorderPoint) : 5,
      },
      include: { category: true, inventory: true },
    })
    return NextResponse.json(product)
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    // Delete dependent records in safe order inside a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Nullify AllocationItem.stockItemId for devices belonging to this product
      //    (stockItemId is nullable, so we can detach before deleting StockItems)
      await tx.allocationItem.updateMany({
        where: { stockItem: { productId: id } },
        data: { stockItemId: null },
      })
      // 2. Delete individual device records
      await tx.stockItem.deleteMany({ where: { productId: id } })
      // 3. Delete transaction log entries
      await tx.transaction.deleteMany({ where: { productId: id } })
      // 4. Delete allocations (cascades to their AllocationItems via onDelete: Cascade)
      await tx.allocation.deleteMany({ where: { productId: id } })
      // 5. Delete inventory record
      await tx.inventory.deleteMany({ where: { productId: id } })
      // 6. Delete the product
      await tx.product.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
