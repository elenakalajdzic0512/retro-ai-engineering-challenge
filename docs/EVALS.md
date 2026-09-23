# Week 3 Evaluation Set

Baseline reference: commit `936e047`

The expected result for each evaluation is defined before execution.

Baseline results must be preserved so that the same scenarios can be repeated after the controlled change.

## Evaluation Matrix

| ID | Owner | Input or Scenario | Expected Result | Baseline Result | After Change | Status |
|---|---|---|---|---|---|---|
| E1 | Elena | Start the application, verify the initial game state, then press Space | Paddle, ball, brick grid, score and 3 lives are visible; score starts at 0; Space launches the ball and gameplay begins | PASS — initial state rendered correctly and Space successfully launched gameplay during manual browser verification | Not run yet | PASS |
| E2 | Elena | Use both Left/Right Arrow and A/D controls, then hold movement toward both playfield edges | Paddle responds to both control pairs and never leaves the visible playfield on either side | PASS — Arrow and A/D controls worked and the paddle remained inside both playfield boundaries during manual browser verification | Not run yet | PASS |
| E3 | Colleague | Provide an incomplete or invalid structured game configuration | Invalid input is rejected or handled through the explicitly defined safe fallback; malformed data must not silently become valid game state | Not run yet — the structured runtime contract does not exist in baseline commit `936e047` | Not run yet | PENDING |
| E4 | Colleague | Simulate paddle movement for the same elapsed time at approximately 60 FPS and 120 FPS | Paddle should travel approximately the same distance for the same elapsed time regardless of frame rate | Formal baseline eval not run yet. Earlier implementation verification observed approximately 115 px at 60 FPS and 230 px at 120 FPS. | Not run yet | PENDING |

---

## E1 — Normal Start

### Owner

Elena

### Scenario

Start the development server and open the game in a browser.

Before starting gameplay, verify that:

- the paddle is visible;
- the ball is visible;
- the brick grid is visible;
- the score is visible;
- the score starts at `0`;
- the lives counter is visible;
- the game starts with `3` lives;
- the ball is waiting for launch.

Then press `Space`.

### Expected Result

The initial state should render correctly and pressing `Space` should launch the ball and begin gameplay.

### Baseline Result

**PASS**

Manual browser verification confirmed that:

- the initial game elements were visible;
- the score started at `0`;
- three lives were displayed;
- pressing `Space` launched the ball;
- gameplay began successfully.

No additional visible issue was discovered while executing this scenario.

### After Change

Not run yet.

### Status

**PASS**

---

## E2 — Paddle Controls and Boundaries

### Owner

Elena

### Scenario

During gameplay:

1. Use the Left and Right Arrow keys.
2. Use the `A` and `D` keys.
3. Hold left movement until the paddle reaches the left boundary.
4. Hold right movement until the paddle reaches the right boundary.

### Expected Result

The paddle should:

- respond to Left/Right Arrow controls;
- respond to `A`/`D` controls;
- remain inside the left boundary;
- remain inside the right boundary.

### Baseline Result

**PASS**

Manual browser verification confirmed that:

- Arrow controls worked;
- `A` and `D` controls worked;
- the paddle remained inside the left playfield boundary;
- the paddle remained inside the right playfield boundary.

No obvious boundary problem was visible during normal manual gameplay.

### After Change

Not run yet.

### Status

**PASS**

---

## E3 — Invalid Structured Input

### Owner

Colleague

### Scenario

Provide an incomplete or invalid structured game configuration after the structured runtime contract has been defined.

The exact invalid input must be written down before executing this evaluation.

### Expected Result

The application must not silently accept malformed or unsupported configuration data.

The invalid input must either:

- be explicitly rejected; or
- produce the safe fallback defined by the runtime-validation contract.

The exact expected behavior must be determined by the structured runtime contract before this evaluation is executed.

### Baseline Result

Not run yet.

E3 cannot be executed against baseline commit `936e047` because the structured runtime contract has not yet been introduced.

The exact baseline reference for E3 must be recorded after that contract is added and before any controlled improvement to its behavior.

### After Change

Not run yet.

### Status

**PENDING**

---

## E4 — Frame-Rate-Independent Paddle Movement

### Owner

Colleague

### Scenario

Simulate paddle movement for the same amount of elapsed time at different frame rates.

At minimum compare:

- approximately 60 FPS;
- approximately 120 FPS.

Use the same:

- starting paddle position;
- movement direction;
- elapsed simulation time;
- game state.

### Expected Result

For the same elapsed simulation time, the paddle should travel approximately the same distance regardless of frame rate.

Expected relationship:

```text
distance at 60 FPS ≈ distance at 120 FPS
```

A small numerical tolerance is acceptable, but movement distance must not scale directly with the number of rendered frames.

### Previous Observation

During implementation verification, Codex observed approximately:

```text
60 FPS  -> 115 px in one simulated second
120 FPS -> 230 px in one simulated second
```

This suggests that paddle movement may currently depend on frame count rather than elapsed time.

The implementation was intentionally left unchanged after this finding so that the genuine first baseline could be preserved.

### Formal Baseline Result

Not run yet.

The previous observation is not treated as the formal E4 result until this scenario is deliberately reproduced and the actual measurement is recorded.

### After Change

Not run yet.

### Status

**PENDING**

---

## Known Baseline Observations

### 1. Frame-rate-dependent paddle movement

During the initial implementation verification, an additional check reported:

```text
approximately 60 FPS  -> approximately 115 px in one simulated second
approximately 120 FPS -> approximately 230 px in one simulated second
```

The existing automated tests did not detect this behavior.

This issue was intentionally **not fixed** before the baseline was preserved.

Baseline reference:

```text
936e047
```

This observation is the selected candidate regression scenario for E4.

Before any fix is made, E4 must be formally reproduced and its actual baseline result recorded.

### 2. Viewport limitation

During implementation verification, the complete playfield and instructions did not fit vertically inside a `1280 × 720` viewport.

This remains a known baseline limitation.

It is currently recorded as an observation rather than a formal evaluation case because the controlled-change experiment will focus on one clearly measurable problem.

### 3. Manual visual verification

During E1 and E2, no additional gameplay problems were obvious through normal visual inspection.

This does **not** invalidate the frame-rate-dependent paddle movement observation.

The evaluations test different properties:

- E1 verifies normal initialization and game launch.
- E2 verifies controls and playfield boundaries.
- E3 will verify structured runtime validation.
- E4 will specifically evaluate whether paddle movement is independent of frame rate.

A passing visual scenario therefore does not imply that every relevant behavioral property is correct.

---

## Evaluation Rules

For the controlled-change experiment:

1. Preserve baseline commit `936e047`.
2. Formally execute E4 and record the actual baseline measurement.
3. State the hypothesis before changing the implementation.
4. Define the smallest proposed change.
5. Change only the relevant implementation layer.
6. Repeat the same E4 scenario after the change.
7. Compare the baseline and after-change results.
8. Record any remaining limitation.
9. Do not overwrite the original baseline result.

E1 and E2 may also be repeated after the controlled change as regression checks.
