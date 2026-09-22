# 🧵 Thridhavarnam — Saree CRM Admin Panel

React + Vite admin dashboard for the Thridhavarnam saree boutique. It is the
front end for the Express + MongoDB API in [`../sareeebackend`](../sareeebackend).

## 🚀 Getting started

```bash
# 1. Start the backend first (in ../sareeebackend)
cd ../sareeebackend && npm install && npm run dev   # → http://localhost:5000

# 2. Then the frontend
cd ../frontend
npm install
npm run dev        # → http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:5000`, so no CORS
setup is needed locally.

### Demo login

| Email | Password |
| --- | --- |
| `riya@vastrasarees.in` | `password` |

## ⚙️ Environment

Copy `.env.example` → `.env` only if you need to point at a non-default API:

| Key | Description |
| --- | --- |
| `VITE_API_URL` | API base URL. Defaults to `/api` (proxied in dev). Set to your deployed backend origin + `/api` for production builds. |

## 🧭 Features

- **Dashboard** — revenue, orders, customers, product KPIs, trend + category breakdown, recent orders, top sellers
- **Products** — catalogue CRUD, restock, category & status filters
- **Orders** — create/edit/delete, inline status change, auto-mirrored to Payments
- **Customers** — CRUD with segments (New / Loyal / VIP) and lifetime value
- **Payments** — ledger, record payment, mark paid, refund
- **Categories** — collections with accent colours and product counts
- **Reset demo data** — from the ⚙️ menu in the top bar

## 🏗 Build

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

## 🎨 Brand

Palette drawn from the Thridhavarnam logo — cream `#f7ead9`, deep maroon,
and temple gold. Logo lives at `public/logo.svg`.

## 🛠 Tech

React 18 · Vite · React Router · Fetch (no other runtime deps)
