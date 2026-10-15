import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import { Copy, RefreshCw, Key, Check } from 'lucide-react'

export default function Settings() {
  const { operator, refreshOperator } = useAuth()
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const copyApiKey = () => {
    navigator.clipboard.writeText(operator?.api_key || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = async () => {
    if (!confirm('Regenerate API Key? The old key will stop working immediately.')) return
    setRegenerating(true)
    try {
      await authAPI.regenerateApiKey()
      await refreshOperator()
    } catch (err) {
      alert('Failed to regenerate')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-1">Account & API configuration</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Operator Profile</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Full Name</span>
            <span className="font-medium">{operator?.full_name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Email</span>
            <span className="font-medium">{operator?.email}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Operator ID</span>
            <span className="font-medium">{operator?.id}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">API Key</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Use this key to send metrics from your external systems.
          Send it in the <code className="bg-gray-100 px-1 rounded">X-API-Key</code> header.
        </p>

        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 font-mono text-sm break-all">
          <span className="flex-1">{operator?.api_key}</span>
          <button onClick={copyApiKey} className="p-2 hover:bg-gray-200 rounded-lg shrink-0">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="btn-secondary mt-4 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
          {regenerating ? 'Regenerating...' : 'Regenerate API Key'}
        </button>
      </div>

      <div className="card bg-blue-50 border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-2">API Usage Example</h3>
        <pre className="text-xs bg-white p-4 rounded-lg overflow-x-auto text-gray-800">
{`curl -X POST https://your-api.railway.app/api/v1/metrics/api \\
  -H "X-API-Key: ${operator?.api_key?.slice(0, 16)}..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "network_id": 1,
    "date": "2026-10-13",
    "active_users": 15000,
    "traffic_gb": 450.5,
    "prb_utilization": 78.2,
    "latency_ms": 45.0,
    "packet_loss": 0.8,
    "throughput_mbps": 35.5
  }'`}
        </pre>
      </div>
    </div>
  )
}
