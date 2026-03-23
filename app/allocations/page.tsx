'use client'

import { useEffect, useState, useCallback, Suspense, Fragment } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Layers, ChevronDown, ChevronRight, Pencil, Check, X, PackageSearch } from 'lucide-react'

interface AllocationItem {
  id: string
  serialNumber: string | null
  assetTag: string | null
  notes: string | null
}

interface Allocation {
  id: string
  quantity: number
  status: string
  reference: string | null
  allocatedAt: string
  product: { id: string; name: string; sku: string; category: { name: string } }
  customer: { id: string; name: string; company: string | null }
  items: AllocationItem[]
}

interface Product { id: string; name: string; sku: string; inventory: { quantity: number } | null }
interface Customer { id: string; name: string; company: string | null }
interface StockItem { id: string; serialNumber: string | null; barcode: string | null; assetTag: string | null; notes: string | null; status: string }

const statusColors: Record<string, string> = {
  ALLOCATED: 'bg-amber-100 text-[#A07818]',
  PENDING: 'bg-yellow-100 text-yellow-700',
  DISPATCHED: 'bg-green-100 text-green-700',
  RETURNED: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

// ── Inline editor for a single allocation item ──────────────────────────────
function ItemRow({ item, index, allocationId, onSaved }: { item: AllocationItem; index: number; allocationId: string; onSaved: (updated: AllocationItem) => void }) {
  const [editing, setEditing] = useState(false)
  const [serial, setSerial] = useState(item.serialNumber ?? '')
  const [asset, setAsset] = useState(item.assetTag ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/allocations/${allocationId}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumber: serial, assetTag: asset }),
      })
      if (res.ok) {
        const updated = await res.json()
        onSaved(updated)
        setEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setSerial(item.serialNumber ?? '')
    setAsset(item.assetTag ?? '')
    setEditing(false)
  }

  if (editing) {
    return (
      <tr className="bg-amber-50/40">
        <td className="py-1.5 pr-2 text-xs text-gray-400">{index}</td>
        <td className="py-1.5 pr-3">
          <input
            autoFocus
            value={serial}
            onChange={e => setSerial(e.target.value)}
            placeholder="Serial number…"
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#C49A2A] font-mono"
          />
        </td>
        <td className="py-1.5 pr-3">
          <input
            value={asset}
            onChange={e => setAsset(e.target.value)}
            placeholder="Asset tag…"
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#C49A2A] font-mono"
          />
        </td>
        <td className="py-1.5 text-right whitespace-nowrap">
          <button onClick={save} disabled={saving} className="p-1 rounded hover:bg-green-100 text-green-600 mr-1" title="Save">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={cancel} className="p-1 rounded hover:bg-gray-100 text-gray-400" title="Cancel">
            <X className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-gray-50/80 group">
      <td className="py-1.5 pr-2 text-xs text-gray-300">{index}</td>
      <td className="py-1.5 pr-3 text-xs font-mono text-gray-700">
        {item.serialNumber || <span className="text-gray-300 italic">no serial</span>}
      </td>
      <td className="py-1.5 pr-3 text-xs font-mono text-gray-500">
        {item.assetTag || <span className="text-gray-300 italic">no tag</span>}
      </td>
      <td className="py-1.5 text-right">
        <button
          onClick={() => setEditing(true)}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 text-gray-400"
          title="Edit serial / asset tag"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </td>
    </tr>
  )
}

function AllocationsContent() {
  const searchParams = useSearchParams()
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [itemsMap, setItemsMap] = useState<Record<string, AllocationItem[]>>({})
  const [availableStockItems, setAvailableStockItems] = useState<StockItem[]>([])
  const [loadingStockItems, setLoadingStockItems] = useState(false)
  const [selectedStockItemIds, setSelectedStockItemIds] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    productId: '',
    customerId: searchParams.get('customerId') || '',
    quantity: '',
    reference: '',
    notes: '',
    serialsText: '',
  })

  const fetchAllocations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const cId = searchParams.get('customerId')
      if (cId) params.set('customerId', cId)
      const res = await fetch(`/api/allocations?${params}`)
      if (res.ok) {
        const data: Allocation[] = await res.json()
        setAllocations(data)
        // Seed itemsMap with fresh data
        const map: Record<string, AllocationItem[]> = {}
        data.forEach(a => { map[a.id] = a.items })
        setItemsMap(map)
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchParams])

  useEffect(() => {
    Promise.all([
      fetch('/api/products?limit=200').then(r => r.json()).then(d => setProducts(d.products)),
      fetch('/api/customers').then(r => r.json()).then(setCustomers),
    ])
  }, [])

  useEffect(() => { fetchAllocations() }, [fetchAllocations])

  // Fetch available StockItems whenever the selected product changes
  useEffect(() => {
    if (!form.productId) {
      setAvailableStockItems([])
      setSelectedStockItemIds(new Set())
      return
    }
    setLoadingStockItems(true)
    setSelectedStockItemIds(new Set())
    fetch(`/api/stock-items?productId=${form.productId}&status=AVAILABLE`)
      .then(r => r.json())
      .then((items: StockItem[]) => setAvailableStockItems(items))
      .catch(() => setAvailableStockItems([]))
      .finally(() => setLoadingStockItems(false))
  }, [form.productId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      let body: Record<string, unknown>
      if (selectedStockItemIds.size > 0) {
        // Tracked inventory — send specific StockItem IDs
        body = {
          productId: form.productId,
          customerId: form.customerId,
          reference: form.reference,
          notes: form.notes,
          stockItemIds: Array.from(selectedStockItemIds),
        }
      } else {
        // Legacy path — quantity + optional serial numbers text
        const serialLines = form.serialsText.split('\n').map(s => s.trim()).filter(Boolean)
        const qty = serialLines.length > 0 ? serialLines.length : parseInt(form.quantity) || 0
        body = { ...form, quantity: qty, serialNumbers: serialLines }
      }
      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        await fetchAllocations()
        setShowForm(false)
        setForm({ productId: '', customerId: '', quantity: '', reference: '', notes: '', serialsText: '' })
        setAvailableStockItems([])
        setSelectedStockItemIds(new Set())
      } else {
        const data = await res.json()
        setFormError(data.error || 'Failed to create allocation')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleStatusUpdate = async (allocationId: string, status: string) => {
    await fetch(`/api/allocations/${allocationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchAllocations()
  }

  const handleDelete = async (allocationId: string) => {
    if (!confirm('Delete this allocation and all its items?')) return
    await fetch(`/api/allocations/${allocationId}`, { method: 'DELETE' })
    await fetchAllocations()
  }

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const updateItem = (allocationId: string, updated: AllocationItem) => {
    setItemsMap(prev => ({
      ...prev,
      [allocationId]: prev[allocationId].map(i => i.id === updated.id ? updated : i),
    }))
  }


  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Allocations</h1>
          <p className="text-sm text-gray-500">Stock allocated to customers</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#C49A2A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#A07818]"
        >
          <Plus className="h-4 w-4" /> New Allocation
        </button>
      </div>

      {/* New allocation form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Create Allocation</h2>
          {formError && <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{formError}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Product *</label>
              <select
                required
                value={form.productId}
                onChange={e => setForm(prev => ({ ...prev, productId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
              >
                <option value="">Select product…</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.inventory?.quantity ?? 0})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Customer *</label>
              <select
                required
                value={form.customerId}
                onChange={e => setForm(prev => ({ ...prev, customerId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
              >
                <option value="">Select customer…</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Select Available Devices
                <span className="ml-1 font-normal text-gray-400">{form.productId ? '' : '— choose a product first'}</span>
              </label>

              {loadingStockItems && (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#C49A2A]"></div>
                  Loading available stock…
                </div>
              )}

              {!loadingStockItems && form.productId && availableStockItems.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 flex items-center justify-between text-xs text-gray-500 border-b border-gray-200">
                    <span>{availableStockItems.length} device{availableStockItems.length !== 1 ? 's' : ''} available</span>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setSelectedStockItemIds(new Set(availableStockItems.map(i => i.id)))} className="text-[#C49A2A] hover:underline">Select all</button>
                      <button type="button" onClick={() => setSelectedStockItemIds(new Set())} className="text-gray-400 hover:underline">Clear</button>
                    </div>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                    {availableStockItems.map(item => {
                      const checked = selectedStockItemIds.has(item.id)
                      const label = item.serialNumber || item.barcode || item.assetTag || item.id
                      return (
                        <label key={item.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-amber-50/40 ${checked ? 'bg-amber-50/60' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedStockItemIds(prev => {
                                const next = new Set(prev)
                                if (next.has(item.id)) next.delete(item.id)
                                else next.add(item.id)
                                return next
                              })
                            }}
                            className="accent-[#C49A2A] h-4 w-4 rounded"
                          />
                          <span className="font-mono text-sm text-gray-800 flex-1">{label}</span>
                          {item.assetTag && item.serialNumber && (
                            <span className="text-xs text-gray-400 font-mono">{item.assetTag}</span>
                          )}
                          {item.notes && <span className="text-xs text-gray-400 truncate max-w-32">{item.notes}</span>}
                        </label>
                      )
                    })}
                  </div>
                  {selectedStockItemIds.size > 0 && (
                    <div className="bg-amber-50 px-3 py-2 text-xs text-[#A07818] border-t border-amber-100 flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      {selectedStockItemIds.size} device{selectedStockItemIds.size !== 1 ? 's' : ''} selected
                    </div>
                  )}
                </div>
              )}

              {!loadingStockItems && form.productId && availableStockItems.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <PackageSearch className="h-4 w-4" />
                  No individually tracked devices — use quantity below
                </div>
              )}

              {/* Legacy fallback: manual serial numbers when no tracked stock items */}
              {(!form.productId || availableStockItems.length === 0) && !loadingStockItems && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Serial Numbers / Asset Tags
                    <span className="ml-1 font-normal text-gray-400">(one per line — quantity is derived from entries)</span>
                  </label>
                  <textarea
                    value={form.serialsText}
                    onChange={e => setForm(prev => ({ ...prev, serialsText: e.target.value }))}
                    rows={4}
                    placeholder={'e.g.\nSN-001-ABC\nSN-002-DEF\nSN-003-GHI'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A] font-mono resize-y"
                  />
                  {form.serialsText.split('\n').map(s => s.trim()).filter(Boolean).length > 0 ? (
                    <p className="text-xs text-gray-400 mt-1">
                      {form.serialsText.split('\n').map(s => s.trim()).filter(Boolean).length} device{form.serialsText.split('\n').map(s => s.trim()).filter(Boolean).length !== 1 ? 's' : ''} entered
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Or enter a numeric quantity below</p>
                  )}
                </div>
              )}
            </div>
            {selectedStockItemIds.size === 0 && availableStockItems.length === 0 && !loadingStockItems && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required={selectedStockItemIds.size === 0 && availableStockItems.length === 0}
                  value={form.quantity}
                  onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Reference</label>
              <input
                type="text"
                value={form.reference}
                onChange={e => setForm(prev => ({ ...prev, reference: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
                placeholder="e.g. Contract #123"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowForm(false); setAvailableStockItems([]); setSelectedStockItemIds(new Set()) }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              {(() => {
                const serialCount = form.serialsText.split('\n').map(s => s.trim()).filter(Boolean).length
                const qty = selectedStockItemIds.size > 0
                  ? selectedStockItemIds.size
                  : serialCount > 0 ? serialCount : parseInt(form.quantity) || 0
                const disabled = saving || qty === 0
                return (
                  <button type="submit" disabled={disabled}
                    className="bg-[#C49A2A] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60 hover:bg-[#A07818]">
                    {saving ? 'Saving…' : `Allocate${qty > 0 ? ` ${qty} device${qty !== 1 ? 's' : ''}` : ''}`}
                  </button>
                )
              })()}
            </div>
          </form>
        </div>
      )}

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {['', 'ALLOCATED', 'PENDING', 'DISPATCHED', 'RETURNED', 'CANCELLED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-[#C49A2A] text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Allocations list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C49A2A]"></div>
          </div>
        ) : allocations.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No allocations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Devices</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {allocations.map(alloc => {
                  const isExpanded = !!expanded[alloc.id]
                  const items = itemsMap[alloc.id] ?? alloc.items
                  return (
                    <Fragment key={alloc.id}>
                      {/* ── Allocation summary row ── */}
                      <tr className={`hover:bg-gray-50 border-b border-gray-50 ${isExpanded ? 'bg-amber-50/20' : ''}`}>
                        <td className="px-4 py-3">
                          <Link href={`/products/${alloc.product.id}`} className="hover:text-[#C49A2A]">
                            <p className="font-medium text-gray-900">{alloc.product.name}</p>
                            <p className="text-xs text-gray-400">{alloc.product.sku}</p>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/customers/${alloc.customer.id}`} className="hover:text-[#C49A2A]">
                            <p className="font-medium text-gray-800">{alloc.customer.name}</p>
                            {alloc.customer.company && <p className="text-xs text-gray-400">{alloc.customer.company}</p>}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleExpand(alloc.id)}
                            className="flex items-center gap-1.5 font-medium text-gray-800 hover:text-[#C49A2A]"
                          >
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 text-[#C49A2A]" />
                              : <ChevronRight className="h-4 w-4 text-gray-400" />}
                            {alloc.quantity} device{alloc.quantity !== 1 ? 's' : ''}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{alloc.reference || '—'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={alloc.status}
                            onChange={e => handleStatusUpdate(alloc.id, e.target.value)}
                            className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C49A2A] ${statusColors[alloc.status] || ''}`}
                          >
                            {['PENDING', 'ALLOCATED', 'DISPATCHED', 'RETURNED', 'CANCELLED'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                          {new Date(alloc.allocatedAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(alloc.id)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>

                      {/* ── Per-device rows (expanded) ── */}
                      {isExpanded && (
                        <tr className="bg-gray-50/60 border-b border-gray-100">
                          <td colSpan={7} className="px-0 py-0">
                            <div className="pl-14 pr-6 py-3">
                              <table className="w-full max-w-2xl">
                                <thead>
                                  <tr className="text-left">
                                    <th className="text-xs font-semibold text-gray-400 uppercase pb-2 w-8">#</th>
                                    <th className="text-xs font-semibold text-gray-400 uppercase pb-2 w-56">Serial Number</th>
                                    <th className="text-xs font-semibold text-gray-400 uppercase pb-2 w-40">Asset Tag</th>
                                    <th className="w-14"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((item, idx) => (
                                    <ItemRow key={item.id} item={item} index={idx + 1} allocationId={alloc.id} onSaved={updated => updateItem(alloc.id, updated)} />
                                  ))}
                                </tbody>
                              </table>
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

export default function AllocationsPage() {
  return <Suspense><AllocationsContent /></Suspense>
}

