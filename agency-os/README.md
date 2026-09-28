# Soberano Agency OS

Multi-agent delivery system for building, configuring, testing and releasing technical projects with minimal manual intervention.

## Core principle
Agents do not "chat freely". They exchange structured tasks, evidence, artifacts and pass/fail decisions through a shared state store.

## Pipeline
1. Intake
2. Planner
3. Builder
4. Infra/DevOps
5. Integrator
6. QA
7. Security
8. Release
9. Monitor
10. Orchestrator closes the job only when every required gate passes.

## Shared state
Use Postgres/Supabase tables from `db/schema.sql`.

## Suggested runtime
- n8n = orchestration/event router
- Supabase/Postgres = shared state + audit log
- GitHub = source/artifacts/versioning
- Easypanel/VPS = runtime/deploy
- LLMs = agents
- Telegram/WhatsApp = human approval only for high-risk actions

## Human involvement
Only required for:
- credentials/2FA
- destructive operations
- paid purchases
- production secrets
- actions the runtime cannot technically access

Everything else should be automated and evidence-driven.
