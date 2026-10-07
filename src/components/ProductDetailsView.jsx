import { inr, productStatusClass, productStatusLabel } from '../lib/format'
import { isImageSrc } from '../lib/image'
import { IconStar } from './icons'

// Read-only product (saree) details view. Used from the Sarees page card
// click and the Inventory row click so both surfaces show the same
// comprehensive record the admin entered on registration.
export default function ProductDetailsView({ p }) {
  const images = Array.isArray(p.images) && p.images.length
    ? p.images.filter((img) => img && isImageSrc(img.url))
    : (isImageSrc(p.image) ? [{ url: p.image, color: p.color || '' }] : [])

  const detailRows = [
    ['Style No', p.styleNo],
    ['Design No', p.designNo],
    ['Weave', p.weave],
    ['Region', p.region],
    ['Length', p.length],
    ['Blouse', p.blouse],
    ['Zari', p.zari],
    ['Weight', p.weight],
    ['Pack contains', p.packContains],
    ['Manufactured', p.manufactured],
  ].filter(([, v]) => v && String(v).trim())

  const flagLabel = { bestseller: 'Bestseller', new_in: 'New in', sale: 'Sale' }
  const badgeLabel = { ready: 'Ready to ship', fast: 'Selling fast', last: 'Last chance', silk: 'Silk tag' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          {images.map((img, i) => (
            <div key={i} style={{
              aspectRatio: '3 / 4',
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              position: 'relative',
            }}>
              <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {img.color && (
                <span style={{
                  position: 'absolute', bottom: 4, left: 4, right: 4,
                  background: 'rgba(0,0,0,0.6)', color: '#fff',
                  fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                  textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3,
                }}>
                  {img.color}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <StatBox label="Status">
          <span className={`badge ${productStatusClass[p.status] || 'grey'}`}>
            {productStatusLabel[p.status] || p.status || '—'}
          </span>
        </StatBox>
        <StatBox label="Selling price">
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink-900)' }}>
            {inr(p.price)}
            {p.mrp > p.price && (
              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--ink-400)', textDecoration: 'line-through', fontWeight: 500 }}>
                {inr(p.mrp)}
              </span>
            )}
          </div>
        </StatBox>
        <StatBox label="Stock">
          <div style={{ fontWeight: 700, color: p.stock === 0 ? 'var(--red)' : p.stock <= 5 ? 'var(--amber)' : 'var(--green)' }}>
            {p.stock} in stock
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>{p.sold || 0} sold</div>
        </StatBox>
        <StatBox label="Rating">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
            <IconStar size={14} /> {p.rating || '—'}
          </div>
        </StatBox>
      </div>

      <DetailBlock title="Catalogue">
        <KV k="Category" v={p.category} />
        <KV k="Occasion" v={p.occasion} />
        <KV k="Colour" v={p.color} />
      </DetailBlock>

      {(p.flags?.length > 0 || p.badges?.length > 0) && (
        <DetailBlock title="Storefront tags">
          {p.flags?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {p.flags.map((f) => (
                <span key={f} className="badge maroon">{flagLabel[f] || f}</span>
              ))}
            </div>
          )}
          {p.badges?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {p.badges.map((b) => (
                <span key={b} className="badge gold">{badgeLabel[b] || b}</span>
              ))}
            </div>
          )}
        </DetailBlock>
      )}

      {p.description && (
        <DetailBlock title="Description">
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-700)', whiteSpace: 'pre-wrap' }}>
            {p.description}
          </p>
        </DetailBlock>
      )}

      {detailRows.length > 0 && (
        <DetailBlock title="Product details">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {detailRows.map(([k, v]) => <KV key={k} k={k} v={v} />)}
          </div>
        </DetailBlock>
      )}

      {p.story && <DetailBlock title="Product speciality"><Prose text={p.story} /></DetailBlock>}
      {p.styleTips && <DetailBlock title="Style tips"><Prose text={p.styleTips} /></DetailBlock>}
      {p.fitTips && <DetailBlock title="Fit tips"><Prose text={p.fitTips} /></DetailBlock>}
      {p.shippingReturns && <DetailBlock title="Shipping & returns"><Prose text={p.shippingReturns} /></DetailBlock>}

      {Array.isArray(p.faqs) && p.faqs.filter((f) => f && (f.q || f.a)).length > 0 && (
        <DetailBlock title="FAQs">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {p.faqs.filter((f) => f && (f.q || f.a)).map((f, i) => (
              <div key={i} style={{ borderLeft: '3px solid var(--maroon-200)', paddingLeft: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-900)' }}>{f.q || '—'}</div>
                {f.a && (
                  <div style={{ fontSize: 13, color: 'var(--ink-600)', lineHeight: 1.55, marginTop: 2, whiteSpace: 'pre-wrap' }}>
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DetailBlock>
      )}
    </div>
  )
}

function StatBox({ label, children }) {
  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: 8,
      border: '1px solid var(--border)',
      background: 'var(--surface-2)',
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--ink-400)' }}>
        {label}
      </div>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  )
}

function DetailBlock({ title, children }) {
  return (
    <div>
      <div style={{
        fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
        color: 'var(--maroon-700)', marginBottom: 8,
      }}>
        {title}
      </div>
      <div>{children}</div>
    </div>
  )
}

function KV({ k, v }) {
  if (!v) return null
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--ink-400)' }}>
        {k}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink-800)', marginTop: 2 }}>{String(v)}</div>
    </div>
  )
}

function Prose({ text }) {
  return (
    <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink-700)', whiteSpace: 'pre-wrap' }}>
      {text}
    </p>
  )
}
