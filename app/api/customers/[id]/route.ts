import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        allocations: {
          include: { product: { include: { category: true } } },
          orderBy: { allocatedAt: 'desc' },
        },
        transactions: {
          include: { product: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    return NextResponse.json(customer)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, email, phone, company, address, accountManager } = body
    const customer = await prisma.customer.update({
      where: { id },
      data: { name, email: email || null, phone: phone || null, company: company || null, address: address || null, accountManager: accountManager || null },
    })
    return NextResponse.json(customer)
  } catch {
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await prisma.customer.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}
