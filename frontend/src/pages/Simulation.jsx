import { useState, useMemo } from 'react'
import {
  Radio,
  Users,
  Plus,
  Minus,
  Activity,
  Gauge,
  Wifi,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

// Simulation formulas: how KPIs change with Active Users
// Tower capacity baseline = 80 users (healthy)
function calculateKPIs(activeUsers) {
  const capacity = 80
  const load = activeUsers / capacity

  // PRB Utilization (%) - rises with load, saturates near 100
  const prb = Math.min(95, Math.round(18 + load * 65 + (load > 1 ? (load - 1) * 40 : 0)))

  // Latency (ms) - increases non-linearly under congestion
  const latency = Math.round(15 + load * 35 + Math.pow(Math.max(0, load - 0.7), 2) * 180)

  // Packet Loss (%) - stays low until heavy load
  const packetLoss = Math.max(0, +(0.05 + Math.pow(Math.max(0, load - 0.85), 2) * 8).toFixed(2))

  // Throughput (Mbps) - decreases as users share resources
  const throughput = Math.max(2, +(55 - load * 28 - Math.pow(Math.max(0, load - 1), 1.5) * 15).toFixed(1))

  // Traffic (GB) - roughly proportional to users
  const traffic = +(activeUsers * 0.45 + Math.random() * 2).toFixed(1)

  // Risk score (0-1)
  const prbScore = Math.min(prb / 100, 1)
  const latencyScore = Math.min(latency / 150, 1)
  const lossScore = Math.min(packetLoss / 5, 1)
  const throughputScore = Math.max(0, 1 - throughput / 50)

  const riskScore =
    prbScore * 0.3 + latencyScore * 0.25 + lossScore * 0.25 + throughputScore * 0.2

  let riskLevel = 'Low'
  if (riskScore >= 0.75) riskLevel = 'Critical'
  else if (riskScore >= 0.55) riskLevel = 'High'
  else if (riskScore >= 0.35) riskLevel = 'Medium'

  return {
    prb,
    latency,
    packetLoss,
    throughput,
    traffic,
    riskScore: Math.round(riskScore * 100),
    riskLevel
  }
}

const riskStyles = {
  Low: {
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    badge: 'bg-green-100 text-green-800',
    bar: 'bg-green-500',
    icon: CheckCircle
  },
  Medium: {
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    badge: 'bg-yellow-100 text-yellow-800',
    bar: 'bg-yellow-500',
    icon: Activity
  },
  High: {
    bg: 'bg-orange-50 border-orange-200',
    text: 'text-orange-800',
    badge: 'bg-orange-100 text-orange-800',
    bar: 'bg-orange-500',
    icon: AlertTriangle
  },
  Critical: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-800',
    bar: 'bg-red-500',
    icon: AlertTriangle
  }
}

export default function Simulation() {
  const [activeUsers, setActiveUsers] = useState(35)

  const kpis = useMemo(() => calculateKPIs(activeUsers), [activeUsers])
  const style = riskStyles[kpis.riskLevel]
  const RiskIcon = style.icon

  const changeUsers = (delta) => {
    setActiveUsers((prev) => Math.max(1, Math.min(200, prev + delta)))
  }

  // Visual users dots (max 40 shown for performance)
  const visualUsers = Math.min(activeUsers, 40)
  const overflow = activeUsers > 40 ? activeUsers - 40 : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tower Simulation</h1>
        <p className="text-gray-500 mt-1">
          Badilisha idadi ya Active Users manually ili kuona tofauti ya Network Performance & Congestion
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Tower Visual + Controls */}
        <div className="xl:col-span-1 space-y-6">
          {/* Tower Card */}
          <div className="card relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-50 to-transparent rounded-bl-full" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center">
                <Radio className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Site-A-4G Tower</h2>
                <p className="text-xs text-gray-500">Dar es Salaam – Kinondoni</p>
              </div>
            </div>

            {/* Tower illustration */}
            <div className="relative flex flex-col items-center py-4">
              {/* Antenna top */}
              <div className="w-3 h-3 rounded-full bg-primary-500 mb-1 shadow-lg shadow-primary-300" />
              <div className="w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-700" />
              
              {/* Main tower body */}
              <div className="relative">
                <div className="w-16 h-40 bg-gradient-to-b from-gray-300 to-gray-500 rounded-t-sm relative">
                  {/* Cross beams */}
                  <div className="absolute inset-x-2 top-6 h-0.5 bg-gray-400" />
                  <div className="absolute inset-x-2 top-14 h-0.5 bg-gray-400" />
                  <div className="absolute inset-x-2 top-22 h-0.5 bg-gray-400" />
                  <div className="absolute inset-x-2 top-30 h-0.5 bg-gray-400" />
                </div>
                {/* Base */}
                <div className="w-24 h-4 bg-gray-600 rounded-sm -ml-4" />
              </div>

              {/* Signal waves when congested */}
              {kpis.riskLevel === 'Critical' || kpis.riskLevel === 'High' ? (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-1 opacity-60">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                </div>
              ) : (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-8 opacity-40">
                  <span className="w-8 h-8 border-2 border-primary-400 rounded-full animate-pulse" />
                </div>
              )}
            </div>

            {/* Users visual */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Active Users
                </span>
                <span className="text-2xl font-bold text-gray-900">{activeUsers}</span>
              </div>

              {/* User dots grid */}
              <div className="flex flex-wrap gap-1.5 min-h-[72px] content-start">
                {Array.from({ length: visualUsers }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                      kpis.riskLevel === 'Critical'
                        ? 'bg-red-400'
                        : kpis.riskLevel === 'High'
                        ? 'bg-orange-400'
                        : kpis.riskLevel === 'Medium'
                        ? 'bg-yellow-400'
                        : 'bg-green-400'
                    }`}
                    style={{ animationDelay: `${i * 20}ms` }}
                  />
                ))}
                {overflow > 0 && (
                  <span className="text-xs text-gray-500 self-center ml-1">+{overflow}</span>
                )}
              </div>
            </div>
          </div>

          {/* Manual Controls */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Dhibiti Active Users (Manual)</h3>
            
            <div className="flex items-center justify-center gap-4 mb-5">
              <button
                onClick={() => changeUsers(-10)}
                className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                title="-10 users"
              >
                <Minus className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={() => changeUsers(-1)}
                className="w-10 h-10 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center"
              >
                <Minus className="w-4 h-4 text-gray-600" />
              </button>

              <div className="text-center min-w-[80px]">
                <p className="text-3xl font-bold text-gray-900">{activeUsers}</p>
                <p className="text-xs text-gray-500">users</p>
              </div>

              <button
                onClick={() => changeUsers(1)}
                className="w-10 h-10 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => changeUsers(10)}
                className="w-12 h-12 rounded-xl bg-primary-100 hover:bg-primary-200 flex items-center justify-center transition-colors"
                title="+10 users"
              >
                <Plus className="w-5 h-5 text-primary-700" />
              </button>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="1"
              max="200"
              value={activeUsers}
              onChange={(e) => setActiveUsers(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1</span>
              <span>Capacity ~80</span>
              <span>200</span>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 mt-4">
              {[
                { label: 'Wachache', value: 20 },
                { label: 'Kawaida', value: 50 },
                { label: 'Wengi', value: 100 },
                { label: 'Mzito', value: 150 }
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => setActiveUsers(p.value)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                    activeUsers === p.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Live KPIs */}
        <div className="xl:col-span-2 space-y-6">
          {/* Risk Banner */}
          <div className={`card border-2 ${style.bg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${style.badge} flex items-center justify-center`}>
                  <RiskIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Risk Level</p>
                  <p className={`text-2xl font-bold ${style.text}`}>{kpis.riskLevel}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Risk Score</p>
                <p className={`text-3xl font-bold ${style.text}`}>{kpis.riskScore}%</p>
              </div>
            </div>
            <div className="mt-4 h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${style.bar} transition-all duration-500 ease-out`}
                style={{ width: `${kpis.riskScore}%` }}
              />
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="PRB Utilization"
              value={`${kpis.prb}%`}
              icon={Gauge}
              color={kpis.prb >= 80 ? 'red' : kpis.prb >= 60 ? 'orange' : 'green'}
              hint="Resource blocks in use"
              trend={kpis.prb >= 70 ? 'up' : 'down'}
            />
            <KPICard
              title="Latency"
              value={`${kpis.latency} ms`}
              icon={Activity}
              color={kpis.latency >= 100 ? 'red' : kpis.latency >= 60 ? 'orange' : 'green'}
              hint="Round-trip delay"
              trend={kpis.latency >= 60 ? 'up' : 'down'}
            />
            <KPICard
              title="Packet Loss"
              value={`${kpis.packetLoss}%`}
              icon={AlertTriangle}
              color={kpis.packetLoss >= 2 ? 'red' : kpis.packetLoss >= 0.5 ? 'orange' : 'green'}
              hint="Lost packets"
              trend={kpis.packetLoss >= 0.5 ? 'up' : 'down'}
            />
            <KPICard
              title="Throughput"
              value={`${kpis.throughput} Mbps`}
              icon={Wifi}
              color={kpis.throughput <= 15 ? 'red' : kpis.throughput <= 30 ? 'orange' : 'green'}
              hint="Data rate per user"
              trend={kpis.throughput <= 25 ? 'down' : 'up'}
            />
          </div>

          {/* Explanation & Relation */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Uhusiano: Active Users ↔ Network KPIs</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <RelationRow
                label="Active Users vs PRB"
                desc={
                  activeUsers <= 50
                    ? 'Users wachache → PRB utilization ni chini, rasilimali zinatosha.'
                    : activeUsers <= 90
                    ? 'Users wanaongezeka → PRB inaanza kupanda, bado inasimamiwa.'
                    : 'Users wengi sana → PRB inakaribia saturation, congestion inaanza.'
                }
                status={activeUsers <= 50 ? 'good' : activeUsers <= 90 ? 'warn' : 'bad'}
              />
              <RelationRow
                label="Active Users vs Latency"
                desc={
                  kpis.latency < 50
                    ? 'Latency ni nzuri. Users wanapata service haraka.'
                    : kpis.latency < 100
                    ? 'Latency inaongezeka. Users wanaanza kuhisi delay.'
                    : 'Latency ni mbaya. Congestion inaathiri quality ya service.'
                }
                status={kpis.latency < 50 ? 'good' : kpis.latency < 100 ? 'warn' : 'bad'}
              />
              <RelationRow
                label="Active Users vs Packet Loss"
                desc={
                  kpis.packetLoss < 0.5
                    ? 'Packet loss ni chini sana. Data inaenda vizuri.'
                    : kpis.packetLoss < 2
                    ? 'Packet loss inaongezeka kidogo chini ya load kubwa.'
                    : 'Packet loss ni juu. Users wanaweza kupoteza data / calls drop.'
                }
                status={kpis.packetLoss < 0.5 ? 'good' : kpis.packetLoss < 2 ? 'warn' : 'bad'}
              />
              <RelationRow
                label="Active Users vs Throughput"
                desc={
                  kpis.throughput > 30
                    ? 'Throughput ni juu. Kila user anapata bandwidth ya kutosha.'
                    : kpis.throughput > 15
                    ? 'Throughput inapungua. Bandwidth inashirikiwa na users wengi.'
                    : 'Throughput ni chini sana. Network imefika kikomo cha capacity.'
                }
                status={kpis.throughput > 30 ? 'good' : kpis.throughput > 15 ? 'warn' : 'bad'}
              />
            </div>
          </div>

          {/* Tip */}
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-sm text-primary-800">
            <strong>Kidokezo:</strong> Jaribu kubadilisha idadi ya users kutoka <em>Wachache (20)</em> hadi{' '}
            <em>Mzito (150)</em> na uangalie jinsi Risk Level, PRB, Latency na Packet Loss zinavyobadilika.
            Hii ndiyo dhana kuu ya Network Congestion Prediction.
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({ title, value, icon: Icon, color, hint, trend }) {
  const colors = {
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600'
  }
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown

  return (
    <div className="card !p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        <TrendIcon
          className={`w-4 h-4 ${
            trend === 'up' ? 'text-red-500' : 'text-green-500'
          }`}
        />
      </div>
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
    </div>
  )
}

function RelationRow({ label, desc, status }) {
  const statusColors = {
    good: 'bg-green-500',
    warn: 'bg-yellow-500',
    bad: 'bg-red-500'
  }
  return (
    <div className="flex gap-3 items-start">
      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${statusColors[status]}`} />
      <div>
        <p className="font-medium text-gray-800">{label}</p>
        <p className="text-gray-500">{desc}</p>
      </div>
    </div>
  )
}
