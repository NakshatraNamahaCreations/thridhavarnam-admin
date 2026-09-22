import { NavLink } from 'react-router-dom'
import {
  IconDashboard, IconOrders, IconShirt, IconInventory, IconUsers,
  IconTag, IconCalendar, IconCard, IconChart, IconStar, IconSettings, IconWallet,IconPhone
} from './icons'

const NAV = [
  { to: '/', label: 'Dashboard', Icon: IconDashboard, end: true },
  { to: '/orders', label: 'Order Management', Icon: IconOrders, badge: true },
  { to: '/products', label: 'Sarees', Icon: IconShirt },
  { to: '/inventory', label: 'Inventory', Icon: IconInventory },
  { to: '/customers', label: 'Customers', Icon: IconUsers },
  { to: '/categories', label: 'Categories', Icon: IconTag },
  { to: '/occasions', label: 'Occasions', Icon: IconCalendar },
  { to: '/coupons', label: 'Coupons', Icon: IconWallet },
  { to: '/payments', label: 'Payments', Icon: IconCard },
  { to: '/analytics', label: 'Analytics', Icon: IconChart },
  { to: '/reviews', label: 'Reviews', Icon: IconStar },
  { to: '/settings', label: 'Settings', Icon: IconSettings },
  { to: '/enquiry', label: 'Enquiry', Icon: IconPhone}
]

export default function Sidebar({ open, onNavigate, pendingCount = 0 }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <img src="/logo.svg" alt="Thridhavarnam" />
      </div>

      <nav className="nav">
        <div className="nav-label">Main Menu</div>
        {NAV.map(({ to, label, Icon, badge, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="ico"><Icon size={19} /></span>
            <span className="nav-text">{label}</span>
            {badge && pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="online-card">
          <span className="online-dot" />
          <div>
            <div className="online-t">Online</div>
            <div className="online-s">Store is live</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
