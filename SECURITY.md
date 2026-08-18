# Security

## Required before production
Use OIDC/passkeys or Argon2id credentials, rotating HttpOnly Secure SameSite cookies, origin/CSRF checks, per-user authorization on every query, PostgreSQL RLS, rate limits, strict MIME/size checks, quarantine + malware scanning, object-store signed URLs, KMS envelope encryption for provider keys, redacted structured logs, and immutable audit events.

High-risk tools are denied by default and require a persisted, expiring approval. Approval payload hashes prevent post-approval mutation. Code execution must run in an isolated disposable sandbox with no host socket, read-only base image, non-root UID, seccomp, egress policy, CPU/memory/time quotas, and output caps. Never pass untrusted text to a shell.

Current status: secrets are server-only; `.env` is ignored; inputs are schema-validated; security headers and body limits are enabled. Authentication, persistent authorization, uploads, and live tools are intentionally not represented as production-ready yet.
