import { useEffect, useState, useMemo } from 'react'
import { reviews as api, products as productsApi } from '../api/client'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import Pagination from '../components/Pagination'
import { IconStar, IconTrash } from '../components/icons'

const PAGE = 6

function Stars({ n, size = 14 }) {
  return (
    <span className="stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <IconStar
          key={i}
          size={size}
          fill={i < Math.round(n) ? '#d4af37' : 'none'}
          style={{ color: i < Math.round(n) ? '#d4af37' : '#c4c5cd' }}
        />
      ))}
    </span>
  )
}

// First-two-initials avatar from a display name. Falls back to '·' when
// the name is missing so the avatar circle is never empty.
function initials(name) {
  if (!name) return '·'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Reviews() {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [productNameById, setProductNameById] = useState({})
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => api.list().then(setRows).catch((e) => toast.bad(e.message))

  useEffect(() => {
    load()
    // Product names so we can show them alongside each review — the
    // review record only carries productId.
    productsApi
      .list()
      .then((ps) => {
        const map = {}
        ps.forEach((p) => { map[p.id] = p.name || p.id })
        setProductNameById(map)
      })
      .catch(() => {})
  }, [])

  const stats = useMemo(() => {
    if (!rows) return null
    const breakdown = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: rows.filter((r) => Math.round(r.rating) === star).length,
    }))
    const total = rows.length
    const avg = total ? rows.reduce((a, r) => a + (r.rating || 0), 0) / total : 0
    const maxCount = Math.max(...breakdown.map((b) => b.count), 1)
    return { breakdown, total, avg, maxCount }
  }, [rows])

  async function doDelete() {
    setBusy(true)
    try {
      await api.remove(confirm.id)
      toast.ok('Review deleted')
      setConfirm(null)
      load()
    } catch (e) {
      toast.bad(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (!rows || !stats) return <div className="spinner" />

  const pageRows = rows.slice((page - 1) * PAGE, page * PAGE)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reviews &amp; Ratings</h1>
          <p>What your customers are saying</p>
        </div>
      </div>

      <div className="grid-2b" style={{ marginBottom: 20 }}>
        <div className="card rating-summary">
          <div className="rs-big">{stats.avg.toFixed(1)}</div>
          <Stars n={stats.avg} size={20} />
          <div className="rs-total">{stats.total} total review{stats.total === 1 ? '' : 's'}</div>
        </div>

        <div className="card card-pad">
          <div className="section-title">Rating Breakdown</div>
          {stats.breakdown.map((b) => (
            <div className="rb-row" key={b.star}>
              <span className="rb-star">
                {b.star}{' '}
                <IconStar size={13} fill="#d4af37" style={{ color: '#d4af37' }} />
              </span>
              <div className="progress">
                <span
                  style={{
                    width: `${(b.count / stats.maxCount) * 100}%`,
                    background: 'linear-gradient(90deg,var(--gold-300),var(--gold-500))',
                  }}
                />
              </div>
              <span className="rb-count">{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="em-ico">💬</div>
            <p>No reviews yet</p>
          </div>
        </div>
      ) : (
        <>
          <div className="rev-list">
            {pageRows.map((r) => (
              <div className="card card-pad review-card" key={r.id}>
                <div className="review-head">
                  <div className="person">
                    <div className="avatar">{initials(r.name)}</div>
                    <div>
                      <div className="p-name">{r.name}</div>
                      <div className="p-sub">
                        on {productNameById[r.productId] || r.productId}
                      </div>
                    </div>
                  </div>
                  <div className="review-meta">
                    <Stars n={r.rating} />
                    <div className="p-sub">{formatDate(r.createdAt)}</div>
                  </div>
                </div>
                {r.comment && <p className="review-text">{r.comment}</p>}
                <div className="review-actions">
                  <button
                    className="rev-act"
                    onClick={() => setConfirm(r)}
                    style={{ color: '#75001F' }}
                  >
                    <IconTrash size={15} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE} total={rows.length} onChange={setPage} />
        </>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete review"
          message={`Delete this review from ${confirm.name}? This can't be undone.`}
          onConfirm={doDelete}
          onClose={() => setConfirm(null)}
          busy={busy}
        />
      )}
    </>
  )
}
