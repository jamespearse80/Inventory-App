'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, ScanLine } from 'lucide-react'
import BarcodeScanner from '@/components/BarcodeScanner'

interface Category {
  id: string
  name: string
}

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    categoryId: '',
    manufacturer: '',
    model: '',
    unitCost: '',
    reorderPoint: '5',
  })

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(console.error)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const product = await res.json()
        router.push(`/products/${product.id}`)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create product')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      {showScanner && (
        <BarcodeScanner
          onScan={code => {
            setForm(prev => ({ ...prev, barcode: code }))
            setShowScanner(false)
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="flex items-center gap-3">
        <Link href="/products" className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Dell Latitude 5540"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. DELL-LAT-5540"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
            <div className="flex gap-2">
              <input
                name="barcode"
                value={form.barcode}
                onChange={handleChange}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Scan or enter barcode"
              />
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50"
                title="Scan barcode"
              >
                <ScanLine className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select category…</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
            <input
              name="manufacturer"
              value={form.manufacturer}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Dell"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              name="model"
              value={form.model}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Latitude 5540"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (£)</label>
            <input
              name="unitCost"
              type="number"
              min="0"
              step="0.01"
              value={form.unitCost}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
            <input
              name="reorderPoint"
              type="number"
              min="0"
              value={form.reorderPoint}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Alert when stock falls at or below this level</p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Optional description…"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-[#C49A2A] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#A07818] disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving…' : 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  )
}
