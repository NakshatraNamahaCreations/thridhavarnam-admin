import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import Orders from './pages/Orders'
import Customers from './pages/Customers'
import Payments from './pages/Payments'
import Categories from './pages/Categories'
import Occasions from './pages/Occasions'
import Stories from './pages/Stories'
import Banners from './pages/Banners'
import Coupons from './pages/Coupons'
import Analytics from './pages/Analytics'
import Reviews from './pages/Reviews'
import Settings from './pages/Settings'
import Enquiry from './pages/Enquiry'
import PriceBuckets from './pages/PriceBuckets'

function Protected({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return <div className="spinner" />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user, ready } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={ready && user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/occasions" element={<Occasions />} />
        <Route path="/stories" element={<Stories />} />
        <Route path="/banners" element={<Banners />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/enquiry" element={<Enquiry/>}/>
        <Route path="/price-buckets" element={<PriceBuckets />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
