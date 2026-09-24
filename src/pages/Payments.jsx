import { useEffect, useState, useMemo } from 'react'
import { payments as api, orders as ordApi } from '../api/client'
import { inr, payStatusClass, titleCase } from '../lib/format'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import { IconWallet, IconClock, IconRefresh, IconRupee, IconDownload, IconPlus, IconSearch } from '../components/icons'

const PAGE = 8
const METHODS = ['UPI', 'Card', 'Net Banking', 'Wallet']
const EMPTY = { orderId: '', customer: '', amount: '', method: 'UPI' }
const TABS = [{ k: 'all', l: 'All' }, { k: 'paid', l: 'Paid' }, { k: 'pending', l: 'Pending' }, { k: 'refunded', l: 'Refunded' }]


export default function Payments() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [orders, setOrders] = useState([])
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('all')
  const [recording, setRecording] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => { load(); ordApi.list().then(setOrders).catch(() => {}) }, [])
  useEffect(() => { setPage(1) }, [q, tab])

  const stats = useMemo(() => {
    if (!rows) return null
    return {
      collected: rows.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0),
      pending: rows.filter((p) => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0),
      refunded: rows.filter((p) => p.status === 'refunded').reduce((s, p) => s + (p.amount || 0), 0),
      count: rows.length,
    }
  }, [rows])

  const filtered = useMemo(() => {
    if (!rows) return []
    return rows.filter((p) => {
      if (tab !== 'all' && p.status !== tab) return false
      if (q && !`${p.customer} ${p.orderId} ${p.id} ${p.method}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [rows, q, tab])
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE)

  function onOrder(e) {
    const id = e.target.value
    const o = orders.find((x) => x.id === id)
    setForm((f) => ({ ...f, orderId: id, customer: o?.customer || f.customer, amount: o ? String(o.amount) : f.amount }))
  }

  async function record(e) {
    e.preventDefault()
    if (!form.customer.trim()) return toast.bad('Customer is required')
    setSaving(true)
    try {
      await api.record({ ...form, amount: Number(form.amount) || 0 })
      toast.ok('Payment recorded')
      setRecording(false); setForm(EMPTY); load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function markPaid(p) {
    try { await api.markPaid(p.id); toast.ok('Marked as paid'); load() }
    catch (e) { toast.bad(e.message) }
  }

  // CSV escape: wrap in quotes and double any existing quotes so
  // commas, newlines and quotes inside cells don't break the columns.
  function csvCell(v) {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  // Export the currently filtered/searched payments as a CSV download.
  // Exports what the admin sees — respects the active tab + search box,
  // ignores pagination.
  function exportCsv() {
    if (!filtered || filtered.length === 0) return toast.bad('Nothing to export')
    const headers = ['id', 'orderId', 'customer', 'amount', 'method', 'status', 'date']
    const lines = [headers.join(',')]
    for (const p of filtered) {
      lines.push(headers.map((h) => csvCell(p[h])).join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `payments-${stamp}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.ok(`Exported ${filtered.length} payment${filtered.length === 1 ? '' : 's'}`)
  }
  async function refund(p) {
    if (!confirm(`Refund ${inr(p.amount)} to ${p.customer}? The linked order will be cancelled.`)) return
    try { await api.refund(p.id); toast.ok('Payment refunded'); load() }
    catch (e) { toast.bad(e.message) }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const cards = stats ? [
    { label: 'Collected', value: inr(stats.collected), Icon: IconWallet, cls: 'c-cus' },
    { label: 'Pending', value: inr(stats.pending), Icon: IconClock, cls: 'c-ord' },
    { label: 'Refunded', value: inr(stats.refunded), Icon: IconRefresh, cls: 'c-rev' },
    { label: 'Transactions', value: stats.count, Icon: IconRupee, cls: 'c-stk' },
  ] : []

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Payments</h1>
          <p>Track transactions, settlements and refunds</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={exportCsv}><IconDownload size={17} /> Export</button>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setRecording(true) }}><IconPlus size={18} /> Record Payment</button>
        </div>
      </div>

      {stats && (
        <div className="stat-grid">
          {cards.map((c) => (
            <div className={`stat inv-stat ${c.cls}`} key={c.label}>
              <div className="st-ico"><c.Icon size={20} /></div>
              <div className="st-label">{c.label}</div>
              <div className="st-value">{c.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="tab-bar">
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.k} className={`tab ${tab === t.k ? 'active' : ''}`} onClick={() => setTab(t.k)}>{t.l}</button>
            ))}
          </div>
          <div className="search-box tab-search">
            <IconSearch size={17} />
            <input placeholder="Search payments…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {!rows ? <div className="spinner" /> : filtered.length === 0 ? (
          <div className="empty"><div className="em-ico">💳</div><p>No payments found</p></div>
        ) : (
          <>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Payment ID</th><th>Order</th><th>Customer</th><th className="num">Amount</th><th>Method</th><th>Status</th><th>Date</th><th></th></tr>
              </thead>
              <tbody>
                {paged.map((p) => (
                  <tr key={p.id}>
                    <td className="mono-sku">{p.id}</td>
                    <td style={{ fontWeight: 600 }}>{p.orderId || '—'}</td>
                    <td>
                      <div className="person">
                        <div className="avatar">{p.avatar}</div>
                        <div className="p-name">{p.customer}</div>
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>{inr(p.amount)}</td>
                    <td>{p.method}</td>
                    <td><span className={`badge ${payStatusClass[p.status] || 'grey'}`}>{titleCase(p.status)}</span></td>
                    <td className="p-sub">{p.date}</td>
                    <td>
                      <div className="cell-actions">
                        {p.status === 'pending' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => markPaid(p)}>Mark paid</button>
                        )}
                        {p.status === 'paid' && (
                          <button className="icon-btn danger" title="Refund" onClick={() => refund(p)}><IconRefresh size={16} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-pager"><Pagination page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} /></div>
          </>
        )}
      </div>

      {recording && (
        <Modal
          title="Record Payment"
          subtitle="Log a payment received against an order"
          onClose={() => setRecording(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setRecording(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={record} disabled={saving}><IconRupee size={16} /> {saving ? 'Recording…' : 'Record Payment'}</button>
            </>
          }
        >
          <form onSubmit={record}>
            <div className="field full">
              <label>Link to order</label>
              <select value={form.orderId} onChange={onOrder}>
                <option value="">— None —</option>
                {orders.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.customer} · {inr(o.amount)}</option>)}
              </select>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Customer</label>
                <input value={form.customer} onChange={set('customer')} placeholder="Ananya Iyer" />
              </div>
              <div className="field">
                <label>Amount (₹)</label>
                <input type="number" value={form.amount} onChange={set('amount')} placeholder="18999" />
              </div>
            </div>
            <div className="field full">
              <label>Method</label>
              <select value={form.method} onChange={set('method')}>
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
