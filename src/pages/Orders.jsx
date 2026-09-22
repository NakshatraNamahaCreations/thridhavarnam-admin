import { useEffect, useState, useMemo } from 'react'
import { orders as api, customers as custApi, products as prodApi } from '../api/client'
import { inr, fmtDate, orderStatusClass, payStatusClass, titleCase } from '../lib/format'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
const PAYSTATES = ['pending', 'paid', 'refunded']
const EMPTY = { customer: '', city: '', product: '', items: '1', amount: '', status: 'pending', payment: 'pending' }

export default function Orders() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [custs, setCusts] = useState([])
  const [prods, setProds] = useState([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => {
    load()
    custApi.list().then(setCusts).catch(() => {})
    prodApi.list().then(setProds).catch(() => {})
  }, [])

  const counts = useMemo(() => {
    const c = { all: rows?.length || 0 }
    STATUSES.forEach((s) => (c[s] = 0))
    rows?.forEach((o) => (c[o.status] = (c[o.status] || 0) + 1))
    return c
  }, [rows])

  const filtered = useMemo(() => {
    if (!rows) return []
    return rows.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      if (q && !`${o.customer} ${o.product} ${o.id} ${o.city}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [rows, q, statusFilter])

  function openNew() { setForm(EMPTY); setEditing({}) }
  function openEdit(o) {
    setForm({ ...EMPTY, ...o, items: String(o.items ?? 1), amount: o.amount ?? '' })
    setEditing(o)
  }

  // when a customer is picked on a new order, prefill their city
  function onCustomer(e) {
    const name = e.target.value
    const c = custs.find((x) => x.name === name)
    setForm((f) => ({ ...f, customer: name, city: c?.city || f.city }))
  }
  function onProduct(e) {
    const name = e.target.value
    const p = prods.find((x) => x.name === name)
    setForm((f) => ({ ...f, product: name, amount: p ? String((p.price || 0) * (Number(f.items) || 1)) : f.amount }))
  }

  async function save(e) {
    e.preventDefault()
    if (!form.customer.trim()) return toast.bad('Customer is required')
    setSaving(true)
    try {
      const payload = { ...form, items: Number(form.items) || 1, amount: Number(form.amount) || 0 }
      if (editing.id) { await api.update(editing.id, payload); toast.ok('Order updated') }
      else { await api.create(payload); toast.ok('Order created') }
      setEditing(null); load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function doDelete() {
    setSaving(true)
    try { await api.remove(confirm.id); toast.ok('Order deleted'); setConfirm(null); load() }
    catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function quickStatus(o, status) {
    try { await api.update(o.id, { status }); load() }
    catch (e) { toast.bad(e.message) }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <div className="toolbar">
        <div className="chips">
          {['all', ...STATUSES].map((s) => (
            <button key={s} className={`chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : titleCase(s)} {counts[s] ? <span style={{ opacity: 0.7 }}>· {counts[s]}</span> : ''}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div className="search-box">
          <span>🔍</span>
          <input placeholder="Search orders…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openNew}>＋ New order</button>
      </div>

      <div className="card">
        {!rows ? <div className="spinner" /> : filtered.length === 0 ? (
          <div className="empty"><div className="em-ico">🧾</div><p>No orders found</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Order</th><th>Customer</th><th>Product</th><th className="num">Items</th>
                  <th className="num">Amount</th><th>Payment</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td><div style={{ fontWeight: 700 }}>{o.id}</div><div className="p-sub">{fmtDate(o.date)}</div></td>
                    <td>
                      <div className="person">
                        <div className="avatar">{o.avatar}</div>
                        <div><div className="p-name">{o.customer}</div><div className="p-sub">{o.city || '—'}</div></div>
                      </div>
                    </td>
                    <td style={{ maxWidth: 200 }}>{o.product || '—'}</td>
                    <td className="num">{o.items}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{inr(o.amount)}</td>
                    <td><span className={`badge ${payStatusClass[o.payment] || 'grey'}`}>{titleCase(o.payment)}</span></td>
                    <td>
                      <select
                        className="select"
                        style={{ padding: '5px 8px', fontSize: 12.5 }}
                        value={o.status}
                        onChange={(e) => quickStatus(o, e.target.value)}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button className="icon-btn" title="Edit" onClick={() => openEdit(o)}>✏️</button>
                        <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(o)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Modal
          title={editing.id ? `Edit ${editing.id}` : 'Create order'}
          onClose={() => setEditing(null)}
          wide
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save order'}</button>
            </>
          }
        >
          <form className="form-grid" onSubmit={save}>
            <div className="field">
              <label>Customer</label>
              <input list="cust-list" value={form.customer} onChange={onCustomer} placeholder="Ananya Iyer" />
              <datalist id="cust-list">{custs.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            </div>
            <div className="field">
              <label>City</label>
              <input value={form.city} onChange={set('city')} placeholder="Chennai" />
            </div>
            <div className="field full">
              <label>Product</label>
              <input list="prod-list" value={form.product} onChange={onProduct} placeholder="Royal Kanjivaram Silk" />
              <datalist id="prod-list">{prods.map((p) => <option key={p.id} value={p.name} />)}</datalist>
            </div>
            <div className="field">
              <label>Items</label>
              <input type="number" value={form.items} onChange={set('items')} min="1" />
            </div>
            <div className="field">
              <label>Amount (₹)</label>
              <input type="number" value={form.amount} onChange={set('amount')} placeholder="18999" />
            </div>
            <div className="field">
              <label>Order status</label>
              <select value={form.status} onChange={set('status')}>
                {STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Payment</label>
              <select value={form.payment} onChange={set('payment')}>
                {PAYSTATES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
              </select>
            </div>
          </form>
          {!editing.id && (
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 6 }}>
              A matching entry is automatically added to the Payments ledger.
            </p>
          )}
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete order"
          message={`Delete order ${confirm.id} for ${confirm.customer}?`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
