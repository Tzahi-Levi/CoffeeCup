# Security Audit Report

**Date**: 2026-03-26
**Application**: CoffeeCup
**Auditor**: Security Auditor Agent
**Scope**: Frontend Angular application (`frontend/src/app/`), backend Express server (`backend/src/server.ts`), and dependency manifests (`frontend/package.json`, `backend/package.json`)

## Executive Summary

CoffeeCup is a client-side coffee tracking SPA with an Express static file server. The overall security posture is **good** for an application of this scope. No Critical or High severity vulnerabilities were identified. The codebase uses Angular's built-in XSS protections correctly (all interpolation via `{{ }}`, no `innerHTML` or `bypassSecurityTrust`), form validation is thorough with server-compatible constraints, and the backend has a well-configured Helmet CSP. Findings are limited to Medium and Low severity hardening opportunities.

## Findings Summary

| ID      | Severity | Title                                                    | Status |
|---------|----------|----------------------------------------------------------|--------|
| SEC-001 | Medium   | CSP allows `unsafe-inline` for styles                    | Open   |
| SEC-002 | Medium   | Rating field lacks min/max validation                    | Open   |
| SEC-003 | Low      | `express.static` serves without cache-control headers    | Open   |
| SEC-004 | Low      | localStorage data not integrity-checked on load          | Open   |
| SEC-005 | Low      | No `Permissions-Policy` header configured                | Open   |
| SEC-006 | Low      | Health endpoint exposes server timestamp                  | Open   |

## Detailed Findings

### SEC-001 -- CSP allows `unsafe-inline` for styles

**Severity**: Medium
**Category**: Transport & API Security (CSP)
**Location**: `backend/src/server.ts:16`
**OWASP Reference**: A05:2021 -- Security Misconfiguration

**Description**:
The Content Security Policy `styleSrc` directive includes `'unsafe-inline'`, which weakens CSP protection against CSS injection attacks. An attacker who can inject HTML attributes (e.g., via a future stored XSS vector) could use inline styles to exfiltrate data via CSS-based side channels or deface the UI.

This is currently mitigated by the fact that Angular escapes all template interpolation and no `innerHTML` or `bypassSecurityTrust` usage exists in the codebase. However, `unsafe-inline` in styleSrc should still be tightened when feasible.

**Vulnerable Code**:
```typescript
styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
```

**Remediation**:
Replace `'unsafe-inline'` with nonce-based or hash-based style loading. If Angular's component styles require inline `<style>` tags at build time, generate a CSP nonce and inject it into the HTML template at serve time. Alternatively, if all styles can be served as external files, remove `'unsafe-inline'` entirely.

Note: Angular often injects component styles as inline `<style>` elements, making full removal of `unsafe-inline` non-trivial without a nonce strategy. This is a known Angular limitation. Documenting this as accepted risk is reasonable for the current threat model.

**Fixed Code** (nonce approach -- requires middleware changes):
```typescript
// This is the ideal direction but requires Angular build + serve nonce integration.
// For now, document as accepted risk if inline component styles are needed.
styleSrc: ["'self'", "'nonce-<generated>'", 'https://fonts.googleapis.com'],
```

---

### SEC-002 -- Rating field lacks min/max validation

**Severity**: Medium
**Category**: Input Validation
**Location**: `frontend/src/app/components/coffee-form-page/coffee-form-page.component.ts:36`
**OWASP Reference**: A03:2021 -- Injection (input validation gap)

**Description**:
The `rating` form control is initialized with `[null]` and no validators. While the star-rating UI component constrains choices to 1-5, a user can manipulate the form programmatically (via browser DevTools or by directly calling `form.patchValue({ rating: 999 })`) to inject arbitrary numeric values. Since this data is persisted to localStorage and rendered in the UI, invalid data could cause unexpected behavior.

The `onRatingChange` method accepts any number without bounds checking. The `onSubmit` method converts with `Number(raw['rating'])` without range validation.

**Vulnerable Code**:
```typescript
rating: [null]
```

**Remediation**:
Add `Validators.min(1)` and `Validators.max(5)` to the rating control. Also validate the rating value in `onSubmit` before persisting.

**Fixed Code**:
```typescript
rating: [null, [Validators.min(1), Validators.max(5)]]
```

---

### SEC-003 -- `express.static` serves without cache-control headers

**Severity**: Low
**Category**: Transport & API Security
**Location**: `backend/src/server.ts:26`
**OWASP Reference**: A05:2021 -- Security Misconfiguration

**Description**:
The `express.static` middleware is invoked without `Cache-Control` options. While this is not a direct vulnerability, properly configured caching headers prevent browsers from serving stale content after deployments and can avoid caching sensitive responses on shared machines.

**Vulnerable Code**:
```typescript
app.use(express.static(DIST_DIR));
```

**Remediation**:
Configure caching strategy. For hashed assets (JS/CSS bundles), use long-term caching. For `index.html`, use `no-cache` to ensure fresh SPA loads.

**Fixed Code**:
```typescript
app.use(express.static(DIST_DIR, {
  maxAge: '1y',          // hashed assets can be cached long-term
  immutable: true,
  index: false           // handle index.html separately via SPA fallback
}));
```

---

### SEC-004 -- localStorage data not integrity-checked on load

**Severity**: Low
**Category**: Data Integrity
**Location**: `frontend/src/app/services/coffee.service.ts:79-85`
**OWASP Reference**: A08:2021 -- Software and Data Integrity Failures

**Description**:
The `loadFromStorage()` method parses localStorage JSON with a try/catch (good), but performs a raw cast `as CoffeeEntry[]` without validating the shape of the parsed data. If localStorage is tampered with (e.g., by another script on the same origin, or by a user manually editing it), malformed objects could propagate through the application and cause runtime errors or unexpected UI behavior.

This is a client-only application with no server-side persistence, so the blast radius is limited to the user's own session.

**Vulnerable Code**:
```typescript
private loadFromStorage(): CoffeeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CoffeeEntry[]) : [];
  } catch {
    return [];
  }
}
```

**Remediation**:
Add runtime validation of the parsed data structure. At minimum, verify it is an array and each element has the required `id` and `name` fields. A lightweight approach:

**Fixed Code**:
```typescript
private loadFromStorage(): CoffeeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out any entries missing required fields
    return parsed.filter(
      (item: unknown): item is CoffeeEntry =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as CoffeeEntry).id === 'string' &&
        typeof (item as CoffeeEntry).name === 'string'
    );
  } catch {
    return [];
  }
}
```

---

### SEC-005 -- No `Permissions-Policy` header configured

**Severity**: Low
**Category**: Transport & API Security (Security Headers)
**Location**: `backend/src/server.ts:10-23`
**OWASP Reference**: A05:2021 -- Security Misconfiguration

**Description**:
The Helmet configuration does not set a `Permissions-Policy` (formerly `Feature-Policy`) header. This header restricts which browser features (camera, microphone, geolocation, etc.) the page can use. While CoffeeCup does not use these APIs, setting a restrictive policy is defense-in-depth against future code changes or third-party script injection.

Helmet v8 does not set `Permissions-Policy` by default.

**Remediation**:
Add a `Permissions-Policy` header via custom middleware or Helmet's `permissionsPolicy` option.

**Fixed Code**:
```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
    permissionsPolicy: {
      features: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
      },
    },
  })
);
```

---

### SEC-006 -- Health endpoint exposes server timestamp

**Severity**: Low
**Category**: Information Disclosure
**Location**: `backend/src/server.ts:30`
**OWASP Reference**: A01:2021 -- Broken Access Control (information leakage)

**Description**:
The `/health` endpoint returns the server's current timestamp in the response body. While this is standard for health checks, if exposed to the public internet, it reveals server clock information that could assist in timing attacks or fingerprinting. For a simple SPA file server, this is minimal risk.

**Vulnerable Code**:
```typescript
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

**Remediation**:
Either remove the timestamp or restrict the health endpoint to internal networks only (e.g., via middleware that checks `X-Forwarded-For` or binds to a separate internal port).

---

## OWASP Top 10 Coverage

| OWASP Category                             | Applicable? | Finding |
|--------------------------------------------|-------------|---------|
| A01:2021 Broken Access Control             | Minimal -- no auth, client-only app | SEC-006 (info leak) |
| A02:2021 Cryptographic Failures            | N/A -- no encryption, no passwords | -- |
| A03:2021 Injection                         | Reviewed -- Angular escapes all interpolation, no SQL/NoSQL | SEC-002 (input validation) |
| A04:2021 Insecure Design                   | N/A -- simple CRUD app | -- |
| A05:2021 Security Misconfiguration         | Reviewed | SEC-001, SEC-003, SEC-005 |
| A06:2021 Vulnerable Components             | Reviewed -- no known CVEs in pinned versions | -- |
| A07:2021 Auth Failures                     | N/A -- no authentication | -- |
| A08:2021 Data Integrity Failures           | Reviewed | SEC-004 |
| A09:2021 Logging & Monitoring Failures     | N/A for scope | -- |
| A10:2021 SSRF                              | N/A -- no server-side URL fetching | -- |

## Positive Security Observations

1. **XSS Protection**: All Angular templates use `{{ }}` interpolation, which auto-escapes HTML. No usage of `innerHTML`, `bypassSecurityTrust*`, or `DomSanitizer` was found anywhere in the application source.

2. **SPA Catch-All Route**: The backend's `app.get('*', ...)` handler uses `path.join(DIST_DIR, 'index.html')` with a hardcoded filename. This is safe from path traversal because the user-controlled `req.path` is never used to construct the file path.

3. **localStorage JSON.parse**: Already wrapped in try/catch in `coffee.service.ts:80-85`, preventing crashes from corrupted storage.

4. **Form Validation**: Comprehensive validators on all required fields with `maxLength`, `min`, and `max` constraints. Form submission is blocked when invalid (`this.form.invalid` check).

5. **Helmet CSP**: Restrictive `defaultSrc: ["'self'"]` with specific allowlists for fonts and images. `scriptSrc` does not allow `unsafe-inline` or `unsafe-eval`.

6. **No Hardcoded Secrets**: No API keys, tokens, passwords, or `.env` files found in the codebase. The only configuration is the `PORT` environment variable with a safe default.

7. **ID Generation**: Uses `crypto.randomUUID()` which produces cryptographically random UUIDs, preventing ID guessing.

8. **Error Handling**: Global error handler in Express does not leak stack traces or internal error details to the client.

9. **Dependencies**: Angular 17.3.x, Express 5.2.x, Helmet 8.1.x -- all are recent versions with no known critical CVEs as of the audit date.

## Recommendations

1. **Consider nonce-based CSP for styles** when Angular build tooling supports it, to eliminate `unsafe-inline` from `styleSrc`.

2. **Add runtime validation** to `loadFromStorage()` to ensure data integrity from localStorage (SEC-004 fix).

3. **Set `Permissions-Policy` header** to restrict browser feature access (SEC-005).

4. **If deploying publicly**, consider rate limiting on the Express server (currently not needed since there are no API mutation endpoints beyond static file serving).

## Out of Scope / Caveats

- **No authentication/authorization system exists** -- this is a client-only app with localStorage persistence. No server-side auth review was applicable.
- **No API mutation endpoints** -- the backend solely serves static files, so injection attacks against a database layer are not applicable.
- **Infrastructure security** (hosting, TLS configuration, DNS, container security) was not reviewed.
- **Third-party dependency deep audit** -- individual transitive dependencies in `node_modules` were not audited for supply chain risks beyond checking top-level version pins.

---

**Verdict**: **APPROVED**

No Critical or High severity findings. All identified issues are Medium or Low severity hardening opportunities that do not block delivery. The codebase demonstrates good security practices for its scope: Angular's built-in XSS protections are used correctly, the backend CSP is well-configured, form validation is thorough, and no secrets or unsafe patterns were found.
