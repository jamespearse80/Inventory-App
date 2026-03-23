import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''

    const customers = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { company: { contains: search } },
            ],
          }
        : undefined,
      include: {
        _count: { select: { allocations: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(customers)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, company, address, accountManager } = body
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const customer = await prisma.customer.create({
      data: { name, email: email || null, phone: phone || null, company: company || null, address: address || null, accountManager: accountManager || null },
    })
    return NextResponse.json(customer, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}
