import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/stock-items?productId=&status=&includeProduct=true&transactionId=&customerId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId') || undefined
    const status = searchParams.get('status') || undefined
    const includeProduct = searchParams.get('includeProduct') === 'true'
    const transactionId = searchParams.get('transactionId') || undefined
    const customerId = searchParams.get('customerId') || undefined

    const items = await prisma.stockItem.findMany({
      where: {
        ...(productId && { productId }),
        ...(status && { status: status as 'AVAILABLE' | 'ALLOCATED' | 'DISPATCHED' | 'RETURNED' | 'RETIRED' }),
        ...(transactionId && { dispatchedTransactionId: transactionId }),
        ...(customerId && { allocationItem: { allocation: { customerId } } }),
      },
      include: includeProduct ? { product: { include: { category: true } } } : undefined,
      orderBy: [{ productId: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stock items' }, { status: 500 })
  }
}
