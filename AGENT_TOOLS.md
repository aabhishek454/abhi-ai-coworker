# Agent tools

A tool declares a unique name, description, Zod input schema, risk, timeout, retry count, and `execute(input, context)`. Registration is dynamic and duplicate names fail fast. Runtime validates model arguments, evaluates policy, creates approval for risky actions, executes with `AbortSignal`, normalizes errors, records redacted telemetry, and returns bounded output. Retries apply only to classified transient/idempotent failures. Destructive tools require explicit approval and an idempotency key.
