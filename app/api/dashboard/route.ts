import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
      totalProducts,
      totalCustomers,
      totalAllocations,
      recentTransactions,
      lowStockItems,
      inventoryData,
      weekTransactions,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.customer.count(),
      prisma.allocation.count({ where: { status: 'ALLOCATED' } }),
      prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { product: true, customer: true },
      }),
      prisma.inventory.findMany({
        where: {
          product: { reorderPoint: { gt: 0 } },
        },
        include: { product: { include: { category: true } } },
      }).then(items => items.filter(i => i.quantity <= i.product.reorderPoint)),
      prisma.inventory.findMany({
        include: {
          product: { include: { category: true } },
        },
      }),
      prisma.transaction.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { type: true, quantity: true, product: { select: { unitCost: true } } },
      }),
    ])

    // Category stock summary
    const categoryStockMap: Record<string, { name: string; quantity: number; count: number }> = {}
    for (const item of inventoryData) {
      const catName = item.product.category.name
      if (!categoryStockMap[catName]) {
        categoryStockMap[catName] = { name: catName, quantity: 0, count: 0 }
      }
      categoryStockMap[catName].quantity += item.quantity
      categoryStockMap[catName].count++
    }

    const totalStockValue = inventoryData.reduce((sum, i) => sum + i.quantity * i.product.unitCost, 0)

    // Net value change from transactions in the last 7 days
    const netWeekChange = weekTransactions.reduce((sum, tx) => {
      const val = tx.quantity * tx.product.unitCost
      return (tx.type === 'GOODS_IN' || tx.type === 'RETURN') ? sum + val : sum - val
    }, 0)

    return NextResponse.json({
      stats: {
        totalProducts,
        totalCustomers,
        activeAllocations: totalAllocations,
        lowStockCount: lowStockItems.length,
        totalStockValue,
        stockValueWeekAgo: totalStockValue - netWeekChange,
      },
      recentTransactions,
      lowStockItems,
      categoryStock: Object.values(categoryStockMap),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
