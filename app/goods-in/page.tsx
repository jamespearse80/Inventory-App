'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowDownToLine, ScanLine, CheckCircle, ChevronDown, PlusCircle, X, MapPin } from 'lucide-react'
import BarcodeScanner from '@/components/BarcodeScanner'
import StockLevelBadge from '@/components/StockLevelBadge'

interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  category: { name: string }
  inventory: { quantity: number } | null
  reorderPoint: number
}

function GoodsInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showScanner, setShowScanner] = useState(false)
  const [showDeviceScanner, setShowDeviceScanner] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [lookupError, setLookupError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [deviceBarcodes, setDeviceBarcodes] = useState('')
  const [locations, setLocations] = useState<Array<{ code: string; group: string }>>([])
  const [showLocationScanner, setShowLocationScanner] = useState(false)
  const [locationScanError, setLocationScanError] = useState('')
  const [showLocationScanner, setShowLocationScanner] = useState(false)
  const [locationScanError, setLocationScanError] = useState('')
  const [form, setForm] = useState({
    productId: searchParams.get('productId') || '',
    quantity: '',
    reference: '',
    notes: '',
    performedBy: '',
    location: '',
  })

  // Fetch all products and locations for the dropdowns
  useEffect(() => {
    fetch('/api/products?limit=1000')
      .then(r => r.json())
      .then(data => setAllProducts(Array.isArray(data) ? data : (data.products ?? [])))
      .catch(console.error)
    fetch('/api/locations')
      .then(r => r.json())
      .then(data => Array.isArray(data) && setLocations(data))
      .catch(console.error)
  }, [])

  // Pre-load product when arriving from a product page link
  useEffect(() => {
    const preloadId = searchParams.get('productId')
    if (preloadId) {
      fetch(`/api/products/${preloadId}`)
        .then(r => r.json())
        .then(p => { setProduct(p); setForm(prev => ({ ...prev, productId: p.id })) })
        .catch(console.error)
    }
  }, [searchParams])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectProduct = (p: Product) => {
    setProduct(p)
    setForm(prev => ({ ...prev, productId: p.id }))
    setDropdownOpen(false)
    setSearch('')
    setLookupError('')
  }

  const clearProduct = () => {
    setProduct(null)
    setForm(prev => ({ ...prev, productId: '' }))
    setSearch('')
  }

  const lookupProduct = async (code: string) => {
    setLookupError('')
    const res = await fetch(`/api/scan?barcode=${encodeURIComponent(code)}`)
    if (res.ok) {
      selectProduct(await res.json())
    } else {
      const res2 = await fetch(`/api/scan?sku=${encodeURIComponent(code)}`)
      if (res2.ok) {
        selectProduct(await res2.json())
      } else {
        setLookupError(`No product found for: "${code}"`)
      }
    }
  }

  const handleScanLocation = (scanned: string) => {
    setShowLocationScanner(false)
    setLocationScanError('')
    const match = locations.find(l => l.code === scanned.trim())
    if (match) {
      setForm(prev => ({ ...prev, location: match.code }))
    } else {
      setLocationScanError(`No location found for barcode: "${scanned}"`)
    }
  }

  const handleScanLocation = (scanned: string) => {
    setShowLocationScanner(false)
    setLocationScanError('')
    const match = locations.find(l => l.code === scanned.trim())
    if (match) {
      setForm(prev => ({ ...prev, location: match.code }))
    } else {
      setLocationScanError(`No location found for barcode: "${scanned}"`)
    }
  }

  const handleScan = async (code: string) => {
    setShowScanner(false)
    await lookupProduct(code)
  }

  // Appends scanned barcode to the device list and keeps scanner open
  const handleDeviceScan = (code: string) => {
    setDeviceBarcodes(prev => {
      const lines = prev.split('\n').map(s => s.trim()).filter(Boolean)
      if (lines.includes(code)) return prev // skip duplicate
      return lines.length > 0 ? prev.trimEnd() + '\n' + code : code
    })
    setLastScanned(code)
    // Don't close — keep scanning for next item
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.productId) {
      setFormError('Please select or scan a product first')
      return
    }
    const barcodeLines = deviceBarcodes.split('\n').map(s => s.trim()).filter(Boolean)
    const effectiveQty = barcodeLines.length > 0 ? barcodeLines.length : parseInt(form.quantity) || 0
    if (effectiveQty <= 0) {
      setFormError('Enter device barcodes or a quantity')
      return
    }
    setLoading(true)
    setFormError('')
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity: effectiveQty,
          type: 'GOODS_IN',
          ...(barcodeLines.length > 0 && { deviceBarcodes: barcodeLines }),
        }),
      })
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          setProduct(null)
          setDeviceBarcodes('')
          setForm({ productId: '', quantity: '', reference: '', notes: '', performedBy: '', location: '' })
        }, 2500)
      } else {
        const data = await res.json()
        setFormError(data.error || 'Failed to record goods in')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      {showDeviceScanner && (
        <BarcodeScanner
          onScan={handleDeviceScan}
          onClose={() => { setShowDeviceScanner(false); setLastScanned(null) }}
          statusMessage={lastScanned ? `✓ Added: ${lastScanned}` : undefined}
        />
      )}

      {showLocationScanner && (
        <BarcodeScanner
          onScan={handleScanLocation}
          onClose={() => setShowLocationScanner(false)}
        />
      )}

      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goods In</h1>
          <p className="text-sm text-gray-500">Record incoming stock</p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span className="font-medium">Stock received successfully!</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {/* Product selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>

          {product ? (
            /* Selected state */
            <div className="flex items-center gap-2 border border-[#C49A2A] bg-amber-50 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                <p className="text-xs text-gray-500">{product.sku}{product.barcode ? ` · ${product.barcode}` : ''}</p>
              </div>
              <button type="button" onClick={clearProduct} className="shrink-0 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* Dropdown selector */
            <div className="relative" ref={dropdownRef}>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setDropdownOpen(o => !o); setSearch('') }}
                  className="flex-1 flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#C49A2A] bg-white"
                >
                  <span className="text-gray-400">Select a product SKU…</span>
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  title="Scan barcode"
                >
                  <ScanLine className="h-4 w-4" />
                  <span className="hidden sm:inline">Scan</span>
                </button>
              </div>

              {dropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {/* Search filter */}
                  <div className="p-2 border-b border-gray-100">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search by name or SKU…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
                    />
                  </div>

                  {/* Product list */}
                  <ul className="max-h-60 overflow-y-auto">
                    {allProducts
                      .filter(p =>
                        !search ||
                        p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.sku.toLowerCase().includes(search.toLowerCase())
                      )
                      .map(p => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => selectProduct(p)}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-amber-50 text-left"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{p.name}</p>
                              <p className="text-xs text-gray-400">{p.sku} · {p.category.name}</p>
                            </div>
                            <span className="text-xs text-gray-400 shrink-0 ml-3">
                              {p.inventory?.quantity ?? 0} in stock
                            </span>
                          </button>
                        </li>
                      ))
                    }
                    {allProducts.filter(p =>
                      !search ||
                      p.name.toLowerCase().includes(search.toLowerCase()) ||
                      p.sku.toLowerCase().includes(search.toLowerCase())
                    ).length === 0 && (
                      <li className="px-4 py-3 text-sm text-gray-400 text-center">No products match &ldquo;{search}&rdquo;</li>
                    )}
                  </ul>

                  {/* Add new product */}
                  <div className="border-t border-gray-100">
                    <Link
                      href="/products/new"
                      className="flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-gray-50 w-full"
                      style={{ color: '#C49A2A' }}
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add new product / SKU
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {lookupError && (
            <p className="text-red-500 text-xs mt-1">{lookupError}</p>
          )}
        </div>

        {/* Product summary card */}
        {product && (
          <div className="p-3 bg-amber-50 border border-orange-100 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-gray-800">{product.name}</p>
              <p className="text-xs text-gray-500">{product.category.name} · {product.sku}</p>
            </div>
            <StockLevelBadge quantity={product.inventory?.quantity ?? 0} reorderPoint={product.reorderPoint} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{formError}</div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Device Barcodes / Serial Numbers
                <span className="ml-1.5 font-normal text-gray-400">(one per line)</span>
              </label>
              <button
                type="button"
                onClick={() => { setLastScanned(null); setShowDeviceScanner(true) }}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600"
              >
                <ScanLine className="h-3.5 w-3.5" />
                Scan barcodes
              </button>
            </div>
            <textarea
              value={deviceBarcodes}
              onChange={e => setDeviceBarcodes(e.target.value)}
              rows={5}
              placeholder={`Scan or paste each device barcode:\nABC-001\nABC-002\nABC-003`}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A] font-mono resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">
              {deviceBarcodes.split('\n').map(s => s.trim()).filter(Boolean).length > 0
                ? `${deviceBarcodes.split('\n').map(s => s.trim()).filter(Boolean).length} device(s) entered — quantity will be set automatically`
                : 'Leave blank to enter a manual quantity below'}
            </p>
          </div>

          {deviceBarcodes.split('\n').map(s => s.trim()).filter(Boolean).length === 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
            <input
              type="number"
              min="1"
              required
              value={form.quantity}
              onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter quantity received"
            />
          </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference / PO Number</label>
            <input
              type="text"
              value={form.reference}
              onChange={e => setForm(prev => ({ ...prev, reference: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. PO-2024-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Received By</label>
            <input
              type="text"
              value={form.performedBy}
              onChange={e => setForm(prev => ({ ...prev, performedBy: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your name"
            />
          </div>

          {locations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Storage Location</label>
                <button
                  type="button"
                  onClick={() => { setLocationScanError(''); setShowLocationScanner(true) }}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-600"
                >
                  <ScanLine className="h-3.5 w-3.5" />
                  Scan location
                </button>
              </div>
              {locationScanError && <p className="text-xs text-red-500 mb-1">{locationScanError}</p>}
              {form.location && (
                <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 bg-amber-50 border border-orange-100 rounded-lg">
                  <MapPin className="h-3.5 w-3.5 text-[#C49A2A] shrink-0" />
                  <span className="text-xs font-mono font-medium text-gray-800">{form.location}</span>
                </div>
              )}
              <select
                value={form.location}
                onChange={e => { setForm(prev => ({ ...prev, location: e.target.value })); setLocationScanError('') }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
              >
                <option value="">Select location (optional)…</option>
                {Object.entries(
                  locations.reduce<Record<string, string[]>>((acc, loc) => {
                    if (!acc[loc.group]) acc[loc.group] = []
                    acc[loc.group].push(loc.code)
                    return acc
                  }, {})
                ).map(([group, codes]) => (
                  <optgroup key={group} label={group}>
                    {codes.map(code => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Optional notes…"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.productId}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-60"
          >
            <ArrowDownToLine className="h-4 w-4" />
            {loading ? 'Recording…' : 'Record Goods In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function GoodsInPage() {
  return (
    <Suspense>
      <GoodsInForm />
    </Suspense>
  )
}
