import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [operator, setOperator] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const saved = localStorage.getItem('operator')
    if (token && saved) {
      setOperator(JSON.parse(saved))
      // Optionally refresh
      authAPI.me()
        .then((res) => {
          setOperator(res.data)
          localStorage.setItem('operator', JSON.stringify(res.data))
        })
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('operator')
          setOperator(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await authAPI.login(email, password)
    localStorage.setItem('token', res.data.access_token)
    localStorage.setItem('operator', JSON.stringify(res.data.operator))
    setOperator(res.data.operator)
    return res.data
  }

  const register = async (data) => {
    const res = await authAPI.register(data)
    localStorage.setItem('token', res.data.access_token)
    localStorage.setItem('operator', JSON.stringify(res.data.operator))
    setOperator(res.data.operator)
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('operator')
    setOperator(null)
  }

  const refreshOperator = async () => {
    const res = await authAPI.me()
    setOperator(res.data)
    localStorage.setItem('operator', JSON.stringify(res.data))
  }

  return (
    <AuthContext.Provider value={{ operator, loading, login, register, logout, refreshOperator }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
