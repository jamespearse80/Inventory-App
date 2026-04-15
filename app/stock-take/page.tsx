'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { Printer, RefreshCw, CheckSquare, Square, CheckCircle2, AlertCircle, Filter, Package, Users } from 'lucide-react'

interface StockItem {
  id: string
  barcode: string | null
  serialNumber: string | null
  assetTag: string | null
  status: string
  location: string | null
  notes: string | null
  createdAt: string
  product: {
    id: string
    name: string
    sku: string
    manufacturer: string | null
    model: string | null
    category: { name: string }
  }
}

interface InventoryRecord {
  id: string
  quantity: number
  location: string | null
  product: {
    id: string
    name: string
    sku: string
    manufacturer: string | null
    model: string | null
    category: { name: string }
  }
}

interface ProductGroup {
  productId: string
  productName: string
  sku: string
  category: string
  manufacturer: string | null
  inventoryQty: number
  stockItems: StockItem[]
}

interface Customer {
  id: string
  name: string
  company: string | null
}

type CountedMap = Record<string, boolean>

function buildGroups(inventory: InventoryRecord[], stockItems: StockItem[]): ProductGroup[] {
  const stockByProduct: Record<string, StockItem[]> = {}
  for (const item of stockItems) {
    if (!stockByProduct[item.product.id]) stockByProduct[item.product.id] = []
    stockByProduct[item.product.id].push(item)
  }

  const groups: ProductGroup[] = []
  const seen = new Set<string>()

  for (const inv of inventory) {
    const pid = inv.product.id
    seen.add(pid)
    const items = stockByProduct[pid] || []
    if (inv.quantity > 0 || items.length > 0) {
      groups.push({
        productId: pid,
        productName: inv.product.name,
        sku: inv.product.sku,
        category: inv.product.category.name,
        manufacturer: inv.product.manufacturer,
        inventoryQty: inv.quantity,
        stockItems: items,
      })
    }
  }

  // Include products with StockItems but no Inventory record
  for (const [pid, items] of Object.entries(stockByProduct)) {
    if (!seen.has(pid) && items.length > 0) {
      groups.push({
        productId: pid,
        productName: items[0].product.name,
        sku: items[0].product.sku,
        category: items[0].product.category.name,
        manufacturer: items[0].product.manufacturer,
        inventoryQty: 0,
        stockItems: items,
      })
    }
  }

  return groups.sort((a, b) => a.productName.localeCompare(b.productName))
}

function StockTakeContent() {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [inventory, setInventory] = useState<InventoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [counted, setCounted] = useState<CountedMap>({})
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerFilter, setCustomerFilter] = useState<string>('')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const stockUrl = customerFilter
        ? `/api/stock-items?includeProduct=true&customerId=${customerFilter}`
        : '/api/stock-items?includeProduct=true'
      const [stockRes, invRes] = await Promise.all([
        fetch(stockUrl),
        fetch('/api/inventory'),
      ])
      if (stockRes.ok) setStockItems(await stockRes.json())
      if (invRes.ok) setInventory(await invRes.json())
    } finally {
      setLoading(false)
    }
  }, [customerFilter])

  useEffect(() => { fetchItems() }, [fetchItems])

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers).catch(() => {})
  }, [])

  // Persist counted state to sessionStorage so refreshing doesn't lose progress
  useEffect(() => {
    const saved = sessionStorage.getItem('stock-take-counted')
    if (saved) setCounted(JSON.parse(saved))
  }, [])

  const saveCounted = (next: CountedMap) => {
    setCounted(next)
    sessionStorage.setItem('stock-take-counted', JSON.stringify(next))
    setLastSaved(new Date())
  }

  const toggle = (id: string) => saveCounted({ ...counted, [id]: !counted[id] })

  const markGroupAll = (ids: string[], value: boolean) => {
    const next = { ...counted }
    ids.forEach(id => { next[id] = value })
    saveCounted(next)
  }

  const resetAll = () => {
    saveCounted({})
    sessionStorage.removeItem('stock-take-counted')
  }

  // Build combined groups from both inventory and stock-item sources
  const selectedCustomer = customers.find(c => c.id === customerFilter) ?? null

  // When filtering by customer, suppress aggregate inventory rows (not customer-scoped)
  const allGroups = buildGroups(customerFilter ? [] : inventory, stockItems)

  // Status filter applies to StockItem rows; aggregate-only products always show on ALL
  const filteredGroups = allGroups.map(g => {
    if (statusFilter === 'ALL' || g.stockItems.length === 0) return g
    return { ...g, stockItems: g.stockItems.filter(i => i.status === statusFilter) }
  }).filter(g => {
    if (statusFilter !== 'ALL' && g.stockItems.length === 0 && g.inventoryQty <= 0) return false
    return true
  })

  // Total = number of individual StockItems + inventoryQty of aggregate products
  // Aggregate products contribute their full qty when verified, so the total reflects real units
  let totalItems = 0
  let countedCount = 0
  for (const g of filteredGroups) {
    if (g.stockItems.length > 0) {
      totalItems += g.stockItems.length
      countedCount += g.stockItems.filter(i => counted[i.id]).length
    } else {
      totalItems += g.inventoryQty
      if (counted['product:' + g.productId]) countedCount += g.inventoryQty
    }
  }
  const uncountedCount = totalItems - countedCount
  const progress = totalItems > 0 ? Math.round((countedCount / totalItems) * 100) : 0

  const statusOptions = ['ALL', 'AVAILABLE', 'ALLOCATED', 'DISPATCHED', 'RETURNED', 'RETIRED']

  const statusColour = (s: string) => {
    if (s === 'AVAILABLE') return 'bg-green-100 text-green-700'
    if (s === 'ALLOCATED') return 'bg-amber-100 text-[#A07818]'
    if (s === 'DISPATCHED') return 'bg-blue-100 text-blue-700'
    if (s === 'RETURNED') return 'bg-purple-100 text-purple-700'
    return 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Take</h1>
          <p className="text-sm text-gray-500">
            {selectedCustomer ? `Showing stock for ${selectedCustomer.name}` : 'Count and verify all individual devices'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchItems}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={resetAll}
            className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
          >
            Reset Count
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#C49A2A' }}
          >
            <Printer className="h-4 w-4" />
            Print Sheet
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 print:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {countedCount} / {totalItems} items counted
          </span>
          <span className="text-sm font-medium text-gray-500">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: progress === 100 ? '#22c55e' : '#C49A2A' }}
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3.5 w-3.5" />{countedCount} counted</span>
          <span className="flex items-center gap-1 text-orange-500"><AlertCircle className="h-3.5 w-3.5" />{uncountedCount} remaining</span>
          {lastSaved && <span className="ml-auto">Last saved {lastSaved.toLocaleTimeString('en-GB')}</span>}
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <span className="flex items-center gap-1 text-xs text-gray-500"><Filter className="h-3.5 w-3.5" />Show:</span>
        {statusOptions.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-[#C49A2A] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'ALL' ? 'All Statuses' : s}
          </button>
        ))}
      </div>

      {/* Customer filter */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <span className="flex items-center gap-1 text-xs text-gray-500"><Users className="h-3.5 w-3.5" />Customer:</span>
        <select
          value={customerFilter}
          onChange={e => { setCustomerFilter(e.target.value); setCounted({}) }}
          className="text-xs border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#C49A2A]"
        >
          <option value="">All Customers</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}{c.company ? ` (${c.company})` : ''}
            </option>
          ))}
        </select>
        {customerFilter && (
          <button
            onClick={() => { setCustomerFilter(''); setCounted({}) }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Print header — only visible on print */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-3 mb-4">
          <div>
            <img src="/Atech-Logo.png" alt="Atech" className="h-10 w-auto mb-1" style={{ filter: 'invert(1)' }} />
            <p className="text-xs text-gray-500">Stock Manager</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">Asset Stock Take Sheet</p>
            {selectedCustomer && <p className="text-sm font-medium text-gray-700">Customer: {selectedCustomer.name}{selectedCustomer.company ? ` — ${selectedCustomer.company}` : ''}</p>}
            <p className="text-sm text-gray-500">Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            <p className="text-sm text-gray-500">Total items: {totalItems}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 italic">Print and use the ☐ column to physically check each device, then update the system.</p>
      </div>

      {/* Stock items by product group */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C49A2A]"></div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
          <p>No stock found. Receive stock via Goods-In to begin tracking inventory.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(group => {
            const isPerDevice = group.stockItems.length > 0
            const countableIds = isPerDevice
              ? group.stockItems.map(i => i.id)
              : ['product:' + group.productId]
            const groupCounted = countableIds.filter(id => counted[id]).length
            const allCounted = groupCounted === countableIds.length
            return (
              <div key={group.productId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:break-inside-avoid print:shadow-none print:border print:border-gray-300 print:rounded-none print:mb-4">
                {/* Group header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 print:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{group.productName}</p>
                      <p className="text-xs text-gray-400">
                        SKU: {group.sku}
                        {group.manufacturer ? ` · ${group.manufacturer}` : ''}
                        {' · '}{group.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full print:hidden ${allCounted ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-orange-600'}`}>
                      {isPerDevice ? `${groupCounted}/${group.stockItems.length} counted` : (allCounted ? 'Verified' : 'Not verified')}
                    </span>
                    <span className="text-xs text-gray-500 hidden print:inline">
                      {isPerDevice ? `${group.stockItems.length} devices` : `${group.inventoryQty} units`}
                    </span>
                    <div className="flex gap-2 print:hidden">
                      <button
                        onClick={() => markGroupAll(countableIds, true)}
                        className="text-xs px-2 py-1 rounded border border-green-200 text-green-700 hover:bg-green-50"
                      >
                        {isPerDevice ? 'Count all' : 'Verify'}
                      </button>
                      <button
                        onClick={() => markGroupAll(countableIds, false)}
                        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                {isPerDevice ? (
                  /* Per-device table */
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 print:bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase w-8 print:hidden">✓</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase hidden print:table-cell w-8">☐</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Barcode</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Serial Number</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Asset Tag</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Location</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase print:hidden">Status</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase hidden print:table-cell">Found ☐</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase hidden print:table-cell">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.stockItems.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={`border-t border-gray-50 hover:bg-gray-50 cursor-pointer print:border-t print:border-gray-200 print:hover:bg-transparent ${
                            counted[item.id] ? 'bg-green-50/40 print:bg-white' : ''
                          }`}
                          onClick={() => toggle(item.id)}
                        >
                          <td className="px-4 py-2.5 print:hidden" onClick={e => { e.stopPropagation(); toggle(item.id) }}>
                            {counted[item.id]
                              ? <CheckSquare className="h-4 w-4 text-green-600" />
                              : <Square className="h-4 w-4 text-gray-300" />}
                          </td>
                          <td className="px-3 py-2.5 hidden print:table-cell text-base">☐</td>
                          <td className="px-4 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-2.5 text-xs font-mono font-medium text-gray-800">
                            {item.barcode || <span className="text-gray-300 italic font-sans">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs font-mono text-gray-600">
                            {item.serialNumber || <span className="text-gray-300 italic font-sans">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs font-mono text-gray-500 hidden sm:table-cell">
                            {item.assetTag || <span className="text-gray-300 italic font-sans">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">
                            {item.location || <span className="text-gray-300 italic">—</span>}
                          </td>
                          <td className="px-4 py-2.5 print:hidden">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColour(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 hidden print:table-cell text-center text-base">☐</td>
                          <td className="px-4 py-2.5 hidden print:table-cell">
                            <div className="border-b border-gray-300 h-4 w-32"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  /* Aggregate row — quantity tracked but not individually registered */
                  <div
                    className={`flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 print:hover:bg-transparent ${
                      counted['product:' + group.productId] ? 'bg-green-50/40 print:bg-white' : ''
                    }`}
                    onClick={() => toggle('product:' + group.productId)}
                  >
                    <div className="print:hidden" onClick={e => { e.stopPropagation(); toggle('product:' + group.productId) }}>
                      {counted['product:' + group.productId]
                        ? <CheckSquare className="h-5 w-5 text-green-600" />
                        : <Square className="h-5 w-5 text-gray-300" />}
                    </div>
                    <span className="hidden print:inline text-base">☐</span>
                    <Package className="h-4 w-4 text-gray-400 print:hidden" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{group.inventoryQty} units expected</span>
                        <span className="text-gray-400 ml-2 text-xs">tracked as quantity — not individually registered</span>
                      </p>
                    </div>
                    <div className="text-sm text-gray-400 hidden print:block">
                      Physical count: _______
                    </div>
                    <div className="hidden print:block ml-4">
                      <div className="border-b border-gray-300 h-4 w-32"></div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Print footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-xs text-gray-400 flex justify-between">
        <span>Atech Stock Manager — Confidential</span>
        <span>Printed: {new Date().toLocaleString('en-GB')}</span>
      </div>
    </div>
  )
}

export default function StockTakePage() {
  return <Suspense><StockTakeContent /></Suspense>
}
