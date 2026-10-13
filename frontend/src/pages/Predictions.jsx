import { useEffect, useState } from 'react'
import { predictionsAPI, networksAPI } from '../services/api'
import { Brain, X } from 'lucide-react'
import { format } from 'date-fns'

const riskColors = {
  Low: 'bg-green-100 text-green-800 border-green-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  High: 'bg-orange-100 text-orange-800 border-orange-200',
  Critical: 'bg-red-100 text-red-800 border-red-200',
}

export default function Predictions() {
  const [predictions, setPredictions] = useState([])
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ network_id: '', horizon_days: 7 })
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  const load = () => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Predictions</h1>
          <p className="text-gray-500 mt-1">Forecast performance degradation & congestion risk</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Brain className="w-4 h-4" /> Run Prediction
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : predictions.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No predictions yet. Add metrics first, then run a prediction.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {predictions.map((p) => {
            const net = networks.find((n) => n.id === p.network_id)
            return (
              <div key={p.id} className={`card border-l-4 ${riskColors[p.risk_level]?.replace('bg-', 'border-').split(' ')[0] || 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{net?.name || `Network #${p.network_id}`}</h3>
                    <p className="text-sm text-gray-500">{net?.area}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${riskColors[p.risk_level]}`}>
                    {p.risk_level}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Risk Score</p>
                    <p className="text-lg font-bold text-gray-900">{(p.risk_score * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Congestion</p>
                    <p className="text-lg font-bold text-gray-900">{(p.congestion_probability * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Degradation</p>
                    <p className="text-lg font-bold text-gray-900">{(p.degradation_probability * 100).toFixed(1)}%</p>
                  </div>
                </div>

                {p.explanation && (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-3">{p.explanation}</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Horizon: {p.horizon_days} day(s)</span>
                  <span>{format(new Date(p.created_at), 'dd MMM yyyy HH:mm')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Run Prediction</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePredict} className="space-y-4">
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
                <label className="label">Prediction Horizon (days) *</label>
                <select
                  className="input"
                  value={form.horizon_days}
                  onChange={(e) => setForm({ ...form, horizon_days: e.target.value })}
                >
                  {[1, 3, 5, 7, 14, 21, 30].map((d) => (
                    <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">How many days ahead to forecast</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={running} className="btn-primary flex-1">
                  {running ? 'Predicting...' : 'Run Prediction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
