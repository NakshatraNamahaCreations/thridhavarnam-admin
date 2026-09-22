// Simple, reusable pager. Renders nothing when everything fits on one page.
export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null

  // windowed page numbers (max 7 shown)
  let nums = []
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) nums.push(i)
  } else {
    const set = new Set([1, pages, page, page - 1, page + 1])
    nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  }

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="pagination">
      <span className="pg-info">{from}–{to} of {total}</span>
      <div className="pg-controls">
        <button className="pg-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>‹ Prev</button>
        {nums.map((n, i) => (
          <span key={n}>
            {i > 0 && n - nums[i - 1] > 1 && <span className="pg-gap">…</span>}
            <button className={`pg-num ${n === page ? 'active' : ''}`} onClick={() => onChange(n)}>{n}</button>
          </span>
        ))}
        <button className="pg-btn" disabled={page === pages} onClick={() => onChange(page + 1)}>Next ›</button>
      </div>
    </div>
  )
}
