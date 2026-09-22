import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { admin } from '../api/client'
import { initials } from '../lib/format'
import { IconStore, IconUser, IconBell, IconCard, IconShield, IconRefresh } from '../components/icons'

const NAV = [
  { k: 'store', label: 'Store', Icon: IconStore },
  { k: 'profile', label: 'Profile', Icon: IconUser },
  { k: 'notifications', label: 'Notifications', Icon: IconBell },
  { k: 'billing', label: 'Billing', Icon: IconCard },
  { k: 'security', label: 'Security', Icon: IconShield },
]

const NOTIFS = [
  { k: 'orders', t: 'New order alerts', s: 'Get notified when a new order is placed', on: true },
  { k: 'lowstock', t: 'Low stock warnings', s: 'Alert when a saree drops below 5 units', on: true },
  { k: 'reviews', t: 'New customer reviews', s: 'Notify me when customers leave reviews', on: true },
  { k: 'daily', t: 'Daily sales summary', s: 'Receive an email digest every evening', on: false },
  { k: 'marketing', t: 'Marketing tips', s: 'Occasional growth & marketing suggestions', on: false },
]

function Switch({ on, onClick }) {
  return <button type="button" className={`switch ${on ? 'on' : ''}`} onClick={onClick}><span /></button>
}

export default function Settings() {
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('store')
  const [resetting, setResetting] = useState(false)
  const [notifs, setNotifs] = useState(() => Object.fromEntries(NOTIFS.map((n) => [n.k, n.on])))
  const [sec, setSec] = useState({ twofa: false, alerts: true })

  async function resetDemo() {
    if (!confirm('Reset all demo data (products, orders, customers, payments, categories)?')) return
    setResetting(true)
    try {
      await admin.reset()
      toast.ok('Demo data reset — reloading')
      setTimeout(() => location.reload(), 700)
    } catch (e) { toast.bad(e.message); setResetting(false) }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Manage your store and account preferences</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={resetDemo} disabled={resetting}><IconRefresh size={17} /> {resetting ? 'Resetting…' : 'Reset demo data'}</button>
          <button className="btn btn-primary" onClick={() => toast.ok('Settings saved')}>Save Changes</button>
        </div>
      </div>

      <div className="settings-wrap">
        <div className="card settings-nav">
          {NAV.map((n) => (
            <button key={n.k} className={`set-nav-item ${tab === n.k ? 'active' : ''}`} onClick={() => setTab(n.k)}>
              <n.Icon size={18} /> {n.label}
            </button>
          ))}
        </div>

        <div className="card card-pad settings-panel">
          {tab === 'store' && (
            <>
              <h3 className="panel-title">Store Information</h3>
              <div className="form-grid">
                <div className="field"><label>Store Name</label><input defaultValue="Thridhavarnam Sarees" /></div>
                <div className="field"><label>Support Email</label><input defaultValue="care@thridhavarnam.in" /></div>
                <div className="field"><label>Phone</label><input defaultValue="+91 80 1234 5678" /></div>
                <div className="field"><label>Currency</label><select defaultValue="INR"><option value="INR">INR (₹)</option><option value="USD">USD ($)</option></select></div>
                <div className="field full"><label>Store Address</label><textarea defaultValue="42 Silk Bazaar Road, T. Nagar, Chennai 600017" /></div>
              </div>
            </>
          )}

          {tab === 'profile' && (
            <>
              <h3 className="panel-title">Your Profile</h3>
              <div className="profile-photo">
                <div className="avatar profile-av">{initials(user?.name) || 'A'}</div>
                <button className="btn btn-outline">Change Photo</button>
              </div>
              <div className="form-grid">
                <div className="field"><label>Full Name</label><input defaultValue={user?.name || ''} /></div>
                <div className="field"><label>Role</label><input defaultValue={user?.role || 'Store Admin'} /></div>
                <div className="field"><label>Email</label><input defaultValue={user?.email || ''} /></div>
                <div className="field"><label>Phone</label><input defaultValue="+91 98765 00000" /></div>
              </div>
            </>
          )}

          {tab === 'notifications' && (
            <>
              <h3 className="panel-title">Notifications</h3>
              <div className="switch-list">
                {NOTIFS.map((n) => (
                  <div className="switch-row" key={n.k}>
                    <div>
                      <div className="sr-t">{n.t}</div>
                      <div className="sr-s">{n.s}</div>
                    </div>
                    <Switch on={notifs[n.k]} onClick={() => setNotifs((p) => ({ ...p, [n.k]: !p[n.k] }))} />
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'billing' && (
            <>
              <h3 className="panel-title">Billing &amp; Plan</h3>
              <div className="plan-card">
                <div className="plan-label">Current Plan</div>
                <div className="plan-name">Growth — ₹2,499/mo</div>
                <div className="plan-renew">Renews on 1 August 2026</div>
                <button className="btn btn-gold">Upgrade Plan</button>
              </div>
              <div className="field full" style={{ marginTop: 20 }}>
                <label>Payment Method</label>
                <div className="pay-method">
                  <IconCard size={20} />
                  <span className="pm-num">•••• •••• •••• 4242</span>
                  <button className="link-maroon">Update</button>
                </div>
              </div>
            </>
          )}

          {tab === 'security' && (
            <>
              <h3 className="panel-title">Security</h3>
              <div className="field full" style={{ marginBottom: 16 }}><label>Current Password</label><input type="password" defaultValue="password" /></div>
              <div className="form-grid">
                <div className="field"><label>New Password</label><input type="password" placeholder="Enter new password" /></div>
                <div className="field"><label>Confirm Password</label><input type="password" placeholder="Re-enter password" /></div>
              </div>
              <div className="switch-list" style={{ marginTop: 8 }}>
                <div className="switch-row">
                  <div><div className="sr-t">Two-factor authentication</div><div className="sr-s">Add an extra layer of security</div></div>
                  <Switch on={sec.twofa} onClick={() => setSec((p) => ({ ...p, twofa: !p.twofa }))} />
                </div>
                <div className="switch-row">
                  <div><div className="sr-t">Login alerts</div><div className="sr-s">Email me on new device sign-in</div></div>
                  <Switch on={sec.alerts} onClick={() => setSec((p) => ({ ...p, alerts: !p.alerts }))} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
