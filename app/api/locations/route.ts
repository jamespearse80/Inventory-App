import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export interface LocationEntry {
  code: string
  group: string
}

// Default locations — used as fallback if the DB setting hasn't been seeded yet
export const DEFAULT_LOCATIONS: LocationEntry[] = [
  // Swindon Office — Aisle A
  ...(['A01', 'A02', 'A03', 'A04'] as const).flatMap(bay =>
    ([1, 2, 3, 4] as const).map(shelf => ({
      code: `${bay}-${shelf}-1`,
      group: 'Swindon Office — Aisle A',
    }))
  ),
  // Swindon Office — Aisle B
  ...(['B01', 'B02', 'B03', 'B04'] as const).flatMap(bay =>
    ([1, 2, 3, 4] as const).map(shelf => ({
      code: `${bay}-${shelf}-1`,
      group: 'Swindon Office — Aisle B',
    }))
  ),
  // In Transit
  { code: 'IN-TRANSIT (Distribution -> Swindon)', group: 'In Transit' },
  { code: 'IN-TRANSIT (Swindon -> Customer)',     group: 'In Transit' },
]

export async function GET() {
  try {
    const setting = await prisma.settings.findUnique({ where: { key: 'stock_locations' } })
    if (setting) {
      return NextResponse.json(JSON.parse(setting.value) as LocationEntry[])
    }
    return NextResponse.json(DEFAULT_LOCATIONS)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
  }
}
