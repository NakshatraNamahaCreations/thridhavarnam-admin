import { useEffect, useState, useMemo } from 'react'
import { products as productsApi, orders as ordersApi, customers as customersApi, payments as paymentsApi } from '../api/client'
import { inr } from '../lib/format'
import { IconRupee, IconBag, IconRefresh, IconTrendUp, IconTrendDown } from '../components/icons'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const WEIGHTS = [0.12, 0.14, 0.17, 0.15, 0.19, 0.23]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const VISITS = [1300, 1520, 1440, 1380, 1720, 2500, 2200]

function niceMax(v) {
  const step = Math.pow(10, Math.floor(Math.log10(v || 1)))
  return Math.ceil(v / step) * step
}

function BarChart({ data }) {
  const w = 560, h = 240, pad = 34
  const max = niceMax(Math.max(...data.map((d) => d.value), 1))
  const bw = (w - pad) / data.length
  const ticks = 4
  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${w} ${h + 20}`} className="chart-svg">
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const y = (i / ticks) * h
          return (
            <g key={i}>
              <line x1={pad} y1={y} x2={w} y2={y} stroke="#e2e2e6" strokeDasharray="3 4" />
              <text x={pad - 8} y={y + 4} textAnchor="end" className="axis-t">{Math.round(max - (i / ticks) * max)}</text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const bh = (d.value / max) * h
          return (
            <g key={d.label}>
              <rect x={pad + i * bw + bw * 0.22} y={h - bh} width={bw * 0.56} height={Math.max(bh, 2)} rx="5"
                fill="url(#barfill)" />
              <text x={pad + i * bw + bw / 2} y={h + 16} textAnchor="middle" className="axis-t">{d.label}</text>
            </g>
          )
        })}
        <defs>
          <linearGradient id="barfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c12a55" /><stop offset="100%" stopColor="#a21c45" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

function line(vals, w, h, pad, max) {
  const x = (i) => pad + (i / (vals.length - 1)) * (w - pad)
  const y = (v) => (1 - v / max) * h
  const pts = vals.map((v, i) => [x(i), y(v)])
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]
    const cx = (x0 + x1) / 2
    d += ` C ${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`
  }
  return d
}

function LineChart({ visits, sales }) {
  const w = 560, h = 220, pad = 40
  const max = niceMax(Math.max(...visits, 1))
  const ticks = 4
  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${w} ${h + 24}`} className="chart-svg">
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const y = (i / ticks) * h
          return (
            <g key={i}>
              <line x1={pad} y1={y} x2={w} y2={y} stroke="#e2e2e6" strokeDasharray="3 4" />
              <text x={pad - 8} y={y + 4} textAnchor="end" className="axis-t">{Math.round(max - (i / ticks) * max)}</text>
            </g>
          )
        })}
        <path d={line(visits, w, h, pad, max)} fill="none" stroke="#c79a2c" strokeWidth="2.5" />
        <path d={line(sales, w, h, pad, max)} fill="none" stroke="#a21c45" strokeWidth="2.5" />
        {DAYS.map((d, i) => (
          <text key={d} x={pad + (i / (DAYS.length - 1)) * (w - pad)} y={h + 18} textAnchor="middle" className="axis-t">{d}</text>
        ))}
      </svg>
      <div className="chart-legend">
        <span><i className="dot-g" /> visits</span>
        <span><i className="dot-m" /> sales</span>
      </div>
    </div>
  )
}

export default function Analytics() {
  const [data, setData] = useState(null)

  useEffect(() => {
    Promise.all([productsApi.list(), ordersApi.list(), customersApi.list(), paymentsApi.list()])
      .then(([products, orders, customers, payments]) => setData({ products, orders, customers, payments }))
      .catch(() => {})
  }, [])

  const s = useMemo(() => {
    if (!data) return null
    const { products, orders, customers, payments } = data
    const revenue = payments.filter((p) => p.status === 'paid').reduce((a, p) => a + (p.amount || 0), 0)
    const totalOrders = customers.reduce((a, c) => a + (c.orders || 0), 0) || orders.length
    const aov = orders.length ? Math.round(orders.reduce((a, o) => a + (o.amount || 0), 0) / orders.length) : 0
    const monthly = WEIGHTS.map((wt, i) => ({ label: MONTHS[i], value: Math.round(totalOrders * wt) }))
    const sales = VISITS.map((v) => Math.round(v * 0.038))
    const topRev = [...products]
      .map((p) => ({ name: p.name, rev: (p.price || 0) * (p.sold || 0) }))
      .sort((a, b) => b.rev - a.rev).slice(0, 5)
    const maxRev = Math.max(...topRev.map((t) => t.rev), 1)
    return { revenue, aov, monthly, sales, topRev, maxRev }
  }, [data])

  if (!s) return <div className="spinner" />

  const cards = [
    { label: 'Avg. Order Value', value: inr(s.aov), Icon: IconRupee, delta: 4.2, cls: 'c-rev' },
    { label: 'Conversion Rate', value: '3.8%', Icon: IconBag, delta: 0.6, cls: 'c-ord' },
    { label: 'Repeat Customers', value: '42%', Icon: IconRefresh, delta: 2.1, cls: 'c-cus' },
    { label: 'Cart Abandonment', value: '18%', Icon: IconTrendUp, delta: -1.4, cls: 'c-stk' },
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p>Deep insights into store performance</p>
        </div>
      </div>

      <div className="stat-grid">
        {cards.map((c) => {
          const up = c.delta >= 0
          return (
            <div className={`stat ${c.cls}`} key={c.label}>
              <div className="stat-top">
                <div className="st-ico"><c.Icon size={20} /></div>
                <span className={`delta-pill ${up ? 'up' : 'down'}`}>{up ? <IconTrendUp size={13} /> : <IconTrendDown size={13} />}{Math.abs(c.delta)}%</span>
              </div>
              <div className="st-label">{c.label}</div>
              <div className="st-value">{c.value}</div>
            </div>
          )
        })}
      </div>

      <div className="grid-2b" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-head"><div><h3>Orders per Month</h3><div className="hint">Order volume trend</div></div></div>
          <div className="card-pad"><BarChart data={s.monthly} /></div>
        </div>
        <div className="card">
          <div className="card-head"><div><h3>Weekly Traffic vs Sales</h3><div className="hint">Visits and conversions</div></div></div>
          <div className="card-pad"><LineChart visits={VISITS} sales={s.sales} /></div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div><h3>Top Revenue Generators</h3><div className="hint">Products ranked by revenue</div></div></div>
        <div className="card-pad">
          {s.topRev.map((t) => (
            <div className="rev-row" key={t.name}>
              <div className="rev-top">
                <span className="rev-name">{t.name}</span>
                <span className="rev-val">{inr(t.rev)}</span>
              </div>
              <div className="progress"><span style={{ width: `${(t.rev / s.maxRev) * 100}%`, background: 'linear-gradient(90deg,var(--maroon-500),var(--maroon-700))' }} /></div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
