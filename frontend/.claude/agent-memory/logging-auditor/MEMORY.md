# Logging Auditor Memory — CoffeeCup

## Project Stack
- Backend: Node.js 20 + Express 4, no logging library — raw `console` with JSON.stringify
- Frontend: Angular 17 standalone, no logging library — `console.error`/`console.warn` only
- Storage: localStorage key `coffeecup_v1` (no backend DB)

## Logging Library Decision
No external library (Pino, Winston, etc.) — intentional for single-user app scale.
If added, Pino is the recommended backend choice. Angular logger service pattern documented in guide.

## Required Log Fields
- Backend: `level`, `message`, `timestamp` (ISO 8601), plus request-scoped `method` + `url` where available
- Frontend: `[ComponentName]` prefix, error message, safe context fields (IDs, keys, counts)

## Safe vs Sensitive Fields
- SAFE to log: `entry.id` (UUID), `STORAGE_KEY`, `entryCount`, HTTP `method`/`url`, error messages, stack traces, route param IDs
- NEVER log: `entry.name`, `entry.notes`, `entry.rating`, any `CoffeeEntry[]` array, raw localStorage string, form `payload` objects

## Known Anti-Patterns Found (first audit 2026-03-26)
- Empty `catch {}` in `loadFromStorage` — FIXED
- 500 handler discarding stack + request context — FIXED
- `saveToStorage` has no error handling (QuotaExceededError path) — MEDIUM, documented
- Silent redirect on unknown edit ID in CoffeeFormPage — MEDIUM, documented

## Health Check Rule
The `/health` route must never log — it is polled by monitors. No logging in that handler is correct.

## No-console Lint Rule
Project does not yet have ESLint `no-console` configured. Recommend adding to enforce no `console.log` commits.

## Style Guide Location
`C:\Users\Tazac\Documents\Coding\CoffeeCup\logs\logging-guide.md`

## Audit Report Location
`C:\Users\Tazac\Documents\Coding\CoffeeCup\logs\logging-audit.md`
