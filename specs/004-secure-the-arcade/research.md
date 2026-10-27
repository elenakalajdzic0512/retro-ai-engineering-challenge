# Research: Secure the Arcade

**Date**: 2026-10-27
**Basis**: local repository and installed package inspection at baseline `e0ef30a1eddc9583a9894b79e10d53424d9f0b2a`; no live provider or dependency remediation.

## R01 — Tactical boundary and authority

**Decision**: Keep W08 centered on `POST /api/tactical-coach`, its existing two read-only tools, and the browser result. Treat the browser snapshot as validated but unverified input, without adding login, owner IDs, or storage.

**Rationale**: `server/index.ts` routes Tactical separately from Week 4 Hint and validates method/media/body/schema before provider construction (lines 126–177, 207–213). `server/tactical/contracts.ts` accepts exactly `goal,state`, a 240-code-point goal, and bounded internally consistent snapshot fields (lines 76–176). `server/tactical/tools.ts` declares exactly two tools and validates the request-scoped context. No persisted game store, auth middleware, cookies, or resource lookup exists in this flow.

**Alternatives considered**: Adding session/owner authorization or anti-cheat state. Rejected because it invents a resource model and expands the project beyond W08.

## R02 — Aggregate admission and events

**Decision**: Plan a per-process admission gate in the Tactical HTTP handler after request validation and before provider factory/orchestrator work: at most two active runs and five newly admitted runs per rolling 60 seconds. Keep state in a server-instance scope, with injected clock for deterministic tests; reserve and release active slots through all completion paths. Produce allowlisted security events for admission/rejection/completion.

**Rationale**: `server/index.ts` has body-size and schema rejection but no aggregate active/rate counters or security-event model. Existing `rate_limited` mapping describes provider failure, not HTTP admission. A browser-disabled button does not protect direct callers. Fixed categories, generated correlation ID, and numeric counts avoid logging raw input.

**Alternatives considered**: Per-IP or client-supplied identity limits, a distributed store, or a browser-only throttle. Rejected for the current single-process demo because they add false authority or unneeded infrastructure. This policy is not distributed production protection.

## R03 — Provider SDK and output boundary

**Decision**: Retain the orchestrator's one shared transient retry and four-attempt budget. In the Tactical Gemini adapter, set a server-owned output-token cap supported by the installed SDK and enforce the spec's 8192-byte normalized-outcome cap at the earliest application-controlled point, before proposal dispatch or final acceptance. Record this as a post-SDK bound. Keep SDK HTTP retry configuration absent or explicitly capped to one attempt after confirming the local API.

**Rationale**: `@google/genai` is locked/installed at 2.24.0. Local `dist/genai.d.ts` exposes `maxOutputTokens` and `httpOptions.retryOptions`; local `dist/node/index.mjs` performs one fetch when `retryOptions` is absent, while a supplied retry configuration can add attempts. Current `server/tactical/gemini-provider.ts` sends `abortSignal`, disables automatic function calling, and leaves output-token/HTTP retry options unset (around lines 207–223). `server/tactical/orchestrator.ts` owns the retry, timeout, and attempt counters (lines 193–246, 333–369). The SDK consumes/parses the HTTP response before `generateContent` resolves, so the application cannot claim a network-stream byte cap. The current adapter parses final `part.text` only after the SDK returns (lines 117–130, 223–237).

**Alternatives considered**: Claiming a pre-receive 8192-byte cap or replacing the SDK transport. Rejected because the installed API does not expose such a guarantee through the current adapter; a transport replacement is outside the smallest W08 change. Token count is a generation control, not a UTF-8 byte guarantee.

## R04 — Browser production profile

**Decision**: Use Vite's local production preview configuration as the narrow serving profile: production build, explicit preview `/api` proxy to the loopback API, and delivered CSP/security headers. Test it in a real browser. Candidate CSP for the audited app: `default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; style-src 'self'; img-src 'self' data:; connect-src 'self'`. Verify each directive against the built assets before finalizing; do not add `unsafe-eval` or inline-script allowance without observed need.

**Rationale**: `vite.config.js` currently configures only `server.proxy`; installed Vite types show `PreviewOptions` extends `CommonServerOptions`, including `proxy` and `headers` (`node_modules/vite/dist/node/index.d.ts`, around lines 564–667). `index.html` uses an external module script, no inline script or meta CSP. `src/main.js` uses relative `/api`; `src/tactical-ui.js` renders with `textContent`. Current tests use a DOM stub, not a real browser. There is no current production header profile. Vite preview is a local validation profile, not a public deployment.

**Alternatives considered**: CSP meta tag (cannot cover every desired directive, notably frame ancestry), new general-purpose production server, or broad UI rewrite. Rejected as weaker or larger than needed for this local profile.

## R05 — Minimal browser harness and controlled CSP proof

**Decision**: Plan a small Playwright test harness as a development-only addition, limited to T04/T05/T16 and the positive W05 path. Start the local API and Vite preview from a built artifact. Inspect actual DOM, script marker, delivered response headers, and CSP violation. For T16, serve an accessible controlled script on a second loopback origin; confirm its HTTP 200 availability and execution in a no-CSP control, then show the production CSP `script-src 'self'` blocks it with a violation and leaves its marker unset.

**Rationale**: No browser automation package or real-browser test harness is in `package.json`/lockfile. `tests/tactical-ui.test.js` uses a custom DOM stub, which cannot establish browser CSP enforcement. One dev dependency plus a small config/test file is narrower than replacing the existing Node unit suite. Browser binaries/setup and local listener permissions must be documented in quickstart; no package is installed during planning.

**Alternatives considered**: Existing DOM stub alone or 404-based probe. Both fail to prove actual browser policy; a 404 would not identify CSP as the blocker.

## R06 — CORS/CSRF and dependency evidence

**Decision**: Under the audited local/demo profile, classify privileged CSRF as not applicable because no cookie/session/ambient credential grants authority. Keep direct HTTP abuse in scope through validation and aggregate admission. In development Vite proxies relative `/api` to loopback API; configure the production preview proxy explicitly so browser requests stay same-origin. Do not enable broad CORS. Reassess origin/credential policy if serving changes. Plan a read-only `npm audit` against the lockfile, separate runtime and dev findings, document exposure/disposition, and never blindly run `npm audit fix --force`.

**Rationale**: `vite.config.js` has a dev-only proxy, `src/tactical-ui.js` posts relative `/api`, and `server/index.ts` has no auth/cookie/token processing or CORS headers. The lockfile records the resolved dependency graph; `package.json` separates `@google/genai` runtime from Vite/TypeScript dev dependencies. A clean dependency audit does not prove request, tool, or browser logic safe.

**Alternatives considered**: Adding login/cookies/CSRF tokens solely for the assignment, or treating CORS as authentication. Both misrepresent the current architecture.

## Open research limitations

- The production preview proxy/header behavior must be demonstrated in the later browser test; local Vite type support alone does not prove delivered headers.
- SDK maximum output token value must be selected and tested against normal fake/stubbed Tactical plans; it cannot substitute for application byte validation.
- A package advisory snapshot requires an actual future audit run and network/registry availability. No audit result is claimed here.
