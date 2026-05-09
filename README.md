# BizERP — Small Business ERP System



A full-stack ERP system built for small businesses with 6 complete modules.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React.js, Tailwind CSS, Recharts    |
| Backend    | Node.js, Express.js                 |
| Database   | PostgreSQL                          |
| Auth       | JWT (Access + Refresh Tokens)       |
| Upload     | Multer (image upload)               |
| Deploy     | Vercel (frontend) + Railway (backend) |

---

## Modules

| # | Module | Description |
|---|--------|-------------|
| 1 | Authentication | JWT login, role-based access (Admin/Staff) |
| 2 | Inventory | Product CRUD, categories, stock tracking, low-stock alerts |
| 3 | Sales | Invoice creation, auto stock deduction, due tracking |
| 4 | Purchases | Purchase orders, supplier payments, auto stock addition |
| 5 | Customers & Suppliers | Profiles, due tracking, payment history |
| 6 | Dashboard & Reports | KPI cards, charts, profit & loss, analytics |

---

## Project Structure

```
erp-project/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   └── schema.sql
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── upload.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── productController.js
│   │   │   ├── saleController.js
│   │   │   ├── purchaseController.js
│   │   │   ├── customerController.js
│   │   │   ├── supplierController.js
│   │   │   └── dashboardController.js
│   │   ├── routes/
│   │   │   └── index.js
│   │   └── uploads/
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── index.css
    │   ├── context/
    │   │   ├── AuthContext.jsx
    │   │   └── ThemeContext.jsx
    │   ├── services/
    │   │   └── api.js
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── Layout.jsx
    │   │   │   └── Sidebar.jsx
    │   │   └── ui/
    │   │       └── index.jsx
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Dashboard.jsx
    │       ├── Inventory.jsx
    │       ├── Sales.jsx
    │       ├── PurchasesCustomersSuppliers.jsx
    │       ├── Reports.jsx
    │       └── Settings.jsx
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Getting Started

### 1. Prerequisites
- Node.js v18+
- PostgreSQL v14+

### 2. Database Setup

```bash
# Create database
createdb bizErp

# Run schema (creates all tables + default admin)
psql -U postgres -d bizErp -f backend/src/config/schema.sql
```


### 3. Backend Setup

```bash
cd backend
npm install

# Copy and fill in your values
cp .env.example .env

npm run dev
# Server runs on http://localhost:5000
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

---

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bizErp
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=your_super_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

---

## Features

- ✅ JWT Authentication with refresh tokens
- ✅ Role-based access (Admin / Staff)
- ✅ Dark & Light theme with persistent preference
- ✅ Fully responsive (mobile + desktop)
- ✅ Real-time dashboard with charts
- ✅ Auto stock deduction on sales (PostgreSQL transactions)
- ✅ Auto stock addition on purchases
- ✅ Low stock alerts
- ✅ Customer & supplier due tracking
- ✅ Profit & Loss reports
- ✅ Product image upload

---


---

## Resume Description

> Built a full-stack ERP system for small retail businesses featuring JWT authentication with role-based access, inventory management with low-stock alerts, sales invoicing with automatic stock deduction using PostgreSQL transactions, purchase order management, customer/supplier due tracking, and a real-time analytics dashboard with Recharts. Tech: React.js, Node.js, Express, PostgreSQL, Tailwind CSS.

---

## Live 
business-erp-e13p.vercel.app 


## Demo Accounts
 
| Role  | Email | Password | Access |
|-------|-------|----------|--------|
| Admin |                    |            | Full access — all modules |
| Staff | `demo@bizErp.com`  | `admin123` | View + Sales only |



© 2025 RH BANDHAN. All rights reserved.
