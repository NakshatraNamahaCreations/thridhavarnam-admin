import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { products as api, categories as catApi, occasions as occApi, colorways as colorApi } from '../api/client'
import { inr, productStatusClass, productStatusLabel } from '../lib/format'
import { isImageSrc, uploadImage } from '../lib/image'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import ColorSelect from '../components/ColorSelect'
import { IconLayers, IconPlus, IconSearch, IconStar, IconPencil, IconTrash, IconUpload } from '../components/icons'

const EMPTY = {
  name: '', category: '', occasion: '', color: '', description: '',
  price: '', mrp: '', stock: '', status: 'active', badges: [], flags: [], image: '🥻', images: [],
  // Product Details section (accordion row 1 on storefront).
  // `weave` maps to the storefront's "Work" column.
  styleNo: '', designNo: '',
  weave: '', region: '', length: '', blouse: '', zari: '', weight: '',
  packContains: '', manufactured: '',
  // Product Speciality (row 2)
  story: '',
  // Style & Fit Tips (row 3)
  styleTips: '', fitTips: '',
  // Shipping & Returns (row 4) — free-form, newline-separated paragraphs
  shippingReturns: '',
  // FAQs (row 5)
  faqs: [],
}
const PAGE = 6

const BADGES = [
  { key: 'ready', label: 'Ready to ship' },
  { key: 'fast', label: 'Selling fast' },
  { key: 'last', label: 'Last chance' },
]

const FLAGS = [
  { key: 'bestseller', label: 'Bestseller' },
  { key: 'new_in', label: 'New in' },
  { key: 'sale', label: 'Sale' },
]

export default function Products() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [cats, setCats] = useState([])
  const [occs, setOccs] = useState([])
  const [colorList, setColorList] = useState([])
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null)

  // Bulk-add modal state. `csv` holds the raw pasted / uploaded text;
  // `parsed` is the derived table shown in the preview. Kept separate
  // so the paste box stays reactive without re-parsing on every render.
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkCsv, setBulkCsv] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [page, setPage] = useState(1)
  const [searchParams, setSearchParams] = useSearchParams()

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))
  useEffect(() => {
    load()
    catApi.list().then(setCats).catch(() => {})
    occApi.list().then(setOccs).catch(() => {})
    colorApi.list().then(setColorList).catch(() => {})
  }, [])
  useEffect(() => { setPage(1) }, [q, catFilter])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setForm(EMPTY)
      setEditing({})
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filtered = useMemo(() => {
    if (!rows) return []
    return rows.filter((p) => {
      if (catFilter !== 'all' && p.category !== catFilter) return false
      if (q && !`${p.name} ${p.color} ${p.weave} ${p.id}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [rows, q, catFilter])
  const paged = filtered.slice((page - 1) * PAGE, page * PAGE)

  // Multi-file upload. Each selected file goes to Cloudinary via an
  // unsigned preset; we keep only the returned secure_url on the product.
  // The first entry doubles as the primary hero (kept in `image` too for
  // legacy list rendering). Newly-uploaded images inherit the current
  // product colour so the admin only needs to change entries whose
  // variant differs. Any file that fails to upload is skipped with a
  // toast — the successful ones still land in the gallery.
  async function onFile(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const results = await Promise.allSettled(files.map((file) => uploadImage(file)))
    const urls = []
    const failures = []
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') urls.push(r.value)
      else failures.push({ name: files[i]?.name || 'image', reason: r.reason?.message || 'upload failed' })
    })
    if (urls.length) {
      setForm((f) => {
        const entries = urls.map((url) => ({ url, color: f.color || '' }))
        const images = [...(f.images || []), ...entries].slice(0, 12)
        return { ...f, images, image: images[0]?.url || '🥻' }
      })
      toast.ok(`Uploaded ${urls.length} image${urls.length === 1 ? '' : 's'}`)
    }
    failures.forEach((f) => toast.bad(`${f.name}: ${f.reason}`))
    e.target.value = ''
  }

  function removeImage(i) {
    setForm((f) => {
      const images = (f.images || []).filter((_, idx) => idx !== i)
      return { ...f, images, image: images[0]?.url || '🥻' }
    })
  }

  function makePrimary(i) {
    setForm((f) => {
      const src = f.images || []
      if (i <= 0 || i >= src.length) return f
      const images = [src[i], ...src.filter((_, idx) => idx !== i)]
      return { ...f, images, image: images[0]?.url || '🥻' }
    })
  }

  function setImageColor(i, value) {
    setForm((f) => {
      const images = [...(f.images || [])]
      if (!images[i]) return f
      images[i] = { ...images[i], color: value }
      return { ...f, images }
    })
  }

  function openNew() { setForm(EMPTY); setEditing({}) }
  function openEdit(p) {
    // Normalise legacy shapes into the new {url, color} object form so the
    // gallery UI stays consistent regardless of what the backend returned.
    const raw = Array.isArray(p.images) ? p.images.filter(Boolean) : []
    let images = raw.map((entry) =>
      typeof entry === 'string'
        ? { url: entry, color: '' }
        : { url: entry.url || '', color: entry.color || '' },
    )
    if (!images.length && p.image && p.image !== '🥻') {
      images = [{ url: p.image, color: p.color || '' }]
    }
    setForm({
      ...EMPTY,
      ...p,
      price: p.price ?? '',
      mrp: p.mrp ?? '',
      stock: p.stock ?? '',
      badges: Array.isArray(p.badges) ? p.badges.filter((b) => BADGES.some((x) => x.key === b)) : [],
      flags: Array.isArray(p.flags) ? p.flags.filter((f) => FLAGS.some((x) => x.key === f)) : [],
      images,
      image: images[0]?.url || p.image || '🥻',
      faqs: Array.isArray(p.faqs) ? p.faqs.map((f) => ({ q: f.q || '', a: f.a || '' })) : [],
    })
    setEditing(p)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.bad('Saree name is required')
    setSaving(true)
    try {
      const images = (form.images || [])
        .map((e) => ({ url: (e?.url || '').trim(), color: (e?.color || '').trim() }))
        .filter((e) => e.url && e.url !== '🥻')
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        mrp: Number(form.mrp) || 0,
        stock: Number(form.stock) || 0,
        images,
        image: images[0]?.url || '🥻',
        faqs: (form.faqs || [])
          .map((f) => ({ q: (f.q || '').trim(), a: (f.a || '').trim() }))
          .filter((f) => f.q || f.a),
      }
      if (editing.id) { await api.update(editing.id, payload); toast.ok('Saree updated') }
      else { await api.create(payload); toast.ok('Saree added') }
      setEditing(null); load()
    } catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  function setFaq(i, key, value) {
    setForm((f) => {
      const faqs = [...(f.faqs || [])]
      faqs[i] = { ...faqs[i], [key]: value }
      return { ...f, faqs }
    })
  }
  function addFaq() { setForm((f) => ({ ...f, faqs: [...(f.faqs || []), { q: '', a: '' }] })) }
  function removeFaq(i) {
    setForm((f) => ({ ...f, faqs: (f.faqs || []).filter((_, idx) => idx !== i) }))
  }

  async function doDelete() {
    setSaving(true)
    try { await api.remove(confirm.id); toast.ok('Saree deleted'); setConfirm(null); load() }
    catch (e) { toast.bad(e.message) } finally { setSaving(false) }
  }

  // Parse a CSV string into an array of product objects. First row must
  // be the header; comma-separated with basic quoted-value handling so
  // fields containing commas can be double-quoted. Returns { items,
  // errors } — errors is a list of human-readable warnings for skipped
  // or malformed rows so the admin knows what didn't make it in.
  const parseBulkCsv = (raw) => {
    const text = String(raw || '').trim()
    if (!text) return { items: [], errors: ['No CSV content'] }
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) return { items: [], errors: ['CSV must have a header row and at least one data row'] }

    const parseLine = (line) => {
      const out = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (inQuotes) {
          if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
          else if (c === '"') inQuotes = false
          else cur += c
        } else {
          if (c === '"') inQuotes = true
          else if (c === ',') { out.push(cur); cur = '' }
          else cur += c
        }
      }
      out.push(cur)
      return out.map((s) => s.trim())
    }

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase())
    const errors = []
    const items = []

    for (let r = 1; r < lines.length; r++) {
      const cells = parseLine(lines[r])
      const row = {}
      headers.forEach((h, i) => { row[h] = cells[i] ?? '' })
      if (!row.name) { errors.push(`Row ${r + 1}: missing name — skipped`); continue }

      const item = {
        name: row.name,
        category: row.category || '',
        occasion: row.occasion || '',
        color: row.color || '',
        weave: row.weave || '',
        region: row.region || '',
        description: row.description || '',
        price: row.price ? Number(row.price) : 0,
        mrp: row.mrp ? Number(row.mrp) : 0,
        stock: row.stock ? Number(row.stock) : 0,
        status: row.status || 'active',
      }
      // Flags can be pipe- or slash-separated inside a single cell
      // (comma would collide with CSV column separators).
      if (row.flags) {
        item.flags = row.flags.split(/[|/]/).map((s) => s.trim()).filter(Boolean)
      }
      items.push(item)
    }
    return { items, errors }
  }

  const bulkParsed = parseBulkCsv(bulkCsv)

  async function onBulkFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      setBulkCsv(text)
    } catch (err) {
      toast.bad(err.message || 'Could not read file')
    } finally {
      e.target.value = ''
    }
  }

  async function submitBulk() {
    const { items, errors } = bulkParsed
    if (!items.length) {
      return toast.bad(errors[0] || 'Nothing to import')
    }
    setBulkBusy(true)
    try {
      await api.bulk(items)
      toast.ok(`Imported ${items.length} saree${items.length === 1 ? '' : 's'}`)
      setBulkOpen(false)
      setBulkCsv('')
      load()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setBulkBusy(false)
    }
  }

  // Sample CSV shown as a placeholder inside the paste box + as the
  // downloadable template. Keep column names in sync with parseBulkCsv.
  const SAMPLE_CSV = 'name,category,occasion,color,weave,region,price,mrp,stock,description,flags\nMallika Mysore,silk,festive,green,Mysore Silk,Mysuru,14799,17999,4,"Handloom Mysore silk with gold zari border",new_in|bestseller\nRoyal Kanjivaram,silk,bridal,maroon,Kanjivaram,Kanchipuram,32000,42000,2,"Bridal Kanjivaram with peacock motifs",bestseller'

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggleBadge = (key) => setForm((f) => {
    const has = (f.badges || []).includes(key)
    return { ...f, badges: has ? f.badges.filter((b) => b !== key) : [...(f.badges || []), key] }
  })
  const toggleFlag = (key) => setForm((f) => {
    const has = (f.flags || []).includes(key)
    return { ...f, flags: has ? f.flags.filter((x) => x !== key) : [...(f.flags || []), key] }
  })
  const chips = [{ id: 'all', name: 'All' }, ...cats]

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sarees</h1>
          <p>{rows ? `${rows.length} products in your catalogue` : 'Loading catalogue…'}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={() => { setBulkCsv(''); setBulkOpen(true) }}><IconLayers size={17} /> Bulk Add</button>
          <button className="btn btn-primary" onClick={openNew}><IconPlus size={18} /> Add Saree</button>
        </div>
      </div>

      <div className="card filter-bar">
        <div className="search-box grow">
          <IconSearch size={18} />
          <input placeholder="Search by name or SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="chips">
          {chips.map((c) => (
            <button key={c.id} className={`chip ${catFilter === c.id ? 'active' : ''}`} onClick={() => setCatFilter(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {!rows ? <div className="spinner" /> : filtered.length === 0 ? (
        <div className="card"><div className="empty"><div className="em-ico">🥻</div><p>No sarees found</p></div></div>
      ) : (
        <>
          <div className="prod-grid">
          {paged.map((p) => (
            <div className="prod-card" key={p.id}>
              <div className="pc-media">
                <span className="pc-sku">{p.id}</span>
                <span className={`badge ${productStatusClass[p.status] || 'grey'} pc-status`}>{productStatusLabel[p.status] || p.status}</span>
                {isImageSrc(p.image)
                  ? <img className="pc-img" src={p.image} alt={p.name} />
                  : <div className="pc-emoji">{p.image || '🥻'}</div>}
              </div>
              <div className="pc-body">
                <div className="pc-title">
                  <h3>{p.name}</h3>
                  <span className="rating"><IconStar size={12} /> {p.rating || '—'}</span>
                </div>
                <div className="pc-meta">{[p.weave, p.color].filter(Boolean).join(' · ')}</div>
                <p className="pc-desc">{p.description}</p>
                <div className="pc-price">
                  <div>
                    <span className="pc-now">{inr(p.price)}</span>
                    {p.mrp > p.price && <span className="pc-mrp">{inr(p.mrp)}</span>}
                  </div>
                  <div className="pc-stock">
                    <div className={p.stock === 0 ? 'red' : p.stock <= 5 ? 'amber' : 'green'}>{p.stock} in stock</div>
                    <div className="pc-sold">{p.sold || 0} sold</div>
                  </div>
                </div>
                <div className="pc-actions">
                  <button className="btn btn-outline pc-edit" onClick={() => openEdit(p)}><IconPencil size={15} /> Edit</button>
                  <button className="icon-btn danger" title="Delete" onClick={() => setConfirm(p)}><IconTrash size={16} /></button>
                </div>
              </div>
            </div>
          ))}
          </div>
          <Pagination page={page} pageSize={PAGE} total={filtered.length} onChange={setPage} />
        </>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit Saree' : 'Add Saree'}
          subtitle={editing.id ? editing.id : 'Add a new product to your catalogue'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : editing.id ? 'Save changes' : 'Add Saree'}</button>
            </>
          }
        >
          <form onSubmit={save}>
            <div className="field full">
              <label>Saree images</label>
              <div className="img-gallery">
                {(form.images || []).map((entry, i) => (
                  <div className={`img-tile ${i === 0 ? 'primary' : ''}`} key={i}>
                    <div className="img-tile-media">
                      {isImageSrc(entry.url)
                        ? <img src={entry.url} alt={`image ${i + 1}`} />
                        : <span className="img-tile-fallback">{entry.url || '🥻'}</span>}
                      {i === 0 && <span className="img-tile-badge">Primary</span>}
                      <div className="img-tile-actions">
                        {i !== 0 && (
                          <button
                            type="button"
                            className="img-tile-btn"
                            title="Make primary"
                            onClick={() => makePrimary(i)}
                          >
                            Set primary
                          </button>
                        )}
                        <button
                          type="button"
                          className="img-tile-btn danger"
                          title="Remove image"
                          onClick={() => removeImage(i)}
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    </div>
                    <ColorSelect
                      className="img-tile-color-select"
                      value={entry.color || ''}
                      options={colorList}
                      onChange={(v) => setImageColor(i, v)}
                      placeholder="Colour"
                    />
                  </div>
                ))}
                <label className="img-add">
                  <IconUpload size={18} />
                  <span>Add images</span>
                  <input
                    className="img-file"
                    type="file"
                    accept="image/png,image/jpeg"
                    multiple
                    onChange={onFile}
                  />
                </label>
              </div>
              <span className="img-hint">
                PNG / JPG · auto-resized · first image is the primary hero (up to 12 total).
                Tag each image with a colour so variants group correctly on the storefront.
              </span>
            </div>

            <div className="field full">
              <label>Saree name</label>
              <input value={form.name} onChange={set('name')} placeholder="e.g. Royal Kanjivaram Silk" autoFocus />
            </div>

            {/* Description hidden for now — re-enable when needed on storefront.
            <div className="field full">
              <label>Description</label>
              <textarea value={form.description} onChange={set('description')} placeholder="Short blurb for the product card and listings." />
            </div>
            */}

            <div className="form-grid form-grid-3">
              <div className="field">
                <label>Selling price (₹)</label>
                <input type="number" value={form.price} onChange={set('price')} placeholder="18999" />
              </div>
              <div className="field">
                <label>MRP (₹)</label>
                <input type="number" value={form.mrp} onChange={set('mrp')} placeholder="24999" />
              </div>
              <div className="field">
                <label>Stock</label>
                <input type="number" value={form.stock} onChange={set('stock')} placeholder="12" />
              </div>
            </div>

            <div className="field full">
              <label>Status</label>
              <select value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="out_of_stock">Out of stock</option>
              </select>
            </div>

            <div className="field full">
              <label>Badges</label>
              <div className="badge-picker">
                {BADGES.map((b) => {
                  const on = (form.badges || []).includes(b.key)
                  return (
                    <button
                      type="button"
                      key={b.key}
                      className={`badge-chip ${on ? 'active' : ''}`}
                      onClick={() => toggleBadge(b.key)}
                    >
                      {b.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="field full">
              <label>Featured in</label>
              <div className="badge-picker">
                {FLAGS.map((f) => {
                  const on = (form.flags || []).includes(f.key)
                  return (
                    <button
                      type="button"
                      key={f.key}
                      className={`badge-chip ${on ? 'active' : ''}`}
                      onClick={() => toggleFlag(f.key)}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
             
            </div>

            <h4 className="form-section">Product Details</h4>
            
            <div className="form-grid">
              <div className="field">
                <label>Style No</label>
                <input value={form.styleNo} onChange={set('styleNo')} placeholder="e.g. KANJIVARAM-MAYURA" />
              </div>
              <div className="field">
                <label>Design No</label>
                <input value={form.designNo} onChange={set('designNo')} placeholder="e.g. BRI36500" />
              </div>
              <div className="field">
                <label>Color</label>
                <ColorSelect
                  value={form.color}
                  options={colorList}
                  onChange={(v) => setForm((f) => ({ ...f, color: v }))}
                  placeholder="Select colour"
                />
              </div>
              <div className="field">
                <label>Work</label>
                <input value={form.weave} onChange={set('weave')} placeholder="e.g. Kanjivaram" />
              </div>
              <div className="field">
                <label>Region</label>
                <input value={form.region} onChange={set('region')} placeholder="e.g. Kanchipuram, Tamil Nadu" />
              </div>
              <div className="field">
                <label>Category</label>
                <select value={form.category} onChange={set('category')}>
                  <option value="">Select…</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Occasion</label>
                <select value={form.occasion} onChange={set('occasion')}>
                  <option value="">Select…</option>
                  {occs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Length</label>
                <input value={form.length} onChange={set('length')} placeholder="e.g. 6.3 m" />
              </div>
              <div className="field">
                <label>Blouse</label>
                <input value={form.blouse} onChange={set('blouse')} placeholder="e.g. 0.8 m contrast blouse" />
              </div>
              <div className="field">
                <label>Zari</label>
                <input value={form.zari} onChange={set('zari')} placeholder="e.g. Pure silver-coated gold thread" />
              </div>
              <div className="field">
                <label>Weight</label>
                <input value={form.weight} onChange={set('weight')} placeholder="e.g. 820 g" />
              </div>
              <div className="field">
                <label>Pack Contains</label>
                <input value={form.packContains} onChange={set('packContains')} placeholder="e.g. 1 Saree, 1 Unstitched Blouse Fabric" />
              </div>
              <div className="field">
                <label>Manufactured</label>
                <input value={form.manufactured} onChange={set('manufactured')} placeholder="e.g. Thridha Varnam Pvt Ltd, Bengaluru" />
              </div>
            </div>

            <h4 className="form-section">Product Speciality</h4>
            <div className="field full">
              <label>Story</label>
              <textarea
                value={form.story}
                onChange={set('story')}
                placeholder="One paragraph on what makes this saree special — weave heritage, motif, occasion…"
              />
            </div>

            <h4 className="form-section">Style &amp; Fit Tips</h4>
            <div className="field full">
              <label>Style tips</label>
              <textarea
                value={form.styleTips}
                onChange={set('styleTips')}
                placeholder="Jewellery pairings, blouse cuts, footwear cues…"
              />
            </div>
            <div className="field full">
              <label>Fit tips</label>
              <textarea
                value={form.fitTips}
                onChange={set('fitTips')}
                placeholder="Pallu drape, pleat length, petticoat shade…"
              />
            </div>

            <h4 className="form-section">Shipping &amp; Returns</h4>
            <div className="field full">
              <label>Shipping &amp; returns copy</label>
              <textarea
                value={form.shippingReturns}
                onChange={set('shippingReturns')}
                placeholder="Return window, condition requirements, delivery estimate… Separate paragraphs with a blank line."
                rows={5}
              />
            </div>

            <h4 className="form-section">FAQs</h4>
            <p className="form-section-hint">
              Question / answer pairs shown at the bottom of the product page.
            </p>
            <div className="faq-editor">
              {(form.faqs || []).map((faq, i) => (
                <div className="faq-row" key={i}>
                  <div className="faq-head">
                    <span className="faq-idx">#{i + 1}</span>
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Remove FAQ"
                      onClick={() => removeFaq(i)}
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                  <div className="field full">
                    <label>Question</label>
                    <input
                      value={faq.q}
                      onChange={(e) => setFaq(i, 'q', e.target.value)}
                      placeholder="e.g. Can I customise the blouse?"
                    />
                  </div>
                  <div className="field full">
                    <label>Answer</label>
                    <textarea
                      value={faq.a}
                      onChange={(e) => setFaq(i, 'a', e.target.value)}
                      placeholder="Answer shown when the shopper expands this FAQ."
                    />
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-outline btn-sm" onClick={addFaq}>
                <IconPlus size={15} /> Add FAQ
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete saree"
          message={`Delete "${confirm.name}" (${confirm.id})? This cannot be undone.`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={saving}
        />
      )}

      {bulkOpen && (
        <Modal
          title="Bulk add sarees"
          subtitle="Paste CSV rows or upload a .csv file — one saree per row"
          onClose={() => { if (!bulkBusy) setBulkOpen(false) }}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setBulkOpen(false)} disabled={bulkBusy}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={submitBulk}
                disabled={bulkBusy || bulkParsed.items.length === 0}
              >
                {bulkBusy ? 'Importing…' : `Import ${bulkParsed.items.length} saree${bulkParsed.items.length === 1 ? '' : 's'}`}
              </button>
            </>
          }
        >
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: '#36363e', lineHeight: 1.5, margin: 0 }}>
              Header row is required. Supported columns: <code>name</code> (required),
              {' '}<code>category</code>, <code>occasion</code>, <code>color</code>,{' '}
              <code>weave</code>, <code>region</code>, <code>price</code>, <code>mrp</code>,{' '}
              <code>stock</code>, <code>description</code>, <code>status</code>, <code>flags</code>.
              Wrap values containing commas in double quotes. Flags are separated by <code>|</code>{' '}
              (e.g. <code>new_in|bestseller</code>).
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <label className="btn btn-outline" style={{ cursor: 'pointer', fontSize: 12 }}>
              Upload .csv
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={onBulkFile}
                disabled={bulkBusy}
                style={{ display: 'none' }}
              />
            </label>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: 12 }}
              onClick={() => setBulkCsv(SAMPLE_CSV)}
              disabled={bulkBusy}
            >
              Load sample rows
            </button>
            {bulkCsv && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: 12, color: '#75001F', borderColor: '#75001F' }}
                onClick={() => setBulkCsv('')}
                disabled={bulkBusy}
              >
                Clear
              </button>
            )}
          </div>

          <div className="field full" style={{ marginBottom: 12 }}>
            <label>CSV</label>
            <textarea
              value={bulkCsv}
              onChange={(e) => setBulkCsv(e.target.value)}
              rows={10}
              placeholder={SAMPLE_CSV}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
              disabled={bulkBusy}
            />
          </div>

          {(bulkParsed.items.length > 0 || bulkParsed.errors.length > 0) && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Preview — {bulkParsed.items.length} valid row{bulkParsed.items.length === 1 ? '' : 's'}
                {bulkParsed.errors.length > 0 && (
                  <span style={{ color: '#75001F', marginLeft: 8, fontWeight: 500 }}>
                    · {bulkParsed.errors.length} skipped
                  </span>
                )}
              </div>
              {bulkParsed.items.length > 0 && (
                <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid #e5e5ea', borderRadius: 6 }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f7f7fa' }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '6px 10px' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '6px 10px' }}>Category</th>
                        <th style={{ textAlign: 'left', padding: '6px 10px' }}>Weave</th>
                        <th style={{ textAlign: 'right', padding: '6px 10px' }}>Price</th>
                        <th style={{ textAlign: 'right', padding: '6px 10px' }}>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkParsed.items.slice(0, 20).map((it, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #eee' }}>
                          <td style={{ padding: '6px 10px' }}>{it.name}</td>
                          <td style={{ padding: '6px 10px', color: '#616373' }}>{it.category || '—'}</td>
                          <td style={{ padding: '6px 10px', color: '#616373' }}>{it.weave || '—'}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right' }}>{it.price ? inr(it.price) : '—'}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right' }}>{it.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bulkParsed.items.length > 20 && (
                    <div style={{ padding: '6px 10px', fontSize: 11, color: '#8a8b96', textAlign: 'center' }}>
                      + {bulkParsed.items.length - 20} more…
                    </div>
                  )}
                </div>
              )}
              {bulkParsed.errors.length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: '#75001F', fontSize: 12 }}>
                  {bulkParsed.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
