import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { auth as authApi } from '../api/client'
import { uploadImage } from '../lib/image'
import { initials } from '../lib/format'
import { IconStore, IconUser } from '../components/icons'

const NAV = [
  { k: 'store', label: 'Store', Icon: IconStore },
  { k: 'profile', label: 'Profile', Icon: IconUser },
]

export default function Settings() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('store')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  // Upload the selected image to Cloudinary, PATCH the URL onto the
  // authenticated user's profile, then refresh the in-memory user so the
  // header and Settings pane both show the new photo without a reload.
  async function onAvatarPicked(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const url = await uploadImage(file)
      const updated = await authApi.updateMe({ avatar: url })
      setUser(updated)
      toast.ok('Profile photo updated')
    } catch (err) {
      toast.bad(err.message || 'Could not update photo')
    } finally {
      setUploadingAvatar(false)
      // Reset the input so picking the same file again still fires change.
      e.target.value = ''
    }
  }

  async function removeAvatar() {
    setUploadingAvatar(true)
    try {
      const updated = await authApi.updateMe({ avatar: '' })
      setUser(updated)
      toast.ok('Profile photo removed')
    } catch (err) {
      toast.bad(err.message || 'Could not remove photo')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Manage your store and account preferences</p>
        </div>
        <div className="page-actions">
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
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    className="avatar profile-av"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div className="avatar profile-av">{initials(user?.name) || 'A'}</div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? 'Uploading…' : user?.avatar ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {user?.avatar && (
                    <button
                      className="btn btn-outline"
                      onClick={removeAvatar}
                      disabled={uploadingAvatar}
                      style={{ color: '#75001F', borderColor: '#75001F' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onAvatarPicked}
                  style={{ display: 'none' }}
                />
              </div>
              <div className="form-grid">
                <div className="field"><label>Full Name</label><input defaultValue={user?.name || ''} /></div>
                <div className="field"><label>Role</label><input defaultValue={user?.role || 'Store Admin'} /></div>
                <div className="field"><label>Email</label><input defaultValue={user?.email || ''} /></div>
                <div className="field"><label>Phone</label><input defaultValue="+91 98765 00000" /></div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
