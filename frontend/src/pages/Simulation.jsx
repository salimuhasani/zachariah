import { useState, useEffect, useMemo, useRef } from 'react'
import { networksAPI, metricsAPI, predictionsAPI } from '../services/api'
import {
  Radio, Users, Plus, Minus, Activity, Gauge, Wifi, AlertTriangle,
  CheckCircle, TrendingUp, TrendingDown, Save, Brain, Loader2,
  ArrowRight, Lightbulb, Zap, Signal, Database
} from 'lucide-react'
import { format } from 'date-fns'

/* ─── KPI engine ─── */
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
    riskLevel,
    load: Math.round(load * 100)
  }
}

const riskMeta = {
  Low:      { bg: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-400/40', text: 'text-emerald-700', badge: 'bg-emerald-500', bar: 'bg-emerald-500', glow: 'shadow-emerald-500/30', label: 'Healthy' },
  Medium:   { bg: 'from-amber-500/10 to-amber-600/5',   border: 'border-amber-400/40',   text: 'text-amber-700',   badge: 'bg-amber-500',   bar: 'bg-amber-500',   glow: 'shadow-amber-500/30',   label: 'Elevated' },
  High:     { bg: 'from-orange-500/15 to-orange-600/5',  border: 'border-orange-400/50',  text: 'text-orange-700',  badge: 'bg-orange-500',  bar: 'bg-orange-500',  glow: 'shadow-orange-500/40',  label: 'Congested' },
  Critical: { bg: 'from-red-500/20 to-red-700/10',       border: 'border-red-500/60',     text: 'text-red-700',     badge: 'bg-red-500',     bar: 'bg-red-500',     glow: 'shadow-red-500/50',     label: 'Critical' },
}

/* ─── Animated gauge ─── */
function AnimatedGauge({ value, max = 100, color, label, unit, size = 110 }) {
  const pct = Math.min(value / max, 1)
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-xl font-bold tabular-nums text-gray-900">{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{unit}</span>
      </div>
      <p className="text-xs font-medium text-gray-600 mt-1">{label}</p>
    </div>
  )
}

/* ─── Packet loss particles ─── */
function PacketParticles({ intensity }) {
  const count = Math.min(Math.floor(intensity * 12), 24)
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-red-400 opacity-70"
          style={{
            left: `${10 + (i * 37) % 80}%`,
            top: `-5%`,
            animation: `packetFall ${1.2 + (i % 5) * 0.35}s linear ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

/* ─── Signal rings ─── */
function SignalRings({ healthy }) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`absolute rounded-full border-2 ${healthy ? 'border-emerald-400/40' : 'border-red-400/50'}`}
          style={{
            width: 30 + i * 28,
            height: 30 + i * 28,
            left: -(15 + i * 14),
            top: -(15 + i * 14),
            animation: `signalPulse ${2 + i * 0.4}s ease-out ${i * 0.3}s infinite`,
          }}
        />
      ))}
    </div>
  )
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
  const [pulse, setPulse] = useState(0)

  // subtle pulse for living UI
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => p + 1), 2000)
    return () => clearInterval(t)
  }, [])

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
        const m = res.data?.[0] || null
        setLatestMetric(m)
        setActiveUsers(m ? m.active_users : 40)
        setLastPrediction(null)
        setMessage(null)
      })
      .catch(() => { setLatestMetric(null); setActiveUsers(40) })
  }, [selectedNetworkId])

  const selectedNetwork = networks.find((n) => String(n.id) === selectedNetworkId)
  const kpis = useMemo(() => calculateKPIs(activeUsers, latestMetric), [activeUsers, latestMetric])
  const meta = riskMeta[kpis.riskLevel]
  const isStressed = kpis.riskLevel === 'High' || kpis.riskLevel === 'Critical'
  const isCritical = kpis.riskLevel === 'Critical'

  const changeUsers = (d) => setActiveUsers((p) => Math.max(1, Math.min(250, p + d)))

  const handleSave = async () => {
    if (!selectedNetworkId) return
    setSaving(true); setMessage(null)
    try {
      await metricsAPI.create({
        network_id: Number(selectedNetworkId),
        date: format(new Date(), 'yyyy-MM-dd'),
        active_users: activeUsers,
        traffic_gb: kpis.traffic,
        prb_utilization: kpis.prb,
        latency_ms: kpis.latency,
        packet_loss: kpis.packetLoss,
        throughput_mbps: kpis.throughput,
      })
      setMessage({ type: 'ok', text: 'Metrics saved to network. Ready for prediction.' })
      const res = await metricsAPI.list({ network_id: selectedNetworkId, limit: 1 })
      setLatestMetric(res.data?.[0] || null)
    } catch (err) {
      setMessage({ type: 'err', text: err.response?.data?.detail || 'Failed to save metrics' })
    } finally { setSaving(false) }
  }

  const handlePredict = async (horizon = 7) => {
    if (!selectedNetworkId) return
    setPredicting(true); setMessage(null)
    try {
      const res = await predictionsAPI.create({ network_id: Number(selectedNetworkId), horizon_days: horizon })
      setLastPrediction(res.data)
      setMessage({ type: 'ok', text: `Prediction complete (${horizon}-day horizon). Risk: ${res.data.risk_level}` })
    } catch (err) {
      setMessage({ type: 'err', text: err.response?.data?.detail || 'Prediction failed. Ensure the network has metrics.' })
    } finally { setPredicting(false) }
  }

  const visualUsers = Math.min(activeUsers, 56)
  const overflow = activeUsers > 56 ? activeUsers - 56 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
          <Radio className="w-5 h-5 text-primary-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Inject keyframe styles */}
      <style>{`
        @keyframes packetFall {
          0%   { transform: translateY(0) scale(1); opacity: 0.8; }
          70%  { opacity: 0.6; }
          100% { transform: translateY(220px) scale(0.3); opacity: 0; }
        }
        @keyframes signalPulse {
          0%   { transform: scale(0.6); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes userPop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes heatPulse {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 0.7; }
        }
        @keyframes barGrow {
          from { width: 0%; }
        }
        .user-dot { animation: userPop 0.35s ease-out both; }
        .heat-overlay { animation: heatPulse 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tower Simulation</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Live capacity laboratory — adjust active users and watch network KPIs react in real time
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
          {['Network', 'Users', 'KPIs', 'Save', 'Predict'].map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              {i > 0 && <ArrowRight className="w-3 h-3" />}
              <span className={`px-2 py-0.5 rounded-full ${i === 0 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100'}`}>{s}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Network selector */}
      <div className="card !py-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="label">Select Network Site</label>
            <select className="input" value={selectedNetworkId} onChange={(e) => setSelectedNetworkId(e.target.value)}>
              {networks.length === 0 && <option value="">No networks — create one under Networks first</option>}
              {networks.map((n) => (
                <option key={n.id} value={n.id}>{n.name} — {n.area}</option>
              ))}
            </select>
          </div>
          {selectedNetwork && (
            <div className="text-sm text-gray-500 pb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-400" />
              {latestMetric ? (
                <span>Baseline: <strong className="text-gray-800">{latestMetric.active_users}</strong> users · {format(new Date(latestMetric.date), 'dd MMM yyyy')}</span>
              ) : (
                <span className="text-amber-600">No metrics yet — using default capacity model</span>
              )}
            </div>
          )}
        </div>
      </div>

      {!selectedNetworkId ? (
        <div className="card text-center py-24 text-gray-400">
          <Radio className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="font-medium text-gray-600">Create a network first</p>
          <p className="text-sm mt-1">Go to <strong>Networks</strong> → Add Network, then return here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* ═══ LEFT: Tower stage ═══ */}
          <div className="xl:col-span-4 space-y-5">
            {/* Tower visual */}
            <div className={`card relative overflow-hidden border-2 bg-gradient-to-b ${meta.bg} ${meta.border} transition-all duration-500`}>
              {/* Heat overlay when congested */}
              {isStressed && (
                <div className={`absolute inset-0 heat-overlay pointer-events-none ${isCritical ? 'bg-red-500/10' : 'bg-orange-500/8'}`} />
              )}
              {/* Packet loss particles */}
              {kpis.packetLoss > 0.3 && <PacketParticles intensity={kpis.packetLoss} />}

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${meta.glow} ${meta.badge}`}>
                    <Radio className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 leading-tight">{selectedNetwork?.name}</h2>
                    <p className="text-[11px] text-gray-500">{selectedNetwork?.area}</p>
                  </div>
                  <div className={`ml-auto px-2.5 py-1 rounded-full text-[11px] font-semibold text-white ${meta.badge}`}>
                    {meta.label}
                  </div>
                </div>

                {/* Tower illustration */}
                <div className="relative flex flex-col items-center py-2 h-52">
                  <SignalRings healthy={!isStressed} />
                  {/* Antenna tip */}
                  <div className={`w-3 h-3 rounded-full mb-0.5 transition-colors duration-500 ${isCritical ? 'bg-red-500 shadow-lg shadow-red-400' : isStressed ? 'bg-orange-500 shadow-md shadow-orange-300' : 'bg-primary-500 shadow-md shadow-primary-300'}`} />
                  <div className={`w-0.5 h-6 transition-colors duration-500 ${isCritical ? 'bg-red-400' : 'bg-primary-500'}`} />
                  {/* Mast */}
                  <div className="relative">
                    <div className={`w-12 h-32 rounded-t-sm transition-all duration-500 ${isCritical ? 'bg-gradient-to-b from-red-300 to-slate-500' : isStressed ? 'bg-gradient-to-b from-orange-200 to-slate-500' : 'bg-gradient-to-b from-slate-300 to-slate-500'}`}>
                      {[10, 22, 34, 46, 58, 70, 82, 94].map((t) => (
                        <div key={t} className="absolute inset-x-1 h-px bg-white/20" style={{ top: t }} />
                      ))}
                    </div>
                    <div className="w-20 h-3 bg-slate-600 rounded-sm -ml-4" />
                  </div>
                  {/* Load bar under tower */}
                  <div className="w-full max-w-[160px] mt-3">
                    <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                      <span>Load</span>
                      <span className="font-semibold tabular-nums">{kpis.load}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${meta.bar}`}
                        style={{ width: `${Math.min(kpis.load, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* User dots */}
                <div className="mt-3 pt-3 border-t border-gray-200/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Active Users
                    </span>
                    <span className="text-xl font-bold tabular-nums text-gray-900">{activeUsers}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 min-h-[56px] content-start">
                    {Array.from({ length: visualUsers }).map((_, i) => (
                      <div
                        key={`${activeUsers}-${i}`}
                        className={`user-dot w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                          isCritical ? 'bg-red-400' : isStressed ? 'bg-orange-400' : kpis.riskLevel === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ animationDelay: `${(i % 20) * 20}ms` }}
                      />
                    ))}
                    {overflow > 0 && <span className="text-[10px] text-gray-400 self-center ml-0.5">+{overflow}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm">Control Active Users</h3>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => changeUsers(-10)} className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center transition">
                  <Minus className="w-5 h-5 text-gray-700" />
                </button>
                <button onClick={() => changeUsers(-1)} className="w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 active:scale-95 flex items-center justify-center">
                  <Minus className="w-4 h-4" />
                </button>
                <div className="text-center min-w-[72px]">
                  <p className="text-3xl font-bold tabular-nums text-gray-900">{activeUsers}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">users</p>
                </div>
                <button onClick={() => changeUsers(1)} className="w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 active:scale-95 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => changeUsers(10)} className="w-11 h-11 rounded-xl bg-primary-100 hover:bg-primary-200 active:scale-95 flex items-center justify-center transition">
                  <Plus className="w-5 h-5 text-primary-700" />
                </button>
              </div>
              <input type="range" min="1" max="250" value={activeUsers} onChange={(e) => setActiveUsers(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary-600 bg-gray-200" />
              <div className="flex justify-between text-[10px] text-gray-400"><span>1</span><span>Capacity ≈ 80</span><span>250</span></div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { l: 'Idle', v: 15 }, { l: 'Normal', v: 50 },
                  { l: 'Busy', v: 110 }, { l: 'Peak', v: 180 }
                ].map((p) => (
                  <button key={p.v} onClick={() => setActiveUsers(p.v)}
                    className={`py-1.5 text-[11px] font-semibold rounded-lg transition active:scale-95 ${
                      activeUsers === p.v ? 'bg-primary-600 text-white shadow-md shadow-primary-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="card space-y-2.5">
              <h3 className="font-semibold text-gray-900 text-sm">Next Steps</h3>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm active:scale-[0.98]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Metrics to Network
              </button>
              <div className="grid grid-cols-3 gap-1.5">
                {[3, 7, 14].map((h) => (
                  <button key={h} onClick={() => handlePredict(h)} disabled={predicting}
                    className="btn-secondary flex items-center justify-center gap-1 text-xs py-2 active:scale-95">
                    {predicting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                    {h}d
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-center text-gray-400">Run AI Prediction (horizon)</p>
            </div>
          </div>

          {/* ═══ RIGHT: Live telemetry ═══ */}
          <div className="xl:col-span-8 space-y-5">
            {message && (
              <div className={`rounded-xl px-4 py-3 text-sm border flex items-center gap-2 ${
                message.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {message.type === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                {message.text}
              </div>
            )}

            {/* Risk banner */}
            <div className={`card border-2 bg-gradient-to-r ${meta.bg} ${meta.border} shadow-lg ${meta.glow} transition-all duration-500`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl ${meta.badge} flex items-center justify-center shadow-lg`}>
                    {isStressed ? <AlertTriangle className="w-7 h-7 text-white" /> : <CheckCircle className="w-7 h-7 text-white" />}
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">Risk Level</p>
                    <p className={`text-3xl font-bold ${meta.text}`}>{kpis.riskLevel}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{meta.label} network condition</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">Score</p>
                  <p className={`text-4xl font-bold tabular-nums ${meta.text}`}>{kpis.riskScore}%</p>
                </div>
              </div>
              <div className="mt-4 h-3 bg-white/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ease-out ${meta.bar}`}
                  style={{ width: `${kpis.riskScore}%` }} />
              </div>
            </div>

            {/* Animated gauges */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 text-sm mb-5 flex items-center gap-2">
                <Signal className="w-4 h-4 text-primary-600" /> Live Network Gauges
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center relative">
                <div className="relative flex flex-col items-center">
                  <AnimatedGauge value={kpis.prb} max={100} color={kpis.prb >= 80 ? '#ef4444' : kpis.prb >= 60 ? '#f97316' : '#10b981'} label="PRB Utilization" unit="%" />
                </div>
                <div className="relative flex flex-col items-center">
                  <AnimatedGauge value={kpis.latency} max={200} color={kpis.latency >= 100 ? '#ef4444' : kpis.latency >= 60 ? '#f97316' : '#10b981'} label="Latency" unit="ms" />
                </div>
                <div className="relative flex flex-col items-center">
                  <AnimatedGauge value={kpis.packetLoss} max={8} color={kpis.packetLoss >= 2 ? '#ef4444' : kpis.packetLoss >= 0.5 ? '#f97316' : '#10b981'} label="Packet Loss" unit="%" />
                </div>
                <div className="relative flex flex-col items-center">
                  <AnimatedGauge value={kpis.throughput} max={60} color={kpis.throughput <= 15 ? '#ef4444' : kpis.throughput <= 30 ? '#f97316' : '#10b981'} label="Throughput" unit="Mbps" />
                </div>
              </div>
            </div>

            {/* KPI detail bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'prb', label: 'PRB Utilization', value: kpis.prb, max: 100, unit: '%', icon: Gauge, good: 60, warn: 80 },
                { key: 'lat', label: 'Latency', value: kpis.latency, max: 200, unit: ' ms', icon: Activity, good: 50, warn: 100 },
                { key: 'loss', label: 'Packet Loss', value: kpis.packetLoss, max: 8, unit: '%', icon: AlertTriangle, good: 0.5, warn: 2 },
                { key: 'tp', label: 'Throughput', value: kpis.throughput, max: 60, unit: ' Mbps', icon: Wifi, good: 30, warn: 15, invert: true },
              ].map((k) => {
                const Icon = k.icon
                const pct = Math.min((k.value / k.max) * 100, 100)
                const bad = k.invert ? k.value <= k.warn : k.value >= k.warn
                const mid = k.invert ? k.value <= k.good : k.value >= k.good
                const barColor = bad ? 'bg-red-500' : mid ? 'bg-orange-500' : 'bg-emerald-500'
                const Trend = (k.invert ? k.value <= k.good : k.value >= k.good) ? TrendingUp : TrendingDown
                const trendColor = (k.invert ? k.value <= k.good : k.value >= k.good) ? 'text-red-500' : 'text-emerald-500'
                return (
                  <div key={k.key} className="card !p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bad ? 'bg-red-50 text-red-600' : mid ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-medium text-gray-600">{k.label}</span>
                      </div>
                      <Trend className={`w-4 h-4 ${trendColor}`} />
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-gray-900 mb-2">
                      {typeof k.value === 'number' && k.value % 1 !== 0 ? k.value.toFixed(2) : k.value}
                      <span className="text-sm font-normal text-gray-400">{k.unit}</span>
                    </p>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Relations */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Active Users ↔ KPI Relationships</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Users vs PRB', ok: activeUsers <= 55, warn: activeUsers <= 100, g: 'Low PRB — resources available', m: 'PRB rising — still manageable', b: 'PRB saturation — congestion starting' },
                  { label: 'Users vs Latency', ok: kpis.latency < 50, warn: kpis.latency < 100, g: 'Low latency — fast service', m: 'Latency increasing', b: 'High latency — quality degraded' },
                  { label: 'Users vs Packet Loss', ok: kpis.packetLoss < 0.5, warn: kpis.packetLoss < 2, g: 'Minimal packet loss', m: 'Packet loss rising under load', b: 'High loss — drops & retransmits' },
                  { label: 'Users vs Throughput', ok: kpis.throughput > 30, warn: kpis.throughput > 15, g: 'Strong throughput', m: 'Throughput shared among users', b: 'Throughput exhausted — capacity limit' },
                ].map((r) => {
                  const st = r.ok ? 'good' : r.warn ? 'warn' : 'bad'
                  const desc = r.ok ? r.g : r.warn ? r.m : r.b
                  const dot = { good: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-red-500' }
                  return (
                    <div key={r.label} className="flex gap-2.5 items-start p-2.5 rounded-lg bg-gray-50">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot[st]}`} />
                      <div>
                        <p className="font-medium text-gray-800 text-[13px]">{r.label}</p>
                        <p className="text-gray-500 text-[12px]">{desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Prediction result */}
            {lastPrediction && (
              <div className="card border border-primary-200 bg-gradient-to-br from-primary-50/50 to-white">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Prediction Result</h3>
                    <p className="text-[11px] text-gray-500">{lastPrediction.horizon_days}-day horizon</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { l: 'Risk Level', v: lastPrediction.risk_level, cls: riskMeta[lastPrediction.risk_level]?.text },
                    { l: 'Risk Score', v: `${(lastPrediction.risk_score * 100).toFixed(1)}%` },
                    { l: 'Congestion', v: `${(lastPrediction.congestion_probability * 100).toFixed(1)}%` },
                    { l: 'Degradation', v: `${(lastPrediction.degradation_probability * 100).toFixed(1)}%` },
                  ].map((x) => (
                    <div key={x.l} className="bg-white rounded-xl p-3 border border-gray-100">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">{x.l}</p>
                      <p className={`text-lg font-bold tabular-nums ${x.cls || 'text-gray-900'}`}>{x.v}</p>
                    </div>
                  ))}
                </div>
                {lastPrediction.explanation && (
                  <p className="text-sm text-gray-600 bg-white rounded-xl p-3 border border-gray-100 mb-3 leading-relaxed">
                    {lastPrediction.explanation}
                  </p>
                )}
                <div className="flex items-start gap-2 text-sm text-primary-800 bg-primary-50 rounded-xl p-3">
                  <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>Saved metrics appear in <strong>Metrics</strong> and <strong>Dashboard</strong>. This prediction is also listed under <strong>Predictions</strong>.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
