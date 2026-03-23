'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Save, Trash2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import StockLevelBadge from '@/components/StockLevelBadge'

interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  description: string | null
  manufacturer: string | null
  model: string | null
  unitCost: number
  reorderPoint: number
  createdAt: string
  category: { id: string; name: string }
  inventory: { quantity: number; location: string | null } | null
  transactions: Array<{
    id: string
    type: string
    quantity: number
    createdAt: string
    reference: string | null
    customer: { name: string } | null
    performedBy: string | null
  }>
  allocations: Array<{
    id: string
    quantity: number
    status: string
    allocatedAt: string
    customer: { name: string }
  }>
}

interface Category { id: string; name: string }

const typeColors: Record<string, string> = {
  GOODS_IN: 'text-green-600',
  GOODS_OUT: 'text-red-600',
  ADJUSTMENT: 'text-[#E8612A]',
  RETURN: 'text-purple-600',
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editForm, setEditForm] = useState<Partial<Product> & { categoryId: string }>({ categoryId: '' })

  useEffect(() => {
    Promise.all([
      fetch(`/api/products/${id}`).then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]).then(([p, c]) => {
      setProduct(p)
      setCategories(c)
      setEditForm({
        name: p.name,
        sku: p.sku,
        barcode: p.barcode || '',
        description: p.description || '',
        categoryId: p.category.id,
        manufacturer: p.manufacturer || '',
        model: p.model || '',
        unitCost: p.unitCost,
        reorderPoint: p.reorderPoint,
      })
    }).catch(() => setError('Failed to load product'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        const updated = await res.json()
        setProduct(prev => prev ? { ...prev, ...updated } : updated)
        setEditing(false)
      } else {
        const data = await res.json()
        setError(data.error)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${product?.name}"? This will permanently remove all stock items, transactions and allocations for this product.`)) return
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/products')
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to delete product. It may have active allocations.')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8612A]"></div></div>
  if (!product) return <div className="text-red-500">{error || 'Product not found'}</div>

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/products" className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-sm text-gray-400">{product.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/goods-in?productId=${id}`}
            className="flex items-center gap-2 border border-green-300 text-green-700 px-3 py-2 rounded-lg text-sm hover:bg-green-50"
          >
            <ArrowDownToLine className="h-4 w-4" /> Goods In
          </Link>
          <Link
            href={`/goods-out?productId=${id}`}
            className="flex items-center gap-2 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-sm hover:bg-red-50"
          >
            <ArrowUpFromLine className="h-4 w-4" /> Goods Out
          </Link>
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            <Edit className="h-4 w-4" /> Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 border border-red-300 text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Product details */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Product Details</h2>
          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'name', label: 'Name', type: 'text' },
                { key: 'sku', label: 'SKU', type: 'text' },
                { key: 'barcode', label: 'Barcode', type: 'text' },
                { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
                { key: 'model', label: 'Model', type: 'text' },
                { key: 'unitCost', label: 'Unit Cost (£)', type: 'number' },
                { key: 'reorderPoint', label: 'Reorder Point', type: 'number' },
              ].map(({ key, label, type }) => (
                <div key={key} className={key === 'name' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input
                    type={type}
                    value={String(editForm[key as keyof typeof editForm] ?? '')}
                    onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select
                  value={editForm.categoryId}
                  onChange={e => setEditForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-[#E8612A] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60 hover:bg-[#C94E1E]"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Category', value: product.category.name },
                { label: 'SKU', value: product.sku },
                { label: 'Barcode', value: product.barcode || '—' },
                { label: 'Manufacturer', value: product.manufacturer || '—' },
                { label: 'Model', value: product.model || '—' },
                { label: 'Unit Cost', value: `£${product.unitCost.toFixed(2)}` },
                { label: 'Reorder Point', value: String(product.reorderPoint) },
                { label: 'Added', value: new Date(product.createdAt).toLocaleDateString('en-GB') },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs font-medium text-gray-500">{label}</dt>
                  <dd className="mt-0.5 text-gray-800 font-medium">{value}</dd>
                </div>
              ))}
              {product.description && (
                <div className="col-span-2">
                  <dt className="text-xs font-medium text-gray-500">Description</dt>
                  <dd className="mt-0.5 text-gray-600">{product.description}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Stock card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Stock Level</h2>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-gray-900">{product.inventory?.quantity ?? 0}</p>
            <p className="text-sm text-gray-400 mt-1">units in stock</p>
            <div className="mt-3">
              <StockLevelBadge
                quantity={product.inventory?.quantity ?? 0}
                reorderPoint={product.reorderPoint}
                showCount={false}
              />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Reorder point</span>
              <span className="font-medium">{product.reorderPoint}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-500">Stock value</span>
              <span className="font-medium">£{((product.inventory?.quantity ?? 0) * product.unitCost).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Recent Transactions</h2>
        {product.transactions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Reference</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Customer</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {product.transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="py-2">
                      <span className={`font-medium text-xs ${typeColors[tx.type] || ''}`}>
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 font-medium">{tx.quantity}</td>
                    <td className="py-2 text-gray-400 hidden sm:table-cell">{tx.reference || '—'}</td>
                    <td className="py-2 text-gray-500 hidden md:table-cell">{tx.customer?.name || '—'}</td>
                    <td className="py-2 text-gray-400 text-xs">
                      {new Date(tx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
