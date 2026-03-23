'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowUpFromLine, CheckCircle, ChevronDown,
  Trash2, FileText,
} from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  category: { name: string }
  inventory: { quantity: number } | null
  reorderPoint: number
  unitCost: number
}

interface Customer {
  id: string
  name: string
  company: string | null
}

interface BasketLine {
  uid: string
  product: Product
  quantity: number
}

function generateRef() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `GO-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`
}

function ProductDropdown({ allProducts, onSelect }: { allProducts: Product[]; onSelect: (p: Product) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = allProducts.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        className="flex items-center justify-between w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 bg-white focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
      >
        Add a product…
        <ChevronDown className="h-4 w-4 shrink-0 ml-2" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input autoFocus type="text" placeholder="Search name or SKU…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]" />
          </div>
          <ul className="max-h-56 overflow-y-auto">
            {filtered.map(p => (
              <li key={p.id}>
                <button type="button" onClick={() => { onSelect(p); setOpen(false); setSearch('') }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-amber-50 text-left">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.sku} · {p.category.name}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-3">{p.inventory?.quantity ?? 0} in stock</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="px-4 py-3 text-sm text-gray-400 text-center">No products match &ldquo;{search}&rdquo;</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

function GoodsOutForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [basket, setBasket] = useState<BasketLine[]>([])
  const [completedRef, setCompletedRef] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    customerId: '',
    reference: generateRef(),
    notes: '',
    performedBy: '',
  })

  const addToBasket = useCallback((product: Product) => {
    setBasket(prev => {
      const existing = prev.find(l => l.product.id === product.id)
      if (existing) return prev.map(l => l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l)
      return [...prev, { uid: crypto.randomUUID(), product, quantity: 1 }]
    })
  }, [])

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers).catch(console.error)
    fetch('/api/products?limit=1000')
      .then(r => r.json())
      .then(data => {
        const ps: Product[] = Array.isArray(data) ? data : (data.products ?? [])
        setAllProducts(ps)
        const pid = searchParams.get('productId')
        if (pid) { const p = ps.find(x => x.id === pid); if (p) addToBasket(p) }
      })
      .catch(console.error)
  }, [searchParams, addToBasket])

  const removeFromBasket = (uid: string) => setBasket(prev => prev.filter(l => l.uid !== uid))

  const setQty = (uid: string, qty: number) => {
    if (qty < 1) return
    setBasket(prev => prev.map(l => l.uid === uid ? { ...l, quantity: qty } : l))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (basket.length === 0) { setFormError('Add at least one product to the basket.'); return }
    setLoading(true)
    setFormError('')
    const ref = form.reference || generateRef()
    try {
      const results = await Promise.all(
        basket.map(line =>
          fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'GOODS_OUT',
              productId: line.product.id,
              quantity: line.quantity,
              customerId: form.customerId || undefined,
              reference: ref,
              notes: form.notes || undefined,
              performedBy: form.performedBy || undefined,
            }),
          })
        )
      )
      const failed = results.filter(r => !r.ok)
      if (failed.length > 0) {
        const errs = await Promise.all(failed.map(r => r.json()))
        setFormError(errs.map((e: { error?: string }) => e.error).join('; ') || 'Some items failed to record.')
        setLoading(false)
        return
      }
      setCompletedRef(ref)
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (completedRef) {
    return (
      <div className="max-w-xl space-y-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col items-center gap-6">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">Goods out recorded!</h2>
            <p className="text-sm text-gray-500 mt-1">
              Reference: <span className="font-mono font-semibold text-[#0C1F3F]">{completedRef}</span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => router.push(`/goods-out/invoice?ref=${encodeURIComponent(completedRef)}`)}
              className="flex-1 flex items-center justify-center gap-2 bg-[#0C1F3F] text-white py-2.5 rounded-lg font-medium hover:bg-[#162d56] transition-colors"
            >
              <FileText className="h-4 w-4" />
              View / Print Invoice
            </button>
            <button
              onClick={() => {
                setCompletedRef(null)
                setBasket([])
                setForm({ customerId: '', reference: generateRef(), notes: '', performedBy: '' })
                setFormError('')
              }}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <ArrowUpFromLine className="h-4 w-4" />
              New goods out
            </button>
          </div>
        </div>
      </div>
    )
  }

  const orderTotal = basket.reduce((sum, l) => sum + (l.product.unitCost ?? 0) * l.quantity, 0)
  const totalItems = basket.reduce((s, l) => s + l.quantity, 0)

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goods Out</h1>
          <p className="text-sm text-gray-500">Record stock dispatched</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basket */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm">Products</h2>

          {basket.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Use the picker below to add products</p>
          )}

          {basket.map(line => (
            <div key={line.uid} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{line.product.name}</p>
                <p className="text-xs text-gray-400">{line.product.sku} · {line.product.category.name}</p>
                {line.product.inventory && (
                  <p className="text-xs text-gray-400">{line.product.inventory.quantity} available</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  min="1"
                  max={line.product.inventory?.quantity ?? undefined}
                  value={line.quantity}
                  onChange={e => setQty(line.uid, parseInt(e.target.value) || 1)}
                  className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
                />
                <button type="button" onClick={() => removeFromBasket(line.uid)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <ProductDropdown allProducts={allProducts} onSelect={addToBasket} />

          {basket.length > 0 && (
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-sm">
              <span className="text-gray-500">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
              {orderTotal > 0 && (
                <span className="font-semibold text-gray-800">Total: £{orderTotal.toFixed(2)}</span>
              )}
            </div>
          )}
        </div>

        {/* Order details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm">Order Details</h2>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{formError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
            <input
              type="text"
              value={form.reference}
              onChange={e => setForm(prev => ({ ...prev, reference: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
              placeholder="e.g. GO-20260101-1234"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={form.customerId}
              onChange={e => setForm(prev => ({ ...prev, customerId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
            >
              <option value="">Select customer (optional)…</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` — ${c.company}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dispatched By</label>
            <input
              type="text"
              value={form.performedBy}
              onChange={e => setForm(prev => ({ ...prev, performedBy: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A]"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C49A2A] resize-none"
              placeholder="Optional notes…"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || basket.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          <ArrowUpFromLine className="h-4 w-4" />
          {loading ? 'Recording…' : basket.length === 0 ? 'Record Goods Out' : `Dispatch ${totalItems} ${totalItems === 1 ? 'item' : 'items'}`}
        </button>
      </form>
    </div>
  )
}

export default function GoodsOutPage() {
  return (
    <Suspense>
      <GoodsOutForm />
    </Suspense>
  )
}
