# Architecture

## System shape

```text
Web (React) ─┐
             ├─ HTTPS API / authenticated SSE ─ API ─ PostgreSQL
Android ─────┘                              │       └ object storage
                                           ├─ Redis/BullMQ ─ workers
                                           └─ Agent runtime
                                               ├─ provider registry → Arena/other provider
                                               ├─ tool registry → isolated tools
                                               ├─ approval policy
                                               └─ event/audit sink
```

## Boundaries
- **Clients** render safe activity summaries only; model secrets and chain-of-thought never reach clients.
- **API** authenticates, authorizes per-user resources, validates input, creates jobs, and streams user-scoped events.
- **Worker** owns leases, cancellation, retries, budgets, and bounded agent loops. Web processes never run long tasks.
- **Runtime** is provider-agnostic. `ModelProvider.stream()` emits normalized text, tool calls, and usage.
- **Tools** are registered dynamically with schemas, risk, timeout, retry policy, and an abort signal.
- **Persistence** is tenant-scoped by `userId`; production adds PostgreSQL row-level security as defense in depth.

## Runtime state machine
`QUEUED → PLANNING → RUNNING ↔ PAUSED → COMPLETED|FAILED|CANCELLED`; risky tool calls transition to `WAITING_FOR_APPROVAL`. Limits default to 12 model iterations, 20 calls, and 15 minutes. Repeated action signatures trigger loop detection.

## Current slice versus target
The current API uses an in-memory adapter and deterministic demo provider to make the vertical slice runnable without credentials. Next, repository interfaces replace the adapter with Prisma and queue execution with BullMQ. The UI and API event contracts remain stable.
