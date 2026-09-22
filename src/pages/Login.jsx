import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IconMail, IconLock, IconEye, IconEyeOff, IconArrowRight } from '../components/icons'

const STATS = [
  { v: '12K+', l: 'Orders managed' },
  { v: '98%', l: 'On-time delivery' },
  { v: '4.8★', l: 'Avg. rating' },
]

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('riya@vastrasarees.in')
  const [password, setPassword] = useState('password')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await login(email.trim(), password)
      nav('/', { replace: true })
    } catch (e) {
      setErr(e.message || 'Login failed')
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      {/* ---- Brand panel ---- */}
      <div className="login-brand">
        <div className="lb-glow lb-glow-1" />
        <div className="lb-glow lb-glow-2" />

        <div className="lb-content">
          <div className="lb-logo">
            <img src="/logo.svg" alt="Thridhavarnam" />
          </div>

          <h1 className="lb-title">
            Manage your saree business,<br />beautifully.
          </h1>
          <p className="lb-sub">
            Track orders, delight customers, and grow your collection — all from one elegant dashboard.
          </p>

          <div className="lb-stats">
            {STATS.map((s) => (
              <div className="lb-stat" key={s.l}>
                <div className="lb-stat-v">{s.v}</div>
                <div className="lb-stat-l">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lb-foot">© {new Date().getFullYear()} Thridhavarnam. All rights reserved.</div>
      </div>

      {/* ---- Form panel ---- */}
      <div className="login-form-side">
        <div className="login-card">
          <h2>Welcome back</h2>
          <p className="lc-sub">Sign in to your admin dashboard</p>

          {err && <div className="err-banner">{err}</div>}

          <form onSubmit={submit}>
            <div className="field">
              <label>Email</label>
              <div className="input-wrap">
                <span className="input-ico"><IconMail size={18} /></span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@vastrasarees.in"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div className="input-wrap">
                <span className="input-ico"><IconLock size={18} /></span>
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button type="button" className="input-eye" onClick={() => setShow((s) => !s)} tabIndex={-1}>
                  {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-row">
              <label className="check">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Remember me</span>
              </label>
              <a className="link-maroon" href="#" onClick={(e) => e.preventDefault()}>Forgot password?</a>
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : <>Sign In <IconArrowRight size={18} /></>}
            </button>
          </form>

          <p className="login-foot">
            Don't have an account? <a className="link-maroon" href="#" onClick={(e) => e.preventDefault()}>Request access</a>
          </p>
        </div>
      </div>
    </div>
  )
}
