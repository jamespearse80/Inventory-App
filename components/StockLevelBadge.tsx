interface StockLevelBadgeProps {
  quantity: number
  reorderPoint: number
  showCount?: boolean
}

export default function StockLevelBadge({ quantity, reorderPoint, showCount = true }: StockLevelBadgeProps) {
  let colorClass = 'bg-green-100 text-green-800'
  let label = 'In Stock'

  if (quantity === 0) {
    colorClass = 'bg-red-100 text-red-800'
    label = 'Out of Stock'
  } else if (quantity <= reorderPoint) {
    colorClass = 'bg-yellow-100 text-yellow-800'
    label = 'Low Stock'
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {showCount && <span className="font-bold">{quantity}</span>}
      <span>{label}</span>
    </span>
  )
}
