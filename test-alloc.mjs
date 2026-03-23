import { PrismaClient } from './node_modules/.prisma/client/index.js'
const prisma = new PrismaClient()

try {
  const [inv, cust] = await Promise.all([
    prisma.inventory.findFirst({ include: { product: true } }),
    prisma.customer.findFirst()
  ])
  console.log('productId:', inv?.productId, 'stock:', inv?.quantity)
  console.log('customerId:', cust?.id)

  if (!inv || !cust) { console.log('No data found'); process.exit(1) }

  // Try creating an allocation
  const result = await prisma.allocation.create({
    data: {
      productId: inv.productId,
      customerId: cust.id,
      quantity: 1,
      reference: 'TEST',
      status: 'ALLOCATED',
      items: { create: [{ serialNumber: 'TEST-SN-001', assetTag: null, notes: null }] }
    },
    include: {
      product: { include: { category: true } },
      customer: true,
      items: { orderBy: { createdAt: 'asc' } }
    }
  })
  console.log('SUCCESS - Allocation created:', result.id, 'items:', result.items.length)

  // Clean up test record
  await prisma.allocation.delete({ where: { id: result.id } })
  console.log('Test record cleaned up.')
} catch (e) {
  console.error('ERROR:', e.message)
  console.error(e)
} finally {
  await prisma.$disconnect()
}
