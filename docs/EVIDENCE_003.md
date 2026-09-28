# Evidence 003 — Week 3 Controlled Change

## Project

Neon Breaker

## Original Baseline

Original game baseline:

```text
936e047
```

The original baseline was preserved before the Week 3 runtime-validation and controlled-change work.

## Runtime Contract Reference

Structured `GameConfig` runtime validation was introduced in:

```text
17c0df0
```

The runtime contract accepts the supported baseline configuration:

```js
{
  lives: 3,
  brickRows: 5,
  brickColumns: 8
}
```

Malformed or unsupported configuration is rejected at runtime.

## Formal E3 Result

E3 tested the predefined invalid input:

```js
createGame({
  lives: "3",
  brickRows: 5,
  brickColumns: 8
});
```

Expected result:

```text
TypeError: Invalid GameConfig: lives must be the integer 3.
```

Actual result:

```text
TypeError: Invalid GameConfig: lives must be the integer 3.
```

Result:

```text
PASS
```

The formal result was recorded before the controlled FPS change.

---

## Selected Problem

The selected controlled-change problem is frame-rate-dependent paddle movement while the game is in the `ready` state.

The predefined E4 expectation is:

```text
distance at 60 FPS ≈ distance at 120 FPS
```

for the same starting state, movement direction and total elapsed simulation time.

## Formal E4 Baseline

The formal baseline was executed before any FPS-related change.

Conditions:

```text
starting paddle x = 345
direction = +1
total simulated time = 1 second
game status = ready
```

Actual result:

```text
60 FPS  -> start=345.000, end=460.000, distance=115.000, status=ready
120 FPS -> start=345.000, end=575.000, distance=230.000, status=ready
difference -> 115.000 px
```

Result:

```text
FAIL
```

For the same elapsed simulation time, the 120 FPS simulation moved the paddle exactly twice as far as the 60 FPS simulation.

No FPS-related code was changed before or during this measurement.

---

## Controlled Change Definition

### Claim

Paddle movement in the `ready` state currently depends on how many times `update()` is called rather than only on elapsed time.

### Signal

The formal E4 baseline measured:

```text
60 FPS  -> 115.000 px
120 FPS -> 230.000 px
```

during the same one-second interval.

The 120 FPS result is exactly twice the 60 FPS result.

### Hypothesis

`update()` divides the supplied elapsed time into fixed internal steps, but after each step it currently stops processing when:

```js
game.status !== "playing"
```

Because a newly created game is in the `ready` state, each external `update()` call processes only one internal step.

Therefore, a higher external frame rate produces more completed movement steps during the same real elapsed time.

If the update loop is changed so that an already-`ready` game consumes the full supplied elapsed time while still preserving the intended stop when active gameplay transitions out of `playing`, paddle movement should become independent of external frame rate.

### Minimum Change

Change only the update-loop control related to when internal stepping stops.

The change must:

- allow a game that starts an update in `ready` state to consume the full supplied elapsed time;
- preserve the existing fixed-step movement calculation;
- preserve the behavior when active gameplay transitions out of `playing`;
- leave paddle speed unchanged;
- leave physics and collision behavior unchanged;
- leave rendering unchanged;
- leave `GameConfig` unchanged;
- introduce no new dependencies or Week 4 functionality.

No unrelated cleanup or refactoring is part of this experiment.

### Check

After the change:

1. run the complete automated test suite;
2. run the production build;
3. repeat the exact same formal E4 scenario;
4. compare the 60 FPS and 120 FPS movement distances;
5. repeat E1, E2 and E3 as regression checks;
6. record all actual results without overwriting the baseline.

### Expected Result

For one second of simulated movement:

```text
distance at 60 FPS ≈ distance at 120 FPS
```

The movement distances may differ by a small numerical tolerance, but must no longer scale directly with frame count.

The original gameplay tests and structured runtime-validation checks should continue to pass.

### Known Limitation Before Change

The existing viewport limitation remains outside this controlled-change experiment:

```text
The full playfield and instructions may not fit vertically in a 1280 × 720 viewport.
```

This experiment will not attempt to fix that issue.

---

## After-Change Evidence

Not run yet.

The following evidence will be recorded only after the controlled change has been implemented and verified:

- controlled-change commit;
- automated test result;
- production build result;
- E1 after-change result;
- E2 after-change result;
- E3 after-change result;
- E4 after-change measurement;
- comparison with the formal baseline;
- remaining limitations.

---

## Contributions

### Elena

- defined and reviewed the game scope and baseline requirements;
- reviewed and approved the AI implementation plan;
- independently verified the baseline implementation;
- defined and executed E1 and E2;
- defined the exact E3 expectation before implementation;
- reviewed the runtime-contract implementation;
- independently reran automated tests and build verification;
- formally executed E3;
- formally executed the E4 baseline;
- defined the controlled-change evidence and hypothesis before the FPS fix.

### Mateja

No contribution to this continuation block has been recorded as of this checkpoint.

---

## Evidence Discipline

The following order was preserved:

```text
baseline
→ predefined evaluations
→ runtime contract
→ formal E3
→ formal E4 baseline
→ hypothesis
→ minimum controlled change
→ after-change evaluation
```

The original baseline results must not be overwritten by later results.
