import { useEffect, useState } from 'react'
import { metricsAPI, networksAPI } from '../services/api'
import { Plus, X } from 'lucide-react'
import { format } from 'date-fns'

export default function Metrics() {
  const [metrics, setMetrics] = useState([])
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    network_id: '',
    date: new Date().toISOString().slice(0, 10),
    active_users: '',
    traffic_gb: '',
    prb_utilization: '',
    latency_ms: '',
    packet_loss: '',
    throughput_mbps: '',
  })
  const [error, setError] = useState('')
  const [filterNetwork, setFilterNetwork] = useState('')

  const load = () => {
    Promise.all([
      metricsAPI.list(filterNetwork ? { network_id: filterNetwork } : {}),
      networksAPI.list()
    ])
      .then(([mRes, nRes]) => {
        setMetrics(mRes.data)
        setNetworks(nRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterNetwork])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await metricsAPI.create({
        ...form,
        network_id: Number(form.network_id),
        active_users: Number(form.active_users),
        traffic_gb: Number(form.traffic_gb),
        prb_utilization: Number(form.prb_utilization),
        latency_ms: Number(form.latency_ms),
        packet_loss: Number(form.packet_loss),
        throughput_mbps: Number(form.throughput_mbps),
      })
      setShowModal(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save metric')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metrics</h1>
          <p className="text-gray-500 mt-1">Daily performance data (Manual entry)</p>
        </div>
        <div className="flex gap-3">
          <select
            className="input w-auto"
            value={filterNetwork}
            onChange={(e) => setFilterNetwork(e.target.value)}
          >
            <option value="">All Networks</option>
            {networks.map((n) => (
              <option key={n.id} value={n.id}>{n.name} ({n.area})</option>
            ))}
          </select>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Metric
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : metrics.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">
          <p>No metrics recorded yet. Add daily data or use the API.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Network</th>
                <th className="pb-3 font-medium">Users</th>
                <th className="pb-3 font-medium">Traffic (GB)</th>
                <th className="pb-3 font-medium">PRB %</th>
                <th className="pb-3 font-medium">Latency</th>
                <th className="pb-3 font-medium">Loss %</th>
                <th className="pb-3 font-medium">Throughput</th>
                <th className="pb-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const net = networks.find((n) => n.id === m.network_id)
                return (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3">{format(new Date(m.date), 'dd MMM yyyy')}</td>
                    <td className="py-3 font-medium">{net?.name || `#${m.network_id}`}</td>
                    <td className="py-3">{m.active_users.toLocaleString()}</td>
                    <td className="py-3">{m.traffic_gb.toFixed(1)}</td>
                    <td className="py-3">{m.prb_utilization.toFixed(1)}%</td>
                    <td className="py-3">{m.latency_ms.toFixed(0)} ms</td>
                    <td className="py-3">{m.packet_loss.toFixed(2)}%</td>
                    <td className="py-3">{m.throughput_mbps.toFixed(1)} Mbps</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${m.source === 'api' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {m.source}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Add Daily Metric</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
              <div>
                <label className="label">Network *</label>
                <select
                  className="input"
                  value={form.network_id}
                  onChange={(e) => setForm({ ...form, network_id: e.target.value })}
                  required
                >
                  <option value="">Select network</option>
                  {networks.map((n) => (
                    <option key={n.id} value={n.id}>{n.name} — {n.area}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Active Users *</label>
                  <input type="number" className="input" value={form.active_users}
                    onChange={(e) => setForm({ ...form, active_users: e.target.value })} required min="0" />
                </div>
                <div>
                  <label className="label">Traffic (GB) *</label>
                  <input type="number" step="0.1" className="input" value={form.traffic_gb}
                    onChange={(e) => setForm({ ...form, traffic_gb: e.target.value })} required min="0" />
                </div>
                <div>
                  <label className="label">PRB Utilization (%) *</label>
                  <input type="number" step="0.1" className="input" value={form.prb_utilization}
                    onChange={(e) => setForm({ ...form, prb_utilization: e.target.value })} required min="0" max="100" />
                </div>
                <div>
                  <label className="label">Latency (ms) *</label>
                  <input type="number" step="0.1" className="input" value={form.latency_ms}
                    onChange={(e) => setForm({ ...form, latency_ms: e.target.value })} required min="0" />
                </div>
                <div>
                  <label className="label">Packet Loss (%) *</label>
                  <input type="number" step="0.01" className="input" value={form.packet_loss}
                    onChange={(e) => setForm({ ...form, packet_loss: e.target.value })} required min="0" max="100" />
                </div>
                <div>
                  <label className="label">Throughput (Mbps) *</label>
                  <input type="number" step="0.1" className="input" value={form.throughput_mbps}
                    onChange={(e) => setForm({ ...form, throughput_mbps: e.target.value })} required min="0" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save Metric</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
