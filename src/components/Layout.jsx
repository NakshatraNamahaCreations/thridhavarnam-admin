import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'
import { admin, orders as ordersApi } from '../api/client'
import { useToast } from '../context/ToastContext'
import { initials } from '../lib/format'
import { IconSearch, IconPlus, IconBell, IconLogout, IconRefresh } from './icons'

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    ordersApi.list()
      .then((os) => setPending(os.filter((o) => ['pending', 'processing'].includes(o.status)).length))
      .catch(() => {})
  }, [])

  async function resetDemo() {
    setMenuOpen(false)
    if (!confirm('Reset all demo data (products, orders, customers, payments, categories)?')) return
    setResetting(true)
    try {
      await admin.reset()
      toast.ok('Demo data reset — reloading')
      setTimeout(() => location.reload(), 700)
    } catch (e) {
      toast.bad(e.message)
      setResetting(false)
    }
  }

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

          <button className="btn btn-primary btn-pill" onClick={() => nav('/products')}>
            <IconPlus size={18} /> Add Saree
          </button>

          <button className="topbar-bell" title="Notifications">
            <IconBell size={20} />
            <span className="bell-dot" />
          </button>

          <div className="topbar-account">
            <button className="account-btn" onClick={() => setMenuOpen((m) => !m)}>
              <span className="account-av">{initials(user?.name) || 'A'}</span>
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
                  <button className="am-item" onClick={resetDemo} disabled={resetting}>
                    <IconRefresh size={17} /> {resetting ? 'Resetting…' : 'Reset demo data'}
                  </button>
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
