/**
 * Seed stock locations into the Settings table.
 * Run with: node scripts/seedLocations.mjs
 *       or: npm run seed:locations
 *
 * Uses the built-in node:sqlite module (Node.js 22+) to bypass the
 * ARM64-incompatible Prisma native binary.
 */
import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

// Resolve the DATABASE_URL from .env (simple key=value parse, no dotenv dep needed)
const envPath = resolve(fileURLToPath(import.meta.url), '../../.env')
let dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  try {
    const envContent = readFileSync(envPath, 'utf8')
    const match = envContent.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m)
    if (match) dbUrl = match[1]
  } catch { /* ignore */ }
}

if (!dbUrl || !dbUrl.startsWith('file:')) {
  console.error('This seed script only supports a local SQLite DATABASE_URL (file:./dev.db).')
  console.error('For Azure SQL, run "npm run seed:locations:api" with the app running, or use the Settings page.')
  process.exit(1)
}

const dbFile = resolve(fileURLToPath(import.meta.url), '../..', dbUrl.replace(/^file:/, ''))

const aisleLocations = (aislePrefix, groupLabel) =>
  ['01', '02', '03', '04'].flatMap(bay =>
    [1, 2, 3, 4].map(shelf => ({
      code: `${aislePrefix}${bay}-${shelf}-1`,
      group: groupLabel,
    }))
  )

const LOCATIONS = [
  ...aisleLocations('A', 'Swindon Office \u2014 Aisle A'),
  ...aisleLocations('B', 'Swindon Office \u2014 Aisle B'),
  { code: 'IN-TRANSIT (Distribution -> Swindon)', group: 'In Transit' },
  { code: 'IN-TRANSIT (Swindon -> Customer)',     group: 'In Transit' },
]

console.log(`Seeding ${LOCATIONS.length} stock locations into ${dbFile}\u2026`)

const db = new DatabaseSync(dbFile)
const value = JSON.stringify(LOCATIONS)

db.exec(`
  INSERT INTO Settings (id, key, value)
  VALUES ('stock_locations', 'stock_locations', '${value.replace(/'/g, "''")}')
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`)

db.close()

console.log('\u2705 Locations seeded:')
const groups = {}
for (const loc of LOCATIONS) {
  if (!groups[loc.group]) groups[loc.group] = []
  groups[loc.group].push(loc.code)
}
for (const [group, codes] of Object.entries(groups)) {
  console.log(`  ${group}: ${codes.join(', ')}`)
}

