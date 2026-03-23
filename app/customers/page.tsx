'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Users, Mail, Phone, Building2 } from 'lucide-react'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  accountManager: string | null
  createdAt: string
  _count: { allocations: number }
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', address: '', accountManager: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchCustomers = async (q = '') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/customers${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      if (res.ok) setCustomers(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        await fetchCustomers(search)
        setShowForm(false)
        setForm({ name: '', email: '', phone: '', company: '', address: '', accountManager: '' })
      } else {
        const data = await res.json()
        setFormError(data.error || 'Failed to create customer')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} customer{customers.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#C49A2A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#A07818]"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">New Customer</h2>
          {formError && <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{formError}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'Name *', required: true, span: '2' },
              { key: 'company', label: 'Company', required: false, span: '1' },
              { key: 'email', label: 'Email', required: false, span: '1' },
              { key: 'phone', label: 'Phone', required: false, span: '1' },
              { key: 'address', label: 'Address', required: false, span: '1' },
              { key: 'accountManager', label: 'Account Manager', required: false, span: '1' },
            ].map(({ key, label, required, span }) => (
              <div key={key} className={span === '2' ? 'col-span-2' : ''}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input
                  type="text"
                  required={required}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div className="col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="bg-[#C49A2A] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60 hover:bg-[#A07818]">
                {saving ? 'Saving…' : 'Save Customer'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers…"
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C49A2A]"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No customers found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {customers.map(c => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0" style={{background: '#FDF8E8', color: '#C49A2A'}}>
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <div className="flex flex-wrap gap-3 mt-0.5">
                      {c.company && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Building2 className="h-3 w-3" />{c.company}
                        </span>
                      )}
                      {c.email && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Mail className="h-3 w-3" />{c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Phone className="h-3 w-3" />{c.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-gray-400">{c._count.allocations} allocation{c._count.allocations !== 1 ? 's' : ''}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
