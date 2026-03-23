'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, Package, ScanLine } from 'lucide-react'
import StockLevelBadge from '@/components/StockLevelBadge'
import BarcodeScanner from '@/components/BarcodeScanner'

interface Product {
  id: string
  name: string
  sku: string
  barcode: string | null
  manufacturer: string | null
  model: string | null
  unitCost: number
  reorderPoint: number
  category: { id: string; name: string }
  inventory: { quantity: number } | null
}

interface Category {
  id: string
  name: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter) params.set('categoryId', categoryFilter)
      const res = await fetch(`/api/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter])

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(console.error)
  }, [])

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300)
    return () => clearTimeout(timer)
  }, [fetchProducts])

  const handleScan = async (code: string) => {
    setShowScanner(false)
    const res = await fetch(`/api/scan?barcode=${encodeURIComponent(code)}`)
    if (res.ok) {
      setSearch(code)
    } else {
      setSearch(code)
    }
  }

  return (
    <div className="space-y-5">
      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">{total} item{total !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/products/new"
          className="flex items-center gap-2 bg-[#C49A2A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#A07818]"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, SKU or barcode…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowScanner(true)}
          className="flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <ScanLine className="h-4 w-4" />
          <span className="hidden sm:inline">Scan</span>
        </button>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C49A2A]"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No products found</p>
            <p className="text-sm mt-1">Try adjusting your search or add a new product</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Manufacturer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Unit Cost</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.sku}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {product.category.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {product.manufacturer ? `${product.manufacturer} ${product.model || ''}`.trim() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StockLevelBadge
                        quantity={product.inventory?.quantity ?? 0}
                        reorderPoint={product.reorderPoint}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      £{product.unitCost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/products/${product.id}`}
                        className="text-[#C49A2A] hover:underline text-xs font-medium"
                      >
                        View
                      </Link>
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
