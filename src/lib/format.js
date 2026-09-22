// Formatting + small shared helpers used across pages.

export const inr = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

export const inrK = (n) => {
  const v = Number(n || 0)
  if (v >= 10000000) return '₹' + (v / 10000000).toFixed(2) + ' Cr'
  if (v >= 100000) return '₹' + (v / 100000).toFixed(2) + ' L'
  if (v >= 1000) return '₹' + (v / 1000).toFixed(1) + 'K'
  return inr(v)
}

export const initials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export const fmtDate = (s) => {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d)) return s
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// status -> badge colour class
export const orderStatusClass = {
  delivered: 'green',
  shipped: 'blue',
  processing: 'amber',
  pending: 'grey',
  cancelled: 'red',
}
export const payStatusClass = {
  paid: 'green',
  pending: 'amber',
  refunded: 'red',
}
export const productStatusClass = {
  active: 'green',
  draft: 'grey',
  out_of_stock: 'red',
}
export const productStatusLabel = {
  active: 'Active',
  draft: 'Draft',
  out_of_stock: 'Out of stock',
}
export const segmentClass = { VIP: 'gold', Loyal: 'blue', New: 'green' }

export const titleCase = (s) =>
  String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
