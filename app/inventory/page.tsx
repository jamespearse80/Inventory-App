'use client'

import { useEffect, useState, useCallback, Suspense, Fragment } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, AlertTriangle, BarChart3, RefreshCw, UserPlus, X, CheckCircle, Package, ChevronDown, ChevronRight, MapPin, ScanLine } from 'lucide-react'
import StockLevelBadge from '@/components/StockLevelBadge'
import BarcodeScanner from '@/components/BarcodeScanner'

interface InventoryItem {
  id: string
  quantity: number
  location: string | null
  updatedAt: string
  product: {
    id: string
    name: string
    sku: string
    reorderPoint: number
    unitCost: number
    manufacturer: string | null
    model: string | null
    category: { name: string }
  }
}

interface Customer {
  id: string
  name: string
  company: string | null
  email: string | null
}

interface AssignModalProps {
  item: InventoryItem
  onClose: () => void
  onSuccess: () => void
}

interface StockDevice {
  id: string
  barcode: string | null
  serialNumber: string | null
  assetTag: string | null
  status: string
  location: string | null
}

function AssignModal({ item, onClose, onSuccess }: AssignModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [availableDevices, setAvailableDevices] = useState<StockDevice[]>([])
  const [loadingDevices, setLoadingDevices] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [customerId, setCustomerId] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  // Legacy fallback fields
  const [quantity, setQuantity] = useState('1')
  const [serialsText, setSerialsText] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.json()).then(setCustomers),
      fetch(`/api/stock-items?productId=${item.product.id}&status=AVAILABLE`)
        .then(r => r.json())
        .then(setAvailableDevices)
        .finally(() => setLoadingDevices(false)),
    ])
  }, [item.product.id])

  const hasStockItems = availableDevices.length > 0
  const serialLines = serialsText.split('\n').map(s => s.trim()).filter(Boolean)
  const selectedCount = selectedIds.size
  const derivedQty = hasStockItems
    ? selectedCount
    : (serialLines.length > 0 ? serialLines.length : parseInt(quantity) || 1)

  const toggleDevice = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!customerId) return setError('Please select a customer.')
    if (hasStockItems && selectedCount === 0) return setError('Please select at least one device.')
    if (!hasStockItems && derivedQty <= 0) return setError('Quantity must be at least 1.')
    if (!hasStockItems && derivedQty > item.quantity) return setError(`Only ${item.quantity} units available.`)

    setSaving(true)
    try {
      const body = hasStockItems
        ? {
            productId: item.product.id,
            customerId,
            stockItemIds: Array.from(selectedIds),
            reference: reference || undefined,
            notes: notes || undefined,
          }
        : {
            productId: item.product.id,
            customerId,
            quantity: derivedQty,
            reference: reference || undefined,
            notes: notes || undefined,
            serialNumbers: serialLines.length > 0 ? serialLines : [],
          }
      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create allocation.')
      } else {
        setDone(true)
        setTimeout(() => { onSuccess(); onClose() }, 1200)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">Assign to Customer</h2>
            <p className="text-xs text-gray-500 mt-0.5">{item.product.name} · {item.quantity} in stock</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-10 text-green-600">
            <CheckCircle className="h-10 w-10" />
            <p className="font-medium">Allocation created!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
                >
                  <option value="">Select a customer…</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.company ? ` — ${c.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Device selection */}
              {loadingDevices ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C49A2A]"></div>
                </div>
              ) : hasStockItems ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Select Devices *
                      <span className="ml-1.5 text-xs text-gray-400 font-normal">{availableDevices.length} available</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedIds.size === availableDevices.length) {
                          setSelectedIds(new Set())
                        } else {
                          setSelectedIds(new Set(availableDevices.map(d => d.id)))
                        }
                      }}
                      className="text-xs text-[#C49A2A] hover:underline"
                    >
                      {selectedIds.size === availableDevices.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                    {availableDevices.map((device, idx) => (
                      <label
                        key={device.id}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-amber-50/50 ${
                          idx > 0 ? 'border-t border-gray-100' : ''
                        } ${selectedIds.has(device.id) ? 'bg-amber-50/30' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(device.id)}
                          onChange={() => toggleDevice(device.id)}
                          className="accent-[#C49A2A] h-4 w-4 shrink-0"
                        />
                        <Package className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono font-medium text-gray-800 truncate">
                            {device.barcode || device.serialNumber || (
                              <span className="text-gray-400 italic font-sans">No barcode</span>
                            )}
                          </p>
                          {device.assetTag && (
                            <p className="text-xs text-gray-400">Asset tag: {device.assetTag}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedCount > 0 && (
                    <p className="text-xs text-[#A07818] mt-1.5 font-medium">
                      {selectedCount} device{selectedCount !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              ) : (
                // Legacy: no StockItems yet — use serial textarea + quantity
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serial Numbers / Asset Tags
                      <span className="text-gray-400 font-normal ml-1">(one per line — quantity derived from entries)</span>
                    </label>
                    <textarea
                      value={serialsText}
                      onChange={e => setSerialsText(e.target.value)}
                      rows={4}
                      placeholder={`e.g.\nSN-001-ABC\nSN-002-DEF`}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A] resize-y font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {serialLines.length > 0
                        ? `${serialLines.length} device${serialLines.length !== 1 ? 's' : ''} entered`
                        : 'Leave blank and set quantity below'}
                    </p>
                  </div>
                  {serialLines.length === 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity * <span className="text-gray-400 font-normal">(max {item.quantity})</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={item.quantity}
                        required
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="e.g. REQ-2026-001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || (hasStockItems ? selectedCount === 0 : derivedQty === 0)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ background: '#C49A2A' }}
              >
                {saving
                  ? 'Assigning…'
                  : `Assign${derivedQty > 0 ? ` ${derivedQty} Device${derivedQty !== 1 ? 's' : ''}` : ''}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function MoveLocationModal({
  device,
  onClose,
  onSuccess,
}: {
  device: StockDevice & { productId: string; productName: string }
  onClose: () => void
  onSuccess: (updatedLocation: string | null) => void
}) {
  const [locations, setLocations] = useState<Array<{ code: string; group: string }>>([])
  const [selected, setSelected] = useState(device.location || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scanError, setScanError] = useState('')

  useEffect(() => {
    fetch('/api/locations')
      .then(r => r.json())
      .then(data => Array.isArray(data) && setLocations(data))
      .catch(console.error)
  }, [])

  const grouped = locations.reduce<Record<string, string[]>>((acc, loc) => {
    if (!acc[loc.group]) acc[loc.group] = []
    acc[loc.group].push(loc.code)
    return acc
  }, {})

  const handleScanLocation = (scanned: string) => {
    setShowScanner(false)
    setScanError('')
    const match = locations.find(l => l.code === scanned.trim())
    if (match) {
      setSelected(match.code)
    } else {
      setScanError(`No location found for barcode: "${scanned}"`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/stock-items/${device.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: selected || null }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to move device.')
      } else {
        setDone(true)
        setTimeout(() => { onSuccess(selected || null); onClose() }, 1000)
      }
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      {showScanner && (
        <BarcodeScanner
          onScan={handleScanLocation}
          onClose={() => setShowScanner(false)}
        />
      )}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Move to Location</h2>
            <p className="text-xs text-gray-500 mt-0.5">{device.productName}</p>
            <p className="text-xs font-mono text-[#A07818] mt-0.5">{device.barcode || device.serialNumber || 'No barcode'}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4 text-gray-400" /></button>
        </div>
        {done ? (
          <div className="flex flex-col items-center gap-3 py-10 text-green-600">
            <CheckCircle className="h-10 w-10" />
            <p className="font-medium text-sm">Location updated!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {error && <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{error}</div>}
            {device.location && (
              <p className="text-xs text-gray-500">Current location: <span className="font-mono font-medium text-gray-700">{device.location}</span></p>
            )}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">New Location *</label>
                <button
                  type="button"
                  onClick={() => { setScanError(''); setShowScanner(true) }}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-600"
                >
                  <ScanLine className="h-3.5 w-3.5" />
                  Scan location
                </button>
              </div>
              {scanError && <p className="text-xs text-red-500 mb-1">{scanError}</p>}
              {selected && (
                <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 bg-amber-50 border border-orange-100 rounded-lg">
                  <MapPin className="h-3.5 w-3.5 text-[#C49A2A] shrink-0" />
                  <span className="text-xs font-mono font-medium text-gray-800">{selected}</span>
                </div>
              )}
              <select
                required
                value={selected}
                onChange={e => { setSelected(e.target.value); setScanError('') }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
              >
                <option value="">Select a location…</option>
                {Object.entries(grouped).map(([group, codes]) => (
                  <optgroup key={group} label={group}>
                    {codes.map(code => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving || !selected} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: '#C49A2A' }}>
                {saving ? 'Moving…' : 'Confirm Move'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function SingleDeviceAssignModal({ device, onClose, onSuccess }: {
  device: StockDevice & { productId: string; productName: string }
  onClose: () => void
  onSuccess: () => void
}) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [reference, setReference] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!customerId) return setError('Please select a customer.')
    setSaving(true)
    try {
      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: device.productId,
          customerId,
          stockItemIds: [device.id],
          reference: reference || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to assign device.')
      } else {
        setDone(true)
        setTimeout(() => { onSuccess(); onClose() }, 1200)
      }
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Assign Device</h2>
            <p className="text-xs text-gray-500 mt-0.5">{device.productName}</p>
            <p className="text-xs font-mono text-[#A07818] mt-0.5">{device.barcode || device.serialNumber || 'No barcode'}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4 text-gray-400" /></button>
        </div>
        {done ? (
          <div className="flex flex-col items-center gap-3 py-10 text-green-600">
            <CheckCircle className="h-10 w-10" />
            <p className="font-medium text-sm">Device assigned!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {error && <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{error}</div>}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Customer *</label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
              >
                <option value="">Select a customer…</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reference</label>
              <input
                type="text"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. REQ-2026-001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: '#C49A2A' }}>
                {saving ? 'Assigning…' : 'Assign Device'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function InventoryContent() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [assignItem, setAssignItem] = useState<InventoryItem | null>(null)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [stockItemsMap, setStockItemsMap] = useState<Record<string, StockDevice[]>>({})
  const [loadingExpanded, setLoadingExpanded] = useState<Record<string, boolean>>({})
  const [deviceToAssign, setDeviceToAssign] = useState<(StockDevice & { productId: string; productName: string }) | null>(null)
  const [deviceToMove, setDeviceToMove] = useState<(StockDevice & { productId: string; productName: string }) | null>(null)
  const filterLow = searchParams.get('filter') === 'low'

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    try {
      const url = filterLow ? '/api/inventory?lowStock=true' : '/api/inventory'
      const res = await fetch(url)
      if (res.ok) setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }, [filterLow])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  const toggleExpand = async (productId: string) => {
    setExpandedIds(prev => ({ ...prev, [productId]: !prev[productId] }))
    if (!expandedIds[productId] && !stockItemsMap[productId]) {
      setLoadingExpanded(prev => ({ ...prev, [productId]: true }))
      try {
        const res = await fetch(`/api/stock-items?productId=${productId}&status=AVAILABLE`)
        if (res.ok) {
          const data: StockDevice[] = await res.json()
          setStockItemsMap(prev => ({ ...prev, [productId]: data }))
        }
      } finally {
        setLoadingExpanded(prev => ({ ...prev, [productId]: false }))
      }
    }
  }

  const handleDeviceAssigned = async (productId: string) => {
    fetchInventory()
    try {
      const res = await fetch(`/api/stock-items?productId=${productId}&status=AVAILABLE`)
      if (res.ok) {
        const data = await res.json()
        setStockItemsMap(prev => ({ ...prev, [productId]: data }))
      }
    } catch {}
  }

  const filtered = items.filter(item =>
    !search ||
    item.product.name.toLowerCase().includes(search.toLowerCase()) ||
    item.product.sku.toLowerCase().includes(search.toLowerCase()) ||
    item.product.category.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = filtered.reduce((sum, i) => sum + i.quantity * i.product.unitCost, 0)

  return (
    <div className="space-y-5">
      {assignItem && (
        <AssignModal
          item={assignItem}
          onClose={() => setAssignItem(null)}
          onSuccess={fetchInventory}
        />
      )}
      {deviceToAssign && (
        <SingleDeviceAssignModal
          device={deviceToAssign}
          onClose={() => setDeviceToAssign(null)}
          onSuccess={() => handleDeviceAssigned(deviceToAssign.productId)}
        />
      )}
      {deviceToMove && (
        <MoveLocationModal
          device={deviceToMove}
          onClose={() => setDeviceToMove(null)}
          onSuccess={(newLocation) => {
            // Update in-place without refetching
            setStockItemsMap(prev => ({
              ...prev,
              [deviceToMove.productId]: (prev[deviceToMove.productId] ?? []).map(d =>
                d.id === deviceToMove.id ? { ...d, location: newLocation } : d
              ),
            }))
          }}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {filterLow ? '⚠️ Low Stock Items' : 'Inventory'}
          </h1>
          <p className="text-sm text-gray-500">{filtered.length} item{filtered.length !== 1 ? 's' : ''} · Total value: £{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/inventory"
            className={`px-3 py-2 rounded-lg text-sm border ${!filterLow ? 'bg-[#C49A2A] text-white border-[#C49A2A]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            All Items
          </Link>
          <Link
            href="/inventory?filter=low"
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm border ${filterLow ? 'bg-orange-600 text-white border-orange-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Low Stock
          </Link>
          <button onClick={fetchInventory} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50" title="Refresh">
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by name, SKU or category…"
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C49A2A]"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No inventory items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Reorder Point</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Value</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Last Updated</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(item => {
                  const isExpanded = !!expandedIds[item.product.id]
                  const stockItems = stockItemsMap[item.product.id]
                  const isLoadingExp = !!loadingExpanded[item.product.id]
                  return (
                    <Fragment key={item.id}>
                      <tr className={`hover:bg-gray-50 ${item.quantity <= item.product.reorderPoint && item.quantity > 0 ? 'bg-yellow-50/40' : ''} ${item.quantity === 0 ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleExpand(item.product.id)}
                              className="p-0.5 rounded hover:bg-gray-100 shrink-0"
                              title="Show individual devices"
                            >
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4 text-[#C49A2A]" />
                                : <ChevronRight className="h-4 w-4 text-gray-400" />}
                            </button>
                            <Link href={`/products/${item.product.id}`} className="hover:text-[#C49A2A]">
                              <p className="font-medium text-gray-900">{item.product.name}</p>
                              <p className="text-xs text-gray-400">{item.product.sku}</p>
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                            {item.product.category.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StockLevelBadge quantity={item.quantity} reorderPoint={item.product.reorderPoint} />
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{item.product.reorderPoint}</td>
                        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                          £{(item.quantity * item.product.unitCost).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                          {new Date(item.updatedAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end items-center">
                            <Link href={`/goods-in?productId=${item.product.id}`} className="text-xs text-green-600 hover:underline font-medium">+In</Link>
                            <Link href={`/goods-out?productId=${item.product.id}`} className="text-xs text-red-600 hover:underline font-medium">-Out</Link>
                            <button
                              onClick={() => setAssignItem(item)}
                              disabled={item.quantity === 0}
                              title="Assign to customer"
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ background: '#C49A2A' }}
                            >
                              <UserPlus className="h-3 w-3" />
                              Assign
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Per-device expanded rows */}
                      {isExpanded && (
                        <tr className="bg-gray-50/60 border-b border-gray-100">
                          <td colSpan={7} className="px-0 py-0">
                            <div className="pl-12 pr-4 py-3">
                              {isLoadingExp ? (
                                <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#C49A2A]"></div>
                                  Loading devices…
                                </div>
                              ) : !stockItems || stockItems.length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-2">
                                  No individual devices tracked yet — use{' '}
                                  <Link href={`/goods-in?productId=${item.product.id}`} className="text-[#C49A2A] hover:underline">Goods-In</Link>
                                  {' '}with device barcodes to register each unit individually.
                                </p>
                              ) : (
                                <table className="w-full max-w-3xl">
                                  <thead>
                                    <tr className="text-left">
                                      <th className="text-xs font-semibold text-gray-400 uppercase pb-2 pr-3 w-8">#</th>
                                      <th className="text-xs font-semibold text-gray-400 uppercase pb-2 pr-3 w-44">Barcode</th>
                                      <th className="text-xs font-semibold text-gray-400 uppercase pb-2 pr-3 w-44">Serial Number</th>
                                      <th className="text-xs font-semibold text-gray-400 uppercase pb-2 pr-3 w-36">Asset Tag</th>
                                      <th className="text-xs font-semibold text-gray-400 uppercase pb-2 pr-3 w-24">Status</th>
                                      <th className="text-xs font-semibold text-gray-400 uppercase pb-2 pr-3">Location</th>
                                      <th className="w-28"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {stockItems.map((device, idx) => (
                                      <tr key={device.id} className="border-t border-gray-100 hover:bg-amber-50/30">
                                        <td className="py-2 pr-3 text-xs text-gray-300">{idx + 1}</td>
                                        <td className="py-2 pr-3 text-xs font-mono font-medium text-gray-800">
                                          {device.barcode || <span className="text-gray-300 italic font-sans">no barcode</span>}
                                        </td>
                                        <td className="py-2 pr-3 text-xs font-mono text-gray-600">
                                          {device.serialNumber || <span className="text-gray-300 italic font-sans">—</span>}
                                        </td>
                                        <td className="py-2 pr-3 text-xs font-mono text-gray-500">
                                          {device.assetTag || <span className="text-gray-300 italic font-sans">—</span>}
                                        </td>
                                        <td className="py-2 pr-3">
                                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                            device.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                                            device.status === 'ALLOCATED' ? 'bg-amber-100 text-[#A07818]' :
                                            device.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-500'
                                          }`}>
                                            {device.status}
                                          </span>
                                        </td>
                                        <td className="py-2 pr-3 text-xs font-mono text-gray-500">
                                          {device.location
                                            ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-[#C49A2A] shrink-0" />{device.location}</span>
                                            : <span className="text-gray-300 italic font-sans">—</span>}
                                        </td>
                                        <td className="py-2 text-right">
                                          <div className="flex gap-1.5 justify-end">
                                            <button
                                              onClick={() => setDeviceToMove({ ...device, productId: item.product.id, productName: item.product.name })}
                                              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
                                              title="Move to location"
                                            >
                                              <MapPin className="h-3 w-3" />
                                              Move
                                            </button>
                                            {device.status === 'AVAILABLE' && (
                                              <button
                                                onClick={() => setDeviceToAssign({ ...device, productId: item.product.id, productName: item.product.name })}
                                                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white"
                                                style={{ background: '#C49A2A' }}
                                              >
                                                <UserPlus className="h-3 w-3" />
                                                Assign
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
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

export default function InventoryPage() {
  return <Suspense><InventoryContent /></Suspense>
}
