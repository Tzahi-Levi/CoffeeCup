# CoffeeCup — Logging Audit Report

**Date**: 2026-03-26
**Auditor**: Logging Agent
**Scope**: `backend/src/server.ts`, `frontend/src/app/services/coffee.service.ts`, `frontend/src/app/components/coffee-form-page/coffee-form-page.component.ts`, `frontend/src/main.ts`

---

## Summary

| Severity | Count | Status |
|---|---|---|
| High | 2 | Fixed inline |
| Medium | 3 | Documented — action recommended |
| Low | 2 | Documented |

---

## Findings

---

### [HIGH-1] Silent swallowed error in `loadFromStorage()`

- **Severity**: High
- **File**: `frontend/src/app/services/coffee.service.ts:83`
- **Issue**: The `catch` block was completely empty (`catch { return []; }`). If `localStorage` contains corrupt data (e.g., after a failed write or manual tampering), `JSON.parse` throws a `SyntaxError` and the service silently resets to an empty list. From the user's perspective their entire coffee library vanishes with zero diagnostic information. There is no way to detect this failure in DevTools, in a bug report, or during a future migration.
- **Recommended fix**: Catch the error as a named variable and emit a `console.error` with the storage key and error message. Do **not** log the raw storage value — it would expose the full coffee list (names, notes, ratings) in the console.
- **Status**: **Fixed.** The catch block now reads:
  ```typescript
  } catch (err) {
    // Log parse failure so data-loss events are visible in DevTools; intentionally
    // omits raw storage value to avoid exposing user coffee data in logs.
    console.error('[CoffeeService] Failed to parse localStorage data — starting with empty list.', {
      key: STORAGE_KEY,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
  ```

---

### [HIGH-2] 500 error handler logs no request context

- **Severity**: High
- **File**: `backend/src/server.ts:40`
- **Issue**: The global error handler was:
  ```typescript
  console.error('[Server Error]', err.message);
  ```
  Two problems: (1) It logs only `err.message`, discarding the stack trace entirely. Stack traces are essential for diagnosing where in the middleware chain the error originated. (2) It ignores the `req` parameter, so there is no record of which HTTP method or URL triggered the 500. In production this means a server crash produces a log line like `[Server Error] Cannot read properties of undefined` with no way to reproduce or locate the fault.
- **Recommended fix**: Accept `req` (not `_req`) and emit a structured JSON log containing `method`, `url`, `error`, `stack`, and `timestamp`.
- **Status**: **Fixed.** The handler now emits:
  ```typescript
  console.error(JSON.stringify({
    level: 'error',
    message: 'Unhandled server error',
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  }));
  ```

---

### [MEDIUM-1] `saveToStorage` has no error handling

- **Severity**: Medium
- **File**: `frontend/src/app/services/coffee.service.ts:94`
- **Issue**: `localStorage.setItem()` can throw a `QuotaExceededError` (DOMException) when storage is full, or throw in private browsing on some browsers. Currently this exception propagates uncaught up through `addCoffee`, `updateCoffee`, and `deleteCoffee`, where it will be reported by Angular's global error handler with no useful context. The data mutation has already been applied to the `BehaviorSubject` in memory, so the UI shows the change while storage silently failed — a subtle data inconsistency.
- **Recommended fix**:
  ```typescript
  private saveToStorage(coffees: CoffeeEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(coffees));
    } catch (err) {
      // Intentionally omits coffee content to avoid logging user data.
      console.error('[CoffeeService] Failed to persist data to localStorage.', {
        key: STORAGE_KEY,
        entryCount: coffees.length,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  ```
  Consider surfacing a user-visible warning via a toast/snackbar in a future iteration.

---

### [MEDIUM-2] Silent redirect on unknown edit ID

- **Severity**: Medium
- **File**: `frontend/src/app/components/coffee-form-page/coffee-form-page.component.ts:55`
- **Issue**: When the route contains an ID that `CoffeeService.getCoffeeById()` cannot find, the component silently calls `this.router.navigate(['/'])` with no log. This makes it impossible to distinguish a stale bookmark (benign) from a routing bug or a future API mismatch (actionable). During development it is a silent failure.
- **Recommended fix**:
  ```typescript
  } else {
    console.warn('[CoffeeFormPage] No entry found for edit ID — redirecting to library.', { editId: this.editId });
    this.router.navigate(['/']);
  }
  ```
  The entry ID itself is a UUID (not PII) and is safe to log.

---

### [MEDIUM-3] Startup log omits environment and distribution path

- **Severity**: Medium
- **File**: `backend/src/server.ts:54`
- **Issue**: The startup message `CoffeeCup server running on http://localhost:${PORT}` is adequate for local development but unhelpful in a deployment environment. When `PORT` comes from an environment variable there is no confirmation of what environment is running or whether the static asset directory resolved correctly.
- **Recommended fix**:
  ```typescript
  app.listen(PORT, () => {
    console.log(JSON.stringify({
      level: 'info',
      message: 'CoffeeCup server started',
      port: PORT,
      env: process.env['NODE_ENV'] ?? 'development',
      distDir: DIST_DIR,
      timestamp: new Date().toISOString(),
    }));
  });
  ```

---

### [LOW-1] Bootstrap error logged with no context message

- **Severity**: Low
- **File**: `frontend/src/main.ts:6`
- **Issue**: `bootstrapApplication(...).catch((err) => console.error(err))` logs the raw error object. For Angular bootstrap failures this is often a `NullInjectorError` or a missing provider. Without a wrapping message, a developer scanning the console must infer what the error relates to.
- **Recommended fix**:
  ```typescript
  .catch((err) => console.error('[Bootstrap] Angular application failed to start.', err));
  ```

---

### [LOW-2] Health check correctly produces no logs

- **Severity**: Low (informational — no action required)
- **File**: `backend/src/server.ts:29`
- **Issue**: None. The `/health` endpoint responds without logging, which is the correct behaviour. Health checks are called frequently by load balancers and uptime monitors; logging each one would create log storms in production.
- **Status**: Correct as-is. Document in style guide.

---

## PII / Sensitive Data Assessment

The `CoffeeEntry` model contains: `name`, `origin`, `notes`, `rating`, `grindLevel`, `doseGrams`, `brewTimeSeconds`. None of these are legally PII (no emails, phone numbers, government IDs, or financial data). However, `name` and `notes` are free-text user content that could contain personal information depending on how the user writes them (e.g., "my dad's favourite bean", tasting notes with location names).

**Ruling**: No logging statements in the audited files expose any coffee entry content. The fix applied to `loadFromStorage` was explicitly designed to omit the raw storage value. The `saveToStorage` medium fix recommendation also omits content. This is the correct posture.

No PII escalation to `security-auditor` is required.

---

## Changes Made

| File | Change |
|---|---|
| `backend/src/server.ts` | Replaced bare `console.error('[Server Error]', err.message)` with a structured JSON log including `method`, `url`, `error`, `stack`, and `timestamp`. Renamed `_req` to `req` to make the parameter available. |
| `frontend/src/app/services/coffee.service.ts` | Replaced empty `catch {}` in `loadFromStorage()` with a named catch that logs the storage key and error message without exposing stored data. |

## Files Created

- `C:\Users\Tazac\Documents\Coding\CoffeeCup\logs\logging-audit.md` (this file)
- `C:\Users\Tazac\Documents\Coding\CoffeeCup\logs\logging-guide.md`

---

## Verdict

**APPROVED_WITH_NOTES**

The two High severity issues (silent `catch {}` data-loss swallow and context-free 500 error logging) have been fixed directly. Three Medium issues and two Low issues are documented with precise recommended fixes ready for the backend engineer to apply. No PII or secrets are exposed in any logging path. No log storms or debug-level logs in production paths were found.
