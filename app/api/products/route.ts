import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
          { barcode: { contains: search } },
          { manufacturer: { contains: search } },
          { model: { contains: search } },
        ],
      }),
      ...(categoryId && { categoryId }),
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          inventory: true,
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({ products, total, page, limit })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, sku, barcode, description, categoryId, manufacturer, model, unitCost, reorderPoint } = body

    if (!name || !sku || !categoryId) {
      return NextResponse.json({ error: 'Name, SKU, and category are required' }, { status: 400 })
    }

    const product = await prisma.product.create({
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
        inventory: {
          create: { quantity: 0 },
        },
      },
      include: { category: true, inventory: true },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'SKU or barcode already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
