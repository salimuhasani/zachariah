import { useEffect, useState } from 'react'
import { networksAPI } from '../services/api'
import { Plus, Trash2, Edit2, X } from 'lucide-react'

export default function Networks() {
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', area: '', description: '' })
  const [error, setError] = useState('')

  const load = () => {
    networksAPI.list()
      .then((res) => setNetworks(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await networksAPI.create(form)
      setShowModal(false)
      setForm({ name: '', area: '', description: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create network')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this network and all its data?')) return
    await networksAPI.delete(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Networks</h1>
          <p className="text-gray-500 mt-1">Manage network areas you monitor</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 shadow-md shadow-primary-200">
          <Plus className="w-4 h-4" /> Add Network
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : networks.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">
          <p>No networks yet.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
            Create your first network
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {networks.map((net) => (
            <div key={net.id} className="card hover:shadow-lg hover:border-primary-200 transition-all duration-200 group">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{net.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{net.area}</p>
                  {net.description && (
                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">{net.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(net.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                <span>ID: {net.id}</span>
                <span className={net.is_active ? 'text-green-600' : 'text-gray-400'}>
                  {net.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Add Network</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
              <div>
                <label className="label">Network Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Site-A-4G"
                />
              </div>
              <div>
                <label className="label">Area / Location *</label>
                <input
                  className="input"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  required
                  placeholder="e.g. Dar es Salaam - Kinondoni"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
