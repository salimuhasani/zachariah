import { useEffect, useState } from 'react'
import { metricsAPI, networksAPI } from '../services/api'
import CustomSelect from '../components/CustomSelect'
import { Plus, X, BarChart3, Calendar, Filter } from 'lucide-react'
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
    setLoading(true)
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
      setForm({
        network_id: '',
        date: new Date().toISOString().slice(0, 10),
        active_users: '', traffic_gb: '', prb_utilization: '',
        latency_ms: '', packet_loss: '', throughput_mbps: '',
      })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save metric')
    }
  }

  const networkOptions = [
    { value: '', label: 'All Networks' },
    ...networks.map((n) => ({ value: String(n.id), label: n.name, sublabel: n.area })),
  ]

  const formNetworkOptions = networks.map((n) => ({
    value: String(n.id), label: n.name, sublabel: n.area,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Metrics</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Daily performance KPIs — manual entry & history</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 min-w-[200px]">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <CustomSelect
              value={filterNetwork}
              onChange={(v) => setFilterNetwork(String(v))}
              options={networkOptions}
              placeholder="All Networks"
              className="flex-1"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 shadow-md shadow-primary-200"
          >
            <Plus className="w-4 h-4" /> Add Metric
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        </div>
      ) : metrics.length === 0 ? (
        <div className="card text-center py-20">
          <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-600">No metrics yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first daily KPI record or use Simulation to generate data</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-5">Add Metric</button>
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3.5 font-semibold">Date</th>
                  <th className="px-5 py-3.5 font-semibold">Network</th>
                  <th className="px-5 py-3.5 font-semibold">Users</th>
                  <th className="px-5 py-3.5 font-semibold">Traffic</th>
                  <th className="px-5 py-3.5 font-semibold">PRB</th>
                  <th className="px-5 py-3.5 font-semibold">Latency</th>
                  <th className="px-5 py-3.5 font-semibold">Loss</th>
                  <th className="px-5 py-3.5 font-semibold">Throughput</th>
                  <th className="px-5 py-3.5 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => {
                  const net = networks.find((n) => n.id === m.network_id)
                  return (
                    <tr key={m.id} className={`border-b border-gray-50 hover:bg-primary-50/30 transition-colors ${i % 2 ? 'bg-gray-50/40' : ''}`}>
                      <td className="px-5 py-3.5 text-gray-700 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {format(new Date(m.date), 'dd MMM yyyy')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-gray-900">{net?.name || `#${m.network_id}`}</span>
                        {net?.area && <span className="block text-[11px] text-gray-400">{net.area}</span>}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums font-medium">{m.active_users}</td>
                      <td className="px-5 py-3.5 tabular-nums text-gray-600">{m.traffic_gb} GB</td>
                      <td className="px-5 py-3.5">
                        <span className={`tabular-nums font-medium ${m.prb_utilization >= 80 ? 'text-red-600' : m.prb_utilization >= 60 ? 'text-orange-600' : 'text-emerald-600'}`}>
                          {m.prb_utilization?.toFixed?.(1) ?? m.prb_utilization}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-gray-600">{m.latency_ms} ms</td>
                      <td className="px-5 py-3.5">
                        <span className={`tabular-nums ${m.packet_loss >= 2 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {m.packet_loss?.toFixed?.(2) ?? m.packet_loss}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-gray-600">{m.throughput_mbps} Mbps</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 capitalize">
                          {m.source || 'manual'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Add Daily Metric</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>
              )}
              <div>
                <label className="label">Network</label>
                <CustomSelect
                  value={form.network_id}
                  onChange={(v) => setForm({ ...form, network_id: String(v) })}
                  options={formNetworkOptions}
                  placeholder="Select network site"
                />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" required value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'active_users', label: 'Active Users', step: '1' },
                  { key: 'traffic_gb', label: 'Traffic (GB)', step: '0.1' },
                  { key: 'prb_utilization', label: 'PRB Utilization (%)', step: '0.1' },
                  { key: 'latency_ms', label: 'Latency (ms)', step: '0.1' },
                  { key: 'packet_loss', label: 'Packet Loss (%)', step: '0.01' },
                  { key: 'throughput_mbps', label: 'Throughput (Mbps)', step: '0.1' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="label">{f.label}</label>
                    <input type="number" step={f.step} min="0" required className="input"
                      value={form[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                  </div>
                ))}
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
