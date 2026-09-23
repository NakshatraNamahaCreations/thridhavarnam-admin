import { useEffect, useState } from 'react'
import { stories as api } from '../api/client'
import { uploadImage, isImageSrc } from '../lib/image'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconPlus, IconPencil, IconTrash } from '../components/icons'

const PAGE = 6

// Blank form scaffold. `look_for` is a fixed-length array (3 items)
// because that's what the storefront tile expects — keeping it fixed
// avoids null/undefined checks on the render side.
const EMPTY = {
  id: '',
  name: '',
  region: '',
  state: '',
  era: '',
  image: '',
  origins: '',
  technique: '',
  look_for: ['', '', ''],
  pull_quote: '',
  order: 0,
}

export default function Stories() {
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

  function openEdit(s) {
    setForm({
      id: s.id || '',
      name: s.name || '',
      region: s.region || '',
      state: s.state || '',
      era: s.era || '',
      image: s.image || '',
      origins: s.origins || '',
      technique: s.technique || '',
      look_for: [s.look_for?.[0] || '', s.look_for?.[1] || '', s.look_for?.[2] || ''],
      pull_quote: s.pull_quote || '',
      order: Number(s.order) || 0,
    })
    setEditing(s)
  }

  // Upload one image and store its Cloudinary URL on the form.
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

  function setLookFor(i, value) {
    setForm((f) => {
      const look_for = [...f.look_for]
      look_for[i] = value
      return { ...f, look_for }
    })
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.bad('Story name is required')

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        region: form.region.trim(),
        state: form.state.trim(),
        era: form.era.trim(),
        image: form.image,
        origins: form.origins.trim(),
        technique: form.technique.trim(),
        look_for: form.look_for.map((l) => l.trim()).filter(Boolean),
        pull_quote: form.pull_quote.trim(),
        order: Number(form.order) || 0,
      }
      if (editing.id) {
        await api.update(editing.id, payload)
        toast.ok('Story updated')
      } else {
        await api.create({ ...payload, id: form.id.trim() || undefined })
        toast.ok('Story added')
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
      toast.ok('Story deleted')
      setConfirm(null)
      load()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Stories</h1>
          <p>Heritage narrative — one story per weave shown on the intro scroll</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openNew}><IconPlus size={18} /> New Story</button>
        </div>
      </div>

      {!rows ? <div className="spinner" /> : rows.length === 0 ? (
        <div className="card"><div className="empty"><div className="em-ico">📖</div><p>No stories yet</p></div></div>
      ) : (
        <>
          <div className="prod-grid">
            {rows.slice((page - 1) * PAGE, page * PAGE).map((s) => (
              <div className="cat-card" key={s.id}>
                <div
                  className="cat-banner"
                  style={{
                    background: isImageSrc(s.image)
                      ? `url(${s.image}) center/cover`
                      : 'linear-gradient(135deg,#c12a55,#6e1936)',
                  }}
                >
                  {!isImageSrc(s.image) && <span style={{ color: '#fff', fontSize: 40 }}>📖</span>}
                </div>
                <div className="cat-body">
                  <div className="cat-head">
                    <h3>{s.name}</h3>
                    <div className="cell-actions">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(s)}><IconPencil size={15} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(s)}><IconTrash size={15} /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#616373', marginTop: 4 }}>
                    {s.region}{s.state ? ` · ${s.state}` : ''}
                  </div>
                  {s.origins && (
                    <div style={{ fontSize: 12, color: '#36363e', marginTop: 8, lineHeight: 1.4 }}>
                      {s.origins.length > 120 ? s.origins.slice(0, 120) + '…' : s.origins}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#8a8b96', marginTop: 8 }}>
                    Order: {s.order || 0}
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
          title={editing.id ? 'Edit Story' : 'New Story'}
          subtitle={editing.id ? editing.id : 'Tell the story of a weave'}
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
            {/* Identity */}
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Weave name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Kanjeevaram"
                autoFocus
              />
            </div>

            {!editing.id && (
              <div className="field full" style={{ marginBottom: 14 }}>
                <label>Story id (optional)</label>
                <input
                  value={form.id}
                  onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="Auto-derived from name if left blank"
                />
                <span className="img-hint">Used in URLs / analytics. Cannot be changed after creation.</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="field">
                <label>Region</label>
                <input
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  placeholder="Kanchipuram"
                />
              </div>
              <div className="field">
                <label>State</label>
                <input
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                  placeholder="Tamil Nadu"
                />
              </div>
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Era</label>
              <input
                value={form.era}
                onChange={(e) => setForm((f) => ({ ...f, era: e.target.value }))}
                placeholder="since the Chola dynasty · 9th century"
              />
            </div>

            {/* Image */}
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Hero image</label>
              {isImageSrc(form.image) && (
                <div style={{ marginBottom: 8 }}>
                  <img
                    src={form.image}
                    alt=""
                    style={{ maxWidth: 180, height: 'auto', borderRadius: 6, border: '1px solid #e5e5ea' }}
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
            </div>

            {/* Editorial copy */}
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Origins (paragraph)</label>
              <textarea
                value={form.origins}
                onChange={(e) => setForm((f) => ({ ...f, origins: e.target.value }))}
                placeholder="Historical background — who, when, where, patronage."
                rows={4}
              />
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Technique (paragraph)</label>
              <textarea
                value={form.technique}
                onChange={(e) => setForm((f) => ({ ...f, technique: e.target.value }))}
                placeholder="The distinguishing craft process."
                rows={4}
              />
            </div>

            {/* Look for — three bullets */}
            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Look for (three authentication bullets)</label>
              {[0, 1, 2].map((i) => (
                <input
                  key={i}
                  value={form.look_for[i]}
                  onChange={(e) => setLookFor(i, e.target.value)}
                  placeholder={`Bullet ${i + 1}`}
                  style={{ marginBottom: 6 }}
                />
              ))}
            </div>

            <div className="field full" style={{ marginBottom: 14 }}>
              <label>Pull quote (one memorable line)</label>
              <input
                value={form.pull_quote}
                onChange={(e) => setForm((f) => ({ ...f, pull_quote: e.target.value }))}
                placeholder="Three sarees, fused at the petni, lived as one."
              />
            </div>

            <div className="field full">
              <label>Display order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                placeholder="0"
              />
              <span className="img-hint">Lower numbers appear first in the intro scroll.</span>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete story"
          message={`Delete "${confirm.name}"? This removes it from the storefront intro scroll.`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}
    </>
  )
}
