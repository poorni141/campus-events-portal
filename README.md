# TicketNest — Smart Event Booking and Management Platform

A high-performance, multi-tenant full-stack event ticketing platform with transactional ticket inventory management, strict 10-minute reservation holds, concurrency protection against overselling, simulated asynchronous payments with webhook callbacks, and comprehensive event analytics.

---

## 🏛️ System Architecture

```
[ Client: React + Vite + Tailwind ]
            │
            ▼ (REST API / Bearer Token & User Context)
[ Express.js Full-Stack Engine (server.ts) ]
    ├── Auth & Multi-Tenant Isolation
    ├── Transactional Reservation Engine (Row-Level Locking)
    ├── Simulated Payment Gateway & Webhook Handler
    └── Analytics Aggregator
            │
    ┌───────┴──────────────────────┬───────────────────────┐
    ▼                              ▼                       ▼
[ PostgreSQL / Prisma ORM ]   [ Redis Caching ]    [ BullMQ / Queue Worker ]
• Relational Source of Truth  • Public event lists • 10-min reservation hold timer
• Strict check constraints    • Category & venue   • Background expiration sweeper
• Mutex & Row Locks           • Cache-aside        • Idempotent inventory release
```

---

## 📊 Database Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    ORGANIZATION ||--o{ EVENT : "hosts"
    ORGANIZATION ||--o{ USER : "employs"
    USER ||--o{ RESERVATION : "places"
    USER ||--o{ ORDER : "owns"
    USER ||--o{ AUDIT_LOG : "triggers"
    EVENT ||--o{ TICKET_CATEGORY : "contains"
    EVENT ||--o{ RESERVATION : "books"
    EVENT ||--o{ ORDER : "fulfills"
    TICKET_CATEGORY ||--o{ RESERVATION_ITEM : "reserved_in"
    TICKET_CATEGORY ||--o{ ORDER_ITEM : "purchased_in"
    RESERVATION ||--|{ RESERVATION_ITEM : "includes"
    RESERVATION ||--o| ORDER : "converts_to"
    RESERVATION ||--o{ PAYMENT_TRANSACTION : "funded_by"
    PAYMENT_TRANSACTION ||--o| ORDER : "authorizes"
    ORDER ||--|{ ORDER_ITEM : "contains"

    ORGANIZATION {
        string id PK
        string name
        string slug
        string status
        boolean is_verified
    }
    USER {
        string id PK
        string email
        string name
        string role
        string organization_id FK
    }
    EVENT {
        string id PK
        string organization_id FK
        string title
        string category
        timestamp event_date
        int max_capacity
        string status
    }
    TICKET_CATEGORY {
        string id PK
        string event_id FK
        string name
        decimal price
        int total_quantity
        int available_quantity
        int reserved_quantity
        int sold_quantity
    }
    RESERVATION {
        string id PK
        string user_id FK
        string event_id FK
        string status
        timestamp expires_at
        decimal total_amount
    }
    PAYMENT_TRANSACTION {
        string id PK
        string reservation_id FK
        string status
        decimal amount
        string payment_gateway_ref
        string idempotency_key
    }
    ORDER {
        string id PK
        string booking_reference
        string user_id FK
        string event_id FK
        string reservation_id FK
        string payment_transaction_id FK
        decimal total_amount
        string status
        string qr_code_data
    }
```

---

## 🛡️ Concurrency & Reliability Guarantees

1. **Zero Overselling**:
   Ticket category rows are locked during reservation creation (`SELECT ... FOR UPDATE` simulation via sorted mutex registry). Available quantity is atomically decremented and held stock is incremented.
2. **10-Minute Reservation Hold**:
   Reservations automatically expire after 10 minutes (600 seconds). A countdown timer guides the attendee. If unpaid, the BullMQ worker safely returns held inventory back to the available pool.
3. **Double-Release Prevention**:
   Release operations are strictly idempotent (`WHERE status = 'PENDING'`). Already confirmed or expired reservations cannot be released twice.
4. **Idempotent Webhooks & Payments**:
   Payment callbacks carry gateway references and idempotency keys, guaranteeing that repeated network callbacks will never duplicate orders or double-decrement stock.
5. **Multi-Tenant Isolation**:
   Organizers only query and mutate records belonging to their `organizationId`. Cross-tenant mutations return `403 Forbidden`.

---

## 🚀 Quick Start & Docker Deployment

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Run backend and frontend concurrently
npm run dev

# App runs at http://localhost:3000
```

### Docker Compose
```bash
docker compose up --build -d
```
This spins up:
- PostgreSQL 16 on port 5432
- Redis 7 on port 6379
- TicketNest App on port 3000

---

## 🧪 Automated Testing

Execute the automated test suite covering concurrency, expiration, payment failure, webhook idempotency, and tenant isolation:

```bash
npx tsx tests/concurrency.test.ts
```
