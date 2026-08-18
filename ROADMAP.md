# Development roadmap

## Phase gates
- [x] **1 — Foundation:** environment inspection, monorepo, architecture, schemas, provider/tool boundaries, original virtual-office vertical slice.
- [~] **2 — Backend/database:** Prisma model complete; migrations, repositories, Redis, tenant authorization, audit log pending.
- [~] **3 — Agent runtime:** bounded contracts and cancellation demo complete; production planner, budget/loop detection, durable checkpoints pending.
- [ ] **4 — Arena provider:** blocked on official Arena model API schema or user-supplied configuration. Do not guess endpoints.
- [~] **5 — Tools:** registry complete; sandboxed web/search/files/calculator implementations pending.
- [~] **6–8 — Web, office, realtime:** functional vertical slice complete; auth, approvals, reconnect cursors, task detail pending.
- [ ] **9 — Memory/files:** quarantine pipeline, extraction, embeddings, explicit memory controls.
- [~] **10 — Android:** native Compose shell complete; repository/auth/SSE/notifications/tests pending.
- [ ] **11 — FCM:** device token lifecycle and preference routing.
- [ ] **12 — Hardening:** threat model closure, CSRF/rate limits, RLS, secret rotation, malware scanning.
- [ ] **13 — Testing:** API/provider/runtime integration, Playwright, Compose UI, load and failure tests.
- [ ] **14 — Deployment:** containers, migrations, worker autoscaling, backups, SLO dashboards.

A phase advances only after build, tests, security checks, and acceptance criteria pass. External credentials are never needed for demo development.
