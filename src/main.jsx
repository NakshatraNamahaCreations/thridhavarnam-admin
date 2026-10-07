import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import './styles/theme.css'

// Browser default: a focused <input type="number"> treats the mouse wheel
// as a stepper, so scrolling the page silently mutates values like Stock /
// Price / Qty. Block the wheel on focused number inputs app-wide so page
// scrolls stay page scrolls.
document.addEventListener(
  'wheel',
  (e) => {
    const el = document.activeElement
    if (el && el.tagName === 'INPUT' && el.type === 'number' && el === e.target) {
      el.blur()
    }
  },
  { passive: true },
)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
)
