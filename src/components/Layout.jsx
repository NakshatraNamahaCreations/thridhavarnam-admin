import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import ConfirmDialog from './ConfirmDialog'
import { useAuth } from '../context/AuthContext'
import { orders as ordersApi, enquiries as enquiriesApi } from '../api/client'
import { initials } from '../lib/format'
import { IconSearch, IconPlus, IconBell, IconLogout } from './icons'

// How often the topbar re-fetches enquiries so a new storefront submission
// surfaces as a bell notification without the admin reloading the page.
const ENQUIRY_POLL_MS = 60_000

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(diff) || diff < 0) return ''
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [pending, setPending] = useState(0)
  // Sign-out confirmation — gates both logout triggers (account menu +
  // standalone logout button) so an accidental click doesn't drop the
  // admin's session mid-task.
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const requestSignOut = () => { setMenuOpen(false); setConfirmSignOut(true) }
  // Enquiries with status === 'new'. The bell shows the count + a short
  // dropdown preview; clicking a row jumps to /enquiry.
  const [newEnquiries, setNewEnquiries] = useState([])

  useEffect(() => {
    ordersApi.list()
      .then((os) => setPending(os.filter((o) => ['pending', 'processing'].includes(o.status)).length))
      .catch(() => {})
  }, [])

  // Poll enquiries so the bell reflects storefront submissions landing while
  // the admin keeps the panel open. Immediate fetch on mount, then every
  // ENQUIRY_POLL_MS. Cleanup clears the interval on unmount / logout.
  useEffect(() => {
    let cancelled = false
    const load = () => {
      enquiriesApi.list()
        .then((rows) => {
          if (cancelled) return
          const news = (rows || [])
            .filter((e) => e.status === 'new')
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          setNewEnquiries(news)
        })
        .catch(() => {})
    }
    load()
    const id = setInterval(load, ENQUIRY_POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const openEnquiry = () => {
    setBellOpen(false)
    nav('/enquiry')
  }

  return (
    <div className="app-shell">
      <Sidebar open={open} onNavigate={() => setOpen(false)} pendingCount={pending} />
      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}
      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn hamburger" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation">☰</button>

          <div className="topbar-search">
            <IconSearch size={18} />
            <input placeholder="Search sarees, orders, customers…" />
          </div>

          <div className="spacer" />

          <button className="btn btn-primary btn-pill topbar-add" onClick={() => nav('/products?new=1')}>
            <IconPlus size={18} /> <span className="topbar-add-label">Add Saree</span>
          </button>

          <div className="topbar-notif">
            <button
              className="topbar-bell"
              title={newEnquiries.length ? `${newEnquiries.length} new enquiry${newEnquiries.length === 1 ? '' : ''}` : 'Notifications'}
              onClick={() => setBellOpen((b) => !b)}
              aria-label="Notifications"
            >
              <IconBell size={20} />
              {newEnquiries.length > 0 && (
                <span className="bell-count">
                  {newEnquiries.length > 99 ? '99+' : newEnquiries.length}
                </span>
              )}
            </button>
            {bellOpen && (
              <>
                <div className="menu-scrim" onClick={() => setBellOpen(false)} />
                <div className="notif-menu card">
                  <div className="notif-head">
                    <div className="notif-head-t">Notifications</div>
                    <div className="notif-head-s">
                      {newEnquiries.length
                        ? `${newEnquiries.length} new enquir${newEnquiries.length === 1 ? 'y' : 'ies'}`
                        : "You're all caught up"}
                    </div>
                  </div>
                  {newEnquiries.length === 0 ? (
                    <div className="notif-empty">
                      No new enquiries right now.
                    </div>
                  ) : (
                    <>
                      <ul className="notif-list">
                        {newEnquiries.slice(0, 5).map((e) => (
                          <li key={e._id || e.ref}>
                            <button type="button" className="notif-row" onClick={openEnquiry}>
                              <span className="notif-dot" />
                              <div className="notif-row-body">
                                <div className="notif-row-t">
                                  New enquiry from {e.name || 'Guest'}
                                </div>
                                <div className="notif-row-s">
                                  {[e.weave, e.occasion].filter(Boolean).join(' · ') || e.email || '—'}
                                </div>
                              </div>
                              <span className="notif-row-time">{timeAgo(e.createdAt)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button type="button" className="notif-foot" onClick={openEnquiry}>
                        View all enquiries →
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="topbar-account">
            <button className="account-btn" onClick={() => setMenuOpen((m) => !m)}>
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="account-av"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <span className="account-av">{initials(user?.name) || 'A'}</span>
              )}
              <span className="account-meta">
                <span className="account-nm">{user?.name || 'Admin'}</span>
                <span className="account-rl">{user?.role || 'Store Admin'}</span>
              </span>
            </button>
            {menuOpen && (
              <>
                <div className="menu-scrim" onClick={() => setMenuOpen(false)} />
                <div className="account-menu card">
                  <div className="am-head">
                    <div className="am-nm">{user?.name}</div>
                    <div className="am-em">{user?.email}</div>
                  </div>
                  <button className="am-item danger" onClick={requestSignOut}>
                    <IconLogout size={17} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>

          <button className="topbar-logout" title="Sign out" onClick={requestSignOut}>
            <IconLogout size={20} />
          </button>
        </header>

        {confirmSignOut && (
          <ConfirmDialog
            title="Sign out?"
            message="Are you sure you want to sign out of the admin panel? You'll need to sign in again to continue."
            confirmLabel="Yes, sign out"
            cancelLabel="No, stay signed in"
            onConfirm={() => { setConfirmSignOut(false); logout() }}
            onClose={() => setConfirmSignOut(false)}
          />
        )}

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
