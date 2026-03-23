'use client'

import { useEffect, useState } from 'react'
import {
  Settings,
  Mail,
  MessageSquare,
  Bell,
  Save,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

interface SettingsMap {
  alerts_enabled?: string
  email_alerts_enabled?: string
  teams_alerts_enabled?: string
  alert_from_email?: string
  alert_to_email?: string
  teams_webhook_url?: string
  company_name?: string
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  expanded,
  onToggle,
}: {
  icon: React.ElementType
  title: string
  description: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{background: '#FDF8E8'}}>
          <Icon className="h-5 w-5" style={{color: '#C49A2A'}} />
        </div>
        <div>
          <p className="font-semibold text-gray-800">{title}</p>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
    </button>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    general: true,
    alerts: false,
    email: false,
    teams: false,
  })

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(setSettings)
      .finally(() => setLoading(false))
  }, [])

  const update = (key: keyof SettingsMap, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const toggle = (key: keyof SettingsMap) => {
    setSettings(prev => ({ ...prev, [key]: prev[key] === 'true' ? 'false' : 'true' }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C49A2A]"></div></div>
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Configure your inventory system and integrations</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#C49A2A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#A07818] disabled:opacity-60"
        >
          {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* General */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <SectionHeader
          icon={Settings}
          title="General"
          description="Basic system configuration"
          expanded={expanded.general}
          onToggle={() => toggleSection('general')}
        />
        {expanded.general && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
            <div className="pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={settings.company_name || ''}
                onChange={e => update('company_name', e.target.value)}
                placeholder="Your company name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Alert settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <SectionHeader
          icon={Bell}
          title="Stock Alerts"
          description="Configure when to send low-stock notifications"
          expanded={expanded.alerts}
          onToggle={() => toggleSection('alerts')}
        />
        {expanded.alerts && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => toggle('alerts_enabled')}
                className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${settings.alerts_enabled === 'true' ? 'bg-[#C49A2A]' : 'bg-gray-200'}`}
              >
                <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-1 ${settings.alerts_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Enable stock alerts</p>
                <p className="text-xs text-gray-400">Send notifications when stock falls below reorder point</p>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Email (Microsoft Graph) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <SectionHeader
          icon={Mail}
          title="Email Alerts (Microsoft 365)"
          description="Send email alerts via Microsoft Graph API"
          expanded={expanded.email}
          onToggle={() => toggleSection('email')}
        />
        {expanded.email && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
            <div className="p-3 bg-amber-50 border border-orange-100 rounded-lg flex gap-2 text-sm" style={{color: '#A07818'}}>
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Azure AD App Registration required</p>
                <p className="text-xs mt-1">Set <code className="bg-amber-100 px-1 rounded">AZURE_TENANT_ID</code>, <code className="bg-amber-100 px-1 rounded">AZURE_CLIENT_ID</code>, and <code className="bg-amber-100 px-1 rounded">AZURE_CLIENT_SECRET</code> in your <code className="bg-amber-100 px-1 rounded">.env.local</code> file with <strong>Mail.Send</strong> Graph permission.</p>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => toggle('email_alerts_enabled')}
                className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${settings.email_alerts_enabled === 'true' ? 'bg-[#C49A2A]' : 'bg-gray-200'}`}
              >
                <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-1 ${settings.email_alerts_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
              <p className="text-sm font-medium text-gray-700">Enable email alerts</p>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Email Address</label>
              <input
                type="email"
                value={settings.alert_from_email || ''}
                onChange={e => update('alert_from_email', e.target.value)}
                placeholder="alerts@yourdomain.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Must be a licensed M365 mailbox granted Mail.Send permission</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Send Alerts To</label>
              <input
                type="email"
                value={settings.alert_to_email || ''}
                onChange={e => update('alert_to_email', e.target.value)}
                placeholder="manager@yourdomain.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Teams */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <SectionHeader
          icon={MessageSquare}
          title="Microsoft Teams Integration"
          description="Post alerts to a Teams channel via webhook"
          expanded={expanded.teams}
          onToggle={() => toggleSection('teams')}
        />
        {expanded.teams && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
            <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg flex gap-2 text-sm text-purple-700">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">How to set up Teams webhook:</p>
                <ol className="text-xs mt-1 space-y-1 list-decimal list-inside">
                  <li>In Teams, go to the channel you want alerts in</li>
                  <li>Click ⋯ → Connectors → Incoming Webhook</li>
                  <li>Configure and copy the webhook URL</li>
                  <li>Paste it below</li>
                </ol>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => toggle('teams_alerts_enabled')}
                className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${settings.teams_alerts_enabled === 'true' ? 'bg-purple-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-1 ${settings.teams_alerts_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
              <p className="text-sm font-medium text-gray-700">Enable Teams alerts</p>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teams Webhook URL</label>
              <input
                type="url"
                value={settings.teams_webhook_url || ''}
                onChange={e => update('teams_webhook_url', e.target.value)}
                placeholder="https://yourorg.webhook.office.com/webhookb2/..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {settings.teams_webhook_url && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                Keep this URL secret — it allows posting to your Teams channel without authentication
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#C49A2A] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#A07818] disabled:opacity-60"
        >
          {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </div>
  )
}
