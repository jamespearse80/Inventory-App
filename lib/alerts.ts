import { prisma } from './db'
import { sendLowStockEmail } from './graph'
import { sendLowStockTeamsAlert } from './teams'

export async function checkAndSendLowStockAlerts(productId?: string): Promise<void> {
  // Get settings
  const settings = await prisma.settings.findMany()
  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]))

  const alertsEnabled = settingsMap['alerts_enabled'] === 'true'
  if (!alertsEnabled) return

  const emailEnabled = settingsMap['email_alerts_enabled'] === 'true'
  const teamsEnabled = settingsMap['teams_alerts_enabled'] === 'true'
  const fromEmail = settingsMap['alert_from_email']
  const toEmail = settingsMap['alert_to_email']
  const teamsWebhook = settingsMap['teams_webhook_url']

  // Find low stock items
  const where = productId ? { productId } : {}
  const lowStockItems = await prisma.inventory.findMany({
    where: {
      ...where,
      product: {
        reorderPoint: { gt: 0 },
      },
    },
    include: {
      product: true,
    },
  })

  const belowReorder = lowStockItems.filter(
    item => item.quantity <= item.product.reorderPoint
  )

  for (const item of belowReorder) {
    const { product, quantity } = item

    if (emailEnabled && fromEmail && toEmail) {
      try {
        await sendLowStockEmail(fromEmail, toEmail, product.name, product.sku, quantity, product.reorderPoint)
      } catch (e) {
        console.error('Failed to send low stock email alert:', e)
      }
    }

    if (teamsEnabled && teamsWebhook) {
      try {
        await sendLowStockTeamsAlert(teamsWebhook, product.name, product.sku, quantity, product.reorderPoint)
      } catch (e) {
        console.error('Failed to send Teams alert:', e)
      }
    }
  }
}
