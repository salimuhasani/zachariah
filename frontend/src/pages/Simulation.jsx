import { useState, useEffect, useMemo } from 'react'
import { networksAPI, metricsAPI, predictionsAPI } from '../services/api'
import {
  Radio, Users, Plus, Minus, Activity, Gauge, Wifi, AlertTriangle,
  CheckCircle, TrendingUp, TrendingDown, Save, Brain, Loader2,
  ArrowRight, Lightbulb
} from 'lucide-react'
import { format } from 'date-fns'

function calculateKPIs(activeUsers, baseline = null) {
  const capacity = baseline?.active_users ? Math.max(baseline.active_users * 1.35, 70) : 80
  const load = activeUsers / capacity

  const basePrb = baseline?.prb_utilization ?? 20
  const baseLatency = baseline?.latency_ms ?? 18
  const baseLoss = baseline?.packet_loss ?? 0.08
  const baseThroughput = baseline?.throughput_mbps ?? 52

  const prb = Math.min(98, Math.round(basePrb + (load - 0.45) * 52 + (load > 1 ? (load - 1) * 38 : 0)))
  const latency = Math.round(baseLatency + load * 28 + Math.pow(Math.max(0, load - 0.65), 2) * 155)
  const packetLoss = Math.max(0, +(baseLoss + Math.pow(Math.max(0, load - 0.8), 2) * 7.2).toFixed(2))
  const throughput = Math.max(1.5, +(baseThroughput - load * 24 - Math.pow(Math.max(0, load - 1), 1.4) * 14).toFixed(1))
  const traffic = +(activeUsers * 0.4 + (baseline?.traffic_gb ? baseline.traffic_gb * 0.08 : 1)).toFixed(1)

  const prbScore = Math.min(prb / 100, 1)
  const latencyScore = Math.min(latency / 150, 1)
  const lossScore = Math.min(packetLoss / 5, 1)
  const throughputScore = Math.max(0, 1 - throughput / 50)
  const riskScore = prbScore * 0.3 + latencyScore * 0.25 + lossScore * 0.25 + throughputScore * 0.2

  let riskLevel = 'Low'
  if (riskScore >= 0.75) riskLevel = 'Critical'
  else if (riskScore >= 0.55) riskLevel = 'High'
  else if (riskScore >= 0.35) riskLevel = 'Medium'

  return {
    prb: Math.max(0, Math.min(100, prb)),
    latency: Math.max(5, latency),
    packetLoss: Math.max(0, packetLoss),
    throughput: Math.max(1, throughput),
    traffic: Math.max(0.1, traffic),
    riskScore: Math.round(Math.min(1, riskScore) * 100),
    riskLevel
  }
}

const riskStyles = {
  Low: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-800', bar: 'bg-emerald-500', icon: CheckCircle },
  Medium: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500', icon: Activity },
  High: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-800', bar: 'bg-orange-500', icon: AlertTriangle },
  Critical: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-800', bar: 'bg-red-500', icon: AlertTriangle }
}

export default function Simulation() {
  const [networks, setNetworks] = useState([])
  const [selectedNetworkId, setSelectedNetworkId] = useState('')
  const [latestMetric, setLatestMetric] = useState(null)
  const [activeUsers, setActiveUsers] = useState(40)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [predicting, setPredicting] = useState(false)
  const [message, setMessage] = useState(null)
  const [lastPrediction, setLastPrediction] = useState(null)

  useEffect(() => {
    networksAPI.list()
      .then((res) => {
        setNetworks(res.data)
        if (res.data.length > 0) setSelectedNetworkId(String(res.data[0].id))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedNetworkId) { setLatestMetric(null); return }
    metricsAPI.list({ network_id: selectedNetworkId, limit: 1 })
      .then((res) => {
        const metric = res.data?.[0] || null
        setLatestMetric(metric)
        setActiveUsers(metric ? metric.active_users : 40)
        setLastPrediction(null)
        setMessage(null)
      })
      .catch(() => { setLatestMetric(null); setActiveUsers(40) })
  }, [selectedNetworkId])

  const selectedNetwork = networks.find((n) => String(n.id) === selectedNetworkId)
  const kpis = useMemo(() => calculateKPIs(activeUsers, latestMetric), [activeUsers, latestMetric])
  const style = riskStyles[kpis.riskLevel]
  const RiskIcon = style.icon

  const changeUsers = (d) => setActiveUsers((p) => Math.max(1, Math.min(250, p + d)))

  const handleSaveMetric = async () => {
    if (!selectedNetworkId) return
    setSaving(true)
    setMessage(null)
    try {
      await metricsAPI.create({
        network_id: Number(selectedNetworkId),
        date: format(new Date(), 'yyyy-MM-dd'),
        active_users: activeUsers,
        traffic_gb: kpis.traffic,
        prb_utilization: kpis.prb,
        latency_ms: kpis.latency,
        packet_loss: kpis.packetLoss,
        throughput_mbps: kpis.throughput
      })
      setMessage({ type: 'success', text: 'Metrics zimehifadhiwa. Sasa unaweza kufanya Prediction.' })
      const res = await metricsAPI.list({ network_id: selectedNetworkId, limit: 1 })
      setLatestMetric(res.data?.[0] || null)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Imeshindikana kuhifadhi' })
    } finally {
      setSaving(false)
    }
  }

  const handleRunPrediction = async (horizon = 7) => {
    if (!selectedNetworkId) return
    setPredicting(true)
    setMessage(null)
    try {
      const res = await predictionsAPI.create({ network_id: Number(selectedNetworkId), horizon_days: horizon })
      setLastPrediction(res.data)
      setMessage({ type: 'success', text: `Prediction imekamilika (${horizon} siku). Risk: ${res.data.risk_level}` })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Prediction imeshindikana. Hakikisha network ina metrics.' })
    } finally {
      setPredicting(false)
    }
  }

  const visualUsers = Math.min(activeUsers, 48)
  const overflow = activeUsers > 48 ? activeUsers - 48 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tower Simulation</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Chagua Network → Badilisha Active Users → Ona KPI live → Hifadhi → Run Prediction
        </p>
      </div>

      {/* Flow indicator */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500">
        <span className="px-2.5 py-1 rounded-full bg-primary-100 text-primary-700">1. Network</span>
        <ArrowRight className="w-3.5 h-3.5" />
        <span className="px-2.5 py-1 rounded-full bg-gray-100">2. Users</span>
        <ArrowRight className="w-3.5 h-3.5" />
        <span className="px-2.5 py-1 rounded-full bg-gray-100">3. KPI</span>
        <ArrowRight className="w-3.5 h-3.5" />
        <span className="px-2.5 py-1 rounded-full bg-gray-100">4. Save</span>
        <ArrowRight className="w-3.5 h-3.5" />
        <span className="px-2.5 py-1 rounded-full bg-gray-100">5. Predict</span>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="label">Chagua Network (Mnara)</label>
            <select className="input" value={selectedNetworkId} onChange={(e) => setSelectedNetworkId(e.target.value)}>
              {networks.length === 0 && <option value="">Hakuna network — tengeneza kwenye Networks</option>}
              {networks.map((n) => (
                <option key={n.id} value={n.id}>{n.name} — {n.area}</option>
              ))}
            </select>
          </div>
          {selectedNetwork && (
            <div className="text-sm text-gray-500 pb-2">
              {latestMetric ? (
                <span>Baseline: <strong className="text-gray-800">{latestMetric.active_users}</strong> users ({format(new Date(latestMetric.date), 'dd MMM yyyy')})</span>
              ) : (
                <span className="text-amber-600">Hakuna metrics — formula ya kawaida itatumika</span>
              )}
            </div>
          )}
        </div>
      </div>

      {!selectedNetworkId ? (
        <div className="card text-center py-20 text-gray-500">
          <Radio className="w-14 h-14 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Tengeneza Network kwanza</p>
          <p className="text-sm mt-1">Nenda kwenye <strong>Networks</strong> → Add Network, kisha rudi hapa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="space-y-5">
            <div className="card relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-gradient-to-bl from-primary-100/60 to-transparent rounded-full" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md shadow-primary-200">
                  <Radio className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedNetwork?.name}</h2>
                  <p className="text-xs text-gray-500">{selectedNetwork?.area}</p>
                </div>
              </div>

              <div className="relative flex flex-col items-center py-3">
                <div className="w-2.5 h-2.5 rounded-full bg-primary-500 mb-0.5 shadow shadow-primary-400" />
                <div className="w-0.5 h-7 bg-gradient-to-b from-primary-500 to-primary-700" />
                <div className="relative">
                  <div className="w-14 h-36 bg-gradient-to-b from-slate-300 to-slate-500 rounded-t-sm">
                    {[8, 16, 24, 32].map((t) => (
                      <div key={t} className="absolute inset-x-1.5 h-px bg-slate-400/70" style={{ top: t }} />
                    ))}
                  </div>
                  <div className="w-20 h-3.5 bg-slate-600 rounded-sm -ml-3" />
                </div>
                {(kpis.riskLevel === 'Critical' || kpis.riskLevel === 'High') && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2">
                    <span className="block w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> Active Users
                  </span>
                  <span className="text-2xl font-bold tabular-nums text-gray-900">{activeUsers}</span>
                </div>
                <div className="flex flex-wrap gap-1 min-h-[64px] content-start">
                  {Array.from({ length: visualUsers }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                        kpis.riskLevel === 'Critical' ? 'bg-red-400' :
                        kpis.riskLevel === 'High' ? 'bg-orange-400' :
                        kpis.riskLevel === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                  ))}
                  {overflow > 0 && <span className="text-xs text-gray-400 self-center ml-1">+{overflow}</span>}
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Dhibiti Active Users</h3>
              <div className="flex items-center justify-center gap-3 mb-4">
                <button onClick={() => changeUsers(-10)} className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                  <Minus className="w-5 h-5 text-gray-700" />
                </button>
                <button onClick={() => changeUsers(-1)} className="w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center">
                  <Minus className="w-4 h-4 text-gray-600" />
                </button>
                <div className="text-center min-w-[70px]">
                  <p className="text-3xl font-bold tabular-nums text-gray-900">{activeUsers}</p>
                  <p className="text-[11px] text-gray-400">users</p>
                </div>
                <button onClick={() => changeUsers(1)} className="w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={() => changeUsers(10)} className="w-11 h-11 rounded-xl bg-primary-100 hover:bg-primary-200 flex items-center justify-center transition">
                  <Plus className="w-5 h-5 text-primary-700" />
                </button>
              </div>
              <input type="range" min="1" max="250" value={activeUsers} onChange={(e) => setActiveUsers(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600" />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1"><span>1</span><span>~80 capacity</span><span>250</span></div>
              <div className="grid grid-cols-4 gap-1.5 mt-3">
                {[{ l: 'Low', v: 25 }, { l: 'Normal', v: 55 }, { l: 'Busy', v: 110 }, { l: 'Peak', v: 170 }].map((p) => (
                  <button key={p.v} onClick={() => setActiveUsers(p.v)}
                    className={`py-1.5 text-[11px] font-medium rounded-lg transition ${activeUsers === p.v ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="card space-y-2.5">
              <h3 className="font-semibold text-gray-900 text-sm">Hatua zinazofuata</h3>
              <button onClick={handleSaveMetric} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Hifadhi Metrics → Network
              </button>
              <div className="grid grid-cols-3 gap-1.5">
                {[3, 7, 14].map((h) => (
                  <button key={h} onClick={() => handleRunPrediction(h)} disabled={predicting}
                    className="btn-secondary flex items-center justify-center gap-1 text-xs py-2">
                    {predicting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                    {h}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="xl:col-span-2 space-y-5">
            {message && (
              <div className={`rounded-xl px-4 py-3 text-sm border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                {message.text}
              </div>
            )}

            <div className={`card border-2 ${style.bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${style.badge} flex items-center justify-center`}>
                    <RiskIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Risk Level</p>
                    <p className={`text-2xl font-bold ${style.text}`}>{kpis.riskLevel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Score</p>
                  <p className={`text-3xl font-bold tabular-nums ${style.text}`}>{kpis.riskScore}%</p>
                </div>
              </div>
              <div className="mt-4 h-2.5 bg-white/60 rounded-full overflow-hidden">
                <div className={`h-full ${style.bar} transition-all duration-500`} style={{ width: `${kpis.riskScore}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { title: 'PRB Utilization', value: `${kpis.prb}%`, icon: Gauge, color: kpis.prb >= 80 ? 'red' : kpis.prb >= 60 ? 'orange' : 'green', trend: kpis.prb >= 70 ? 'up' : 'down' },
                { title: 'Latency', value: `${kpis.latency} ms`, icon: Activity, color: kpis.latency >= 100 ? 'red' : kpis.latency >= 60 ? 'orange' : 'green', trend: kpis.latency >= 60 ? 'up' : 'down' },
                { title: 'Packet Loss', value: `${kpis.packetLoss}%`, icon: AlertTriangle, color: kpis.packetLoss >= 2 ? 'red' : kpis.packetLoss >= 0.5 ? 'orange' : 'green', trend: kpis.packetLoss >= 0.5 ? 'up' : 'down' },
                { title: 'Throughput', value: `${kpis.throughput} Mbps`, icon: Wifi, color: kpis.throughput <= 15 ? 'red' : kpis.throughput <= 30 ? 'orange' : 'green', trend: kpis.throughput <= 25 ? 'down' : 'up' },
              ].map((k) => {
                const Icon = k.icon
                const TrendIcon = k.trend === 'up' ? TrendingUp : TrendingDown
                const c = { green: 'bg-emerald-50 text-emerald-600', orange: 'bg-orange-50 text-orange-600', red: 'bg-red-50 text-red-600' }
                return (
                  <div key={k.title} className="card !p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-8 h-8 rounded-lg ${c[k.color]} flex items-center justify-center`}><Icon className="w-4 h-4" /></div>
                      <TrendIcon className={`w-3.5 h-3.5 ${k.trend === 'up' ? 'text-red-500' : 'text-emerald-500'}`} />
                    </div>
                    <p className="text-[11px] text-gray-500">{k.title}</p>
                    <p className="text-lg font-bold text-gray-900 tabular-nums">{k.value}</p>
                  </div>
                )
              })}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Uhusiano: Active Users ↔ KPIs</h3>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: 'Users vs PRB', ok: activeUsers <= 55, warn: activeUsers <= 100, good: 'PRB chini — rasilimali zinatosha', mid: 'PRB inapanda — bado inasimamiwa', bad: 'PRB saturation — congestion inaanza' },
                  { label: 'Users vs Latency', ok: kpis.latency < 50, warn: kpis.latency < 100, good: 'Latency nzuri — service haraka', mid: 'Latency inaongezeka', bad: 'Latency mbaya — quality inaathirika' },
                  { label: 'Users vs Packet Loss', ok: kpis.packetLoss < 0.5, warn: kpis.packetLoss < 2, good: 'Packet loss chini', mid: 'Packet loss inaongezeka', bad: 'Packet loss juu — data/calls zinaweza kukatika' },
                  { label: 'Users vs Throughput', ok: kpis.throughput > 30, warn: kpis.throughput > 15, good: 'Throughput juu', mid: 'Throughput inapungua', bad: 'Throughput chini — capacity imefika kikomo' },
                ].map((r) => {
                  const status = r.ok ? 'good' : r.warn ? 'warn' : 'bad'
                  const desc = r.ok ? r.good : r.warn ? r.mid : r.bad
                  const dot = { good: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-red-500' }
                  return (
                    <div key={r.label} className="flex gap-2.5 items-start">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot[status]}`} />
                      <div><p className="font-medium text-gray-800 text-[13px]">{r.label}</p><p className="text-gray-500 text-[13px]">{desc}</p></div>
                    </div>
                  )
                })}
              </div>
            </div>

            {lastPrediction && (
              <div className="card border border-primary-200 bg-gradient-to-br from-primary-50/40 to-white">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold text-gray-900">Prediction Result — {lastPrediction.horizon_days} siku mbele</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div><p className="text-[11px] text-gray-500">Risk Level</p><p className={`text-lg font-bold ${riskStyles[lastPrediction.risk_level]?.text || ''}`}>{lastPrediction.risk_level}</p></div>
                  <div><p className="text-[11px] text-gray-500">Risk Score</p><p className="text-lg font-bold tabular-nums">{(lastPrediction.risk_score * 100).toFixed(1)}%</p></div>
                  <div><p className="text-[11px] text-gray-500">Congestion</p><p className="text-lg font-bold tabular-nums">{(lastPrediction.congestion_probability * 100).toFixed(1)}%</p></div>
                  <div><p className="text-[11px] text-gray-500">Degradation</p><p className="text-lg font-bold tabular-nums">{(lastPrediction.degradation_probability * 100).toFixed(1)}%</p></div>
                </div>
                {lastPrediction.explanation && (
                  <p className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-100 mb-3">{lastPrediction.explanation}</p>
                )}
                <div className="flex items-start gap-2 text-sm text-primary-800 bg-primary-50 rounded-lg p-3">
                  <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>Metrics zilizohifadhiwa zitaonekana kwenye <strong>Metrics</strong> na <strong>Dashboard</strong>. Prediction hii ipo pia kwenye ukurasa wa Predictions.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
