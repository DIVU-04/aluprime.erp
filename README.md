# AluPrime ERP

Cloud-based **Fenestration ERP** software for windows and doors fabrication — inspired by [EvA ERP Cloud](https://evaerp.cloud/) module architecture.

AluPrime ERP is an open-source alternative built for fabricators, distributors, dealers, and manufacturing companies in the fenestration industry.

## Features

| Module | Route | Description |
|--------|-------|-------------|
| Dashboard | `/dashboard` | Business overview, pipeline & production KPIs |
| CRM | `/crm` | Accounts, contacts, opportunities & sales pipeline |
| QMS | `/qms` | Quotation management with revisions |
| RMS | `/rms` | Rate management & cost head configuration |
| Design Configurator | `/configurator` | Window/door design with instant costing |
| Survey | `/survey` | Pre-production site surveys |
| Projects | `/projects` | Project tracking with geo-tagging |
| Sales Orders | `/order` | Order management |
| Production Planning | `/planning` | Batch scheduling |
| Shop Floor (MES) | `/shopfloor` | Real-time production tracking |
| Raw Inventory | `/inventory` | Raw material stock management |
| FG Inventory | `/fg-inventory` | Finished goods inventory |
| Dispatch | `/dispatch` | Dispatch & delivery management |

## Tech Stack

- **Frontend:** Angular 19, Bootstrap 5, Bootstrap Icons
- **Backend:** NestJS, TypeORM, SQLite (production-ready with PostgreSQL swap)
- **Auth:** JWT-based authentication

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+

### Development

```bash
# Terminal 1 - Backend API
cd backend
npm install
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run start
```

Open http://localhost:4200

### Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@aluprime.com | admin123 | Admin |
| sales@aluprime.com | admin123 | Sales |

### Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:4200
- API: http://localhost:3000/api

## API Endpoints

All endpoints are prefixed with `/api` and require JWT auth (except login/register).

- `POST /api/auth/login` — Login
- `POST /api/auth/register` — Register
- `GET /api/dashboard` — Dashboard overview
- `GET|POST|PUT|DELETE /api/crm/*` — CRM resources
- `GET|POST|PUT|DELETE /api/quotations/*` — Quotations
- `GET|POST|PUT|DELETE /api/projects/*` — Projects
- `GET|POST|PUT|DELETE /api/orders/*` — Sales orders
- `GET|POST|PUT|DELETE /api/inventory/*` — Inventory
- `GET|POST|PUT|DELETE /api/production/*` — Production batches
- `GET|POST|PUT|DELETE /api/dispatch/*` — Dispatch
- `GET|POST|PUT|DELETE /api/survey/*` — Surveys
- `GET|POST|PUT|DELETE /api/configurator/*` — Design configurator

## Project Structure

```
aluprime.erp/
├── backend/          # NestJS REST API
│   └── src/
│       ├── auth/     # Authentication
│       ├── crm/      # CRM module
│       ├── quotations/
│       ├── projects/
│       ├── orders/
│       ├── inventory/
│       ├── production/
│       ├── dispatch/
│       ├── survey/
│       ├── configurator/
│       └── seed/     # Demo data seeder
├── frontend/         # Angular SPA
│   └── src/app/
│       ├── core/     # Auth, guards, interceptors
│       ├── layout/   # Main shell with sidebar
│       ├── features/ # Module pages
│       └── shared/   # Reusable components
└── docker-compose.yml
```

## License

MIT
