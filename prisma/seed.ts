import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('database.windows.net')

  if (isProduction) {
    console.log('  ℹ Production environment detected — skipping demo data, seeding settings only.')
  } else {
    // Categories (dev/local only)
    const categories = [
    { name: 'Laptops', description: 'Portable computers and notebooks' },
    { name: 'Desktop PCs', description: 'Tower and all-in-one desktop computers' },
    { name: 'Phones', description: 'Mobile phones and smartphones' },
    { name: 'Switches', description: 'Network switches (managed & unmanaged)' },
    { name: 'Access Points', description: 'Wireless access points and WAPs' },
    { name: 'Routers', description: 'Network routers and firewalls' },
    { name: 'Monitors', description: 'Computer monitors and displays' },
    { name: 'Accessories', description: 'Keyboards, mice, cables and peripherals' },
    { name: 'Headsets', description: 'Headsets and earphones' },
    { name: 'Peripherals', description: 'Mice, keyboards, webcams and other peripherals' },
  ]

  const createdCats: Record<string, string> = {}
  for (const cat of categories) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      create: cat,
      update: {},
    })
    createdCats[cat.name] = c.id
    console.log(`  ✓ Category: ${cat.name}`)
  }

  // Products
  const products = [
    { name: 'Dell Latitude 5540', sku: 'DELL-LAT-5540', barcode: '5901234123457', categoryId: createdCats['Laptops'], manufacturer: 'Dell', model: 'Latitude 5540', unitCost: 899.99, reorderPoint: 3 },
    { name: 'Lenovo ThinkPad L14', sku: 'LEN-TP-L14', barcode: '5901234123458', categoryId: createdCats['Laptops'], manufacturer: 'Lenovo', model: 'ThinkPad L14', unitCost: 749.99, reorderPoint: 3 },
    { name: 'HP EliteBook 840 G10', sku: 'HP-EB-840G10', barcode: '5901234123459', categoryId: createdCats['Laptops'], manufacturer: 'HP', model: 'EliteBook 840 G10', unitCost: 1099.99, reorderPoint: 2 },
    { name: 'Dell OptiPlex 7010', sku: 'DELL-OPT-7010', barcode: '5901234123460', categoryId: createdCats['Desktop PCs'], manufacturer: 'Dell', model: 'OptiPlex 7010', unitCost: 599.99, reorderPoint: 2 },
    { name: 'HP EliteDesk 800 G9', sku: 'HP-ED-800G9', barcode: '5901234123461', categoryId: createdCats['Desktop PCs'], manufacturer: 'HP', model: 'EliteDesk 800 G9', unitCost: 649.99, reorderPoint: 2 },
    { name: 'Apple iPhone 15 Pro', sku: 'APL-IP15P-256', barcode: '5901234123462', categoryId: createdCats['Phones'], manufacturer: 'Apple', model: 'iPhone 15 Pro 256GB', unitCost: 1149.99, reorderPoint: 5 },
    { name: 'Samsung Galaxy S24', sku: 'SAM-S24-128', barcode: '5901234123463', categoryId: createdCats['Phones'], manufacturer: 'Samsung', model: 'Galaxy S24 128GB', unitCost: 799.99, reorderPoint: 5 },
    { name: 'Cisco Catalyst 2960X-24', sku: 'CISCO-2960X-24', barcode: '5901234123464', categoryId: createdCats['Switches'], manufacturer: 'Cisco', model: 'Catalyst 2960X-24', unitCost: 1299.99, reorderPoint: 1 },
    { name: 'Netgear ProSAFE GS724T', sku: 'NTGR-GS724T', barcode: '5901234123465', categoryId: createdCats['Switches'], manufacturer: 'Netgear', model: 'ProSAFE GS724T', unitCost: 349.99, reorderPoint: 2 },
    { name: 'Cisco Meraki MR46', sku: 'CISCO-MR46', barcode: '5901234123466', categoryId: createdCats['Access Points'], manufacturer: 'Cisco Meraki', model: 'MR46', unitCost: 699.99, reorderPoint: 2 },
    { name: 'Ubiquiti UniFi U6 Pro', sku: 'UBNT-U6PRO', barcode: '5901234123467', categoryId: createdCats['Access Points'], manufacturer: 'Ubiquiti', model: 'UniFi U6 Pro', unitCost: 179.99, reorderPoint: 3 },
    { name: 'Fortinet FortiGate 40F', sku: 'FTNT-FG40F', barcode: '5901234123468', categoryId: createdCats['Routers'], manufacturer: 'Fortinet', model: 'FortiGate 40F', unitCost: 399.99, reorderPoint: 1 },
    { name: 'Dell 24" Monitor P2422H', sku: 'DELL-P2422H', barcode: '5901234123469', categoryId: createdCats['Monitors'], manufacturer: 'Dell', model: 'P2422H', unitCost: 189.99, reorderPoint: 4 },
    { name: 'Logitech MK270 Combo', sku: 'LOGI-MK270', barcode: '5901234123470', categoryId: createdCats['Accessories'], manufacturer: 'Logitech', model: 'MK270', unitCost: 29.99, reorderPoint: 10 },
  ]

  for (const prod of products) {
    await prisma.product.upsert({
      where: { sku: prod.sku },
      create: {
        ...prod,
        description: `${prod.manufacturer} ${prod.model}`,
        inventory: { create: { quantity: Math.floor(Math.random() * 15) + 1 } },
      },
      update: {},
    })
    console.log(`  ✓ Product: ${prod.name}`)
  }

  // Sample customers
  const customers = [
    { name: 'Acme Corporation', email: 'it@acme.com', phone: '01234 567890', company: 'Acme Corp', address: '1 Business Park, London EC1A 1AA' },
    { name: 'TechStart Ltd', email: 'admin@techstart.co.uk', phone: '01234 567891', company: 'TechStart Ltd', address: '42 Innovation Drive, Manchester M1 2AB' },
    { name: 'Global Finance PLC', email: 'procurement@globalfinance.co.uk', company: 'Global Finance PLC', address: 'Canary Wharf, London E14 5HQ' },
    { name: 'NHS Trust IT', email: 'it.procurement@nhstrust.nhs.uk', company: 'NHS Foundation Trust', phone: '01234 555000' },
  ]

  for (const cust of customers) {
    const existing = await prisma.customer.findFirst({ where: { email: cust.email || undefined } })
    if (!existing) {
      await prisma.customer.create({ data: cust })
      console.log(`  ✓ Customer: ${cust.name}`)
    }
  }
  } // end !isProduction block

  // Default settings — always applied
  await prisma.settings.upsert({
    where: { key: 'alerts_enabled' },
    create: { id: 'alerts_enabled', key: 'alerts_enabled', value: 'false' },
    update: {},
  })
  await prisma.settings.upsert({
    where: { key: 'company_name' },
    create: { id: 'company_name', key: 'company_name', value: 'My Company' },
    update: {},
  })

  console.log('\n✅ Seed complete!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
