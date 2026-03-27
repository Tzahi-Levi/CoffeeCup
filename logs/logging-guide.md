# CoffeeCup — Logging Style Guide

**Version**: 1.0
**Date**: 2026-03-26
**Stack**: Node.js 20 + Express 4 (backend) / Angular 17 standalone components (frontend)
**Logging libraries**: `console` (no external library — intentional for this single-user app)

---

## 1. Overview and Philosophy

CoffeeCup is a single-user personal app with no authentication layer and no backend database. Its logging goals are therefore modest but specific:

1. **Operational visibility**: The Express server should leave a clear trail of startup state and any 500-class failures so that production issues can be diagnosed from process logs alone.
2. **Developer experience**: The Angular frontend should log anomalies (storage failures, unexpected navigation states) at a level visible in DevTools without polluting the console during normal usage.
3. **Data hygiene**: Even though this app has no legally-defined PII today, user-authored content (coffee names, tasting notes) must never appear in log output.
4. **No external dependency**: `console` is the logging surface. If the app grows to require log aggregation (e.g., Datadog, CloudWatch), migrate to Pino (backend) and a thin Angular logger service (frontend) at that time. See Section 2.

The rule of thumb: **if a developer would want to know about it at 2am, it should be logged. If it happens on every request, it should not.**

---

## 2. Logging Library and Setup

### Backend

The backend uses `console.error` / `console.log` with manually serialised JSON. This is adequate for a static-file server. If backend logic grows, replace with **Pino**:

```bash
npm install pino pino-pretty
```

```typescript
// backend/src/logger.ts
import pino from 'pino';
export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  base: { service: 'coffeecup-server' },
});
```

Until then, all `console` calls must serialize structured objects — not concatenated strings:

```typescript
// Correct
console.error(JSON.stringify({ level: 'error', message: '...', url: req.url, timestamp: new Date().toISOString() }));

// Wrong
console.error('Error at ' + req.url + ': ' + err.message);
```

### Frontend

No logging library. Use `console.error` / `console.warn` only for anomaly detection. Do not use `console.log` in committed code (use only for temporary debugging, remove before commit).

If a structured frontend logger is ever needed, a thin Angular service is preferred over a third-party library:

```typescript
// frontend/src/app/services/logger.service.ts (future)
@Injectable({ providedIn: 'root' })
export class LoggerService {
  error(message: string, context?: Record<string, unknown>): void {
    console.error(`[${message}]`, context ?? {});
  }
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[${message}]`, context ?? {});
  }
}
```

---

## 3. Log Levels — Definitions and When to Use

| Level | `console` method | When to use | Examples |
|---|---|---|---|
| `INFO` | `console.log` | Normal operational events. Emitted once, not per-request. | Server started, config loaded |
| `WARN` | `console.warn` | Unexpected but recoverable. User can still proceed. | Entry not found → redirect, storage quota near limit |
| `ERROR` | `console.error` | Failure requiring developer attention. Data loss risk or user-visible breakage. | `JSON.parse` failure, 500 server error, bootstrap failure |
| `DEBUG` | not committed | Temporary developer diagnostics only. Must be removed before merge. | — |

**Never** use `ERROR` for events that are part of normal flow (e.g., a user navigating to a non-existent route is a `WARN`, not an `ERROR`).

---

## 4. Structured Log Format — Required Fields

### Backend (all `console.error` / `console.log` calls)

Every log statement must produce a JSON object with at minimum:

```typescript
{
  level: 'info' | 'warn' | 'error',
  message: string,           // human-readable, action-oriented sentence
  timestamp: string,         // new Date().toISOString() — always UTC
  // plus relevant context fields, see Section 5
}
```

Example — startup:
```typescript
console.log(JSON.stringify({
  level: 'info',
  message: 'CoffeeCup server started',
  port: PORT,
  env: process.env['NODE_ENV'] ?? 'development',
  distDir: DIST_DIR,
  timestamp: new Date().toISOString(),
}));
```

### Frontend

Frontend logs do not need full JSON — they appear in DevTools, not a log aggregation platform. Use a bracketed component prefix and a context object as the second argument:

```typescript
console.error('[CoffeeService] Failed to parse localStorage data — starting with empty list.', {
  key: STORAGE_KEY,
  error: err instanceof Error ? err.message : String(err),
});
```

The prefix format is `[ComponentOrServiceName]` — capitalised, matching the class name.

---

## 5. Contextual Logging — How to Propagate Context

CoffeeCup has no authentication and no distributed tracing requirement today. Context rules are therefore simple:

**Backend**: Always include `method` and `url` on any request-scoped log. Access these from the `req` object — never prefix the error handler parameter with `_` if you need it.

```typescript
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(JSON.stringify({
    level: 'error',
    message: 'Unhandled server error',
    method: req.method,   // 'GET', 'POST', etc.
    url: req.url,         // '/health', '/api/...' etc.
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  }));
});
```

**Frontend**: Include the relevant entity ID (e.g., `editId`) and the service key (`STORAGE_KEY`) as context. Do not include entry content.

```typescript
console.warn('[CoffeeFormPage] No entry found for edit ID — redirecting to library.', { editId: this.editId });
```

If a future version adds user sessions or request IDs, add `requestId` / `sessionId` fields to every log entry and propagate via Angular `HttpInterceptor` or Express middleware.

---

## 6. Error Logging — Standards and Examples

### Always catch errors by name

```typescript
// Correct
} catch (err) {
  console.error('[CoffeeService] Failed to parse localStorage data.', {
    error: err instanceof Error ? err.message : String(err),
  });
}

// Wrong — loses the error entirely
} catch {
  return [];
}
```

### Always include the stack trace on the backend

```typescript
// Correct
console.error(JSON.stringify({ ..., error: err.message, stack: err.stack }));

// Wrong — stack discarded, impossible to locate the fault
console.error('[Server Error]', err.message);
```

### Do not stringify the error into the message

Keep `message` human-readable and put the error detail in a separate `error` field:

```typescript
// Correct
{ message: 'Failed to persist data to localStorage', error: err.message }

// Wrong
{ message: `Failed to persist data to localStorage: ${err.message}` }
```

Separating these fields allows log aggregation tools to group by message template without unique error text polluting the grouping key.

---

## 7. Sensitive Data — What Never to Log and Masking Rules

### Fields that must never appear in any log statement

| Field | Reason |
|---|---|
| `coffees` / any `CoffeeEntry[]` array | Contains user-authored content (names, notes) |
| `entry.name` | User-authored, potentially personal |
| `entry.notes` | Free-text, highest risk of personal content |
| `entry.rating` | User preference data |
| `raw` (raw localStorage string) | Contains full serialised coffee list |
| Any form `payload` object | Contains all of the above |

### What is safe to log

- `entry.id` (UUID — no personal information)
- `STORAGE_KEY` (constant string `"coffeecup_v1"`)
- `entryCount` (count of entries, not their content)
- HTTP `method` and `url` (no query string parameters that might contain user data)
- Error messages and stack traces (these do not contain coffee data)
- `editId` from route params (UUID)

### The allowlist principle

When uncertain whether a field is safe, omit it. Log the minimum context needed to reproduce the problem. If you need more detail for debugging, add a temporary `console.log` locally and remove it before committing.

---

## 8. Performance Considerations — Avoiding Log Noise

1. **Health checks must not log.** The `/health` endpoint is polled by monitors potentially every 10–30 seconds. A log entry per poll produces thousands of lines per day with zero diagnostic value. The current implementation (no logging in the handler) is correct.

2. **No logging inside RxJS operators or filter callbacks.** `filteredCoffees$` runs on every keystroke in the search bar. Any log inside the `map` or `filter` would fire dozens of times per second.

3. **No logging in `ngOnChanges` or `ngDoCheck`** unless behind a debug flag that is never committed.

4. **`saveToStorage` and `loadFromStorage` are called on every mutation.** Keep log statements in these methods to error cases only — never log on the happy path.

5. **Remove all `console.log` before committing.** Use ESLint rule `no-console` (or `no-console: ['error', { allow: ['warn', 'error'] }]`) to enforce this at the tooling level. This project does not yet have this configured — consider adding it.

---

## 9. Examples — Good vs. Bad Log Statements

### Backend — 500 error handler

```typescript
// GOOD: structured, has request context, has full stack
console.error(JSON.stringify({
  level: 'error',
  message: 'Unhandled server error',
  method: req.method,
  url: req.url,
  error: err.message,
  stack: err.stack,
  timestamp: new Date().toISOString(),
}));

// BAD: no context, no stack, not structured
console.error('[Server Error]', err.message);
```

### Backend — startup

```typescript
// GOOD: structured, includes env and dist path for deployment verification
console.log(JSON.stringify({
  level: 'info',
  message: 'CoffeeCup server started',
  port: PORT,
  env: process.env['NODE_ENV'] ?? 'development',
  distDir: DIST_DIR,
  timestamp: new Date().toISOString(),
}));

// BAD: useful locally, useless in deployment
console.log(`CoffeeCup server running on http://localhost:${PORT}`);
```

### Frontend — storage parse failure

```typescript
// GOOD: component prefix, error detail, no user data
console.error('[CoffeeService] Failed to parse localStorage data — starting with empty list.', {
  key: STORAGE_KEY,
  error: err instanceof Error ? err.message : String(err),
});

// BAD: silent swallow — data loss is invisible
} catch {
  return [];
}

// BAD: logs user content
console.error('Storage error', { raw, err });
```

### Frontend — unexpected navigation

```typescript
// GOOD: warn level (recoverable), includes the safe ID field
console.warn('[CoffeeFormPage] No entry found for edit ID — redirecting to library.', { editId: this.editId });

// BAD: no log at all — silent redirect hides routing bugs
this.router.navigate(['/']);
```

### Frontend — debug log (never commit)

```typescript
// GOOD: fine for local debugging session
console.log('form value:', this.form.value);

// REQUIREMENT: must be removed before git commit
```

---

## 10. Checklist — Pre-Merge Logging Review

Before marking a PR ready for review, verify:

- [ ] No `console.log` statements in committed code (debug logs removed)
- [ ] Every `catch` block either re-throws or logs — no empty `catch {}`
- [ ] No coffee entry content (`name`, `notes`, `payload`, `raw`) appears in any log argument
- [ ] Backend log statements emit JSON objects, not concatenated strings
- [ ] Frontend log statements use the `[ComponentName]` prefix
- [ ] Error logs include the error message (`err.message`) and, on the backend, `err.stack`
- [ ] No logging inside tight loops, RxJS `map`/`filter` operators, or Angular lifecycle hooks that fire on every change detection cycle
- [ ] The `/health` route handler contains no `console` calls
- [ ] Any new `console.warn` or `console.error` uses the correct level (warn = recoverable, error = needs attention)
