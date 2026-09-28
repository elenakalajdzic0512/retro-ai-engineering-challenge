# Week 3 Evaluation Set

Original game baseline reference: commit `936e047`

Runtime-contract reference: commit `17c0df0`

Controlled-change reference: commit `ec2fb7b`

The expected result for each evaluation was defined before execution.

Baseline results are preserved so that the same scenarios can be compared directly with the after-change results.

## Evaluation Matrix

| ID | Owner | Input or Scenario | Expected Result | Baseline Result | After Change | Status |
|---|---|---|---|---|---|---|
| E1 | Elena | Start the application, verify the initial game state, then press Space | Paddle, ball, brick grid, score and 3 lives are visible; score starts at 0; Space launches the ball and gameplay begins | PASS — initial state rendered correctly and Space successfully launched gameplay during manual browser verification | PASS — repeated manually against `ec2fb7b`; initialization and Space launch still worked | PASS — before and after |
| E2 | Elena | Use both Left/Right Arrow and A/D controls, then hold movement toward both playfield edges | Paddle responds to both control pairs and never leaves the visible playfield on either side | PASS — Arrow and A/D controls worked and the paddle remained inside both playfield boundaries during manual browser verification | PASS — repeated manually against `ec2fb7b`; both control pairs and both boundaries still worked | PASS — before and after |
| E3 | Elena | Call `createGame()` with `lives: "3"`, `brickRows: 5`, `brickColumns: 8` | Runtime validation rejects the configuration with a `TypeError`; no game state is returned and the string `"3"` is not coerced to a number | PASS — against runtime-contract commit `17c0df0`, returned `TypeError: Invalid GameConfig: lives must be the integer 3.` | PASS — same invalid configuration against `ec2fb7b` returned the same expected `TypeError` | PASS — before and after |
| E4 | Elena | Simulate paddle movement for the same elapsed time at approximately 60 FPS and 120 FPS | Paddle should travel approximately the same distance for the same elapsed time regardless of frame rate | FAIL — formal baseline measured 115.000 px at 60 FPS and 230.000 px at 120 FPS; difference 115.000 px | PASS — against `ec2fb7b`, formal 1 s scenario measured 345.000 px at both frame rates; supporting 0.5 s scenario measured 230.000 px at both frame rates; difference 0.000 px | PASS — after controlled change |

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

**PASS**

Manual browser verification against controlled-change commit `ec2fb7b` confirmed that:

- the initial game elements were visible;
- the score started at `0`;
- three lives were displayed;
- the ball waited for launch;
- pressing `Space` launched the ball;
- gameplay began successfully.

The controlled FPS change did not regress the normal-start scenario.

### Status

**PASS — before and after**

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

**PASS**

Manual browser verification against controlled-change commit `ec2fb7b` confirmed that:

- Left/Right Arrow controls worked;
- `A`/`D` controls worked;
- the paddle remained inside the left playfield boundary;
- the paddle remained inside the right playfield boundary.

The controlled FPS change did not regress paddle controls or boundary clamping.

### Status

**PASS — before and after**

---

## E3 — Invalid Structured Input

### Owner

Elena

### Scenario

Provide the following invalid `GameConfig` to `createGame()`:

```js
{
  lives: "3",
  brickRows: 5,
  brickColumns: 8
}
```

Exact invocation:

```js
createGame({
  lives: "3",
  brickRows: 5,
  brickColumns: 8
});
```

The invalid value is intentional: `lives` is a string instead of the required integer value.

### Expected Result

The configuration must be rejected at runtime.

Expected behavior:

- `createGame()` throws a `TypeError`;
- no game state is returned;
- the string `"3"` is not silently converted to the number `3`;
- the error clearly identifies `lives` as invalid.

Expected error:

```text
TypeError: Invalid GameConfig: lives must be the integer 3.
```

### Baseline Result

**PASS**

Runtime-contract reference:

```text
17c0df0
```

The predefined invalid configuration was executed formally against the runtime-contract implementation.

Command:

```bash
node --input-type=module -e "
import { createGame } from './src/game.js';

try {
  createGame({
    lives: '3',
    brickRows: 5,
    brickColumns: 8
  });

  console.log('UNEXPECTED: invalid config was accepted');
  process.exitCode = 1;
} catch (error) {
  console.log(error.name + ': ' + error.message);
}
"
```

Actual result:

```text
TypeError: Invalid GameConfig: lives must be the integer 3.
```

The malformed configuration was rejected at runtime.

No game state was returned and the string `"3"` was not coerced to the number `3`.

The actual result matched the expected result defined before implementation.

The original game baseline commit `936e047` does not contain the structured runtime contract, so this formal E3 result is intentionally referenced to runtime-contract commit `17c0df0`.

### After Change

**PASS**

The same predefined invalid configuration was executed against controlled-change commit `ec2fb7b`.

Actual result:

```text
TypeError: Invalid GameConfig: lives must be the integer 3.
```

The malformed input was still rejected at runtime, no game state was returned, and no coercion occurred.

The controlled FPS change did not regress the structured runtime contract.

### Status

**PASS — before and after**

---

## E4 — Frame-Rate-Independent Paddle Movement

### Owner

Elena

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

This suggested that paddle movement might depend on frame count rather than elapsed time.

The implementation was intentionally left unchanged after this finding so that the genuine first baseline could be preserved.

### Formal Baseline Result

**FAIL**

The predefined E4 scenario was formally reproduced before any FPS-related implementation change.

The same starting paddle position, movement direction, game state and total simulated time of one second were used at approximately 60 FPS and 120 FPS.

Formal execution produced:

```text
E4 FORMAL BASELINE

60 FPS  -> start=345.000, end=460.000, distance=115.000, status=ready
120 FPS -> start=345.000, end=575.000, distance=230.000, status=ready
difference -> 115.000 px
```

The 120 FPS simulation moved the paddle exactly twice as far as the 60 FPS simulation for the same elapsed time.

This did not satisfy the predefined expectation:

```text
distance at 60 FPS ≈ distance at 120 FPS
```

The formal baseline therefore confirmed frame-rate-dependent paddle movement.

No FPS-related code was changed before or during this measurement.

### Controlled Change

Controlled-change reference:

```text
ec2fb7b
```

The controlled change was intentionally limited to the update-loop stop condition.

The implementation captured the status at entry to `update()` and stopped internal stepping only when the game status changed from that entry status.

The change did not modify:

- `PADDLE_SPEED`;
- `STEP`;
- `GameConfig`;
- rendering;
- collision rules;
- dependencies;
- Week 4 functionality.

### After Change

**PASS**

The same predefined E4 scenario was repeated against controlled-change commit `ec2fb7b`.

Formal one-second result:

```text
E4 AFTER CHANGE — 1 second(s)

60 FPS  -> start=345.000, end=690.000, distance=345.000, status=ready
120 FPS -> start=345.000, end=690.000, distance=345.000, status=ready
difference -> 0.000 px
```

The one-second scenario reaches the right playfield boundary in both runs. Therefore, a supporting half-second measurement was also executed before the boundary was reached:

```text
E4 AFTER CHANGE — 0.5 second(s)

60 FPS  -> start=345.000, end=575.000, distance=230.000, status=ready
120 FPS -> start=345.000, end=575.000, distance=230.000, status=ready
difference -> 0.000 px
```

The supporting measurement confirms that equal movement is not only a result of boundary clamping.

### Before / After Comparison

```text
Formal baseline:
60 FPS  -> 115.000 px
120 FPS -> 230.000 px
difference -> 115.000 px
result -> FAIL

After controlled change:
60 FPS  -> 345.000 px
120 FPS -> 345.000 px
difference -> 0.000 px
result -> PASS

Supporting non-boundary check after controlled change:
60 FPS  -> 230.000 px
120 FPS -> 230.000 px
difference -> 0.000 px
```

The predefined frame-rate-independence expectation is now satisfied.

### Status

**PASS — after controlled change**

---

## Automated Verification After Controlled Change

Before the controlled-change commit was created, Elena independently reran the project checks after reviewing the implementation diff.

Automated tests:

```text
tests 16
pass 16
fail 0
```

This included:

- all original eight gameplay tests;
- the six `GameConfig` runtime-contract tests;
- two focused FPS regression tests.

Production build:

```text
vite v7.3.6
5 modules transformed
build completed successfully
```

`git diff --check` completed with no reported whitespace errors.

The controlled change was then committed as:

```text
ec2fb7b
```

---

## Known Limitations

### 1. Viewport limitation

During implementation verification, the complete playfield and instructions did not fit vertically inside a `1280 × 720` viewport.

This remains a known limitation.

It is outside the controlled FPS experiment and was intentionally not addressed in this change.

### 2. One-second E4 boundary clamp

After the controlled change, the one-second E4 scenario reaches the right playfield boundary.

For that reason, the result is supported by the additional 0.5-second measurement, where neither simulation has yet reached the boundary and both travel exactly `230.000 px`.

---

## Evaluation Rules and Evidence Discipline

For this controlled-change experiment, the following order was preserved:

1. Preserve original baseline commit `936e047`.
2. Define the E1–E4 expectations before the controlled change.
3. Introduce and preserve runtime-contract reference commit `17c0df0`.
4. Execute and record the formal E3 result.
5. Execute and preserve the formal E4 baseline measurement: `115.000 px` at 60 FPS and `230.000 px` at 120 FPS.
6. Define and commit the controlled-change claim, signal, hypothesis, minimum change, verification method, expected result and known limitation before changing FPS-related implementation.
7. Change only the implementation layer relevant to the FPS issue.
8. Preserve controlled-change commit `ec2fb7b`.
9. Repeat the same E1–E4 evaluation set after the controlled change.
10. Compare baseline and after-change results directly.
11. Preserve known limitations.
12. Do not overwrite or delete the original baseline results.

## Final Evaluation Summary

```text
E1: PASS -> PASS
E2: PASS -> PASS
E3: PASS -> PASS
E4: FAIL -> PASS
```

The controlled change resolved the selected E4 frame-rate-dependence problem without introducing a detected regression in E1, E2 or E3.
