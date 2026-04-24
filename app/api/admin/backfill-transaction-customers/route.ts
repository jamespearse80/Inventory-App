import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// One-time backfill endpoint — secured by ADMIN_SECRET header.
// Matches GOODS_IN transactions with no customer to allocations created
// within 30 seconds for the same product and reference.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const txns = await prisma.transaction.findMany({
    where: { type: 'GOODS_IN', customerId: null },
    select: { id: true, productId: true, reference: true, createdAt: true },
  })

  let updated = 0
  const results: string[] = []

  for (const tx of txns) {
    const windowStart = new Date(tx.createdAt.getTime() - 30_000)
    const windowEnd   = new Date(tx.createdAt.getTime() + 30_000)

    const alloc = await prisma.allocation.findFirst({
      where: {
        productId: tx.productId,
        ...(tx.reference ? { reference: tx.reference } : {}),
        allocatedAt: { gte: windowStart, lte: windowEnd },
      },
      select: { customerId: true },
    })

    if (alloc) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { customerId: alloc.customerId },
      })
      results.push(`Updated ${tx.id}`)
      updated++
    }
  }

  return NextResponse.json({ checked: txns.length, updated, results })
}
