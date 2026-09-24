import { useEffect, useState } from 'react'
import { categories as api, products as prodApi } from '../api/client'
import { uploadImage, isImageSrc } from '../lib/image'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconTag, IconPlus, IconPencil, IconTrash } from '../components/icons'

const PAGE = 6

const COLORS = [
  { key: 'rose', label: 'Rose', grad: 'linear-gradient(135deg,#e66e8c,#a21c45)' },
  { key: 'gold', label: 'Gold', grad: 'linear-gradient(135deg,#dfc06d,#ab7a24)' },
  { key: 'maroon', label: 'Maroon', grad: 'linear-gradient(135deg,#c12a55,#6e1936)' },
  { key: 'ink', label: 'Ink', grad: 'linear-gradient(135deg,#616373,#36363e)' },
]
const CYCLE = ['rose', 'gold', 'maroon', 'ink', 'rose', 'gold']
const gradOf = (c, i) => COLORS.find((x) => x.key === c.color)?.grad || COLORS.find((x) => x.key === CYCLE[i % CYCLE.length]).grad
const EMPTY = { name: '', color: 'rose', image: '', region: '', order: '', active: true }

export default function Categories() {
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
        s[p.category] = s[p.category] || { products: 0, sold: 0 }
        s[p.category].products += 1
        s[p.category].sold += p.sold || 0
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
      region: c.region || '',
      order: c.order != null ? String(c.order) : '',
      active: c.active !== false,
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
    if (!form.name.trim()) return toast.bad('Category name is required')
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        color: form.color,
        image: form.image,
        region: form.region.trim(),
        order: Number(form.order) || 0,
        active: !!form.active,
      }
      if (editing.id) { await api.update(editing.id, payload); toast.ok('Category updated') }
      else { await api.create(payload); toast.ok('Category added') }
      setEditing(null); load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function doDelete() {
    setSaving(true)
    try { await api.remove(confirm.id); toast.ok('Category deleted'); setConfirm(null); load() }
    catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  async function toggleActive(c) {
    try {
      await api.update(c.id, { active: c.active === false })
      load()
    } catch (e) { toast.bad(e.message) }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Categories</h1>
          <p>Organise your saree collection</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><IconPlus size={18} /> New Category</button>
        </div>
      </div>

      {!rows ? <div className="spinner" /> : rows.length === 0 ? (
        <div className="card"><div className="empty"><div className="em-ico">🏷️</div><p>No categories yet</p></div></div>
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
                    opacity: c.active === false ? 0.55 : 1,
                  }}
                >
                  {!isImageSrc(c.image) && <IconTag size={38} />}
                </div>
                <div className="cat-body">
                  <div className="cat-head">
                    <h3>{c.name}</h3>
                    <div className="cell-actions">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(c)}><IconPencil size={15} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(c)}><IconTrash size={15} /></button>
                    </div>
                  </div>
                  {c.region && (
                    <div style={{ fontSize: 12, color: '#616373', marginTop: 4 }}>{c.region}</div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, color: '#8a8b96' }}>
                    <span>Order: {c.order || 0}</span>
                    <button
                      type="button"
                      onClick={() => toggleActive(c)}
                      style={{
                        border: 'none',
                        background: c.active === false ? '#f4e5e7' : '#e8f5ec',
                        color: c.active === false ? '#75001F' : '#2f7f4a',
                        padding: '2px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {c.active === false ? 'Inactive' : 'Active'}
                    </button>
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
          title={editing.id ? 'Edit Category' : 'New Category'}
          subtitle={editing.id ? editing.id : 'Group your sarees into a collection'}
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
              <label>Category name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Kanjivaram"
                disabled={!!editing.id}
                autoFocus
              />
              {editing.id && <span className="img-hint">Category id is fixed once created.</span>}
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
              <span className="img-hint">Shown on the storefront "Shop by weave" rail. Square crops (1:1) work best. Banner overrides still take priority.</span>
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Region</label>
              <input
                value={form.region}
                onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                placeholder="e.g. Kanchipuram"
              />
              <span className="img-hint">Shown as the subtitle under the weave name on the tile.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="field">
                <label>Display order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                  placeholder="0"
                />
                <span className="img-hint">Lower numbers appear first.</span>
              </div>
              <div className="field">
                <label>Status</label>
                <select
                  value={form.active ? '1' : '0'}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === '1' }))}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
                <span className="img-hint">Inactive weaves are hidden on the storefront.</span>
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
          title="Delete category"
          message={`Delete "${confirm.name}"? Products keep their tag but the collection is removed.`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
