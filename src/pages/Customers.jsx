import { useEffect, useState, useMemo } from 'react'
import { customers as api } from '../api/client'
import { inr, inrK, segmentClass } from '../lib/format'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconUsers, IconStar, IconRupee, IconBag, IconUserPlus, IconSearch, IconMail, IconPhone, IconMapPin, IconPencil, IconTrash } from '../components/icons'

const SEGMENTS = ['New', 'Loyal', 'VIP']
const EMPTY = { name: '', email: '', phone: '', city: '', segment: 'New' }
const PAGE = 6

export default function Customers() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [segFilter, setSegFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [page, setPage] = useState(1)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [q, segFilter])

  const stats = useMemo(() => {
    if (!rows) return null
    const spent = rows.reduce((a, c) => a + (c.spent || 0), 0)
    const orders = rows.reduce((a, c) => a + (c.orders || 0), 0)
    return {
      total: rows.length,
      vip: rows.filter((c) => c.segment === 'VIP').length,
      ltv: spent,
      aov: orders ? Math.round(spent / orders) : 0,
    }
  }, [rows])

  const filtered = useMemo(() => {
    if (!rows) return []
    return rows.filter((c) => {
      if (segFilter !== 'all' && c.segment !== segFilter) return false
      if (q && !`${c.name} ${c.email} ${c.phone} ${c.city} ${c.id}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [rows, q, segFilter])
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE)

  function openNew() { setForm(EMPTY); setEditing({}) }
  function openEdit(c) { setForm({ ...EMPTY, ...c }); setEditing(c) }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.bad('Name is required')
    setSaving(true)
    try {
      if (editing.id) { await api.update(editing.id, form); toast.ok('Customer updated') }
      else { await api.create(form); toast.ok('Customer added') }
      setEditing(null); load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function doDelete() {
    setSaving(true)
    try { await api.remove(confirm.id); toast.ok('Customer deleted'); setConfirm(null); load() }
    catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const cards = stats ? [
    { label: 'Total Customers', value: stats.total, Icon: IconUsers, cls: 'c-rev' },
    { label: 'VIP Customers', value: stats.vip, Icon: IconStar, cls: 'c-ord' },
    { label: 'Lifetime Value', value: inrK(stats.ltv), Icon: IconRupee, cls: 'c-cus' },
    { label: 'Avg. Order Value', value: inr(stats.aov), Icon: IconBag, cls: 'c-stk' },
  ] : []
  const chips = [{ k: 'all', l: 'All' }, { k: 'VIP', l: 'VIP' }, { k: 'Loyal', l: 'Loyal' }, { k: 'New', l: 'New' }]

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p>Your customer relationships in one place</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><IconUserPlus size={18} /> Add Customer</button>
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

      <div className="card filter-bar">
        <div className="search-box grow">
          <IconSearch size={18} />
          <input placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="chips">
          {chips.map((c) => (
            <button key={c.k} className={`chip ${segFilter === c.k ? 'active' : ''}`} onClick={() => setSegFilter(c.k)}>{c.l}</button>
          ))}
        </div>
      </div>

      {!rows ? <div className="spinner" /> : filtered.length === 0 ? (
        <div className="card"><div className="empty"><div className="em-ico">👥</div><p>No customers found</p></div></div>
      ) : (
        <>
          <div className="prod-grid">
          {paged.map((c) => (
            <div className="cust-card" key={c.id}>
              <div className="cc-top">
                <div className="cc-id">
                  <div className="avatar cc-av">{c.avatar}</div>
                  <div>
                    <div className="cc-name">{c.name}</div>
                    <div className="cc-sub">{c.id}</div>
                  </div>
                </div>
                <span className={`badge ${segmentClass[c.segment] || 'grey'}`}>{c.segment}</span>
              </div>

              <div className="cc-info">
                <div className="cc-row"><IconMail size={15} /> <span>{c.email || '—'}</span></div>
                <div className="cc-row"><IconPhone size={15} /> <span>{c.phone || '—'}</span></div>
                <div className="cc-row"><IconMapPin size={15} /> <span>{c.city || '—'}</span></div>
              </div>

              <div className="cc-foot">
                <div className="cc-orders"><IconBag size={15} /> <b>{c.orders || 0}</b> orders</div>
                <div className="cc-spent">
                  <div className="cc-spent-l">Total spent</div>
                  <div className="cc-spent-v">{inr(c.spent)}</div>
                </div>
              </div>

              <div className="cc-actions">
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}><IconPencil size={14} /> Edit</button>
                <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(c)}><IconTrash size={15} /></button>
              </div>
            </div>
          ))}
          </div>
          <Pagination page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
        </>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit Customer' : 'Add Customer'}
          subtitle={editing.id ? editing.id : 'Add a new patron to your CRM'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : editing.id ? 'Save changes' : 'Add Customer'}</button>
            </>
          }
        >
          <form onSubmit={save}>
            <div className="field full">
              <label>Full name</label>
              <input value={form.name} onChange={set('name')} placeholder="e.g. Ananya Iyer" autoFocus />
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="ananya@gmail.com" />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
              </div>
              <div className="field">
                <label>City</label>
                <input value={form.city} onChange={set('city')} placeholder="Chennai" />
              </div>
              <div className="field">
                <label>Segment</label>
                <select value={form.segment} onChange={set('segment')}>
                  {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete customer"
          message={`Delete "${confirm.name}" (${confirm.id})?`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
