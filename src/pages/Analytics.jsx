import { useEffect, useState, useMemo } from 'react'
import { products as productsApi, orders as ordersApi, customers as customersApi, payments as paymentsApi } from '../api/client'
import { inr } from '../lib/format'
import { IconRupee, IconBag, IconRefresh, IconUsers, IconTrendUp, IconTrendDown } from '../components/icons'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_MS = 86400 * 1000

function niceMax(v) {
  const step = Math.pow(10, Math.floor(Math.log10(v || 1)))
  return Math.max(Math.ceil(v / step) * step, 1)
}

// Percentage delta between the current-period metric and the previous-
// period metric. Returns 0 when the previous period had no data (avoids
// Infinity that would render as e.g. "Infinity% up") — this is admin
// analytics, not investor relations, so honest silence beats a fake spike.
function pctDelta(current, previous) {
  if (!previous) return 0
  return ((current - previous) / previous) * 100
}

function BarChart({ data, valueFormat }) {
  const w = 560, h = 240, pad = 44
  const max = niceMax(Math.max(...data.map((d) => d.value), 1))
  const bw = (w - pad) / (data.length || 1)
  const ticks = 4
  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${w} ${h + 20}`} className="chart-svg">
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const y = (i / ticks) * h
          const val = Math.round(max - (i / ticks) * max)
          return (
            <g key={i}>
              <line x1={pad} y1={y} x2={w} y2={y} stroke="#e2e2e6" strokeDasharray="3 4" />
              <text x={pad - 8} y={y + 4} textAnchor="end" className="axis-t">
                {valueFormat ? valueFormat(val) : val}
              </text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const bh = (d.value / max) * h
          return (
            <g key={d.label + i}>
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

function linePath(vals, w, h, pad, max) {
  const n = vals.length
  if (n === 0) return ''
  const x = (i) => pad + (n === 1 ? (w - pad) / 2 : (i / (n - 1)) * (w - pad))
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

function LineChart({ series, labels, valueFormat }) {
  const w = 560, h = 220, pad = 52
  const allVals = series.flatMap((s) => s.values)
  const max = niceMax(Math.max(...allVals, 1))
  const ticks = 4
  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${w} ${h + 24}`} className="chart-svg">
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const y = (i / ticks) * h
          const val = Math.round(max - (i / ticks) * max)
          return (
            <g key={i}>
              <line x1={pad} y1={y} x2={w} y2={y} stroke="#e2e2e6" strokeDasharray="3 4" />
              <text x={pad - 8} y={y + 4} textAnchor="end" className="axis-t">
                {valueFormat ? valueFormat(val) : val}
              </text>
            </g>
          )
        })}
        {series.map((s) => (
          <path key={s.label} d={linePath(s.values, w, h, pad, max)} fill="none" stroke={s.color} strokeWidth="2.5" />
        ))}
        {labels.map((d, i) => (
          <text
            key={d + i}
            x={pad + (labels.length === 1 ? (w - pad) / 2 : (i / (labels.length - 1)) * (w - pad))}
            y={h + 18}
            textAnchor="middle"
            className="axis-t"
          >
            {d}
          </text>
        ))}
      </svg>
      {series.length > 1 && (
        <div className="chart-legend">
          {series.map((s) => (
            <span key={s.label}><i style={{ background: s.color }} /> {s.label}</span>
          ))}
        </div>
      )}
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

    // Split into current 30-day window vs previous 30-day window so we
    // can compute honest period-over-period deltas. Records without a
    // parseable createdAt are ignored (rare, but seed data may lack it).
    const now = Date.now()
    const D30 = 30 * DAY_MS
    const inWindow = (iso, start, end) => {
      const t = Date.parse(iso)
      return Number.isFinite(t) && t >= start && t < end
    }
    const currOrders = orders.filter((o) => inWindow(o.createdAt, now - D30, now))
    const prevOrders = orders.filter((o) => inWindow(o.createdAt, now - 2 * D30, now - D30))
    const currPaid = payments.filter((p) => p.status === 'paid' && inWindow(p.createdAt, now - D30, now))
    const prevPaid = payments.filter((p) => p.status === 'paid' && inWindow(p.createdAt, now - 2 * D30, now - D30))

    // Metrics (all-time totals for the value shown on the card, 30d
    // window for deltas — this matches how most e-com dashboards frame
    // "up X% from last month").
    const totalRevenue = payments.filter((p) => p.status === 'paid').reduce((a, p) => a + (p.amount || 0), 0)
    const currRev = currPaid.reduce((a, p) => a + (p.amount || 0), 0)
    const prevRev = prevPaid.reduce((a, p) => a + (p.amount || 0), 0)

    const totalOrders = orders.length
    const currOrderCount = currOrders.length
    const prevOrderCount = prevOrders.length

    const aov = orders.length ? Math.round(orders.reduce((a, o) => a + (o.amount || 0), 0) / orders.length) : 0
    const currAov = currOrders.length ? Math.round(currOrders.reduce((a, o) => a + (o.amount || 0), 0) / currOrders.length) : 0
    const prevAov = prevOrders.length ? Math.round(prevOrders.reduce((a, o) => a + (o.amount || 0), 0) / prevOrders.length) : 0

    // Repeat customer % — share of customers who have placed 2+ orders.
    // No delta here: repeat-customer status is cumulative over the
    // customer's entire history, not a period-over-period signal.
    const repeatPct = customers.length
      ? (customers.filter((c) => (c.orders || 0) >= 2).length / customers.length) * 100
      : 0

    // Orders per month — last 6 calendar months from today. Buckets
    // are keyed by "YYYY-MM" so months that wrap year boundaries don't
    // collide. Orders without a valid createdAt are dropped.
    const monthly = []
    const nowDate = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1)
      monthly.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: MONTH_LABELS[d.getMonth()],
        value: 0,
      })
    }
    const monthlyByKey = Object.fromEntries(monthly.map((m) => [m.key, m]))
    orders.forEach((o) => {
      const t = Date.parse(o.createdAt)
      if (!Number.isFinite(t)) return
      const d = new Date(t)
      const k = `${d.getFullYear()}-${d.getMonth()}`
      if (monthlyByKey[k]) monthlyByKey[k].value += 1
    })

    // Daily revenue for the last 7 days (paid payments), labelled by
    // day-of-week. Same bucketing pattern as monthly.
    const weekly = []
    const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday - i * DAY_MS)
      weekly.push({
        start: d.getTime(),
        end: d.getTime() + DAY_MS,
        label: DAY_LABELS[d.getDay()],
        revenue: 0,
        orders: 0,
      })
    }
    payments.forEach((p) => {
      if (p.status !== 'paid') return
      const t = Date.parse(p.createdAt)
      if (!Number.isFinite(t)) return
      const bucket = weekly.find((b) => t >= b.start && t < b.end)
      if (bucket) bucket.revenue += p.amount || 0
    })
    orders.forEach((o) => {
      const t = Date.parse(o.createdAt)
      if (!Number.isFinite(t)) return
      const bucket = weekly.find((b) => t >= b.start && t < b.end)
      if (bucket) bucket.orders += 1
    })

    // Top revenue-generating products — price × units sold, all-time.
    const topRev = [...products]
      .map((p) => ({ name: p.name, rev: (p.price || 0) * (p.sold || 0) }))
      .filter((t) => t.rev > 0)
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 5)
    const maxRev = Math.max(...topRev.map((t) => t.rev), 1)

    return {
      totalRevenue,
      totalOrders,
      aov,
      repeatPct,
      deltaRev: pctDelta(currRev, prevRev),
      deltaOrders: pctDelta(currOrderCount, prevOrderCount),
      deltaAov: pctDelta(currAov, prevAov),
      monthly,
      weekly,
      topRev,
      maxRev,
    }
  }, [data])

  if (!s) return <div className="spinner" />

  const cards = [
    { label: 'Total Revenue', value: inr(s.totalRevenue), Icon: IconRupee, delta: s.deltaRev, cls: 'c-rev' },
    { label: 'Avg. Order Value', value: inr(s.aov), Icon: IconBag, delta: s.deltaAov, cls: 'c-ord' },
    { label: 'Total Orders', value: s.totalOrders, Icon: IconRefresh, delta: s.deltaOrders, cls: 'c-cus' },
    { label: 'Repeat Customers', value: `${s.repeatPct.toFixed(1)}%`, Icon: IconUsers, delta: null, cls: 'c-stk' },
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
          const up = (c.delta ?? 0) >= 0
          return (
            <div className={`stat ${c.cls}`} key={c.label}>
              <div className="stat-top">
                <div className="st-ico"><c.Icon size={20} /></div>
                {c.delta !== null && (
                  <span className={`delta-pill ${up ? 'up' : 'down'}`}>
                    {up ? <IconTrendUp size={13} /> : <IconTrendDown size={13} />}
                    {Math.abs(c.delta).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="st-label">{c.label}</div>
              <div className="st-value">{c.value}</div>
            </div>
          )
        })}
      </div>

      <div className="grid-2b" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-head"><div><h3>Orders per Month</h3><div className="hint">Order count across the last six months</div></div></div>
          <div className="card-pad"><BarChart data={s.monthly} /></div>
        </div>
        <div className="card">
          <div className="card-head"><div><h3>Daily Revenue &amp; Orders</h3><div className="hint">Last seven days</div></div></div>
          <div className="card-pad">
            <LineChart
              labels={s.weekly.map((w) => w.label)}
              series={[
                { label: 'Revenue (₹)', color: '#a21c45', values: s.weekly.map((w) => w.revenue) },
                { label: 'Orders', color: '#c79a2c', values: s.weekly.map((w) => w.orders) },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div><h3>Top Revenue Generators</h3><div className="hint">Products ranked by revenue (price × units sold)</div></div></div>
        <div className="card-pad">
          {s.topRev.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>
              <p>No sold products yet — top-revenue chart will populate as orders land.</p>
            </div>
          ) : (
            s.topRev.map((t) => (
              <div className="rev-row" key={t.name}>
                <div className="rev-top">
                  <span className="rev-name">{t.name}</span>
                  <span className="rev-val">{inr(t.rev)}</span>
                </div>
                <div className="progress"><span style={{ width: `${(t.rev / s.maxRev) * 100}%`, background: 'linear-gradient(90deg,var(--maroon-500),var(--maroon-700))' }} /></div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
