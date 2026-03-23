import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ id: string; itemId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { itemId } = await params
    const body = await req.json()
    const { serialNumber, assetTag, notes } = body

    const item = await prisma.allocationItem.update({
      where: { id: itemId },
      data: {
        serialNumber: serialNumber !== undefined ? (serialNumber?.trim() || null) : undefined,
        assetTag: assetTag !== undefined ? (assetTag?.trim() || null) : undefined,
        notes: notes !== undefined ? (notes?.trim() || null) : undefined,
      },
    })
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}
