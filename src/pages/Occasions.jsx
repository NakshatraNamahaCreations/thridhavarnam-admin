import { useEffect, useState } from 'react'
import { occasions as api, products as prodApi } from '../api/client'
import { uploadImage, isImageSrc } from '../lib/image'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconCalendar, IconPlus, IconPencil, IconTrash } from '../components/icons'

const PAGE = 6

const COLORS = [
  { key: 'rose', label: 'Rose', grad: 'linear-gradient(135deg,#e66e8c,#a21c45)' },
  { key: 'gold', label: 'Gold', grad: 'linear-gradient(135deg,#dfc06d,#ab7a24)' },
  { key: 'maroon', label: 'Maroon', grad: 'linear-gradient(135deg,#c12a55,#6e1936)' },
  { key: 'ink', label: 'Ink', grad: 'linear-gradient(135deg,#616373,#36363e)' },
]
const CYCLE = ['rose', 'gold', 'maroon', 'ink', 'rose', 'gold']
const gradOf = (c, i) => COLORS.find((x) => x.key === c.color)?.grad || COLORS.find((x) => x.key === CYCLE[i % CYCLE.length]).grad
const EMPTY = { name: '', color: 'rose', image: '', fromAmount: '', toAmount: '' }

export default function Occasions() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [stats, setStats] = useState({})
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [page, setPage] = useState(1)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => {
    load()
    prodApi.list().then((ps) => {
      const s = {}
      ps.forEach((p) => {
        const key = p.occasion
        if (!key) return
        s[key] = s[key] || { products: 0, sold: 0 }
        s[key].products += 1
        s[key].sold += p.sold || 0
      })
      setStats(s)
    }).catch(() => {})
  }, [])

  function openNew() { setForm(EMPTY); setEditing({}) }
  function openEdit(c) {
    setForm({
      name: c.name,
      color: c.color || 'rose',
      image: c.image || '',
      fromAmount: c.fromAmount ? String(c.fromAmount) : '',
      toAmount: c.toAmount ? String(c.toAmount) : '',
    })
    setEditing(c)
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setForm((f) => ({ ...f, image: url }))
      toast.ok('Image uploaded')
    } catch (err) {
      toast.bad(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.bad('Occasion name is required')
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        color: form.color,
        image: form.image,
        fromAmount: Number(form.fromAmount) || 0,
        toAmount: Number(form.toAmount) || 0,
      }
      if (editing.id) {
        await api.update(editing.id, payload)
        toast.ok('Occasion updated')
      } else {
        await api.create(payload)
        toast.ok('Occasion added')
      }
      setEditing(null); load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function doDelete() {
    setSaving(true)
    try { await api.remove(confirm.id); toast.ok('Occasion deleted'); setConfirm(null); load() }
    catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Occasions</h1>
          <p>Curate sarees by the moments they're worn</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><IconPlus size={18} /> New Occasion</button>
        </div>
      </div>

      {!rows ? <div className="spinner" /> : rows.length === 0 ? (
        <div className="card"><div className="empty"><div className="em-ico">✨</div><p>No occasions yet</p></div></div>
      ) : (
        <>
          <div className="prod-grid">
          {rows.slice((page - 1) * PAGE, page * PAGE).map((c, i) => {
            const st = stats[c.id] || stats[c.name?.toLowerCase()] || { products: 0, sold: 0 }
            return (
              <div className="cat-card" key={c.id}>
                <div
                  className="cat-banner"
                  style={{
                    background: isImageSrc(c.image)
                      ? `url(${c.image}) center/cover`
                      : gradOf(c, i),
                  }}
                >
                  {!isImageSrc(c.image) && <IconCalendar size={38} />}
                </div>
                <div className="cat-body">
                  <div className="cat-head">
                    <h3>{c.name}</h3>
                    <div className="cell-actions">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(c)}><IconPencil size={15} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(c)}><IconTrash size={15} /></button>
                    </div>
                  </div>
                  {(c.fromAmount > 0 || c.toAmount > 0) && (
                    <div style={{ fontSize: 12, color: '#616373', marginTop: 4 }}>
                      {c.fromAmount > 0 && c.toAmount > 0
                        ? `₹${Number(c.fromAmount).toLocaleString('en-IN')} – ₹${Number(c.toAmount).toLocaleString('en-IN')}`
                        : c.fromAmount > 0
                        ? `From ₹${Number(c.fromAmount).toLocaleString('en-IN')}`
                        : `Up to ₹${Number(c.toAmount).toLocaleString('en-IN')}`}
                    </div>
                  )}
                  <div className="cat-stats">
                    <div>
                      <div className="cat-num">{st.products}</div>
                      <div className="cat-lbl">Products</div>
                    </div>
                    <div>
                      <div className="cat-num maroon">{st.sold}</div>
                      <div className="cat-lbl">Units sold</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
          <Pagination page={page} pageSize={PAGE} total={rows.length} onChange={setPage} />
        </>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit Occasion' : 'New Occasion'}
          subtitle={editing.id ? editing.id : 'Tag sarees for the perfect moment'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || uploading}>{saving ? 'Saving…' : editing.id ? 'Save changes' : 'Create'}</button>
            </>
          }
        >
          <form onSubmit={save}>
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Occasion name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Wedding"
                disabled={!!editing.id}
                autoFocus
              />
              {editing.id && <span className="img-hint">Occasion id is fixed once created.</span>}
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Tile image</label>
              {isImageSrc(form.image) && (
                <div style={{ marginBottom: 8 }}>
                  <img
                    src={form.image}
                    alt=""
                    style={{ maxWidth: 200, height: 'auto', borderRadius: 6, border: '1px solid #e5e5ea' }}
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={onFile}
                disabled={uploading}
              />
              {uploading && <span className="img-hint">Uploading…</span>}
              {form.image && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ marginTop: 6, fontSize: 12 }}
                  onClick={() => setForm((f) => ({ ...f, image: '' }))}
                >
                  Remove image
                </button>
              )}
              <span className="img-hint">Shown on the storefront home occasion tile. Portrait crops work best.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="field">
                <label>From amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.fromAmount}
                  onChange={(e) => setForm((f) => ({ ...f, fromAmount: e.target.value }))}
                  placeholder="4500"
                />
              </div>
              <div className="field">
                <label>To amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.toAmount}
                  onChange={(e) => setForm((f) => ({ ...f, toAmount: e.target.value }))}
                  placeholder="7000"
                />
              </div>
              <div className="field full" style={{ gridColumn: '1 / -1', marginTop: -6 }}>
                <span className="img-hint">Displayed as "₹X – ₹Y" on the tile. Leave To blank for open-ended "From ₹X". Both 0 hides the price entirely.</span>
              </div>
            </div>

            <div className="field full">
              <label>Accent colour</label>
              <div className="color-grid">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c.key}
                    className={`color-swatch ${form.color === c.key ? 'active' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, color: c.key }))}
                  >
                    <span className="cs-chip" style={{ background: c.grad }} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
              <span className="img-hint">Used as a fallback gradient when no tile image is set.</span>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete occasion"
          message={`Delete "${confirm.name}"? Products keep their tag but the occasion is removed.`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
