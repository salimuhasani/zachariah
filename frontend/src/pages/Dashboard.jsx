import { useEffect, useState } from 'react'
import { dashboardAPI } from '../services/api'
import { Network, BarChart3, AlertTriangle, Activity, Radio, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const riskColors = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100 text-red-800',
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [overview, setOverview] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([dashboardAPI.stats(), dashboardAPI.networksOverview()])
      .then(([statsRes, overviewRes]) => {
        setStats(statsRes.data)
        setOverview(overviewRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Network performance overview & risk summary</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <Network className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Networks</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.total_networks || 0}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Metrics</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.total_metrics || 0}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">High Risk</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.high_risk_networks || 0}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
            <Activity className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Predictions</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.latest_predictions?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/simulation" className="card flex items-center gap-4 hover:border-primary-300 hover:shadow-md transition group">
          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition">
            <Radio className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Tower Simulation</p>
            <p className="text-sm text-gray-500">Test congestion by changing active users live</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition" />
        </Link>
        <Link to="/predictions" className="card flex items-center gap-4 hover:border-primary-300 hover:shadow-md transition group">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition">
            <Activity className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Run Prediction</p>
            <p className="text-sm text-gray-500">Forecast risk 1–30 days ahead with AI</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition" />
        </Link>
      </div>

      {/* Networks Overview */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Networks Overview</h2>
          <Link to="/networks" className="text-sm text-primary-600 hover:underline">
            Manage Networks →
          </Link>
        </div>

        {overview.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Network className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No networks yet. Create your first network to start tracking.</p>
            <Link to="/networks" className="btn-primary inline-block mt-4">
              Add Network
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Network</th>
                  <th className="pb-3 font-medium">Area</th>
                  <th className="pb-3 font-medium">PRB %</th>
                  <th className="pb-3 font-medium">Latency</th>
                  <th className="pb-3 font-medium">Packet Loss</th>
                  <th className="pb-3 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {overview.map((item) => (
                  <tr key={item.network.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{item.network.name}</td>
                    <td className="py-3 text-gray-600">{item.network.area}</td>
                    <td className="py-3">
                      {item.latest_metric ? `${item.latest_metric.prb_utilization.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3">
                      {item.latest_metric ? `${item.latest_metric.latency_ms.toFixed(0)} ms` : '—'}
                    </td>
                    <td className="py-3">
                      {item.latest_metric ? `${item.latest_metric.packet_loss.toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-3">
                      {item.latest_prediction ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${riskColors[item.latest_prediction.risk_level] || 'bg-gray-100'}`}>
                          {item.latest_prediction.risk_level}
                        </span>
                      ) : (
                        <span className="text-gray-400">No prediction</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Predictions */}
      {stats?.latest_predictions?.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Predictions</h2>
          <div className="space-y-3">
            {stats.latest_predictions.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Network #{p.network_id}</p>
                  <p className="text-xs text-gray-500">
                    Horizon: {p.horizon_days} day(s) • Score: {(p.risk_score * 100).toFixed(1)}%
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${riskColors[p.risk_level]}`}>
                  {p.risk_level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
