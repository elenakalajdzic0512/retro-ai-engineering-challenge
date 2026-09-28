# Evidence 003 — Week 3 Controlled Change

## Project

Neon Breaker

## Evidence References

- Original game baseline: `936e047`
- Context manifest: `e366a3a`
- Exact E3 expectation: `438b813`
- Runtime-contract implementation: `17c0df0`
- Formal E3 result: `e56aff9`
- Formal E4 baseline: `e362e87`
- Pre-fix controlled-change hypothesis: `9d09d80`
- Controlled FPS change: `ec2fb7b`
- Final after-change evaluation results: `43c8d86`

---

## 1. Original Baseline

The original game baseline was preserved at:

```text
936e047
```

That baseline was intentionally kept unchanged while the first formal evaluation evidence was prepared.

The initial browser and automated checks established a working Neon Breaker baseline, while later investigation identified a frame-rate-dependent paddle-movement problem that had not been fixed before the baseline was preserved.

---

## 2. Structured Runtime Contract

A structured `GameConfig` runtime contract was introduced in:

```text
17c0df0
```

Supported baseline configuration:

```js
{
  lives: 3,
  brickRows: 5,
  brickColumns: 8
}
```

The runtime contract:

- validates the configuration before game-state construction;
- requires the exact supported fields;
- rejects malformed or unsupported input;
- does not silently coerce invalid values;
- preserves the existing baseline gameplay configuration.

The structured contract was intentionally kept separate from the later FPS controlled-change experiment.

---

## 3. Formal E3 — Invalid Structured Input

### Predefined Input

The invalid input was defined before implementation and formal execution:

```js
createGame({
  lives: "3",
  brickRows: 5,
  brickColumns: 8
});
```

### Expected Result

```text
TypeError: Invalid GameConfig: lives must be the integer 3.
```

### Formal Baseline Result

Runtime-contract reference:

```text
17c0df0
```

Actual result:

```text
TypeError: Invalid GameConfig: lives must be the integer 3.
```

Result:

```text
PASS
```

The malformed configuration was rejected at runtime, no game state was returned, and the string `"3"` was not coerced to the number `3`.

### After Controlled Change

The same E3 scenario was repeated against controlled-change commit:

```text
ec2fb7b
```

Actual result:

```text
TypeError: Invalid GameConfig: lives must be the integer 3.
```

Result:

```text
PASS
```

The FPS change did not regress the structured runtime contract.

---

## 4. Selected Controlled-Change Problem

The selected problem was frame-rate-dependent paddle movement while the game was in the `ready` state.

The predefined E4 expectation was:

```text
distance at 60 FPS ≈ distance at 120 FPS
```

for the same:

- starting paddle position;
- movement direction;
- game state;
- total simulated elapsed time.

---

## 5. Formal E4 Baseline

The E4 baseline was formally executed before any FPS-related implementation change.

Conditions:

```text
starting paddle x = 345
direction = +1
total simulated time = 1 second
game status = ready
```

Actual result:

```text
E4 FORMAL BASELINE

60 FPS  -> start=345.000, end=460.000, distance=115.000, status=ready
120 FPS -> start=345.000, end=575.000, distance=230.000, status=ready
difference -> 115.000 px
```

Result:

```text
FAIL
```

The 120 FPS simulation moved the paddle exactly twice as far as the 60 FPS simulation for the same elapsed time.

This confirmed that paddle movement depended on the number of external `update()` calls rather than only on elapsed time.

No FPS-related code was changed before or during this measurement.

---

## 6. Controlled Change Definition

The controlled-change hypothesis was documented and committed before the implementation change in:

```text
9d09d80
```

### Claim

Paddle movement in the `ready` state depended on how many times `update()` was called rather than only on elapsed time.

### Signal

Formal E4 baseline:

```text
60 FPS  -> 115.000 px
120 FPS -> 230.000 px
difference -> 115.000 px
```

The 120 FPS result was exactly twice the 60 FPS result.

### Hypothesis

`update()` subdivided the supplied elapsed time into fixed internal steps, but its loop stopped after the first step whenever:

```js
game.status !== "playing"
```

Because a newly created game was already in the `ready` state, every external `update()` call processed only one internal step.

A higher external frame rate therefore produced more completed movement steps during the same total elapsed time.

### Minimum Change

The approved change was limited to the update-loop stop condition.

The change had to:

- allow an update that begins in `ready` to consume the full supplied elapsed time;
- preserve the fixed-step movement calculation;
- preserve immediate stopping when active gameplay changes state;
- leave `PADDLE_SPEED` unchanged;
- leave `STEP` unchanged;
- leave collision behavior unchanged;
- leave rendering unchanged;
- leave `GameConfig` unchanged;
- add no dependency or Week 4 functionality.

No unrelated cleanup or refactoring was included.

---

## 7. Controlled Change Implementation

The controlled change was committed as:

```text
ec2fb7b
```

The implementation:

- captured the game status at entry to `update()`;
- allowed stepping to continue while the status remained equal to that entry status;
- stopped internal stepping when the status changed.

Conceptually:

```js
const initialStatus = game.status;

// internal stepping...

if (game.status !== initialStatus) break;
```

This allowed `ready`-state movement to consume elapsed time while still preserving the intended stop after a transition out of active gameplay.

The change did not modify:

- paddle speed;
- fixed-step size;
- `GameConfig`;
- rendering;
- collision rules;
- dependencies;
- Week 4 behavior.

Two focused regression tests were added:

1. equal `ready` paddle movement at 60 FPS and 120 FPS;
2. stopping after a gameplay miss without moving the reset paddle.

---

## 8. Independent Verification After Implementation

After reviewing the actual diff, Elena independently reran the verification before the controlled-change commit was finalized.

### Automated Tests

```text
tests 16
pass 16
fail 0
```

This included:

- all original eight gameplay tests;
- six `GameConfig` tests;
- two new FPS regression tests.

### Production Build

```text
vite v7.3.6
5 modules transformed
build completed successfully
```

### Diff Check

```text
git diff --check
```

completed with no reported whitespace errors.

Only these implementation files were changed for the controlled change:

```text
src/game.js
tests/game.test.js
```

---

## 9. E1–E4 After-Change Evaluation

The same evaluation set was repeated against:

```text
ec2fb7b
```

### E1 — Normal Start

Result:

```text
PASS
```

Manual browser verification confirmed:

- paddle visible;
- ball visible;
- brick grid visible;
- score starts at `0`;
- lives = `3`;
- ball waits for launch;
- `Space` launches gameplay.

### E2 — Paddle Controls and Boundaries

Result:

```text
PASS
```

Manual browser verification confirmed:

- Left/Right Arrow controls work;
- `A`/`D` controls work;
- the paddle remains inside the left boundary;
- the paddle remains inside the right boundary.

### E3 — Invalid Structured Input

Result:

```text
PASS
```

Actual result:

```text
TypeError: Invalid GameConfig: lives must be the integer 3.
```

The structured runtime contract remained intact after the FPS change.

### E4 — Frame-Rate-Independent Paddle Movement

Formal one-second result:

```text
E4 AFTER CHANGE — 1 second(s)

60 FPS  -> start=345.000, end=690.000, distance=345.000, status=ready
120 FPS -> start=345.000, end=690.000, distance=345.000, status=ready
difference -> 0.000 px
```

Result:

```text
PASS
```

Because the one-second scenario reaches the right playfield boundary, an additional supporting half-second measurement was used before the boundary was reached:

```text
E4 AFTER CHANGE — 0.5 second(s)

60 FPS  -> start=345.000, end=575.000, distance=230.000, status=ready
120 FPS -> start=345.000, end=575.000, distance=230.000, status=ready
difference -> 0.000 px
```

This confirms that equal movement is not merely an artifact of boundary clamping.

---

## 10. Before / After Comparison

```text
E1
before -> PASS
after  -> PASS

E2
before -> PASS
after  -> PASS

E3
before -> PASS
after  -> PASS

E4
before:
60 FPS  -> 115.000 px
120 FPS -> 230.000 px
difference -> 115.000 px
result -> FAIL

after:
60 FPS  -> 345.000 px
120 FPS -> 345.000 px
difference -> 0.000 px
result -> PASS

supporting non-boundary check after:
60 FPS  -> 230.000 px
120 FPS -> 230.000 px
difference -> 0.000 px
```

The controlled change resolved the selected E4 frame-rate-dependence problem without a detected regression in E1, E2 or E3.

---

## 11. Known Limitation

The viewport limitation remains outside this controlled-change experiment:

```text
The complete playfield and instructions may not fit vertically inside a 1280 × 720 viewport.
```

This limitation was intentionally not addressed because the Week 3 controlled-change experiment focused on one measurable problem only.

The one-second E4 after-change scenario also reaches the right playfield boundary, so the supporting 0.5-second measurement is retained as an additional non-boundary proof.

---

## 12. Contributions

### Elena

Elena:

- defined and reviewed the game scope and baseline requirements;
- created and reviewed the Week 3 context boundary;
- reviewed and approved AI implementation plans before code changes;
- independently verified the original baseline;
- defined and executed E1 and E2;
- defined the exact E3 expectation before runtime-contract implementation;
- reviewed the runtime-contract implementation;
- independently reran tests and build verification;
- formally executed E3;
- formally executed the E4 baseline;
- defined the controlled-change claim, signal, hypothesis, minimum change and verification plan before the FPS fix;
- reviewed the actual controlled-change diff;
- independently reran the full test suite, build and E4 measurements;
- repeated E1–E4 after the controlled change;
- preserved the evidence trail through Git commits.

### Codex

Codex was used as a coding agent for:

- analysis-only inspection before implementation;
- the runtime `GameConfig` implementation and focused tests after human approval;
- the minimal FPS controlled change and focused regression tests after the hypothesis had already been documented.

Codex did not commit or push the reviewed implementation changes.

### ChatGPT

ChatGPT was used for:

- structuring the specification and build prompt;
- helping formalize the context manifest;
- structuring the evaluation methodology;
- preparing exact AI-agent prompts;
- reviewing reported diffs and evidence with the user;
- helping maintain the Week 3 evidence trail and documentation.

AI outputs were not treated as proof by themselves. Important implementation results were independently checked locally by Elena.

### Mateja

No contribution to the continuation block covered by this evidence file was recorded by the time this Week 3 work was completed.

---

## 13. Evidence Discipline

The following order was preserved:

```text
original baseline
→ predefined evaluations
→ context manifest
→ runtime contract
→ formal E3
→ formal E4 baseline
→ pre-fix claim and hypothesis
→ minimum controlled change
→ human diff review
→ independent verification
→ controlled-change commit
→ same E1–E4 after change
→ direct before/after comparison
```

The original baseline results were not overwritten by later results.

Final after-change evaluation results were recorded in:

```text
43c8d86
```

