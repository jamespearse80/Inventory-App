'use client'

import { useEffect, useState, Fragment } from 'react'
import Link from 'next/link'
import {
  Package,
  Users,
  Layers,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import StockLevelBadge from '@/components/StockLevelBadge'

interface DashboardData {
  stats: {
    totalProducts: number
    totalCustomers: number
    activeAllocations: number
    lowStockCount: number
    totalStockValue: number
    stockValueWeekAgo: number
  }
  recentTransactions: Array<{
    id: string
    type: string
    quantity: number
    reference: string | null
    createdAt: string
    product: { name: string; sku: string }
    customer: { name: string } | null
  }>
  lowStockItems: Array<{
    id: string
    quantity: number
    product: { id: string; name: string; sku: string; reorderPoint: number; category: { name: string } }
  }>
  categoryStock: Array<{ name: string; quantity: number; count: number }>
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  href,
  subtitle,
  trend,
}: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  href?: string
  subtitle?: string
  trend?: { change: number; pct: number }
}) {
  const content = (
    <div className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`inline-flex items-center gap-1 text-xs mt-2 font-medium px-1.5 py-0.5 rounded-md ${
              trend.change > 0 ? 'text-green-700 bg-green-50' :
              trend.change < 0 ? 'text-red-600 bg-red-50' :
              'text-gray-500 bg-gray-50'
            }`}>
              {trend.change > 0 ? <TrendingUp className="h-3 w-3" /> : trend.change < 0 ? <TrendingDown className="h-3 w-3" /> : null}
              <span>
                {trend.change >= 0 ? '+' : ''}
                £{Math.abs(trend.change).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {' '}({trend.change >= 0 ? '+' : ''}{trend.pct.toFixed(1)}%)
              </span>
              <span className="font-normal text-gray-400">vs last wk</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color.replace('text-', 'bg-').replace('-600', '-100').replace('-700', '-100').replace('-500', '-100')}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

const typeColors: Record<string, string> = {
  GOODS_IN: 'text-green-600 bg-green-50',
  GOODS_OUT: 'text-red-600 bg-red-50',
  ADJUSTMENT: 'text-[#C49A2A] bg-amber-50',
  RETURN: 'text-purple-600 bg-purple-50',
}

const typeIcons: Record<string, React.ElementType> = {
  GOODS_IN: ArrowDownToLine,
  GOODS_OUT: ArrowUpFromLine,
  ADJUSTMENT: RefreshCw,
  RETURN: Package,
}

interface DispatchedItem {
  id: string
  barcode: string | null
  serialNumber: string | null
  assetTag: string | null
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [expandedTx, setExpandedTx] = useState<Record<string, DispatchedItem[] | 'loading'>>({})

  const fetchData = async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        setData(await res.json())
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const toggleTx = async (txId: string) => {
    if (expandedTx[txId]) {
      setExpandedTx(prev => { const n = { ...prev }; delete n[txId]; return n })
      return
    }
    setExpandedTx(prev => ({ ...prev, [txId]: 'loading' }))
    const res = await fetch(`/api/stock-items?transactionId=${txId}&includeProduct=false`)
    const items: DispatchedItem[] = res.ok ? await res.json() : []
    setExpandedTx(prev => ({ ...prev, [txId]: items }))
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C49A2A]"></div>
      </div>
    )
  }

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      {error && <p className="text-red-500">Failed to load dashboard.</p>}
      <button
        onClick={fetchData}
        className="flex items-center gap-2 text-sm text-[#C49A2A] hover:text-[#A07818]"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </div>
  )

  const { stats, recentTransactions, lowStockItems, categoryStock } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 text-sm text-[#C49A2A] hover:text-[#A07818]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
          color="text-[#C49A2A]"
          href="/products"
        />
        <StatCard
          title="Customers"
          value={stats.totalCustomers}
          icon={Users}
          color="text-indigo-600"
          href="/customers"
        />
        <StatCard
          title="Active Allocations"
          value={stats.activeAllocations}
          icon={Layers}
          color="text-purple-600"
          href="/allocations"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockCount}
          icon={AlertTriangle}
          color={stats.lowStockCount > 0 ? 'text-orange-600' : 'text-green-600'}
          href="/inventory?filter=low"
        />
        <StatCard
          title="Stock Value"
          value={`£${stats.totalStockValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={stats.totalStockValue >= stats.stockValueWeekAgo ? TrendingUp : TrendingDown}
          color="text-teal-600"
          subtitle="Based on unit cost"
          trend={{
            change: stats.totalStockValue - stats.stockValueWeekAgo,
            pct: stats.stockValueWeekAgo > 0
              ? ((stats.totalStockValue - stats.stockValueWeekAgo) / stats.stockValueWeekAgo) * 100
              : 0,
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category stock chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Stock by Category</h2>
          {categoryStock.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No inventory data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryStock} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#C49A2A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Low stock alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Low Stock Alerts</h2>
            <Link href="/inventory?filter=low" className="text-xs text-[#C49A2A] hover:underline">
              View all
            </Link>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              ✅ All stock levels are healthy
            </p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {lowStockItems.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <Link href={`/products/${item.product.id}`} className="text-sm font-medium text-gray-800 hover:text-[#C49A2A]">
                      {item.product.name}
                    </Link>
                    <p className="text-xs text-gray-400">{item.product.sku} · {item.product.category.name}</p>
                  </div>
                  <StockLevelBadge quantity={item.quantity} reorderPoint={item.product.reorderPoint} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Recent Transactions</h2>
          <Link href="/goods-in" className="text-xs text-[#C49A2A] hover:underline">
            New transaction
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                  <th className="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Customer</th>
                  <th className="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentTransactions.map(tx => {
                  const Icon = typeIcons[tx.type] || Package
                  const isExpanded = !!expandedTx[tx.id]
                  const dispatchedItems = expandedTx[tx.id]
                  return (
                    <Fragment key={tx.id}>
                      <tr
                        className={`hover:bg-gray-50 ${tx.type === 'GOODS_OUT' ? 'cursor-pointer' : ''}`}
                        onClick={() => tx.type === 'GOODS_OUT' ? toggleTx(tx.id) : undefined}
                      >
                        <td className="py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[tx.type] || ''}`}>
                            {tx.type === 'GOODS_OUT' ? (
                              isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                            ) : (
                              <Icon className="h-3 w-3" />
                            )}
                            {tx.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2 font-medium text-gray-800">{tx.product.name}</td>
                        <td className="py-2 text-gray-600">{tx.quantity}</td>
                        <td className="py-2 text-gray-500 hidden sm:table-cell">{tx.customer?.name || '—'}</td>
                        <td className="py-2 text-gray-400 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            {new Date(tx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            {tx.reference && (
                              <Link
                                href={`/goods-out/invoice?ref=${encodeURIComponent(tx.reference)}`}
                                onClick={e => e.stopPropagation()}
                                className="text-[#C49A2A] hover:text-[#A07818]"
                                title={`View invoice ${tx.reference}`}
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                      {tx.type === 'GOODS_OUT' && isExpanded && (
                        <tr>
                          <td colSpan={5} className="pb-2 px-0">
                            <div className="ml-6 bg-red-50 border border-red-100 rounded-lg p-3">
                              {dispatchedItems === 'loading' ? (
                                <p className="text-xs text-gray-400">Loading dispatched items…</p>
                              ) : dispatchedItems.length === 0 ? (
                                <p className="text-xs text-gray-400">No individual asset records for this dispatch.</p>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Dispatched assets</p>
                                  {dispatchedItems.map(item => (
                                    <div key={item.id} className="flex flex-wrap gap-2 text-xs">
                                      {item.barcode && <span className="bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">Barcode: {item.barcode}</span>}
                                      {item.serialNumber && item.serialNumber !== item.barcode && <span className="bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">S/N: {item.serialNumber}</span>}
                                      {item.assetTag && <span className="bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">Asset: {item.assetTag}</span>}
                                      {!item.barcode && !item.serialNumber && !item.assetTag && <span className="text-gray-400">ID: {item.id.slice(0, 8)}…</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
