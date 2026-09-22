import { useEffect, useState, useMemo } from 'react'
import { coupons as api } from '../api/client'
import { inr } from '../lib/format'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconTag, IconPlus, IconSearch, IconPencil, IconTrash } from '../components/icons'

const EMPTY = {
  code: '',
  description: '',
  type: 'percent',
  value: '',
  minOrder: '',
  maxDiscount: '',
  startDate: '',
  expiryDate: '',
  usageLimit: '',
  active: true,
}
const PAGE = 8

const fmtDate = (s) => {
  if (!s) return '—'
  try {
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return s
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return s }
}

const isExpired = (s) => {
  if (!s) return false
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}

export default function Coupons() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [page, setPage] = useState(1)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [q, statusFilter])

  const filtered = useMemo(() => {
    if (!rows) return []
    return rows.filter((c) => {
      if (statusFilter === 'active' && !(c.active && !isExpired(c.expiryDate))) return false
      if (statusFilter === 'inactive' && c.active && !isExpired(c.expiryDate)) return false
      if (statusFilter === 'expired' && !isExpired(c.expiryDate)) return false
      if (q && !`${c.code} ${c.description} ${c.id}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [rows, q, statusFilter])
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE)

  function openNew() { setForm(EMPTY); setEditing({}) }
  function openEdit(c) {
    setForm({
      code: c.code || '',
      description: c.description || '',
      type: c.type || 'percent',
      value: c.value ?? '',
      minOrder: c.minOrder ?? '',
      maxDiscount: c.maxDiscount ?? '',
      startDate: c.startDate || '',
      expiryDate: c.expiryDate || '',
      usageLimit: c.usageLimit ?? '',
      active: c.active !== false,
    })
    setEditing(c)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.code.trim()) return toast.bad('Coupon code is required')
    const value = Number(form.value)
    if (!value || value <= 0) return toast.bad('Value must be greater than 0')
    if (form.type === 'percent' && value > 100) return toast.bad('Percent value cannot exceed 100')
    setSaving(true)
    try {
      const payload = {
        ...form,
        value,
        minOrder: Number(form.minOrder) || 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit: Number(form.usageLimit) || 0,
      }
      if (editing.id) { await api.update(editing.id, payload); toast.ok('Coupon updated') }
      else { await api.create(payload); toast.ok('Coupon created') }
      setEditing(null); load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function doDelete() {
    setSaving(true)
    try { await api.remove(confirm.id); toast.ok('Coupon deleted'); setConfirm(null); load() }
    catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const chips = [
    { k: 'all', l: 'All' },
    { k: 'active', l: 'Active' },
    { k: 'inactive', l: 'Inactive' },
    { k: 'expired', l: 'Expired' },
  ]

  const describeValue = (c) =>
    c.type === 'fixed' ? `${inr(c.value)} off` : `${c.value}% off`

  const statusOf = (c) => {
    if (isExpired(c.expiryDate)) return { label: 'Expired', cls: 'red' }
    if (!c.active) return { label: 'Inactive', cls: 'grey' }
    return { label: 'Active', cls: 'green' }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Coupons</h1>
          <p>Manage discount codes for your storefront checkout</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><IconPlus size={18} /> New Coupon</button>
        </div>
      </div>

      <div className="card filter-bar">
        <div className="search-box grow">
          <IconSearch size={18} />
          <input placeholder="Search by code or description…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="chips">
          {chips.map((c) => (
            <button key={c.k} className={`chip ${statusFilter === c.k ? 'active' : ''}`} onClick={() => setStatusFilter(c.k)}>{c.l}</button>
          ))}
        </div>
      </div>

      {!rows ? <div className="spinner" /> : filtered.length === 0 ? (
        <div className="card"><div className="empty"><div className="em-ico">🎟️</div><p>No coupons found</p></div></div>
      ) : (
        <>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th className="num">Min order</th>
                  <th className="num">Usage</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => {
                  const s = statusOf(c)
                  const used = c.usageCount || 0
                  const limit = c.usageLimit || 0
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <IconTag size={15} />
                          <div>
                            <div style={{ fontWeight: 700 }}>{c.code}</div>
                            {c.description && <div className="cc-sub" style={{ fontSize: 12 }}>{c.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td>{describeValue(c)}</td>
                      <td className="num">{c.minOrder ? inr(c.minOrder) : '—'}</td>
                      <td className="num">{used} / {limit || '∞'}</td>
                      <td>{fmtDate(c.expiryDate)}</td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td>
                        <div className="cell-actions">
                          <button className="icon-btn" title="Edit" onClick={() => openEdit(c)}><IconPencil size={15} /></button>
                          <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(c)}><IconTrash size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
          <Pagination page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
        </>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit Coupon' : 'New Coupon'}
          subtitle={editing.id ? editing.code : 'Create a discount code'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : editing.id ? 'Save changes' : 'Create'}</button>
            </>
          }
        >
          <form onSubmit={save}>
            <div className="form-grid">
              <div className="field">
                <label>Code</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. DIWALI25"
                  disabled={!!editing.id}
                  autoFocus
                />
                {editing.id && <span className="img-hint">Coupon code is fixed once created.</span>}
              </div>
              <div className="field">
                <label>Status</label>
                <select
                  value={form.active ? 'active' : 'inactive'}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === 'active' }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="field full">
              <label>Description (optional)</label>
              <input value={form.description} onChange={set('description')} placeholder="e.g. Diwali festive 25% off" />
            </div>

            <div className="form-grid form-grid-3">
              <div className="field">
                <label>Type</label>
                <select value={form.type} onChange={set('type')}>
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed (₹)</option>
                </select>
              </div>
              <div className="field">
                <label>{form.type === 'percent' ? 'Percent value' : 'Amount (₹)'}</label>
                <input type="number" value={form.value} onChange={set('value')} placeholder={form.type === 'percent' ? '25' : '1000'} />
              </div>
              <div className="field">
                <label>Max discount cap (₹)</label>
                <input type="number" value={form.maxDiscount} onChange={set('maxDiscount')} placeholder="Optional" disabled={form.type === 'fixed'} />
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Minimum order (₹)</label>
                <input type="number" value={form.minOrder} onChange={set('minOrder')} placeholder="0" />
              </div>
              <div className="field">
                <label>Usage limit</label>
                <input type="number" value={form.usageLimit} onChange={set('usageLimit')} placeholder="0 = unlimited" />
              </div>
              <div className="field">
                <label>Start date</label>
                <input type="date" value={form.startDate} onChange={set('startDate')} />
              </div>
              <div className="field">
                <label>Expiry date</label>
                <input type="date" value={form.expiryDate} onChange={set('expiryDate')} />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete coupon"
          message={`Delete "${confirm.code}"? Customers won't be able to redeem it after this.`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
