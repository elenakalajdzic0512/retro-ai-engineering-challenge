# Neon Breaker — Reliable AI Integration

Neon Breaker is a small Breakout-style browser game extended for **SITA AI Bootcamp — Week 04: Reliable AI Integration**.

The Week 04 addition is one explicitly triggered AI feature:

> **Ask AI for Hint** — the player requests a short gameplay hint based on the current game snapshot.

The AI integration is intentionally kept outside the real-time game loop. The browser sends a minimal snapshot to the TypeScript backend through `POST /api/ai`, and the backend communicates with the configured AI provider.

## Week 04 Scope

The frontend sends only:

```json
{
  "status": "playing",
  "score": 120,
  "lives": 2,
  "bricksRemaining": 28
}
```

The backend returns a runtime-validated response:

```json
{
  "hint": "Keep the paddle near the center.",
  "category": "movement"
}
```

Supported categories are:

- `movement`
- `timing`
- `strategy`
- `general`

The AI Hint feature does not directly modify gameplay state.

## Provider and Model

Real provider:

```text
Google Gemini
```

Model:

```text
gemini-3.5-flash-lite
```

SDK:

```text
@google/genai
```

The project also includes a deterministic **fake provider** for offline and automated testing.

The fake provider:
- requires no API key
- performs no external network request
- returns controlled scripted results
- supports deterministic success and failure testing
- records provider calls for assertions

The Gemini API key is used only by the backend and is never exposed to the browser.

## Setup

Requirements:

```text
Node.js 24.x
npm
```

Install dependencies:

```bash
npm ci
```

The reviewed Week 04 submission completed `npm ci` with **0 reported vulnerabilities**.

### Run Week 4 Hint with the local fake provider

Build the TypeScript backend:

```bash
npm run build:server
```

Start the backend:

```bash
npm run start:api
```

In another terminal, start the frontend:

```bash
npm run dev
```

The default example configuration is:

```env
AI_PROVIDER=fake
GEMINI_API_KEY=
```

The frontend uses the relative endpoint:

```text
/api/ai
```

which Vite proxies to the local backend.

`AI_PROVIDER=fake` configures Week 4 Hint. Tactical Coach has an independent provider setting and normally uses Gemini; use the explicit offline mode below to make both features deterministic.

### Run with Gemini

Create a local `.env` file:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=YOUR_LOCAL_GEMINI_API_KEY
```

Do not commit the `.env` file.

Build the backend:

```bash
npm run build:server
```

Start the backend:

```bash
npm run start:api
```

Then start the frontend in another terminal:

```bash
npm run dev
```

The Gemini API key remains available only to the backend process.

### Run Tactical Coach from the game

For normal use, ensure the local backend `.env` has `GEMINI_API_KEY` configured. Build the backend when needed, then start the normal API and frontend from the repository root in separate terminals:

```bash
npm run build:server
npm run start:api
```

```bash
npm run dev
```

Open the game and use **Run Tactical Coach**. Unset `TACTICAL_AI_PROVIDER` selects the real Gemini Tactical provider; `npm run dev:api` has the same default. Week 4 Hint keeps its separate `AI_PROVIDER` behavior, which defaults to fake. The API scripts load `.env` server-side with Node's `--env-file-if-exists=.env`; the key never belongs in browser or Vite code. If the key is missing, Coach returns a sanitized configuration error and does not switch to fake.

For deterministic offline/testing use with both features fake, explicitly start the API with:

```bash
AI_PROVIDER=fake TACTICAL_AI_PROVIDER=fake npm run start:api
```

An explicit `TACTICAL_AI_PROVIDER=gemini` also selects the real Tactical provider. Unknown modes return a sanitized configuration error. Provider selection remains server-only.

## Test and Build Commands

Run the complete automated test suite:

```bash
npm test
```

Run strict backend TypeScript checking:

```bash
npm run typecheck
```

Build the TypeScript backend:

```bash
npm run build:server
```

Build the frontend for production:

```bash
npm run build
```

Start the frontend development server:

```bash
npm run dev
```

Start the backend development process:

```bash
npm run dev:api
```

The reviewed Week 04 implementation recorded:

```text
86 tests
86 passed
0 failed
0 skipped
```

## Architecture

```text
Browser
   ↓
POST /api/ai
   ↓
TypeScript backend
   ↓
runtime request validation
   ↓
AI orchestration
   ↓
Gemini / fake provider
   ↓
runtime output validation
   ↓
{ hint, category }
   ↓
Browser UI
```

The browser never calls Gemini directly.

## Security and Secrets

`GEMINI_API_KEY` is server-side only.

The browser never receives the key and does not import the Gemini SDK.

Local `.env` files are ignored by Git, while `.env.example` contains only an empty placeholder.

Week 04 security verification documented:

```text
CURRENT_TRACKED_KEY_LEAK=NONE
GIT_HISTORY_KEY_LEAK=NONE
DIST_KEY_LEAK=NONE
FRONTEND_PROVIDER_REFERENCE=NONE
```

Real API keys must never be committed to the repository.

## Final Week 04 Reference

Reviewed `main` commit:

```text
1cfbdbd14580f56c0ea3509ddb44b92aa88e7741
```

Merge:

```text
Week 4: Neon Breaker reliable AI integration
```

Final verified local result:

```text
npm ci               PASS
npm run typecheck    PASS
npm run build:server PASS
npm test             PASS — 86/86
npm run build        PASS
```

No automated test requires a real Gemini API key.

## Limited Live Gemini Validation

A deliberate live backend request was executed with:

```text
Provider: Google Gemini
Model: gemini-3.5-flash-lite

status=ready
score=0
lives=3
bricksRemaining=40
```

Observed result:

```text
HTTP 200 OK
```

Validated application response:

```json
{
  "hint": "Launch the ball to begin breaking the remaining forty bricks.",
  "category": "general"
}
```

A separate manual browser check also confirmed the real end-to-end flow:

```text
Browser
→ TypeScript backend
→ Gemini
→ runtime validation
→ AI Hint UI
```

Live-provider validation is documented separately from deterministic automated testing.

## Main Project Structure

```text
src/
  game.js
  main.js
  style.css

server/
  index.ts
  contracts.ts
  tools.ts
  ai/
    contracts.ts
    orchestrator.ts
    fake-provider.ts
    gemini-provider.ts

tests/
  api.test.js
  contracts.test.js
  fake-provider.test.js
  game.test.js
  gemini-provider.test.js
  orchestration.test.js
  tools.test.js

docs/
  EVALS_W04.md
  EVIDENCE_W04.md
  AI_USAGE_LOG.md

specs/
  001-neon-breaker-ai-hint/
```

## Week 04 Documentation and Evidence

### Specification and implementation

- [Feature specification](specs/001-neon-breaker-ai-hint/spec.md)
- [Implementation plan](specs/001-neon-breaker-ai-hint/plan.md)
- [Implementation tasks](specs/001-neon-breaker-ai-hint/tasks.md)
- [Data model](specs/001-neon-breaker-ai-hint/data-model.md)
- [API contract](specs/001-neon-breaker-ai-hint/contracts/api.md)
- [Provider contract](specs/001-neon-breaker-ai-hint/contracts/provider.md)

### Evidence

- [Week 04 Evaluation Records](docs/EVALS_W04.md)
- [Week 04 Evidence](docs/EVIDENCE_W04.md)
- [AI Usage Log](docs/AI_USAGE_LOG.md)

`EVALS_W04.md` contains the chronological evaluation records.

`EVIDENCE_W04.md` connects implementation claims with observed tests, builds, manual verification, live-provider evidence and contribution history.

Historical checkpoints are intentionally preserved.

## Team

**Team 7 — Neon Breaker**

- Elena Kalajdžić
- Isidora Popović
