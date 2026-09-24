import { useEffect, useState } from 'react'
import { banners as api, categories as catsApi } from '../api/client'
import { uploadImage, isImageSrc } from '../lib/image'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconPlus, IconPencil, IconTrash } from '../components/icons'

const PAGE = 8

const EMPTY = {
  id: '',
  type: 'hero',
  weave: '',
  title: '',
  subtitle: '',
  image: '',
  ctaLabel: '',
  ctaHref: '',
  order: 0,
  active: true,
}

const TYPE_LABEL = {
  hero: 'Home hero',
  weave: 'Shop by weave',
}

export default function Banners() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [weaveOptions, setWeaveOptions] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [page, setPage] = useState(1)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => {
    load()
    // Pull weave options from the Categories collection so the admin
    // picks a name that matches the storefront's Shop by weave rail.
    catsApi.list()
      .then((cs) => setWeaveOptions(cs.map((c) => c.name).filter(Boolean)))
      .catch(() => {})
  }, [])

  function openNew() {
    setForm(EMPTY)
    setEditing({})
  }

  function openEdit(b) {
    setForm({
      id: b.id || '',
      type: b.type || 'hero',
      weave: b.weave || '',
      title: b.title || '',
      subtitle: b.subtitle || '',
      image: b.image || '',
      ctaLabel: b.ctaLabel || '',
      ctaHref: b.ctaHref || '',
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
    if (form.type === 'weave') {
      if (!form.weave.trim()) return toast.bad('Pick a weave for this tile')
      if (!form.image) return toast.bad('Upload an image for the weave tile')
    } else if (!form.image && !form.title.trim()) {
      return toast.bad('Add an image or a title')
    }
    setSaving(true)
    try {
      const payload = {
        type: form.type,
        weave: form.type === 'weave' ? form.weave.trim() : '',
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        image: form.image,
        ctaLabel: form.ctaLabel.trim(),
        ctaHref: form.ctaHref.trim(),
        order: Number(form.order) || 0,
        active: !!form.active,
      }
      if (editing.id) {
        await api.update(editing.id, payload)
        toast.ok('Banner updated')
      } else {
        await api.create({ ...payload, id: form.id.trim() || undefined })
        toast.ok('Banner added')
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
      toast.ok('Banner deleted')
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

  const isWeave = form.type === 'weave'

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Banners</h1>
          <p>Hero carousel slides and Shop-by-weave tile images</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><IconPlus size={18} /> New Banner</button>
        </div>
      </div>

      {!rows ? <div className="spinner" /> : rows.length === 0 ? (
        <div className="card"><div className="empty"><div className="em-ico">🖼️</div><p>No banners yet — the storefront falls back to its default slides / weave tiles.</p></div></div>
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
                    position: 'relative',
                  }}
                >
                  {!isImageSrc(b.image) && <span style={{ color: '#fff', fontSize: 40 }}>🖼️</span>}
                  <span style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: b.type === 'weave' ? '#0e4d5c' : '#6e1936',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    {TYPE_LABEL[b.type] || TYPE_LABEL.hero}
                  </span>
                </div>
                <div className="cat-body">
                  <div className="cat-head">
                    <h3>
                      {b.type === 'weave'
                        ? (b.weave || <span style={{ color: '#8a8b96' }}>No weave</span>)
                        : (b.title || <span style={{ color: '#8a8b96' }}>Untitled banner</span>)}
                    </h3>
                    <div className="cell-actions">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(b)}><IconPencil size={15} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(b)}><IconTrash size={15} /></button>
                    </div>
                  </div>
                  {b.type !== 'weave' && b.subtitle && (
                    <div style={{ fontSize: 12, color: '#36363e', marginTop: 6, lineHeight: 1.4 }}>
                      {b.subtitle.length > 100 ? b.subtitle.slice(0, 100) + '…' : b.subtitle}
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
          title={editing.id ? 'Edit Banner' : 'New Banner'}
          subtitle={editing.id ? editing.id : 'Hero carousel slide or Shop-by-weave tile'}
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
              <label>Banner type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="hero">Home hero slide</option>
                <option value="weave">Shop by weave tile</option>
              </select>
              <span className="img-hint">
                {isWeave
                  ? 'Overrides the tile image for one weave in the storefront Shop by weave rail.'
                  : 'Rotating slide on the storefront home page hero carousel.'}
              </span>
            </div>

            {isWeave && (
              <div className="field full" style={{ marginBottom: 14 }}>
                <label>Weave *</label>
                <select
                  value={form.weave}
                  onChange={(e) => setForm((f) => ({ ...f, weave: e.target.value }))}
                >
                  <option value="">Select a weave…</option>
                  {weaveOptions.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
                <span className="img-hint">Options come from Categories. Add a category first if the weave you want isn't listed.</span>
              </div>
            )}

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>{isWeave ? 'Tile image *' : 'Banner image *'}</label>
              {isImageSrc(form.image) && (
                <div style={{ marginBottom: 8 }}>
                  <img
                    src={form.image}
                    alt=""
                    style={{ maxWidth: 320, height: 'auto', borderRadius: 6, border: '1px solid #e5e5ea' }}
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
              <span className="img-hint">
                {isWeave ? 'Square crops (1:1) fit the weave rail best.' : 'Landscape crops (~16:9) fit the hero best.'}
              </span>
            </div>

            {!isWeave && (
              <>
                <div className="field full" style={{ marginBottom: 14 }}>
                  <label>Title (headline)</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Festive Silks Collection"
                    autoFocus
                  />
                </div>

                <div className="field full" style={{ marginBottom: 14 }}>
                  <label>Subtitle (supporting copy)</label>
                  <textarea
                    value={form.subtitle}
                    onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                    placeholder="Hand-woven heirlooms for the season, from ₹8,999."
                    rows={2}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div className="field">
                    <label>CTA label</label>
                    <input
                      value={form.ctaLabel}
                      onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                      placeholder="Shop Now"
                    />
                  </div>
                  <div className="field">
                    <label>CTA link</label>
                    <input
                      value={form.ctaHref}
                      onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))}
                      placeholder="/shop?tier=festive"
                    />
                  </div>
                </div>
              </>
            )}

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
                <span className="img-hint">Inactive banners are hidden on the storefront.</span>
              </div>
            </div>

            {!editing.id && (
              <div className="field full">
                <label>Slug id (optional)</label>
                <input
                  value={form.id}
                  onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="Auto-derived if left blank"
                />
                <span className="img-hint">Cannot be changed after creation.</span>
              </div>
            )}
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete banner"
          message={`Delete banner "${confirm.title || confirm.weave || confirm.id}"? Storefront removes it on next page load.`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
