# Context Manifest — Week 3

## Purpose

This document records the context intentionally selected for the remaining Week 3 work on Neon Breaker.

The goal is to give the coding agent only the context required for the current runtime-validation and evaluation work, while avoiding unrelated or future-scope information.

## Context Sources

| Source | Included? | Reason | Priority | Risk |
|---|---|---|---|---|
| `docs/GAME_SPEC.md` | Yes | Defines the authoritative gameplay scope, rules, controls, win/lose conditions and Definition of Done | High | Low — intentionally frozen baseline specification |
| `docs/BUILD_PROMPT_V1.md` | Yes | Defines engineering boundaries, allowed changes, verification expectations and scope discipline | High | Low — written before baseline implementation |
| `docs/EVALS.md` | Yes | Defines the Week 3 evaluation scenarios and expected behavior that must be preserved and later repeated | High | Medium — E3/E4 are still incomplete and must not be treated as finished results |
| `src/game.js` | Yes | Contains the core deterministic gameplay state and update logic relevant to runtime validation and the frame-rate issue | High | Medium — implementation may contain the known baseline bug |
| `src/main.js` | Yes | Shows how the game loop, controls and rendering connect to the core game state | Medium | Medium — UI/runtime behavior should not be mistaken for specification |
| `tests/game.test.js` | Yes | Shows currently verified gameplay behavior and existing automated coverage | Medium | Medium — passing tests do not prove all required behavior |
| `package.json` | Yes | Defines available scripts and the minimal project/tooling setup | Medium | Low |
| `README.md` | Yes | Provides repository-level context and setup information | Low | Medium — may contain less specific or older information than the Week 3 specification |
| `docs/AI_USAGE_LOG.md` | No | Used for evidence and process logging, not as implementation requirements | — | Including it could add irrelevant process context to a coding task |
| Old chat transcripts | No | They are not authoritative project requirements | — | High — may contain outdated decisions, exploratory ideas or conflicting wording |
| Random web examples | No | Not required for the current task | — | High — unnecessary context and possible scope drift |
| Week 4 AI/tool-calling material | No | Outside the current Session 003 scope | — | High — could cause premature implementation of AI Hint/tool functionality |
| Secrets, credentials or environment values | No | Not required for the task and must not be exposed to the agent | — | Critical security risk |

## What the Model Will Receive

For the upcoming runtime-validation and evaluation work, the coding agent should receive only the context needed for that specific task.

Primary context:

- `docs/GAME_SPEC.md`
- `docs/BUILD_PROMPT_V1.md`
- `docs/EVALS.md`
- relevant implementation files from `src/`
- relevant tests from `tests/`
- `package.json` when commands or tooling are relevant

Additional files should be inspected only when there is a specific reason.

## Intentionally Omitted Context

The following context is intentionally excluded:

- unrelated historical chat transcripts;
- random external examples;
- Week 4 AI Hint and tool-calling implementation details;
- unrelated repository files;
- secrets, credentials and environment values.

These sources are excluded to reduce noise, avoid scope expansion and keep the coding agent focused on the current Week 3 task.

## Priority When Sources Conflict

When information conflicts, use this priority:

1. `docs/GAME_SPEC.md` for gameplay scope and product behavior.
2. The explicitly approved current task for the specific change being performed.
3. `docs/BUILD_PROMPT_V1.md` for engineering boundaries and verification rules.
4. `docs/EVALS.md` for predefined evaluation expectations.
5. Existing implementation and tests as evidence of current behavior.
6. `README.md` for general repository/setup information.

Existing code or passing tests must not silently override the specification.

If a meaningful conflict remains unresolved, stop and report it before changing the implementation.

## Context Rules for the Next AI Call

Before changing code, the coding agent must:

1. identify which of the included sources are relevant to the requested task;
2. summarize the applicable constraints;
3. report any conflict or ambiguity;
4. propose the smallest implementation plan;
5. avoid loading or using excluded context unless explicitly approved;
6. avoid Week 4 functionality;
7. wait for human approval before implementation.