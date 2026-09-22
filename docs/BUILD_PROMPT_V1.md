# Build Prompt V1 — Neon Breaker

## Role

You are a coding agent working on a small Week 3 AI Engineering Bootcamp project.

Your responsibility is to implement the minimum verifiable baseline of the game described in `docs/GAME_SPEC.md`.

You must follow the existing specification and must not expand the project scope without explicit approval.

## Before Implementation

Before changing any file:

1. Summarize your understanding of the task.
2. Provide a short implementation plan.
3. List any ambiguities, missing information, or assumptions.
4. Do not expand the scope without an explicit reason and approval.
5. Inspect the repository before proposing changes.

Do not begin implementation until the plan has been reviewed.

## Goal

Implement a minimal playable browser version of **Neon Breaker**, following `docs/GAME_SPEC.md`.

The result should provide a small, testable baseline that can later be evaluated and improved through one controlled change.

The goal is not to build the most polished game. The goal is to produce a clear and verifiable baseline.

## Authoritative Context

Use the following sources in this priority order:

1. `docs/GAME_SPEC.md` — authoritative product and gameplay specification.
2. This file, `docs/BUILD_PROMPT_V1.md` — implementation instructions and engineering constraints.
3. `README.md` — repository-level setup information, if relevant.

Do not use assumptions from unrelated projects, old chat conversations, or external examples as authoritative project requirements.

If two instructions conflict, stop and report the conflict instead of choosing silently.

## Technical Boundary

The implementation should remain a small browser application.

Preferred technologies:

- TypeScript or JavaScript;
- HTML;
- CSS;
- HTML Canvas when appropriate.

Keep dependencies minimal.

Do not introduce a backend, database, authentication system, deployment infrastructure, or additional application framework unless explicitly approved.

If the repository does not yet contain enough project scaffolding to implement the game, report what is missing and propose the smallest setup necessary before making changes.

## Gameplay Requirements

Follow the complete gameplay specification in `docs/GAME_SPEC.md`.

The baseline must include:

- a paddle controlled horizontally by the player;
- a moving ball;
- a brick grid;
- collision with the left, right and top boundaries;
- paddle collision;
- brick collision;
- score tracking;
- lives tracking;
- ball reset after a missed ball;
- win state when all bricks are destroyed;
- lose state when no lives remain;
- restart behavior.

The paddle must remain inside the game area.

## Out of Scope

Do not add:

- multiplayer;
- user accounts or authentication;
- online leaderboard;
- backend services;
- database;
- procedural level generation;
- custom audio or music;
- AI-controlled gameplay;
- power-ups;
- multiple levels;
- particle systems;
- advanced animations;
- deployment infrastructure.

Do not add features only because they seem useful or visually impressive.

## Definition of Done

The baseline is complete only when the following can be demonstrated:

- the game opens and runs in a browser;
- the paddle responds to the specified controls;
- the paddle cannot move outside the game area;
- the ball moves correctly;
- the ball bounces from the left, right and top boundaries;
- the ball bounces from the paddle;
- hitting a brick removes it and increases the score;
- missing the ball removes exactly one life and resets the ball;
- zero remaining lives produces a lose state;
- destroying all bricks produces a win state;
- the game can be restarted;
- no explicitly out-of-scope functionality has been added.

## Allowed Changes

For the baseline implementation you may propose changes inside:

- `src/`
- `tests/`
- browser entry files required by the chosen minimal setup;
- `package.json` and related minimal configuration files if project setup requires them.

Do not modify:

- `docs/GAME_SPEC.md`;
- project scope;
- unrelated documentation;
- Git configuration;
- secrets or environment credentials.

If another file needs to be changed, explain why before changing it.

## Verification

After implementation, report the exact commands used for verification.

At minimum, verify:

1. the project builds successfully;
2. static/type checks pass if configured;
3. automated tests pass if present;
4. the application can be started locally;
5. the implemented behavior matches the Definition of Done.

Do not claim that a check passed unless you actually ran it.

If a check cannot be run, clearly state:

- which check was not run;
- why it could not be run;
- what evidence is available instead.

## Scope Discipline

Prefer the smallest implementation that satisfies the specification.

Do not refactor unrelated code.

Do not add speculative abstractions for future Week 4 functionality.

Do not implement AI Hint, tool calling, model integration, or any Week 4 functionality.

## Required Final Report

After implementation, summarize:

1. files created or modified;
2. what was implemented;
3. commands executed;
4. actual verification results;
5. any known limitations;
6. anything that remains uncertain.

Do not hide failures or blockers.
