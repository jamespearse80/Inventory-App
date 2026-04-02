import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAndSendLowStockAlerts } from '@/lib/alerts'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, productId, customerId, quantity, reference, notes, performedBy, deviceBarcodes, location, allocateToCustomerId } = body

    if (!type || !productId || !quantity) {
      return NextResponse.json({ error: 'type, productId, and quantity are required' }, { status: 400 })
    }

    const qty = parseInt(quantity)
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive integer' }, { status: 400 })
    }

    // Check product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true },
    })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    // Validate sufficient stock for outbound transactions
    if (type === 'GOODS_OUT' || type === 'ADJUSTMENT') {
      const currentQty = product.inventory?.quantity || 0
      if (type === 'GOODS_OUT' && currentQty < qty) {
        return NextResponse.json({
          error: `Insufficient stock. Available: ${currentQty}, Requested: ${qty}`,
        }, { status: 400 })
      }
    }

    // Create transaction and update inventory in a single atomic operation
    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          type,
          productId,
          customerId: customerId || null,
          quantity: qty,
          reference: reference || null,
          notes: notes || null,
          performedBy: performedBy || null,
        },
        include: { product: true, customer: true },
      })

      await tx.inventory.upsert({
        where: { productId },
        create: {
          productId,
          quantity: type === 'GOODS_IN' || type === 'RETURN' ? qty : 0,
        },
        update: {
          quantity: {
            increment: type === 'GOODS_IN' || type === 'RETURN' ? qty : -qty,
          },
        },
      })

      // Create individual StockItems when device barcodes are provided on Goods In
      if (type === 'GOODS_IN' && Array.isArray(deviceBarcodes) && deviceBarcodes.length > 0) {
        const createdStockItems: { id: string }[] = []
        for (const raw of deviceBarcodes) {
          const barcode = typeof raw === 'string' ? raw.trim() : ''
          const si = await tx.stockItem.create({
            data: {
              productId,
              barcode: barcode || null,
              serialNumber: barcode || null,
              status: allocateToCustomerId ? 'ALLOCATED' : 'AVAILABLE',
              receivedRef: reference || null,
              location: location || null,
            },
          })
          createdStockItems.push({ id: si.id })
        }

        // Immediately allocate to customer if requested
        if (allocateToCustomerId && createdStockItems.length > 0) {
          await tx.allocation.create({
            data: {
              productId,
              customerId: allocateToCustomerId,
              quantity: createdStockItems.length,
              reference: reference || null,
              notes: notes || null,
              status: 'ALLOCATED',
              items: {
                create: createdStockItems.map(si => ({ stockItemId: si.id })),
              },
            },
          })
        }
      }

      // Mark oldest AVAILABLE StockItems as DISPATCHED when stock goes out
      if (type === 'GOODS_OUT') {
        const availableItems = await tx.stockItem.findMany({
          where: { productId, status: 'AVAILABLE' },
          orderBy: { createdAt: 'asc' },
          take: qty,
          select: { id: true },
        })
        if (availableItems.length > 0) {
          await tx.stockItem.updateMany({
            where: { id: { in: availableItems.map(i => i.id) } },
            data: { status: 'DISPATCHED', dispatchedTransactionId: created.id, location: 'IN-TRANSIT (Swindon -> Customer)' },
          })
        }
      }

      return created
    })

    // Check low stock alerts asynchronously
    checkAndSendLowStockAlerts(productId).catch(console.error)

    return NextResponse.json(transaction, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || undefined
    const productId = searchParams.get('productId') || undefined
    const customerId = searchParams.get('customerId') || undefined
    const reference = searchParams.get('reference') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where = {
      ...(type && { type: type as 'GOODS_IN' | 'GOODS_OUT' | 'ADJUSTMENT' | 'RETURN' }),
      ...(productId && { productId }),
      ...(customerId && { customerId }),
      ...(reference && { reference }),
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          product: { include: { category: true } },
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    return NextResponse.json({ transactions, total, page, limit })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
