import { useEffect, useState, useMemo } from 'react'
import { products as productsApi, orders as ordersApi } from '../api/client'
import Pagination from '../components/Pagination'
import { IconStar, IconThumbsUp, IconReply } from '../components/icons'

const PAGE = 6

const TEXTS = [
  'Absolutely stunning! The zari work is exquisite and the colour is exactly as shown. Worth every rupee.',
  "Wore this for my sister's wedding and received so many compliments. The fabric quality is premium.",
  'Beautiful drape and rich colour. Delivery was quick and the packaging was elegant.',
  'Lovely saree, the craftsmanship is top-notch. Will definitely shop here again.',
  'Gorgeous piece — looks even better in person. Highly recommend to everyone.',
  'Elegant and comfortable to wear all day. The border detailing is beautiful.',
]

function Stars({ n, size = 14 }) {
  return (
    <span className="stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <IconStar key={i} size={size} fill={i < Math.round(n) ? '#d4af37' : 'none'} style={{ color: i < Math.round(n) ? '#d4af37' : '#c4c5cd' }} />
      ))}
    </span>
  )
}

export default function Reviews() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    Promise.all([productsApi.list(), ordersApi.list()])
      .then(([products, orders]) => setData({ products, orders }))
      .catch(() => {})
  }, [])

  const s = useMemo(() => {
    if (!data) return null
    const { products, orders } = data
    const byName = Object.fromEntries(products.map((p) => [p.name, p]))
    const reviews = orders.map((o, i) => {
      const prod = byName[o.product]
      const rating = prod ? Math.round(prod.rating || 5) : 5 - (i % 2)
      return {
        id: o.id,
        name: o.customer,
        avatar: o.avatar,
        product: o.product,
        rating,
        date: o.date,
        text: TEXTS[i % TEXTS.length],
        helpful: 8 + ((i * 7) % 22),
      }
    })
    const breakdown = [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }))
    const total = reviews.length || 1
    const avg = reviews.reduce((a, r) => a + r.rating, 0) / total
    const maxCount = Math.max(...breakdown.map((b) => b.count), 1)
    return { reviews, breakdown, total: reviews.length, avg, maxCount }
  }, [data])

  if (!s) return <div className="spinner" />

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
          <div className="rs-big">{s.avg.toFixed(1)}</div>
          <Stars n={s.avg} size={20} />
          <div className="rs-total">{s.total} total reviews</div>
        </div>

        <div className="card card-pad">
          <div className="section-title">Rating Breakdown</div>
          {s.breakdown.map((b) => (
            <div className="rb-row" key={b.star}>
              <span className="rb-star">{b.star} <IconStar size={13} fill="#d4af37" style={{ color: '#d4af37' }} /></span>
              <div className="progress"><span style={{ width: `${(b.count / s.maxCount) * 100}%`, background: 'linear-gradient(90deg,var(--gold-300),var(--gold-500))' }} /></div>
              <span className="rb-count">{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rev-list">
        {s.reviews.slice((page - 1) * PAGE, page * PAGE).map((r) => (
          <div className="card card-pad review-card" key={r.id}>
            <div className="review-head">
              <div className="person">
                <div className="avatar">{r.avatar}</div>
                <div>
                  <div className="p-name">{r.name}</div>
                  <div className="p-sub">on {r.product}</div>
                </div>
              </div>
              <div className="review-meta">
                <Stars n={r.rating} />
                <div className="p-sub">{r.date}</div>
              </div>
            </div>
            <p className="review-text">{r.text}</p>
            <div className="review-actions">
              <button className="rev-act"><IconThumbsUp size={15} /> Helpful ({r.helpful})</button>
              <button className="rev-act"><IconReply size={15} /> Reply</button>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} pageSize={PAGE} total={s.reviews.length} onChange={setPage} />
    </>
  )
}
