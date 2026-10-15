import { useEffect, useState } from 'react'
import { predictionsAPI, networksAPI } from '../services/api'
import CustomSelect from '../components/CustomSelect'
import { Brain, X, AlertTriangle, CheckCircle, Activity, Clock } from 'lucide-react'
import { format } from 'date-fns'

const riskMeta = {
  Low:      { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-800', bar: 'bg-emerald-500' },
  Medium:   { bg: 'bg-amber-50 border-amber-200',   text: 'text-amber-800',   badge: 'bg-amber-100 text-amber-800',   bar: 'bg-amber-500' },
  High:     { bg: 'bg-orange-50 border-orange-200',  text: 'text-orange-800',  badge: 'bg-orange-100 text-orange-800',  bar: 'bg-orange-500' },
  Critical: { bg: 'bg-red-50 border-red-200',        text: 'text-red-800',     badge: 'bg-red-100 text-red-800',        bar: 'bg-red-500' },
}

export default function Predictions() {
  const [predictions, setPredictions] = useState([])
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ network_id: '', horizon_days: '7' })
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([predictionsAPI.list(), networksAPI.list()])
      .then(([pRes, nRes]) => {
        setPredictions(pRes.data)
        setNetworks(nRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handlePredict = async (e) => {
    e.preventDefault()
    setError('')
    setRunning(true)
    try {
      await predictionsAPI.create({
        network_id: Number(form.network_id),
        horizon_days: Number(form.horizon_days),
      })
      setShowModal(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Prediction failed')
    } finally {
      setRunning(false)
    }
  }

  const networkOptions = networks.map((n) => ({
    value: String(n.id), label: n.name, sublabel: n.area,
  }))

  const horizonOptions = [1, 3, 5, 7, 14, 21, 30].map((d) => ({
    value: String(d), label: `${d} day${d > 1 ? 's' : ''}`,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Predictions</h1>
          <p className="text-gray-500 mt-0.5 text-sm">AI forecast of performance degradation & congestion risk</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 shadow-md shadow-primary-200">
          <Brain className="w-4 h-4" /> Run Prediction
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
        </div>
      ) : predictions.length === 0 ? (
        <div className="card text-center py-20">
          <Brain className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-600">No predictions yet</p>
          <p className="text-sm text-gray-400 mt-1">Add metrics first, then run a prediction — or use Simulation</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-5">Run Prediction</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {predictions.map((p) => {
            const net = networks.find((n) => n.id === p.network_id)
            const meta = riskMeta[p.risk_level] || riskMeta.Low
            const Icon = p.risk_level === 'Low' ? CheckCircle : p.risk_level === 'Medium' ? Activity : AlertTriangle
            return (
              <div key={p.id} className={`card border ${meta.bg} !p-5 transition-shadow hover:shadow-md`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${meta.badge}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{net?.name || `Network #${p.network_id}`}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{net?.area || ''}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(p.created_at), 'dd MMM yyyy HH:mm')}</span>
                        <span>Horizon: {p.horizon_days}d</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:text-right">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Risk Level</p>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${meta.badge}`}>
                        {p.risk_level}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Score</p>
                      <p className={`text-xl font-bold tabular-nums ${meta.text}`}>{(p.risk_score * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 h-2 bg-white/70 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${meta.bar} transition-all`} style={{ width: `${p.risk_score * 100}%` }} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="bg-white/80 rounded-lg px-3 py-2 border border-white">
                    <p className="text-[10px] text-gray-400 uppercase">Congestion</p>
                    <p className="font-semibold tabular-nums text-gray-800">{(p.congestion_probability * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-white/80 rounded-lg px-3 py-2 border border-white">
                    <p className="text-[10px] text-gray-400 uppercase">Degradation</p>
                    <p className="font-semibold tabular-nums text-gray-800">{(p.degradation_probability * 100).toFixed(1)}%</p>
                  </div>
                  {p.predicted_prb != null && (
                    <div className="bg-white/80 rounded-lg px-3 py-2 border border-white">
                      <p className="text-[10px] text-gray-400 uppercase">Pred. PRB</p>
                      <p className="font-semibold tabular-nums text-gray-800">{Number(p.predicted_prb).toFixed(1)}%</p>
                    </div>
                  )}
                  {p.predicted_latency != null && (
                    <div className="bg-white/80 rounded-lg px-3 py-2 border border-white">
                      <p className="text-[10px] text-gray-400 uppercase">Pred. Latency</p>
                      <p className="font-semibold tabular-nums text-gray-800">{Number(p.predicted_latency).toFixed(0)} ms</p>
                    </div>
                  )}
                </div>

                {p.explanation && (
                  <p className="mt-3 text-sm text-gray-600 leading-relaxed bg-white/60 rounded-xl px-3.5 py-2.5 border border-white">
                    {p.explanation}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Run Prediction</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePredict} className="p-6 space-y-4">
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>
              )}
              <div>
                <label className="label">Network Site</label>
                <CustomSelect
                  value={form.network_id}
                  onChange={(v) => setForm({ ...form, network_id: String(v) })}
                  options={networkOptions}
                  placeholder="Select network"
                />
              </div>
              <div>
                <label className="label">Prediction Horizon</label>
                <CustomSelect
                  value={form.horizon_days}
                  onChange={(v) => setForm({ ...form, horizon_days: String(v) })}
                  options={horizonOptions}
                />
                <p className="text-xs text-gray-400 mt-1.5">How many days ahead to forecast</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={running || !form.network_id} className="btn-primary flex-1">
                  {running ? 'Predicting…' : 'Run Prediction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
