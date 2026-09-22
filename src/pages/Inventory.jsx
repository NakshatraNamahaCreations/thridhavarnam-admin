import { useEffect, useState, useMemo } from 'react'
import { products as api } from '../api/client'
import { inr, inrK, titleCase } from '../lib/format'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import { IconBox, IconAlert, IconBoxX, IconRupee, IconRefresh } from '../components/icons'

const LOW = 5
const PAGE = 8

export default function Inventory() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [restockRow, setRestockRow] = useState(null)
  const [qty, setQty] = useState('10')
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => { load() }, [])
  const paged = rows ? rows.slice((page - 1) * PAGE, page * PAGE) : []

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

      <div className="card">
        <div className="card-head"><h3>Stock Levels</h3></div>
        {!rows ? <div className="spinner" /> : (
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
            <div className="table-pager"><Pagination page={page} pageSize={PAGE} total={rows.length} onChange={setPage} /></div>
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
