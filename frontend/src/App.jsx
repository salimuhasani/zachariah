import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Networks from './pages/Networks'
import Metrics from './pages/Metrics'
import Predictions from './pages/Predictions'
import Settings from './pages/Settings'
import Simulation from './pages/Simulation'

function PrivateRoute({ children }) {
  const { operator, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  return operator ? children : <Navigate to="/login" />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="networks" element={<Networks />} />
        <Route path="metrics" element={<Metrics />} />
        <Route path="predictions" element={<Predictions />} />
        <Route path="simulation" element={<Simulation />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
