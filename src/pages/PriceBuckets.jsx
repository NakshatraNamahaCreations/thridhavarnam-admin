import { useEffect, useState } from 'react'
import { priceBuckets as api } from '../api/client'
import { uploadImage, isImageSrc } from '../lib/image'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconPlus, IconPencil, IconTrash } from '../components/icons'

const PAGE = 8

const EMPTY = {
  id: '',
  label: '',
  subtitle: '',
  image: '',
  href: '/shop',
  startingPrice: '',
  order: 0,
  active: true,
}

// Suggestions matching PRICE_BRACKETS on the storefront FilterRail. The
// admin can free-text any URL, but these cover the common cases.
const HREF_SUGGESTIONS = [
  '/shop?bracket=under-5k',
  '/shop?bracket=5-15k',
  '/shop?bracket=15-30k',
  '/shop?bracket=30-60k',
  '/shop?bracket=above-60k',
  '/shop?tier=bridal',
  '/shop?tier=festive',
  '/shop?tier=everyday',
]

export default function PriceBuckets() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [page, setPage] = useState(1)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => { load() }, [])

  function openNew() {
    setForm(EMPTY)
    setEditing({})
  }

  function openEdit(b) {
    setForm({
      id: b.id || '',
      label: b.label || '',
      subtitle: b.subtitle || '',
      image: b.image || '',
      href: b.href || '/shop',
      startingPrice: b.startingPrice ? String(b.startingPrice) : '',
      order: Number(b.order) || 0,
      active: b.active !== false,
    })
    setEditing(b)
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
    if (!form.label.trim()) return toast.bad('Label is required')
    setSaving(true)
    try {
      const payload = {
        label: form.label.trim(),
        subtitle: form.subtitle.trim(),
        image: form.image,
        href: form.href.trim() || '/shop',
        startingPrice: Number(form.startingPrice) || 0,
        order: Number(form.order) || 0,
        active: !!form.active,
      }
      if (editing.id) {
        await api.update(editing.id, payload)
        toast.ok('Price bucket updated')
      } else {
        await api.create({ ...payload, id: form.id.trim() || undefined })
        toast.ok('Price bucket added')
      }
      setEditing(null)
      load()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function doDelete() {
    setSaving(true)
    try {
      await api.remove(confirm.id)
      toast.ok('Price bucket deleted')
      setConfirm(null)
      load()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(b) {
    try {
      await api.update(b.id, { active: !b.active })
      load()
    } catch (e) {
      toast.bad(e.message)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Shop by Price</h1>
          <p>Price-based tiles on the storefront home page</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><IconPlus size={18} /> New Tile</button>
        </div>
      </div>

      {!rows ? <div className="spinner" /> : rows.length === 0 ? (
        <div className="card"><div className="empty"><div className="em-ico">🏷️</div><p>No tiles yet — the storefront falls back to its default four tiles.</p></div></div>
      ) : (
        <>
          <div className="prod-grid">
            {rows.slice((page - 1) * PAGE, page * PAGE).map((b) => (
              <div className="cat-card" key={b.id}>
                <div
                  className="cat-banner"
                  style={{
                    background: isImageSrc(b.image)
                      ? `url(${b.image}) center/cover`
                      : 'linear-gradient(135deg,#c12a55,#6e1936)',
                    opacity: b.active ? 1 : 0.55,
                  }}
                >
                  {!isImageSrc(b.image) && <span style={{ color: '#fff', fontSize: 40 }}>🏷️</span>}
                </div>
                <div className="cat-body">
                  <div className="cat-head">
                    <h3>{b.label || <span style={{ color: '#8a8b96' }}>Untitled</span>}</h3>
                    <div className="cell-actions">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(b)}><IconPencil size={15} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(b)}><IconTrash size={15} /></button>
                    </div>
                  </div>
                  {b.subtitle && (
                    <div style={{ fontSize: 12, color: '#616373', marginTop: 4 }}>
                      {b.subtitle}
                    </div>
                  )}
                  {b.startingPrice > 0 && (
                    <div style={{ fontSize: 12, color: '#36363e', marginTop: 6 }}>
                      Starting at ₹{Number(b.startingPrice).toLocaleString('en-IN')}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, color: '#8a8b96' }}>
                    <span>Order: {b.order || 0}</span>
                    <button
                      type="button"
                      onClick={() => toggleActive(b)}
                      style={{
                        border: 'none',
                        background: b.active ? '#e8f5ec' : '#f4e5e7',
                        color: b.active ? '#2f7f4a' : '#75001F',
                        padding: '2px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {b.active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE} total={rows.length} onChange={setPage} />
        </>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit Tile' : 'New Tile'}
          subtitle={editing.id ? editing.id : 'A tile in the storefront "Shop by price" section'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || uploading}>
                {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Create'}
              </button>
            </>
          }
        >
          <form onSubmit={save}>
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
              <span className="img-hint">Portrait crops (~3:4) fit the tile best.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="field">
                <label>Label *</label>
                <input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Under ₹5,000"
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Subtitle</label>
                <input
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  placeholder="Everyday Drapes"
                />
              </div>
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Link (href)</label>
              <input
                list="href-suggestions"
                value={form.href}
                onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))}
                placeholder="/shop?bracket=under-5k"
              />
              <datalist id="href-suggestions">
                {HREF_SUGGESTIONS.map((h) => (
                  <option key={h} value={h} />
                ))}
              </datalist>
              <span className="img-hint">Where the tile links. Storefront supports ?bracket=&lt;id&gt;, ?tier=&lt;id&gt;, ?weave=&lt;name&gt;, ?occasion=&lt;name&gt;.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="field">
                <label>Starting at (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.startingPrice}
                  onChange={(e) => setForm((f) => ({ ...f, startingPrice: e.target.value }))}
                  placeholder="3850"
                />
                <span className="img-hint">Shown as "Starting at ₹X". Leave 0 to hide.</span>
              </div>
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
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Status</label>
              <select
                value={form.active ? '1' : '0'}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === '1' }))}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
              <span className="img-hint">Inactive buckets are hidden on the storefront.</span>
            </div>

            {!editing.id && (
              <div className="field full">
                <label>Slug id (optional)</label>
                <input
                  value={form.id}
                  onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="Auto-derived from label if left blank"
                />
                <span className="img-hint">Cannot be changed after creation.</span>
              </div>
            )}
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete tile"
          message={`Delete "${confirm.label || confirm.id}"? Storefront removes it on next page load.`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
