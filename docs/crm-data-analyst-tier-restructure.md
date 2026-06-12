# CRM Data Analyst & Tier Restructure

## System Flowchart

```mermaid
flowchart TD
  A[New or existing lead] --> B[Data Analyst lead assignment screen]
  B --> C{Search and filters}
  C --> C1[Search text]
  C --> C2[Assigned date range]
  C --> C3[Tier, agent, team leader, lifecycle filters]
  C --> D[Data Analyst selects one or more leads]
  D --> E[Assign or reassign directly to Agent]
  E --> F[Customer.assigned_to = Agent]
  E --> G[Customer.assigned_by = Data Analyst]
  E --> H[Customer.assigned_at = timestamp]
  F --> I[Agent processes lead]
  I --> J[CRM customer profile]
  J --> K[Customer Notes]
  J --> L[Manual Tier Management]
  L --> M{Tier 6?}
  M -->|Yes| N[Reject action allowed]
  M -->|No| O[Reject action disabled]
  N --> P[Rejected list]
  P --> Q[Restore to active Tier 6 pool]
  Q --> B
```

## ERD

```mermaid
erDiagram
  USERS ||--o{ CUSTOMERS : assigns
  USERS ||--o{ ACTIVITIES : writes
  CUSTOMERS ||--o| CUSTOMER_TIERS : has
  CUSTOMERS ||--o{ ACTIVITIES : notes

  USERS {
    int id PK
    varchar name
    varchar last_name
    varchar email
    int role_id
    int team_leader_id
  }

  CUSTOMERS {
    int id PK
    varchar name
    varchar phone
    int assigned_to FK
    int assigned_by FK
    timestamp assigned_at
    int assigned_supervisor_id
    varchar lead_status
    varchar customer_type
  }

  CUSTOMER_TIERS {
    int id PK
    int customer_id FK
    varchar tier
    boolean is_active
    boolean auto_assigned
    int tier_assigned_by_id
    timestamp tier_assigned_at
    text notes
  }

  ACTIVITIES {
    int id PK
    varchar type
    int customer_id FK
    int user_id FK
    varchar subject
    text description
    text notes
    timestamp created_at
  }
```

## Database Changes

- Add `customers.assigned_by` and `customers.assigned_at`.
- Add indexes for assignment owner/date filtering.
- Add `data-analyst` role and CRM permissions.
- Replace legacy `customer_tiers.tier` values with `tier_1` through `tier_6` plus `rejected`.
- Disable auto-tier semantics by forcing migrated tier rows to `auto_assigned = false`.
- Restore legacy rejected customers to active Tier 6 in the migration script.

## Breaking-Change Review

- Old frontend routes remain in place, but the backend also exposes `/crm/data-analyst/*`.
- Old `/crm/sales-manager/*` APIs remain as aliases for compatibility.
- Team Leader assignment endpoints now reject requests from `sales-team-leader` role users.
- Legacy tier values are migrated; integrations sending `silver/gold/vip` must switch to `tier_1` through `tier_6`.
- Rejection requires the customer's current saved tier to be `tier_6`.
