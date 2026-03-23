import axios from 'axios'

export interface TeamsCardPayload {
  title: string
  message: string
  color?: 'good' | 'warning' | 'attention' | 'default'
  facts?: { name: string; value: string }[]
}

export async function sendTeamsNotification(
  webhookUrl: string,
  payload: TeamsCardPayload
): Promise<void> {
  const themeColor =
    payload.color === 'good'
      ? '00CC00'
      : payload.color === 'warning'
      ? 'FF8800'
      : payload.color === 'attention'
      ? 'CC0000'
      : '0078D4'

  const card = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor,
    summary: payload.title,
    sections: [
      {
        activityTitle: payload.title,
        activityText: payload.message,
        facts: payload.facts || [],
        markdown: true,
      },
    ],
  }

  await axios.post(webhookUrl, card, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  })
}

export async function sendLowStockTeamsAlert(
  webhookUrl: string,
  productName: string,
  sku: string,
  currentQty: number,
  reorderPoint: number
): Promise<void> {
  await sendTeamsNotification(webhookUrl, {
    title: '⚠️ Low Stock Alert',
    message: `Stock level for **${productName}** has fallen below the reorder point.`,
    color: 'warning',
    facts: [
      { name: 'Product', value: productName },
      { name: 'SKU', value: sku },
      { name: 'Current Stock', value: currentQty.toString() },
      { name: 'Reorder Point', value: reorderPoint.toString() },
    ],
  })
}
