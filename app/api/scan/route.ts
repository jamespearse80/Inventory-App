import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const barcode = searchParams.get('barcode')
    const sku = searchParams.get('sku')

    if (!barcode && !sku) {
      return NextResponse.json({ error: 'barcode or sku parameter required' }, { status: 400 })
    }

    const product = await prisma.product.findFirst({
      where: barcode ? { barcode } : { sku: sku! },
      include: {
        category: true,
        inventory: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
