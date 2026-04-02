import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/stock-items/:id  — update mutable fields (currently: location, notes)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    // Only allow safe mutable fields to be updated
    const { location, notes } = body as { location?: string | null; notes?: string | null }

    const updated = await prisma.stockItem.update({
      where: { id },
      data: {
        ...(location !== undefined && { location: location || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update stock item'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
