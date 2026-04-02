/**
 * Clear all stock/transaction data while keeping products, categories,
 * customers, and settings.
 *
 * Clears (in FK-safe order):
 *   AllocationItem → Allocation → StockItem → Transaction → Inventory (reset to 0)
 *
 * Run with: node scripts/clearStock.mjs
 */
import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

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
  console.error('This script only supports a local SQLite DATABASE_URL (file:./dev.db).')
  process.exit(1)
}

const dbFile = resolve(fileURLToPath(import.meta.url), '../..', dbUrl.replace(/^file:/, ''))
console.log(`Clearing stock data from ${dbFile}…`)

const db = new DatabaseSync(dbFile)

// Counts before
const before = {
  allocationItems: db.prepare('SELECT COUNT(*) as n FROM AllocationItem').get().n,
  allocations:     db.prepare('SELECT COUNT(*) as n FROM Allocation').get().n,
  stockItems:      db.prepare('SELECT COUNT(*) as n FROM StockItem').get().n,
  transactions:    db.prepare('SELECT COUNT(*) as n FROM "Transaction"').get().n,
  inventoryRows:   db.prepare('SELECT COUNT(*) as n FROM Inventory').get().n,
}

// Delete in FK-safe order
db.exec('DELETE FROM AllocationItem')
db.exec('DELETE FROM Allocation')
db.exec('DELETE FROM StockItem')
db.exec('DELETE FROM "Transaction"')
db.exec('UPDATE Inventory SET quantity = 0')

db.close()

console.log('✅ Done:')
console.log(`  AllocationItem : ${before.allocationItems} removed`)
console.log(`  Allocation     : ${before.allocations} removed`)
console.log(`  StockItem      : ${before.stockItems} removed`)
console.log(`  Transaction    : ${before.transactions} removed`)
console.log(`  Inventory      : ${before.inventoryRows} row(s) reset to qty 0`)
