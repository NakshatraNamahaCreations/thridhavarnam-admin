import { useEffect, useState, useMemo } from 'react'
import { orders as api, customers as custApi, products as prodApi } from '../api/client'
import { inr, fmtDate, orderStatusClass, payStatusClass, titleCase } from '../lib/format'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
const PAYSTATES = ['pending', 'paid', 'refunded']
const EMPTY = { customer: '', city: '', product: '', items: '1', amount: '', status: 'pending', payment: 'pending' }

// How often we re-poll the batched tracking endpoint. 60s matches the
// server-side Shiprocket cache TTL, so a poll cycle that lands just
// after an entry expires picks up fresh data; one that lands inside
// the TTL hits the cache and is cheap.
const TRACKING_POLL_MS = 60_000

// Rows per page. Ten keeps the viewport uncluttered without burying
// pagination controls below the fold on common laptop heights.
const PAGE_SIZE = 10

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
  // Holds the order the admin has clicked "Cancel order" on — triggers
  // the confirm dialog + the backend PUT that also hits Shiprocket's
  // cancel API via the controller.
  const [cancelOrder, setCancelOrder] = useState(null)
  // Live Shiprocket statuses keyed by order id. Populated by the
  // /orders/tracking poller — orders not in this map (admin-created,
  // Shiprocket push failed, upstream errored) just keep showing their
  // internal status.
  const [tracking, setTracking] = useState({})
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [page, setPage] = useState(1)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => {
    load()
    custApi.list().then(setCusts).catch(() => {})
    prodApi.list().then(setProds).catch(() => {})
  }, [])

  // Poll Shiprocket-backed tracking for every visible order. We don't
  // pass an ids filter — the backend already scopes to orders with a
  // shipment and the response is small. First fetch marks loading so
  // the badges show a spinner on initial paint; subsequent polls run
  // silently in the background.
  useEffect(() => {
    let cancelled = false
    let first = true

    const pull = async () => {
      if (first) setTrackingLoading(true)
      try {
        const data = await api.tracking()
        if (!cancelled) setTracking(data?.tracking || {})
      } catch (e) {
        // Non-fatal — the row keeps showing the stored internal status.
        console.warn('[orders] tracking fetch failed', e?.message || e)
      } finally {
        if (first && !cancelled) setTrackingLoading(false)
        first = false
      }
    }

    pull()
    const t = setInterval(pull, TRACKING_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  // Pick the effective status for an order — the live Shiprocket entry
  // if we've got one, otherwise the stored internal field. Everything
  // downstream (chip counts, filter, row badge) consumes this so the
  // table, the tab counters, and the badge all agree on reality.
  const effectiveStatus = (o) => {
    const t = tracking[o.id]
    if (t?.internalStatus) return t.internalStatus
    return o.status || 'pending'
  }

  const counts = useMemo(() => {
    const c = { all: rows?.length || 0 }
    STATUSES.forEach((s) => (c[s] = 0))
    rows?.forEach((o) => {
      const s = effectiveStatus(o)
      c[s] = (c[s] || 0) + 1
    })
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, tracking])

  const filtered = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase()
    return rows.filter((o) => {
      if (statusFilter !== 'all' && effectiveStatus(o) !== statusFilter) return false
      if (!needle) return true
      // Primary haystack — the fields visible in the table row.
      const base = `${o.customer || ''} ${o.product || ''} ${o.id || ''} ${o.city || ''}`.toLowerCase()
      if (base.includes(needle)) return true
      // Secondary haystack — per-item SKU / productId / name. Lets the
      // admin search by product code (eg. "SAR-0006" or just "0006") and
      // land on the order that actually contains it, even when the
      // flattened `product` summary only shows the first item + "+N more".
      const items = Array.isArray(o.lineItems) ? o.lineItems : []
      for (const it of items) {
        const hay = `${it.productId || ''} ${it.sku || ''} ${it.name || ''}`.toLowerCase()
        if (hay.includes(needle)) return true
      }
      return false
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, statusFilter, tracking])

  // Reset to page 1 whenever the user narrows the result set — otherwise
  // changing the filter while on page 5 can leave the table empty.
  useEffect(() => { setPage(1) }, [q, statusFilter])

  // If a mutation (delete, status change) shrinks the result set below
  // the current page's window, back off one page so we're not stranded
  // on an empty view.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  )

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

  async function doCancelOrder() {
    if (!cancelOrder) return
    setSaving(true)
    try {
      await api.update(cancelOrder.id, { status: 'cancelled' })
      toast.ok(`Order ${cancelOrder.id} cancelled`)
      setCancelOrder(null)
      // Close the edit modal if it was the one open — we don't want
      // the admin left looking at a stale "cancel this order" strip.
      if (editing && editing.id === cancelOrder.id) setEditing(null)
      load()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setSaving(false)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // Shape consumed by the row badge renderer below. Reuses
  // `effectiveStatus` so chip counts / filter / badge all agree.
  function resolveRowStatus(o) {
    const t = tracking[o.id]
    const internal = effectiveStatus(o)
    if (t) {
      // Guard against bare numeric statuses leaking through — those
      // are Shiprocket-internal `shipment_status` codes and would
      // render as a meaningless digit ("8", "26"). Fall back to the
      // mapped internal label when we see one.
      const raw = (t.currentStatus || '').trim()
      const isNumericCode = /^\d+$/.test(raw)
      return {
        text: raw && !isNumericCode ? raw : titleCase(internal),
        internal,
        source: t.source || 'shiprocket',
        courier: t.courier || '',
        awb: t.awbCode || '',
      }
    }
    return {
      text: titleCase(internal),
      internal,
      source: 'internal',
      courier: o?.shiprocket?.courier || '',
      awb: o?.shiprocket?.awbCode || '',
    }
  }

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
                {paged.map((o) => (
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
                      {(() => {
                        const r = resolveRowStatus(o)
                        const live = r.source === 'shiprocket'
                        const title = live
                          ? `Live Shiprocket status${r.courier ? ` · ${r.courier}` : ''}${r.awb ? ` · AWB ${r.awb}` : ''}`
                          : trackingLoading
                            ? 'Fetching live status…'
                            : 'No Shiprocket shipment yet — showing internal status'
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span
                              className={`badge ${orderStatusClass[r.internal] || 'grey'}`}
                              title={title}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                              {live && (
                                <span
                                  aria-hidden
                                  title="Live from Shiprocket"
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: '#22c55e',
                                    boxShadow: '0 0 0 2px rgba(34,197,94,0.2)',
                                  }}
                                />
                              )}
                              {r.text}
                            </span>
                            {(r.courier || r.awb) && (
                              <span className="p-sub" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                                {r.courier}{r.courier && r.awb ? ' · ' : ''}{r.awb}
                              </span>
                            )}
                          </div>
                        )
                      })()}
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
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onChange={setPage}
            />
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
          {editing.id && editing.status !== 'cancelled' && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid var(--line, #eee)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>Cancel this order</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                  Restores stock and cancels the Shiprocket shipment. This can&apos;t be undone.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setCancelOrder(editing)}
                disabled={saving}
              >
                Cancel order
              </button>
            </div>
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

      {cancelOrder && (
        <ConfirmDialog
          title="Cancel order"
          message={`Cancel order ${cancelOrder.id} for ${cancelOrder.customer}? Stock will be restored and the Shiprocket shipment will be cancelled.`}
          confirmLabel={saving ? 'Cancelling…' : 'Yes, cancel order'}
          cancelLabel="No, keep it"
          tone="danger"
          onConfirm={doCancelOrder}
          onClose={() => setCancelOrder(null)}
          busy={saving}
        />
      )}

    </>
  )
}
