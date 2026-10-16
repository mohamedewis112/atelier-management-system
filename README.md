# Atelier Management System

A custom atelier rental and operations management system being developed by **Smart Media** for bridal, formalwear, and clothing-rental businesses.

This repository is public as a development portfolio and technical showcase. The project is being adapted from an MIT-licensed dress-rental ERP base into a workflow designed around real atelier operations.

## Product direction

The target system is designed around the day-to-day flow of an atelier rather than a generic inventory template.

Planned core modules include:

- Bridal, kids, men, and retail-product sections
- Unique coding for every rentable item
- Customer profiles and full item history
- Availability search and booking conflict prevention
- One-day booking buffer before and after each rental
- Booking extensions with automatic conflict re-checking
- Default rental pricing with controlled overrides
- Booking deposits, security deposits, installments, and remaining balances
- Admin, supervisor, sales, and preparation roles
- Salesperson assignment on bookings
- Preparation, handover, return, cleaning, and maintenance workflow
- Daily closing and cash-flow visibility
- Income, expenses, and profit/loss reporting
- Search, filters, and operational dashboards
- Audit trail for important actions
- Real-time updates while connected
- Windows-first offline operation with cloud synchronization as a later production layer

## Current technical baseline

The imported open-source base already includes business concepts for:

- Customers
- Dresses and inventory
- Orders for rentals, sewing, and sales
- Income and expense transactions
- Dashboard reporting
- SQLite storage
- Authentication
- PDF generation
- Image processing
- CSV exports and operational utilities

The atelier-specific workflows listed above are the active development roadmap. Features such as Windows offline-first operation and cloud synchronization are **not presented as complete until they are implemented and tested**.

## Technology baseline

- Next.js / React
- Node.js / Express
- SQLite
- JWT authentication
- PDF generation
- Image processing
- Business reporting

## Development roadmap

The project roadmap is documented in [docs/ROADMAP.md](docs/ROADMAP.md).

The business workflow in Arabic is documented in [docs/ATELIER_WORKFLOW_AR.md](docs/ATELIER_WORKFLOW_AR.md).

## Open-source attribution

This project began from the MIT-licensed project:

**Dress Rental Business Management System** by Moyshi Ginzburg  
https://github.com/moyshiginzburg/dress-rental-business-management

The original MIT license is preserved in [LICENSE](LICENSE). Additional attribution and the imported source revision are documented in [NOTICE.md](NOTICE.md).

## Security

This is a public repository. Never commit:

- Production passwords or API keys
- Real customer personal data
- Production database files
- Private receipts or agreements
- Customer images that are not approved for public use
- Environment files containing secrets

Use example configuration only and keep real operational data outside Git.
