import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'
import { orders as ordersApi } from '../api/client'
import { initials } from '../lib/format'
import { IconSearch, IconPlus, IconBell, IconLogout } from './icons'

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    ordersApi.list()
      .then((os) => setPending(os.filter((o) => ['pending', 'processing'].includes(o.status)).length))
      .catch(() => {})
  }, [])

  return (
    <div className="app-shell">
      <Sidebar open={open} onNavigate={() => setOpen(false)} pendingCount={pending} />
      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn hamburger" onClick={() => setOpen((o) => !o)}>☰</button>

          <div className="topbar-search">
            <IconSearch size={18} />
            <input placeholder="Search sarees, orders, customers…" />
          </div>

          <div className="spacer" />

          <button className="btn btn-primary btn-pill" onClick={() => nav('/products?new=1')}>
            <IconPlus size={18} /> Add Saree
          </button>

          <button className="topbar-bell" title="Notifications">
            <IconBell size={20} />
            <span className="bell-dot" />
          </button>

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
                  <button className="am-item danger" onClick={logout}>
                    <IconLogout size={17} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>

          <button className="topbar-logout" title="Sign out" onClick={logout}>
            <IconLogout size={20} />
          </button>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
