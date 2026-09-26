# StockSense — Multi-Warehouse Inventory Management System

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey.svg)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3.45+-blue.svg)](https://sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> A production-grade, modular Inventory Management System built for hackathon submission. Replaces manual registers, Excel sheets, and fragmented tracking with a centralized, real-time, auditable platform for multi-warehouse stock operations.

---

## 🎯 Problem Statement

Small and medium businesses manage inventory using:
- Manual registers and notebooks
- Disconnected Excel/Google Sheets
- Ad-hoc WhatsApp messages and paper notes
- No clear audit trail of stock movements
- Frequent stock mismatches between physical count and recorded stock

**StockSense solves this** by providing a structured, auditable, and automated inventory system with real-time visibility across multiple warehouses and locations.

---

## ✨ Features

### Core Inventory Operations
| Module | Description |
|--------|-------------|
| **Products** | Full catalog with SKU, categories, UoM, reorder rules, stock matrix per location |
| **Receipts** | Vendor intake → validate → atomic stock increase + immutable ledger |
| **Deliveries** | Pick → Pack → Validate → atomic stock decrease + ledger |
| **Transfers** | Multi-warehouse relocations with dual ledger entries (out/in) |
| **Adjustments** | Physical count reconciliation with approval threshold |
| **Stock Ledger** | Append-only audit trail of every movement with idempotency keys |

### Dashboard & Analytics
- **8 KPI Cards**: Total products, stock units, valuation, low/out-of-stock, pending receipts/deliveries/transfers/adjustments
- **Dynamic Filters**: By warehouse, category, date range, document type, status
- **Charts**: Operation volume breakdown, top moving products
- **Real-time Activity Feed**: Last 20 stock movements with source/destination

### Security & Governance
- **JWT Authentication** with short-lived access tokens + refresh token rotation
- **OTP-based Password Reset** (10-min validity, single-use)
- **RBAC**: 4 roles (ADMIN, INVENTORY_MANAGER, WAREHOUSE_STAFF, VIEWER) with 21 granular permissions
- **Audit Logs**: All sensitive actions logged (login, validation, adjustments, user changes)
- **Rate Limiting** on auth endpoints
- **Security Headers** via Helmet.js

### Multi-Warehouse Architecture
- 3 pre-seeded warehouses with hierarchical locations (Receiving → Storage → Production → Dispatch → Scrap)
- Location-wise stock availability matrix per product
- Cross-warehouse transfers with real-time stock validation

### Developer Experience
- **Zero build step** — runs with `npm start`
- **Seeded demo data** — 1-click login for all 4 roles
- **RESTful API** v1 with consistent JSON responses
- **SPA Frontend** — vanilla ES6 modules, hash-based routing, dark theme design system

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm 10+

### Installation
```bash
git clone https://github.com/yourusername/stocksense.git
cd stocksense
npm install
npm run seed    # Initialize SQLite database with demo data
npm start       # Start server at http://localhost:3000
```

### Demo Accounts (Pre-seeded)
| Role | Email | Password | Capabilities |
|------|-------|----------|--------------|
| 👑 **Admin** | `admin@stocksense.io` | `Password123!` | Full system control, user management, settings |
| 📦 **Manager** | `manager@stocksense.io` | `Password123!` | Validate receipts/deliveries, approve adjustments, manage products |
| 👷 **Staff** | `staff@stocksense.io` | `Password123!` | Create receipts/deliveries/transfers, picking, packing, counts |
| 👁️ **Viewer** | `viewer@stocksense.io` | `Password123!` | Read-only dashboards, reports, stock ledger |

> **Hackathon Tip**: Use the 1-click demo buttons on the login page for instant access!

---

## 🏗️ Architecture

```
src/
├── public/                    # Frontend (served statically)
│   ├── css/                   # Design system (variables, base, components, layout, views)
│   ├── js/
│   │   ├── api.js            # API client with JWT intercept & auto-refresh
│   │   ├── state.js          # Global client state store (tokens, user, perms)
│   │   ├── main.js           # SPA router, app shell, auth guard
│   │   ├── components/       # Modal, Toast
│   │   └── views/            # One file per page (dashboard, products, receipts, ...)
│   └── index.html
└── server/                    # Backend
    ├── app.js                # Express setup, middleware, routes
    ├── server.js             # Entry point
    ├── config/               # Environment config
    ├── database/
    │   ├── connection.js     # SQLite WAL mode, prepared statements, transactions
    │   ├── schema.sql        # 24-table schema with indexes
    │   └── seed.js           # Demo org, users, warehouses, products, sample ops
    ├── middleware/           # Auth, RBAC, audit logging, error handling
    └── modules/              # Feature modules (each: controller + service)
        ├── auth/
        ├── dashboard/
        ├── products/
        ├── warehouses/
        ├── receipts/
        ├── deliveries/
        ├── transfers/
        ├── adjustments/
        ├── inventory/
        ├── notifications/
        ├── auditLogs/
        └── settings/
```

### Database Schema (Key Tables)
| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant isolation |
| `users`, `roles`, `permissions`, `user_roles`, `role_permissions` | RBAC |
| `refresh_tokens`, `otp_requests` | Auth state |
| `warehouses`, `locations` | Facility hierarchy (7 location types) |
| `products`, `categories`, `units_of_measure` | Catalog |
| `inventory_balances` | Current stock per product/location (optimistic locking) |
| `stock_ledger` | **Immutable** audit trail (append-only, idempotency keys) |
| `receipts`/`receipt_items` | Inbound workflow |
| `deliveries`/`delivery_items` | Outbound workflow (pick/pack/validate) |
| `internal_transfers`/`items` | Cross-location moves |
| `stock_adjustments`/`items` | Physical count reconciliation |
| `notifications` | Alerts (low stock, operations, approvals) |
| `audit_logs` | Security/compliance trail |

---

## 🔌 API Reference

Base path: `/api/v1`

### Auth
```
POST   /auth/register           # Register new org + admin user
POST   /auth/login              # Email/password → tokens
POST   /auth/refresh            # Refresh token → new pair
POST   /auth/logout             # Revoke refresh token
POST   /auth/forgot-password    # Request OTP
POST   /auth/verify-otp         # Verify OTP
POST   /auth/reset-password     # Set new password via OTP
POST   /auth/demo-switch        # Hackathon: switch demo persona
GET    /auth/me                 # Current user + permissions
```

### Dashboard
```
GET /dashboard/summary          # KPIs (with warehouse/category filters)
GET /dashboard/activity         # Recent stock movements
GET /dashboard/warehouse-summary
GET /dashboard/charts           # Operation breakdown + top products
```

### Products
```
GET    /products                # Paginated, searchable, filterable
POST   /products                # Create (with optional initial stock)
GET    /products/:id            # Detail + location matrix + ledger
PATCH  /products/:id            # Update
GET    /products/categories     # List categories
POST   /products/categories     # Create category
GET    /products/uoms           # List UoM
POST   /products/uoms           # Create UoM
```

### Warehouses & Locations
```
GET    /warehouses              # List with stock aggregates
POST   /warehouses              # Create (auto-creates 3 default locations)
GET    /warehouses/:id          # Detail with locations
PATCH  /warehouses/:id          # Update
GET    /warehouses/locations    # All locations (filter by warehouseId)
POST   /warehouses/locations    # Create location
```

### Receipts (Inbound)
```
GET    /receipts
POST   /receipts
GET    /receipts/:id
PATCH  /receipts/:id/status     # DRAFT → WAITING → READY
POST   /receipts/:id/validate   # Atomic stock increase + ledger
POST   /receipts/:id/cancel
```

### Deliveries (Outbound)
```
GET    /deliveries
POST   /deliveries
GET    /deliveries/:id
POST   /deliveries/:id/pick     # Update picked quantities
POST   /deliveries/:id/pack     # Update packed quantities
POST   /deliveries/:id/validate # Atomic stock decrease + ledger
POST   /deliveries/:id/cancel
```

### Transfers
```
GET    /transfers
POST   /transfers
GET    /transfers/:id
PATCH  /transfers/:id/status
POST   /transfers/:id/validate  # Dual ledger (out + in)
POST   /transfers/:id/cancel
```

### Adjustments
```
GET    /adjustments
POST   /adjustments             # Auto-pending if valuation > threshold
GET    /adjustments/:id
POST   /adjustments/:id/approve # Apply to stock + ledger
POST   /adjustments/:id/reject
```

### Inventory & Ledger
```
GET /inventory/balances         # Stock matrix with filters
GET /inventory/ledger           # Full audit trail with filters
```

### Notifications
```
GET    /notifications
PATCH  /notifications/:id/read
PATCH  /notifications/read-all
```

### Settings & Audit
```
GET    /settings/organization
PATCH  /settings/organization
GET    /settings/inventory
PATCH  /settings/inventory
GET    /audit-logs              # Admin/Manager only
```

---

## 🛡️ Security Model

| Layer | Implementation |
|-------|----------------|
| **Transport** | HTTPS in production, Helmet.js headers |
| **Auth** | Argon2id-equivalent (bcrypt 10 rounds), JWT RS256-ready |
| **Tokens** | 2h access, 7d refresh, rotation on use, revocation on logout/password change |
| **Authorization** | Middleware checks permissions on every endpoint; Admin bypass |
| **Validation** | Server-side on all mutations; SQL parameterization |
| **Concurrency** | Optimistic locking (`version` column) on `inventory_balances` |
| **Idempotency** | Unique `idempotency_key` on every `stock_ledger` entry |
| **Audit** | All sensitive actions logged with user, IP, user-agent, old/new values |

---

## 🧪 Testing the Flow

```bash
# 1. Login as Manager
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@stocksense.io","password":"Password123!"}'

# 2. Create a product (use returned accessToken)
curl -X POST http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Widget","sku":"TST-WDG-001","category_id":"cat-raw","uom_id":"uom-pcs","min_stock_level":10,"reorder_quantity":50}'

# 3. Create receipt for 100 units
curl -X POST http://localhost:3000/api/v1/receipts \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"supplier_name":"Acme Corp","warehouse_id":"wh-central","receiving_location_id":"loc-c-rec","items":[{"product_id":"<product_id>","received_quantity":100}]}'

# 4. Validate receipt → stock increases
curl -X POST http://localhost:3000/api/v1/receipts/<receipt_id>/validate \
  -H "Authorization: Bearer <accessToken>"

# 5. Check stock balance
curl -H "Authorization: Bearer <accessToken>" \
  http://localhost:3000/api/v1/inventory/balances?productId=<product_id>
```

---

## 📦 Deployment

### Environment Variables
```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=<64-char-random>
JWT_REFRESH_SECRET=<64-char-random>
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d
DATABASE_PATH=/var/lib/stocksense/stocksense.db
```

### Docker (Example)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "src/server/server.js"]
```

### Production Checklist
- [ ] Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Use managed PostgreSQL (migrate schema) instead of SQLite
- [ ] Configure reverse proxy (nginx/Caddy) with TLS
- [ ] Set up daily DB backups
- [ ] Configure SMTP for OTP emails
- [ ] Enable log aggregation (JSON logs)
- [ ] Set up health check monitoring (`/api/health`)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feat/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feat/amazing-feature`)
5. Open Pull Request

### Code Style
- ESLint (Airbnb base) + Prettier
- Conventional Commits
- No console.log in production code

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Built for hackathon submission — **StockSense Problem Statement**
- Design inspired by modern dark-theme dashboards
- Icons: Custom SVG set (zero dependencies)
- Fonts: Plus Jakarta Sans, JetBrains Mono (Google Fonts)

---

## 📞 Support

- **Issues**: GitHub Issues
- **Demo**: 1-click login buttons on `/auth`
- **API Docs**: This README + `/api/health` endpoint

---

> **Built with ❤️ for the hackathon** — StockSense team