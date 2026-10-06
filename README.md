# Neon Breaker

Neon Breaker is a retro Breakout-style browser game expanded with Hazard Arena mechanics and AI-assisted tactical guidance. Its Neon Tactical Coach uses Gemini through a bounded, application-controlled flow to turn a player goal and the current game state into actionable, evidence-backed advice.

## Highlights

- **Hazard Arena:** armored bricks, directional paddle control, neon bumpers, a portal pair, and a moving shield gate.
- **Ask AI for Hint:** a short, on-demand gameplay hint, separate from the real-time game loop.
- **Neon Tactical Coach:** a goal-driven plan with recommended moves, next actions, and explanations grounded in the current Tactical snapshot.

## Neon Tactical Coach

Enter a goal such as “Help me clear the center safely without relying on the portal,” then select **Run Tactical Coach**. The Coach presents a **Recommended move**, compact plan badges, numbered **What to do next** actions, and **Why this plan** explanations. The final UI puts useful tactical evidence first and turns validated facts into player-facing language.

For example, a plan might recommend a safe, direct approach to the center, show badges such as *Safe approach · Target center · Center paddle contact · Direct route*, then suggest positioning the paddle for a center bounce. Its explanation might note that 10 targets remain in the center and that the planned contact and route fit that target. This illustrates the UI; actual advice and values depend on the player's goal and reported game state.

## How the Tactical Coach works

```text
Player goal + validated Tactical snapshot
  → Gemini proposes get_tactical_snapshot
  → application validates and executes the local tool
  → Gemini proposes a tactical candidate
  → application evaluates it with evaluate_tactical_strategy
  → Gemini returns a structured final plan
  → application validates the plan and materializes its evidence
  → UI renders player guidance
```

**Model proposes. Application decides.** The two named tools are the complete local tool allowlist. The evaluator is deterministic, and the application controls tool execution, candidate acceptance, final validation, and evidence values.

## Safety and authority boundaries

The Coach is advisory: it cannot move the paddle or ball, or change score, lives, bricks, or hazards. It has no arbitrary shell, filesystem, or browser tools. Each run is capped at **3 agent steps, 2 local tool calls, and 4 provider attempts**, with a **5-second per-attempt timeout** and a **22-second total deadline**. The application validates structured final output and supplies the evidence values shown to the player.

The Tactical snapshot is **validated client-reported game state**, not an independently authoritative server-side game ledger. A full restart or page leave invalidates a pending Coach request so a stale result cannot appear in the new game.

## Run locally

Requires Node.js 24.x and npm. From the repository root, install dependencies and build the TypeScript backend:

```bash
npm ci
npm run build:server
```

For normal Tactical Coach use, put your Gemini key in a local `.env` file as `GEMINI_API_KEY=your_key_here`. The API startup script loads `.env` **server-side**; never put the key in frontend or Vite code or commit it. Start the API in one terminal:

```bash
npm run start:api
```

Start the browser app in a second terminal:

```bash
npm run dev
```

Open the Vite URL printed in the terminal. With `TACTICAL_AI_PROVIDER` unset, Tactical Coach uses the real Gemini provider and the server-fixed `gemini-3.5-flash-lite` model; `TACTICAL_AI_PROVIDER=gemini` selects the same path. A missing key or unknown Tactical provider mode produces a sanitized configuration error, without silently switching to fake. **Ask AI for Hint** uses its independent `AI_PROVIDER` setting, which defaults to fake; set `AI_PROVIDER=gemini` separately if desired.

### Offline / deterministic mode

After building the backend, start both AI features with their explicit fake providers:

```bash
AI_PROVIDER=fake TACTICAL_AI_PROVIDER=fake npm run start:api
```

Then run `npm run dev` in another terminal. This mode supports offline development, deterministic debugging and demos, and automated tests. It is not the normal Tactical Coach runtime.

## Controls

- **Left / Right arrows** or **A / D:** move the paddle.
- **Space:** launch the ball when ready; start a fresh game after a win or loss.

## Architecture

```text
Browser game
├── Hazard Arena gameplay
├── Ask AI for Hint ────────────→ /api/ai → independent Hint provider
└── Neon Tactical Coach ────────→ /api/tactical-coach
                                    ↓
                              bounded orchestrator
                                    ↓
                              Gemini Tactical provider
                                    ↓
                              allowlisted local tools
                                    ↓
                              validated plan + evidence
                                    ↓
                              player-facing Coach UI
```

The browser calls the local API; it does not call Gemini directly.

## Verification

The final accepted gate passed **287 tests, 0 failed, 0 skipped**, plus TypeScript typecheck, client build, and server build. Coverage includes Hazard Arena regressions, Tactical contracts and evaluator, tool boundaries, bounded orchestration, API and provider selection, UI rendering, restart/page-leave stale-response handling, and Week 4 preservation. Automated tests use fake or stubbed providers and make **no real Gemini calls**.

```bash
npm test
npm run typecheck
npm run build
npm run build:server
```

## Acceptance and evidence

Acceptance evidence includes the deterministic fake browser path, recovery from an injected `provider_unavailable` failure, a bounded real-Gemini Terminal probe, the normal real-Gemini browser/game path, stale-response protection on restart and page leave, and a final player-guidance UI smoke check. Detailed attribution and limitations remain in the evidence documents:

- [Week 5 acceptance evidence](docs/EVIDENCE_W05.md)
- [Tactical agent evaluations](docs/AGENT_EVALS.md)
- [AI usage log](docs/AI_USAGE_LOG.md)

## Status

**W05 Neon Tactical Coach — ACCEPTED.** T001–T029 are complete. The feature builds on the completed Neon Breaker: Hazard Arena gameplay baseline.

## Team

**Team 7 — Neon Breaker:** Elena Kalajdžić and Isidora Popović.
