import { useEffect, useState, useMemo } from 'react'
import { products as api, categories as catApi } from '../api/client'
import { inr, inrK, titleCase } from '../lib/format'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import { IconBox, IconAlert, IconBoxX, IconRupee, IconRefresh, IconSearch } from '../components/icons'

const LOW = 5
const PAGE = 8

export default function Inventory() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [cats, setCats] = useState([])
  const [restockRow, setRestockRow] = useState(null)
  const [qty, setQty] = useState('10')
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  // Stock status filter — mirrors the badges in the table ('all' | 'active'
  // | 'low' | 'out') so the chip row doubles as a quick way to drill into
  // whatever needs attention first.
  const [stockFilter, setStockFilter] = useState('all')

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => {
    load()
    catApi.list().then(setCats).catch(() => {})
  }, [])
  // Reset to page 1 whenever any filter changes so the user isn't stranded
  // on an empty page after narrowing the result set.
  useEffect(() => { setPage(1) }, [q, catFilter, stockFilter])

  const filtered = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase()
    return rows.filter((p) => {
      if (catFilter !== 'all' && p.category !== catFilter) return false
      if (stockFilter === 'active' && !(p.stock > LOW)) return false
      if (stockFilter === 'low' && !(p.stock > 0 && p.stock <= LOW)) return false
      if (stockFilter === 'out' && p.stock !== 0) return false
      if (needle) {
        const hay = `${p.name} ${p.id} ${p.weave || ''} ${p.color || ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, q, catFilter, stockFilter])

  const paged = filtered.slice((page - 1) * PAGE, page * PAGE)

  const stats = useMemo(() => {
    if (!rows) return null
    return {
      units: rows.reduce((a, p) => a + (p.stock || 0), 0),
      low: rows.filter((p) => p.stock > 0 && p.stock <= LOW).length,
      out: rows.filter((p) => p.stock === 0).length,
      value: rows.reduce((a, p) => a + (p.price || 0) * (p.stock || 0), 0),
      max: Math.max(...rows.map((p) => p.stock || 0), 1),
    }
  }, [rows])

  async function quickRestock(p, amount) {
    try { await api.restock(p.id, amount); toast.ok(`+${amount} added to ${p.name}`); load() }
    catch (e) { toast.bad(e.message) }
  }

  async function doRestock(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.restock(restockRow.id, Number(qty) || 0)
      toast.ok('Stock updated')
      setRestockRow(null); load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  const cards = stats ? [
    { label: 'Total Units', value: stats.units, Icon: IconBox, cls: 'c-cus' },
    { label: 'Low Stock', value: stats.low, Icon: IconAlert, cls: 'c-ord' },
    { label: 'Out of Stock', value: stats.out, Icon: IconBoxX, cls: 'c-rev' },
    { label: 'Stock Value', value: inr(stats.value), Icon: IconRupee, cls: 'c-stk' },
  ] : []

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Inventory</h1>
          <p>Monitor stock levels and restock alerts</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setRestockRow(rows?.[0]); setQty('10') }} disabled={!rows?.length}>
            <IconRefresh size={17} /> Restock
          </button>
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

      {rows && (
        <div className="card filter-bar">
          <div className="search-box grow">
            <IconSearch size={18} />
            <input
              placeholder="Search by name, SKU, weave or colour…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="chips">
            <button
              className={`chip ${catFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCatFilter('all')}
            >
              All
            </button>
            {cats.map((c) => (
              <button
                key={c.id}
                className={`chip ${catFilter === c.id ? 'active' : ''}`}
                onClick={() => setCatFilter(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="chips">
            {[
              { id: 'all', label: 'Any stock' },
              { id: 'active', label: 'Active' },
              { id: 'low', label: 'Low' },
              { id: 'out', label: 'Out of stock' },
            ].map((s) => (
              <button
                key={s.id}
                className={`chip ${stockFilter === s.id ? 'active' : ''}`}
                onClick={() => setStockFilter(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h3>Stock Levels</h3>
          {rows && (
            <span className="muted" style={{ fontSize: 12 }}>
              {filtered.length === rows.length
                ? `${rows.length} product${rows.length === 1 ? '' : 's'}`
                : `${filtered.length} of ${rows.length} matching`}
            </span>
          )}
        </div>
        {!rows ? <div className="spinner" /> : filtered.length === 0 ? (
          <div className="empty"><div className="em-ico">🥻</div><p>No sarees match these filters</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>SKU</th><th>Saree</th><th>Category</th><th className="num">Stock</th><th>Level</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {paged.map((p) => {
                  const pct = Math.min(Math.round(((p.stock || 0) / stats.max) * 100), 100)
                  const level = p.stock === 0 ? 'red' : p.stock <= LOW ? 'amber' : p.stock <= 15 ? 'blue' : 'green'
                  return (
                    <tr key={p.id}>
                      <td className="mono-sku">{p.id}</td>
                      <td style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{p.name}</td>
                      <td>{titleCase(p.category)}</td>
                      <td className="num" style={{ fontWeight: 700 }}>{p.stock}</td>
                      <td>
                        <div className="level-bar"><span className={level} style={{ width: `${Math.max(pct, 4)}%` }} /></div>
                      </td>
                      <td>
                        {p.stock === 0
                          ? <span className="badge red">Out of stock</span>
                          : p.stock <= LOW
                            ? <span className="badge amber">Low</span>
                            : <span className="badge green">Active</span>}
                      </td>
                      <td className="num">
                        <button className="restock-link" onClick={() => quickRestock(p, 10)}>+10</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="table-pager"><Pagination page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} /></div>
          </div>
        )}
      </div>

      {restockRow && (
        <Modal
          title="Restock"
          subtitle={restockRow.name}
          onClose={() => setRestockRow(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setRestockRow(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={doRestock} disabled={saving}>{saving ? 'Adding…' : 'Add stock'}</button>
            </>
          }
        >
          <form onSubmit={doRestock}>
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Saree</label>
              <select value={restockRow.id} onChange={(e) => setRestockRow(rows.find((r) => r.id === e.target.value))}>
                {rows.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.stock} in stock</option>)}
              </select>
            </div>
            <div className="field full">
              <label>Quantity to add</label>
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
