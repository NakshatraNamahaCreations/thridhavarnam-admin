// Thin fetch wrapper around the Vastra/Thridhavarnam CRM backend.
// Resolution order for the API base URL:
//   1. VITE_API_URL if provided (dashboard env var or .env)
//   2. Local backend on :5000 (dev via vite proxy, prod via direct URL)
// Render is commented out for now — its deployed build lags the local one.
const BASE =
  import.meta.env.VITE_API_URL ||
  // (import.meta.env.PROD ? 'http://localhost:5000/api' : '/api')
  // (import.meta.env.PROD ? 'https://sareeebackend.onrender.com/api' : '/api')
  (import.meta.env.PROD ? 'https://api.thridhavarnam.com/api' : '/api')
const TOKEN_KEY = 'thv_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })

  let data = null
  const text = await res.text()
  if (text) {
    try { data = JSON.parse(text) } catch { data = text }
  }

  if (!res.ok) {
    if (res.status === 401 && getToken()) {
      clearToken()
      if (!location.pathname.startsWith('/login')) location.href = '/login'
    }
    const message = (data && data.message) || `Request failed (${res.status})`
    throw new Error(message)
  }
  return data
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
}

// ---- Resource helpers ----
export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  updateMe: (patch) => api.patch('/auth/me', patch),
}
// Ids that contain characters HTTP treats as special — like `#` (which
// browsers strip as a URL fragment) or `/` — silently break path
// building. Every id-bearing URL below runs through encodeURIComponent
// so those characters survive the round-trip to the server.
const enc = (id) => encodeURIComponent(id)

export const products = {
  list: () => api.get('/products'),
  create: (d) => api.post('/products', d),
  bulk: (items) => api.post('/products/bulk', { items }),
  update: (id, d) => api.put(`/products/${enc(id)}`, d),
  restock: (id, qty) => api.patch(`/products/${enc(id)}/restock`, { qty }),
  remove: (id) => api.del(`/products/${enc(id)}`),
}
export const customers = {
  list: () => api.get('/customers'),
  create: (d) => api.post('/customers', d),
  update: (id, d) => api.put(`/customers/${enc(id)}`, d),
  remove: (id) => api.del(`/customers/${enc(id)}`),
}

export const enquiries = {
  list: () => api.get('/enquiries'),
  create: (d) => api.post('/enquiries', d),
  update: (id, d) => api.put(`/enquiries/${enc(id)}`, d),
  remove: (id) => api.del(`/enquiries/${enc(id)}`),
}

export const categories = {
  list: () => api.get('/categories'),
  create: (d) => api.post('/categories', d),
  update: (id, d) => api.put(`/categories/${enc(id)}`, d),
  remove: (id) => api.del(`/categories/${enc(id)}`),
}
export const occasions = {
  list: () => api.get('/occasions'),
  create: (d) => api.post('/occasions', d),
  update: (id, d) => api.put(`/occasions/${enc(id)}`, d),
  remove: (id) => api.del(`/occasions/${enc(id)}`),
}
export const stories = {
  list: () => api.get('/stories'),
  get: (id) => api.get(`/stories/${enc(id)}`),
  create: (d) => api.post('/stories', d),
  update: (id, d) => api.put(`/stories/${enc(id)}`, d),
  remove: (id) => api.del(`/stories/${enc(id)}`),
}
export const reviews = {
  list: (productId) => api.get(productId ? `/reviews?productId=${enc(productId)}` : '/reviews'),
  remove: (id) => api.del(`/reviews/${enc(id)}`),
}
export const colorways = {
  list: () => api.get('/colorways'),
}
export const coupons = {
  list: () => api.get('/coupons'),
  create: (d) => api.post('/coupons', d),
  update: (id, d) => api.put(`/coupons/${enc(id)}`, d),
  remove: (id) => api.del(`/coupons/${enc(id)}`),
}
export const orders = {
  list: () => api.get('/orders'),
  create: (d) => api.post('/orders', d),
  update: (id, d) => api.put(`/orders/${enc(id)}`, d),
  remove: (id) => api.del(`/orders/${enc(id)}`),
}
export const payments = {
  list: () => api.get('/payments'),
  record: (d) => api.post('/payments', d),
  markPaid: (id) => api.patch(`/payments/${enc(id)}/paid`),
  refund: (id) => api.patch(`/payments/${enc(id)}/refund`),
}
