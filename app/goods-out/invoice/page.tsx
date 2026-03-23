'use client'

import { useEffect, useState, Suspense, Fragment } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'

interface Transaction {
  id: string
  type: string
  quantity: number
  reference: string | null
  notes: string | null
  performedBy: string | null
  createdAt: string
  product: {
    id: string
    name: string
    sku: string
    unitCost: number
    category: { name: string }
  }
  customer: {
    id: string
    name: string
    company: string | null
    address: string | null
    email: string | null
    phone: string | null
  } | null
}

interface StockItem {
  id: string
  barcode: string | null
  serialNumber: string | null
  assetTag: string | null
}

function InvoiceContent() {
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref') || ''
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [assets, setAssets] = useState<Record<string, StockItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ref) { setError('No reference provided.'); setLoading(false); return }
    const load = async () => {
      const res = await fetch(`/api/transactions?type=GOODS_OUT&reference=${encodeURIComponent(ref)}&limit=100`)
      if (!res.ok) { setError('Failed to load invoice data.'); setLoading(false); return }
      const data = await res.json()
      const txs: Transaction[] = data.transactions ?? []
      if (txs.length === 0) { setError(`No goods-out transactions found for reference "${ref}".`); setLoading(false); return }
      setTransactions(txs)
      const assetEntries = await Promise.all(
        txs.map(tx =>
          fetch(`/api/stock-items?transactionId=${tx.id}`)
            .then(r => r.ok ? r.json() : [])
            .then((items: StockItem[]) => [tx.id, items] as const)
        )
      )
      setAssets(Object.fromEntries(assetEntries))
      setLoading(false)
    }
    load().catch(() => { setError('Failed to load invoice data.'); setLoading(false) })
  }, [ref])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C49A2A]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <p className="font-semibold mb-2">Unable to load invoice</p>
        <p>{error}</p>
        <Link href="/goods-out" className="mt-4 inline-flex items-center gap-1 text-[#C49A2A] hover:underline text-xs">
          <ArrowLeft className="h-3 w-3" /> Back to Goods Out
        </Link>
      </div>
    )
  }

  const customer = transactions[0]?.customer
  const performedBy = transactions[0]?.performedBy
  const notes = transactions[0]?.notes
  const date = transactions[0]?.createdAt ? new Date(transactions[0].createdAt) : new Date()
  const orderTotal = transactions.reduce((sum, tx) => sum + tx.product.unitCost * tx.quantity, 0)
  const totalItems = transactions.reduce((sum, tx) => sum + tx.quantity, 0)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Screen-only controls */}
      <div className="flex items-center justify-between print:hidden">
        <Link href="/goods-out" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Goods Out
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#0C1F3F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162d56] transition-colors"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      {/* Invoice document */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 print:shadow-none print:border-0 print:rounded-none print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#0C1F3F] flex items-center justify-center">
                <span className="text-[#C49A2A] font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-bold text-[#0C1F3F]">Atech</span>
            </div>
            <p className="text-xs text-gray-400 ml-10">Stock Manager</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-gray-900">Dispatch Invoice</h1>
            <p className="font-mono text-sm font-semibold text-[#C49A2A] mt-1">{ref}</p>
            <p className="text-xs text-gray-400 mt-1">
              {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Bill to / dispatched by */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Dispatched To</p>
            {customer ? (
              <>
                <p className="font-semibold text-gray-900">{customer.name}</p>
                {customer.company && <p className="text-gray-500">{customer.company}</p>}
                {customer.address && (
                  <p className="text-gray-500 whitespace-pre-line mt-0.5">{customer.address}</p>
                )}
                {customer.email && <p className="text-gray-400 mt-0.5">{customer.email}</p>}
                {customer.phone && <p className="text-gray-400">{customer.phone}</p>}
              </>
            ) : (
              <p className="text-gray-400 italic">No customer specified</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Dispatched By</p>
            <p className="text-gray-700">{performedBy || '—'}</p>
            <p className="text-xs text-gray-400 mt-2">
              {totalItems} {totalItems === 1 ? 'item' : 'items'} · {transactions.length} {transactions.length === 1 ? 'product line' : 'product lines'}
            </p>
          </div>
        </div>

        {/* Line items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
              <th className="text-center pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
              <th className="text-right pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit</th>
              <th className="text-right pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => {
              const lineAssets = assets[tx.id] ?? []
              const lineTotal = tx.product.unitCost * tx.quantity
              return (
                <Fragment key={tx.id}>
                  <tr className="border-b border-gray-100">
                    <td className="py-3">
                      <p className="font-medium text-gray-900">{tx.product.name}</p>
                      <p className="text-xs text-gray-400">{tx.product.sku} · {tx.product.category.name}</p>
                    </td>
                    <td className="py-3 text-center text-gray-700">{tx.quantity}</td>
                    <td className="py-3 text-right text-gray-700">
                      {tx.product.unitCost > 0 ? `£${tx.product.unitCost.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 text-right font-medium text-gray-900">
                      {lineTotal > 0 ? `£${lineTotal.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                  {lineAssets.length > 0 && (
                    <tr className="border-b border-gray-50">
                      <td colSpan={4} className="pb-3 pt-0 pl-4">
                        <p className="text-xs text-gray-400 mb-1">Asset records dispatched:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {lineAssets.map(item => {
                            const label = [
                              item.barcode ? `BC: ${item.barcode}` : null,
                              item.serialNumber && item.serialNumber !== item.barcode ? `S/N: ${item.serialNumber}` : null,
                              item.assetTag ? `Asset: ${item.assetTag}` : null,
                            ].filter(Boolean).join(' · ') || `ID: ${item.id.slice(0, 8)}`
                            return (
                              <span key={item.id} className="text-xs bg-gray-50 border border-gray-200 px-2 py-0.5 rounded font-mono">
                                {label}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>

        {/* Order totals */}
        <div className="flex justify-end mb-6">
          <div className="w-56 text-sm">
            {orderTotal > 0 && (
              <div className="flex justify-between py-2 border-t-2 border-gray-900 font-bold text-gray-900">
                <span>Order Total</span>
                <span>£{orderTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div className="p-3 bg-gray-50 rounded-lg mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-700">{notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">Generated by Atech Stock Manager · Ref: {ref}</p>
        </div>
      </div>
    </div>
  )
}

export default function InvoicePage() {
  return (
    <Suspense>
      <InvoiceContent />
    </Suspense>
  )
}
