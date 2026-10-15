import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import { Key, Copy, Check, RefreshCw, User, Shield, UserPlus, Users } from 'lucide-react'

export default function Settings() {
  const { operator, refreshOperator } = useAuth()
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // Profile form
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileMsg, setProfileMsg] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)

  // Team
  const [operators, setOperators] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [newOp, setNewOp] = useState({ full_name: '', email: '', password: '' })
  const [teamMsg, setTeamMsg] = useState(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (operator) {
      setFullName(operator.full_name || '')
      setEmail(operator.email || '')
    }
  }, [operator])

  useEffect(() => {
    authAPI.listOperators().then((r) => setOperators(r.data)).catch(() => {})
  }, [])

  const copyApiKey = () => {
    if (operator?.api_key) {
      navigator.clipboard.writeText(operator.api_key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRegenerate = async () => {
    if (!confirm('Regenerate API key? Old key will stop working immediately.')) return
    setRegenerating(true)
    try {
      await authAPI.regenerateApiKey()
      await refreshOperator()
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed')
    } finally {
      setRegenerating(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setProfileMsg(null)
    if (newPassword && newPassword !== confirmPassword) {
      setProfileMsg({ type: 'err', text: 'New passwords do not match' })
      return
    }
    if (newPassword && newPassword.length < 6) {
      setProfileMsg({ type: 'err', text: 'New password must be at least 6 characters' })
      return
    }
    setSavingProfile(true)
    try {
      const payload = { full_name: fullName, email }
      if (newPassword) {
        payload.current_password = currentPassword
        payload.new_password = newPassword
      }
      await authAPI.updateProfile(payload)
      await refreshOperator()
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setProfileMsg({ type: 'ok', text: 'Profile updated successfully. Use the new email/password next time you sign in.' })
    } catch (err) {
      setProfileMsg({ type: 'err', text: err.response?.data?.detail || 'Update failed' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAddOperator = async (e) => {
    e.preventDefault()
    setTeamMsg(null)
    setAdding(true)
    try {
      await authAPI.createOperator(newOp)
      const r = await authAPI.listOperators()
      setOperators(r.data)
      setNewOp({ full_name: '', email: '', password: '' })
      setShowAdd(false)
      setTeamMsg({ type: 'ok', text: 'Operator account created. Share the email and password securely.' })
    } catch (err) {
      setTeamMsg({ type: 'err', text: err.response?.data?.detail || 'Failed to create operator' })
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-0.5 text-sm">Account credentials, API access, and team operators</p>
      </div>

      {/* Profile / Credentials */}
      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Profile & Credentials</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">Change your display name, login email, and password.</p>

        {profileMsg && (
          <div className={`mb-4 text-sm rounded-xl px-3 py-2.5 border ${
            profileMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
          }`}>
            {profileMsg.text}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Login Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-gray-400" /> Change password
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Current password</label>
                <input type="password" className="input" value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Required to change" autoComplete="current-password" />
              </div>
              <div>
                <label className="label">New password</label>
                <input type="password" className="input" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters" autoComplete="new-password" />
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input type="password" className="input" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password" autoComplete="new-password" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Leave password fields empty if you only want to update name or email.</p>
          </div>

          <button type="submit" disabled={savingProfile} className="btn-primary">
            {savingProfile ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* API Key */}
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">API Key</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Use this key to push metrics from external systems via the{' '}
          <code className="bg-gray-100 px-1 rounded text-xs">X-API-Key</code> header.
        </p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 font-mono text-sm break-all border border-gray-100">
          <span className="flex-1">{operator?.api_key}</span>
          <button type="button" onClick={copyApiKey} className="p-2 hover:bg-gray-200 rounded-lg shrink-0">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <button type="button" onClick={handleRegenerate} disabled={regenerating}
          className="btn-secondary mt-4 flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
          {regenerating ? 'Regenerating…' : 'Regenerate API Key'}
        </button>
      </div>

      {/* Team / Create operators */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Team Operators</h2>
          </div>
          <button type="button" onClick={() => setShowAdd((v) => !v)}
            className="btn-secondary text-sm flex items-center gap-1.5 py-1.5">
            <UserPlus className="w-4 h-4" />
            Add operator
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Public registration is closed. Only you can create accounts for other operators.
        </p>

        {teamMsg && (
          <div className={`mb-4 text-sm rounded-xl px-3 py-2.5 border ${
            teamMsg.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
          }`}>
            {teamMsg.text}
          </div>
        )}

        {showAdd && (
          <form onSubmit={handleAddOperator} className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Full name</label>
                <input className="input" required value={newOp.full_name}
                  onChange={(e) => setNewOp({ ...newOp, full_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" required value={newOp.email}
                  onChange={(e) => setNewOp({ ...newOp, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Temporary password</label>
                <input type="password" className="input" required minLength={6} value={newOp.password}
                  onChange={(e) => setNewOp({ ...newOp, password: e.target.value })}
                  placeholder="Min 6 characters" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={adding} className="btn-primary text-sm">
                {adding ? 'Creating…' : 'Create account'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        )}

        <div className="divide-y divide-gray-50">
          {operators.map((op) => (
            <div key={op.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                  {op.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{op.full_name}</p>
                  <p className="text-xs text-gray-500">{op.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {op.email === 'zachariah@gmail.com' && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">Admin</span>
                )}
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${op.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {op.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
          {operators.length === 0 && (
            <p className="text-sm text-gray-400 py-4">No operators loaded.</p>
          )}
        </div>
      </div>
    </div>
  )
}
