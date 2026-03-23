'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Save, Trash2, Plus } from 'lucide-react'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  address: string | null
  accountManager: string | null
  createdAt: string
  allocations: Array<{
    id: string
    quantity: number
    status: string
    allocatedAt: string
    product: { name: string; sku: string; category: { name: string } }
  }>
  transactions: Array<{
    id: string
    type: string
    quantity: number
    createdAt: string
    product: { name: string }
  }>
}

const statusColors: Record<string, string> = {
  ALLOCATED: 'bg-orange-100 text-[#C94E1E]',
  PENDING: 'bg-yellow-100 text-yellow-700',
  DISPATCHED: 'bg-green-100 text-green-700',
  RETURNED: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', address: '', accountManager: '' })

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then(r => r.json())
      .then(data => {
        setCustomer(data)
        setForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          company: data.company || '',
          address: data.address || '',
          accountManager: data.accountManager || '',
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        const updated = await res.json()
        setCustomer(prev => prev ? { ...prev, ...updated } : updated)
        setEditing(false)
      } else {
        const data = await res.json()
        setSaveError(data.error || 'Failed to save customer')
      }
    } catch {
      setSaveError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete customer "${customer?.name}"?`)) return
    await fetch(`/api/customers/${id}`, { method: 'DELETE' })
    router.push('/customers')
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8612A]"></div></div>
  if (!customer) return <div className="text-red-500">Customer not found</div>

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/customers" className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            {customer.company && <p className="text-sm text-gray-400">{customer.company}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/allocations?customerId=${id}`}
            className="flex items-center gap-2 border border-[#E8612A] text-[#E8612A] px-3 py-2 rounded-lg text-sm hover:bg-orange-50"
          >
            <Plus className="h-4 w-4" /> New Allocation
          </Link>
          <button onClick={() => setEditing(!editing)}
            className="flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            <Edit className="h-4 w-4" /> Edit
          </button>
          <button onClick={handleDelete}
            className="border border-red-300 text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Customer info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Contact Details</h2>
          {editing ? (
            <div className="space-y-3">
              {[
                { key: 'name', label: 'Name' },
                { key: 'company', label: 'Company' },
                { key: 'email', label: 'Email' },
                { key: 'phone', label: 'Phone' },
                { key: 'address', label: 'Address' },
                { key: 'accountManager', label: 'Account Manager' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input
                    type="text"
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                {saveError && <p className="text-sm text-red-600 self-center mr-auto">{saveError}</p>}
                <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 bg-[#E8612A] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60 hover:bg-[#C94E1E]">
                  <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <dl className="space-y-3 text-sm">
              {[
                { label: 'Company', value: customer.company },
                { label: 'Email', value: customer.email },
                { label: 'Phone', value: customer.phone },
                { label: 'Address', value: customer.address },
                { label: 'Account Manager', value: customer.accountManager },
                { label: 'Customer Since', value: new Date(customer.createdAt).toLocaleDateString('en-GB') },
              ].map(({ label, value }) => value ? (
                <div key={label} className="flex justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-800 text-right max-w-xs">{value}</dd>
                </div>
              ) : null)}
            </dl>
          )}
        </div>

        {/* Allocations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Allocations</h2>
            <Link href="/allocations" className="text-xs text-[#E8612A] hover:underline">View all</Link>
          </div>
          {customer.allocations.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No allocations</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {customer.allocations.map(alloc => (
                <div key={alloc.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{alloc.product.name}</p>
                    <p className="text-xs text-gray-400">{alloc.product.sku} · Qty: {alloc.quantity}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[alloc.status] || ''}`}>
                    {alloc.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Transaction History</h2>
        {customer.transactions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No transactions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customer.transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="py-2">
                      <span className={`text-xs font-medium ${tx.type === 'GOODS_IN' ? 'text-green-600' : tx.type === 'GOODS_OUT' ? 'text-red-600' : 'text-[#E8612A]'}`}>
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 font-medium text-gray-800">{tx.product.name}</td>
                    <td className="py-2 text-gray-600">{tx.quantity}</td>
                    <td className="py-2 text-gray-400 text-xs">
                      {new Date(tx.createdAt).toLocaleDateString('en-GB')}
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
