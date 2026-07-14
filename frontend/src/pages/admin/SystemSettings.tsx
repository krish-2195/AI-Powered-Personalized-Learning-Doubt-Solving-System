import React, { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Key, Server, Brain, ShieldAlert } from 'lucide-react'
import api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

interface SystemSettings {
  maintenance_mode: boolean
  openai_api_key: string
  gemini_api_key: string
  ai_tutor_strictness: string
}

export default function SystemSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<SystemSettings>({
    maintenance_mode: false,
    openai_api_key: '',
    gemini_api_key: '',
    ai_tutor_strictness: 'standard'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/admin/settings')
      setSettings(res.data.data)
    } catch (error) {
      console.error('Failed to fetch settings', error)
      setMessage({ type: 'error', text: 'Failed to load system settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await api.patch('/api/admin/settings', settings)
      setMessage({ type: 'success', text: 'System settings updated successfully' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-8 text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <ShieldAlert size={48} />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-slate-100">Access Denied</h1>
        <p className="max-w-md text-slate-400">
          This area is restricted to Super Administrators only. Please contact IT if you need access to system settings.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <SettingsIcon className="text-primary-500" /> System Settings
          </h1>
          <p className="mt-2 text-slate-400">Manage global platform configurations and API integrations.</p>
        </div>
      </div>

      {message && (
        <div className={`mb-8 rounded-xl p-4 flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
        
        {/* Maintenance Section */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="border-b border-white/10 bg-white/[0.02] p-5 flex items-center gap-3">
            <Server className="text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-100">Platform Status</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-200">Maintenance Mode</h3>
                <p className="text-sm text-slate-400 mt-1">When active, only administrators can log in. All other users will see a maintenance screen.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={settings.maintenance_mode}
                  onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-500/30"></div>
              </label>
            </div>
          </div>
        </div>

        {/* API Keys Section */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="border-b border-white/10 bg-white/[0.02] p-5 flex items-center gap-3">
            <Key className="text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-100">API Configurations</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">OpenAI API Key (Embeddings)</label>
              <input
                type="password"
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                value={settings.openai_api_key}
                onChange={(e) => setSettings({ ...settings, openai_api_key: e.target.value })}
                placeholder="sk-..."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Gemini API Key (Tutor Core)</label>
              <input
                type="password"
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                value={settings.gemini_api_key}
                onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                placeholder="AIza..."
              />
            </div>
          </div>
        </div>

        {/* AI Tutor Section */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="border-b border-white/10 bg-white/[0.02] p-5 flex items-center gap-3">
            <Brain className="text-purple-500" />
            <h2 className="text-lg font-semibold text-slate-100">AI Tutor Behavior</h2>
          </div>
          <div className="p-6">
            <label className="mb-2 block text-sm font-medium text-slate-300">Strictness Level</label>
            <p className="text-sm text-slate-400 mb-4">Controls how easily the AI gives away direct answers versus guiding the student.</p>
            <select
              className="w-full rounded-xl border border-white/10 bg-[#0f172a] px-4 py-3 text-slate-100 transition-all focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              value={settings.ai_tutor_strictness}
              onChange={(e) => setSettings({ ...settings, ai_tutor_strictness: e.target.value })}
            >
              <option value="lenient">Lenient (More direct help)</option>
              <option value="standard">Standard (Balanced Socratic method)</option>
              <option value="strict">Strict (Demands student effort before answering)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white transition-all hover:bg-primary-500 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
            ) : (
              <Save size={20} />
            )}
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  )
}

function CheckCircle({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  )
}

function AlertCircle({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  )
}
