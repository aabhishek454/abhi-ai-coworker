# Deployment

Target topology: CDN → web; load balancer → stateless API; PostgreSQL HA; Redis; separate worker pool; S3-compatible quarantined/clean buckets; KMS/secret manager; FCM. Run migrations as a one-shot release job. Workers use graceful shutdown and lease renewal. Health checks distinguish liveness/readiness. Back up PostgreSQL and test restores. Set CSP, TLS/HSTS, allowed origins, request limits, and private service networking. Canary runtime/provider changes and alert on queue age, task failures, model/tool latency, token spend, and SSE disconnects.
