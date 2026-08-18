# API

Current development endpoints: `GET /api/health`, `GET /api/agent/status`, `GET|POST /api/tasks`, `GET /api/tasks/:id`, `POST /api/tasks/:id/{pause,resume,cancel}`, `GET /api/messages`, and `GET /api/events` (SSE).

Task creation body: `{ "description": "…", "title"?: "…", "priority"?: "low|normal|high" }`.

Production endpoints are authenticated and user-scoped. SSE supports `Last-Event-ID`, heartbeat, event replay, and event types `agent.status`, `task.*`, `tool.*`, `approval.required`, and `message.*`. Errors use stable codes and correlation IDs; no stack traces are sent to normal clients.
