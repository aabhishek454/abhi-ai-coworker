# ABHI — Your AI coworker

ABHI is an agent-first personal workspace: **user → task → plan → act → result**. This repository contains the responsive virtual-office web client, a native Jetpack Compose Android client, a realtime API, provider/tool SDKs, and production database design.

**Live:** https://abhi-psi-sand.vercel.app · **Repository:** https://github.com/aabhishek454/abhi-ai-coworker

## What works now

- Original responsive virtual office with visual `IDLE / THINKING / WORKING / BROWSING / COMPLETED / ERROR / WAITING` states
- Create, pause, resume, and cancel tasks through the API
- Server-Sent Events for agent status, task progress, and streaming answer chunks
- Bounded demo runtime clearly labels simulated output when no provider is configured
- Modular model-provider and tool contracts, duplicate-registration protection, timeouts/retry metadata
- PostgreSQL/Prisma production schema and native Android Compose foundation
- No undocumented Arena endpoint is assumed

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

Web: `http://localhost:5173` · API: `http://localhost:8787/api/health`

This first vertical slice intentionally uses an in-memory development store. Do not deploy it as production storage. See [ROADMAP.md](ROADMAP.md) and [SETUP.md](SETUP.md).
