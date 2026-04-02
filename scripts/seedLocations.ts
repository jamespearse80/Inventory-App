/**
 * Seed stock locations into the Settings table.
 * Run with: npx tsx scripts/seedLocations.ts
 */
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

interface LocationEntry {
  code: string
  group: string
}

const aisleLocations = (aislePrefix: string, groupLabel: string): LocationEntry[] =>
  ['01', '02', '03', '04'].flatMap(bay =>
    [1, 2, 3, 4].map(shelf => ({
      code: `${aislePrefix}${bay}-${shelf}-1`,
      group: groupLabel,
    }))
  )

const LOCATIONS: LocationEntry[] = [
  ...aisleLocations('A', 'Swindon Office — Aisle A'),
  ...aisleLocations('B', 'Swindon Office — Aisle B'),
  { code: 'IN-TRANSIT (Distribution -> Swindon)', group: 'In Transit' },
  { code: 'IN-TRANSIT (Swindon -> Customer)',     group: 'In Transit' },
]

async function main() {
  console.log(`Seeding ${LOCATIONS.length} stock locations…`)

  await prisma.settings.upsert({
    where:  { key: 'stock_locations' },
    create: { id: 'stock_locations', key: 'stock_locations', value: JSON.stringify(LOCATIONS) },
    update: { value: JSON.stringify(LOCATIONS) },
  })

  console.log('✅ Locations seeded:')
  const groups = LOCATIONS.reduce<Record<string, string[]>>((acc, l) => {
    if (!acc[l.group]) acc[l.group] = []
    acc[l.group].push(l.code)
    return acc
  }, {})
  for (const [group, codes] of Object.entries(groups)) {
    console.log(`  ${group}: ${codes.join(', ')}`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
