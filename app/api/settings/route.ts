import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const ALLOWED_KEYS = [
  'alerts_enabled',
  'email_alerts_enabled',
  'teams_alerts_enabled',
  'alert_from_email',
  'alert_to_email',
  'teams_webhook_url',
  'company_name',
  'low_stock_check_interval',
  'stock_locations',
]

export async function GET() {
  try {
    const settings = await prisma.settings.findMany()
    const map = Object.fromEntries(settings.map(s => [s.key, s.value]))
    return NextResponse.json(map)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate keys to prevent storing arbitrary data
    const updates = Object.entries(body).filter(([key]) => ALLOWED_KEYS.includes(key))

    await prisma.$transaction(
      updates.map(([key, value]) =>
        prisma.settings.upsert({
          where: { key },
          create: { id: key, key, value: String(value) },
          update: { value: String(value) },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
