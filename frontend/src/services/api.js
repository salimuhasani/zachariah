import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('operator')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (email, password) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  },
  me: () => api.get('/auth/me'),
  regenerateApiKey: () => api.post('/auth/regenerate-api-key'),
  updateProfile: (data) => api.put('/auth/profile', data),
  createOperator: (data) => api.post('/auth/operators', data),
  listOperators: () => api.get('/auth/operators'),
}

export const networksAPI = {
  list: () => api.get('/networks/'),
  create: (data) => api.post('/networks/', data),
  get: (id) => api.get(`/networks/${id}`),
  update: (id, data) => api.put(`/networks/${id}`, data),
  delete: (id) => api.delete(`/networks/${id}`),
}

export const metricsAPI = {
  list: (params) => api.get('/metrics/', { params }),
  create: (data) => api.post('/metrics/', data),
}

export const predictionsAPI = {
  create: (data) => api.post('/predictions/', data),
  list: (params) => api.get('/predictions/', { params }),
}

export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
  networksOverview: () => api.get('/dashboard/networks-overview'),
}

export default api
