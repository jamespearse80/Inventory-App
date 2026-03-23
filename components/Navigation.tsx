'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  Layers,
  Settings,
  BarChart3,
  Menu,
  X,
  ClipboardList,
  LogOut,
} from 'lucide-react'
import { useState } from 'react'
import { signOut } from 'next-auth/react'

type User = {
  name?: string | null
  email?: string | null
  image?: string | null
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/inventory', label: 'Inventory', icon: BarChart3 },
  { href: '/goods-in', label: 'Goods In', icon: ArrowDownToLine },
  { href: '/goods-out', label: 'Goods Out', icon: ArrowUpFromLine },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/allocations', label: 'Allocations', icon: Layers },
  { href: '/stock-take', label: 'Stock Take', icon: ClipboardList },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Navigation({ user }: { user: User | null }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() ?? '?'

  const displayName = user?.name ?? user?.email ?? ''

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 shadow-md" style={{background: '#0C1F3F'}}>
        <button
          className="md:hidden mr-3 p-1 rounded"
          style={{color: 'white'}}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        {/* Atech logo */}
        <div className="flex items-center gap-3">
          <img src="/Atech-Logo.png" alt="Atech" className="h-8 w-auto" />
          <span className="text-xs font-medium" style={{color: '#C49A2A'}}>Stock Manager</span>
        </div>

        {/* Signed-in user */}
        {user && (
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user.image ? (
                <img src={user.image} alt={displayName} className="h-7 w-7 rounded-full" />
              ) : (
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{background: '#C49A2A', color: 'white'}}
                >
                  {initials}
                </div>
              )}
              <span className="hidden sm:block text-sm" style={{color: '#cbd5e1'}}>{displayName}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-white/10 transition-colors"
              style={{color: '#94a3b8'}}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        )}
      </header>

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col fixed top-14 left-0 bottom-0 w-56 overflow-y-auto z-40" style={{background: '#091529'}}>
        <nav className="flex-1 py-4">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  active
                    ? 'font-semibold'
                    : 'hover:bg-white/5'
                }`}
                style={active
                  ? { background: '#C49A2A', color: 'white' }
                  : { color: '#94a3b8' }
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-3 border-t text-xs" style={{borderColor: '#1a3258', color: '#475569'}}>
          © 2026 Atech Cloud
        </div>
      </aside>

      {/* Sidebar — mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="absolute top-14 left-0 bottom-0 w-64 overflow-y-auto"
            style={{background: '#091529'}}
            onClick={e => e.stopPropagation()}
          >
            <nav className="py-4">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors font-semibold`}
                    style={active
                      ? { background: '#C49A2A', color: 'white' }
                      : { color: '#94a3b8' }
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}
