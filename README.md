# SmartShift AI

Intelligent workforce scheduling SaaS MVP scaffold.

## Stack

- API: NestJS, TypeORM, PostgreSQL, Redis/BullMQ-ready
- Web: Next.js, React, Material UI
- Auth: JWT-ready login flow
- Tenancy: tenant-scoped entities and guards
- Domains: Core, Scheduling, Preference Bidding

## Run Locally

```bash
cp .env.example .env
docker compose up -d
npm install
npm run dev
```

API docs are exposed at:

```text
http://localhost:3001/api/docs
```

Web app runs at:

```text
http://localhost:3000
```

## Implemented MVP Modules

- Core system: tenants, users, organizations, departments, locations, feature flags, audit logs
- Auth: tenant-aware login and JWT payload structure
- Scheduling: periods, shifts, availability, assignments, greedy generation, conflict detection
- Bidding: bid windows, ranked bids, deterministic awards, fairness-ready scoring, decision logs
- Personnel requests: leave, expense, and advance workflows with manager approval and accounting handoff
- Web UI: admin dashboard, scheduling board, bidding screen, employees, rules/audit

## Scheduling Score

```text
assignment_score =
  seniority
  + preference_match
  - overwork_penalty
  + fairness_balance
  - conflict_penalty
```

Hard conflicts make an assignment ineligible.
