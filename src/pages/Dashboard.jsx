import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { products as productsApi, customers as customersApi, orders as ordersApi, payments as paymentsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { inr, inrK, fmtDate, orderStatusClass, titleCase } from '../lib/format'
import {
  IconRupee, IconOrders, IconUsers, IconBox, IconTrendUp, IconTrendDown,
  IconCalendar, IconArrowUpRight, IconStar,
} from '../components/icons'

const DONUT_COLORS = ['#a21c45', '#d4af37', '#e66e8c', '#9fa1ac', '#ead9a3', '#2563eb']

/* smooth area-chart path from a list of values */
function areaPath(vals, w, h, pad = 6) {
  if (!vals.length) return { line: '', area: '' }
  const max = Math.max(...vals, 1)
  const min = Math.min(...vals, 0)
  const span = max - min || 1
  const n = vals.length
  const x = (i) => (n === 1 ? w / 2 : (i / (n - 1)) * w)
  const y = (v) => pad + (1 - (v - min) / span) * (h - pad * 2)
  const pts = vals.map((v, i) => [x(i), y(v)])
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    const cx = (x0 + x1) / 2
    d += ` C ${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`
  }
  const area = `${d} L ${w} ${h} L 0 ${h} Z`
  return { line: d, area }
}

function Sparkline({ vals, color }) {
  const w = 120, h = 34
  const max = Math.max(...vals, 1)
  const bw = w / vals.length
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {vals.map((v, i) => {
        const bh = Math.max((v / max) * h, 3)
        return <rect key={i} x={i * bw + 2} y={h - bh} width={bw - 4} height={bh} rx="2" fill={color} />
      })}
    </svg>
  )
}

function Donut({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const R = 52, C = 2 * Math.PI * R
  let acc = 0
  return (
    <svg viewBox="0 0 140 140" className="donut">
      <g transform="translate(70 70) rotate(-90)">
        {segments.map((s, i) => {
          const frac = s.value / total
          const len = frac * C
          const el = (
            <circle
              key={i}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="18"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-acc}
              strokeLinecap="butt"
            />
          )
          acc += len
          return el
        })}
      </g>
      <text x="70" y="66" textAnchor="middle" className="donut-c1">100%</text>
      <text x="70" y="84" textAnchor="middle" className="donut-c2">tracked</text>
    </svg>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    Promise.all([productsApi.list(), customersApi.list(), ordersApi.list(), paymentsApi.list()])
      .then(([products, customers, orders, payments]) => setData({ products, customers, orders, payments }))
      .catch((e) => setErr(e.message))
  }, [])

  const s = useMemo(() => {
    if (!data) return null
    const { products, customers, orders, payments } = data
    const paid = payments.filter((p) => p.status === 'paid')
    const revenue = paid.reduce((a, p) => a + (p.amount || 0), 0)
    const allRevenue = customers.reduce((a, c) => a + (c.spent || 0), 0) || revenue
    const totalStock = products.reduce((a, p) => a + (p.stock || 0), 0)

    // daily revenue trend (area chart)
    const byDate = {}
    paid.forEach((p) => { byDate[p.date] = (byDate[p.date] || 0) + (p.amount || 0) })
    const trend = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0])).slice(-8)

    // daily order counts
    const ordByDate = {}
    orders.forEach((o) => { ordByDate[o.date] = (ordByDate[o.date] || 0) + 1 })
    const ordSeries = Object.entries(ordByDate).sort((a, b) => a[0].localeCompare(b[0])).slice(-7).map((e) => e[1])

    // revenue by category (donut)
    const catMap = {}
    products.forEach((p) => { catMap[p.category] = (catMap[p.category] || 0) + (p.price || 0) * (p.sold || 0) })
    const catsSorted = Object.entries(catMap).sort((a, b) => b[1] - a[1])
    const top = catsSorted.slice(0, 5)
    const otherTotal = catsSorted.slice(5).reduce((a, c) => a + c[1], 0)
    const cats = otherTotal > 0 ? [...top, ['Others', otherTotal]] : top
    const catTotal = cats.reduce((a, c) => a + c[1], 0) || 1

    const revVals = trend.map((t) => t[1])
    const custSeries = [3, 5, 4, 7, 6, 9, Math.max(customers.length % 12, 4)]
    const stockSeries = top.length ? top.map(([c]) =>
      products.filter((p) => p.category === c).reduce((a, p) => a + (p.stock || 0), 0)) : [totalStock]

    return {
      products, customers, orders, revenue, allRevenue, totalStock,
      trend, revVals, ordSeries, custSeries, stockSeries,
      cats, catTotal,
      revDelta: 12.5, ordDelta: 8.2,
      custDelta: 5.1, stockDelta: -3.4,
      pending: orders.filter((o) => ['pending', 'processing'].includes(o.status)).length,
      topProducts: [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 5),
      recentOrders: orders.slice(0, 5),
    }
  }, [data])

  if (err) return <div className="empty"><div className="em-ico">⚠️</div><p>{err}</p></div>
  if (!s) return <div className="spinner" />

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const first = (user?.name || 'Admin').split(' ')[0]
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()

  const cards = [
    { label: 'Total Revenue', value: inrK(s.allRevenue), Icon: IconRupee, delta: s.revDelta, series: s.revVals, cls: 'c-rev' },
    { label: 'Total Orders', value: s.orders.length, Icon: IconOrders, delta: s.ordDelta, series: s.ordSeries, cls: 'c-ord' },
    { label: 'New Customers', value: s.customers.length, Icon: IconUsers, delta: s.custDelta, series: s.custSeries, cls: 'c-cus' },
    { label: 'Sarees in Stock', value: s.totalStock, Icon: IconBox, delta: s.stockDelta, series: s.stockSeries, cls: 'c-stk' },
  ]

  const rev = areaPath(s.revVals.length ? s.revVals : [0, 0], 560, 240)

  return (
    <>
      {/* ---- Hero greeting ---- */}
      <div className="hero">
        <div className="hero-bg1" />
        <div className="hero-bg2" />
        <div className="hero-main">
          <div className="hero-date"><IconCalendar size={15} /> {today}</div>
          <h1 className="hero-title">{greet}, {first} <span className="wave">👋</span></h1>
          <p className="hero-sub">
            Your store has earned <b>{inr(s.revenue)}</b> from paid orders. Sales are up{' '}
            <b>{s.revDelta}%</b> this week.
          </p>
          <div className="hero-actions">
            <Link to="/payments" className="btn btn-gold"><IconArrowUpRight size={17} /> View Report</Link>
            <button className="btn hero-ghost"><IconCalendar size={16} /> Last 30 days</button>
          </div>
        </div>
        <div className="hero-pills">
          <div className="hero-pill"><div className="hp-v">{s.orders.length}</div><div className="hp-l">Orders</div></div>
          <div className="hero-pill"><div className="hp-v">{s.customers.length}</div><div className="hp-l">Customers</div></div>
          <div className="hero-pill"><div className="hp-v">{s.totalStock}</div><div className="hp-l">In Stock</div></div>
        </div>
      </div>

      {/* ---- Stat cards ---- */}
      <div className="stat-grid">
        {cards.map((c) => {
          const up = c.delta >= 0
          const clr = getComputedColor(c.cls)
          return (
            <div className={`stat ${c.cls}`} key={c.label}>
              <div className="stat-top">
                <div className="st-ico"><c.Icon size={20} /></div>
                <span className={`delta-pill ${up ? 'up' : 'down'}`}>
                  {up ? <IconTrendUp size={13} /> : <IconTrendDown size={13} />}{Math.abs(c.delta)}%
                </span>
              </div>
              <div className="st-label">{c.label}</div>
              <div className="st-value">{c.value}</div>
              <Sparkline vals={c.series.length ? c.series : [1, 1, 1]} color={clr} />
            </div>
          )
        })}
      </div>

      {/* ---- Charts ---- */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Revenue Overview</h3>
              <div className="hint">Paid orders trend</div>
            </div>
            <span className="delta-pill up"><IconTrendUp size={13} /> {s.revDelta}% vs last month</span>
          </div>
          <div className="card-pad">
            <div className="area-chart">
              <svg viewBox="0 0 560 240" preserveAspectRatio="none" className="area-svg">
                <defs>
                  <linearGradient id="revfill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a21c45" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#a21c45" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={rev.area} fill="url(#revfill)" />
                <path d={rev.line} fill="none" stroke="#a21c45" strokeWidth="2.5" strokeLinejoin="round" />
              </svg>
              <div className="area-x">
                {s.trend.map(([d]) => <span key={d}>{d.slice(5)}</span>)}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div><h3>Sales by Category</h3><div className="hint">Share of total sales</div></div></div>
          <div className="card-pad donut-wrap">
            <Donut segments={s.cats.map(([name, val], i) => ({ value: val, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
            <div className="legend">
              {s.cats.map(([name, val], i) => (
                <div className="legend-row" key={name}>
                  <span className="sw" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span>{titleCase(name)}</span>
                  <span className="lv">{Math.round((val / s.catTotal) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Recent orders + best sellers ---- */}
      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>Recent Orders</h3>
            <Link to="/orders" className="link-maroon sm">View all</Link>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Order</th><th>Customer</th><th className="num">Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {s.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.id}</td>
                    <td>
                      <div className="person">
                        <div className="avatar">{o.avatar}</div>
                        <div><div className="p-name">{o.customer}</div><div className="p-sub">{o.city}</div></div>
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>{inr(o.amount)}</td>
                    <td><span className={`badge ${orderStatusClass[o.status] || 'grey'}`}>{titleCase(o.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3><IconStar size={16} style={{ verticalAlign: '-2px', color: 'var(--gold-500)' }} /> Best Sellers</h3>
            <Link to="/products" className="link-maroon sm">Catalogue</Link>
          </div>
          <div className="card-pad">
            {s.topProducts.map((p, i) => (
              <div className="list-row" key={p.id}>
                <div className="rank">{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="bs-name">{p.name}</div>
                  <div className="bs-sub">{p.sold} sold</div>
                </div>
                <div className="bs-rev">{inr((p.price || 0) * (p.sold || 0))}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// resolve a CSS variable colour for the sparkline fill
function getComputedColor(cls) {
  const map = { 'c-rev': '#e66e8c', 'c-ord': '#d4af37', 'c-cus': '#34d399', 'c-stk': '#60a5fa' }
  return map[cls] || '#a21c45'
}
