# Atelier Management System Roadmap

## Phase 1 — Base audit and cleanup

- Audit the imported dress-rental ERP
- Remove business-specific assumptions that do not fit the atelier
- Normalize naming and configuration
- Verify database migrations and local setup
- Add test/demo data that contains no real customer information

## Phase 2 — Arabic and atelier domain model

- Arabic RTL interface
- Atelier terminology
- Sections: bridal, kids, men, retail products
- Unique item coding
- Item status model
- Customer profiles and history

## Phase 3 — Booking engine

- Date-based availability
- One-day pre/post booking buffer
- Conflict prevention
- Booking extension rules
- Default price with controlled overrides
- Availability search and filters

## Phase 4 — Payments and daily operations

- Booking deposit
- Security deposit
- Multiple installment payments
- Remaining balance
- Deposit return / deduction states
- Income and expenses
- Daily closing

## Phase 5 — Roles and operational workflow

- Admin
- Supervisor
- Sales
- Preparation
- Sales assignment
- Preparation queue
- Handover and return
- Cleaning / maintenance states
- Audit trail

## Phase 6 — Windows offline-first layer

- Desktop packaging strategy
- Local SQLite as operational source while offline
- Local image/file handling
- Backup and restore
- Offline UX and connectivity state

## Phase 7 — Cloud synchronization

- Sync protocol
- Conflict rules
- Booking-conflict protection across devices
- Retry queue
- Server reconciliation
- Multi-device validation

## Phase 8 — Production hardening

- Security review
- Permission tests
- Backup recovery tests
- Performance checks
- Installer / update workflow
- User documentation and training
