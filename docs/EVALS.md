# Week 3 Evaluation Set

Baseline reference: commit `936e047`

Evaluations are defined before execution. Baseline results must be preserved so that the same scenarios can be repeated after a later controlled change.

| ID | Owner | Input or Scenario | Expected Result | Baseline Result | After Change | Status |
|---|---|---|---|---|---|---|
| E1 | Elena | Start the application, verify initial game state, then press Space | Paddle, ball, brick grid, score and 3 lives are visible; score starts at 0; Space launches the ball and gameplay begins | Not run yet | - | PENDING |
| E2 | Elena | Hold Left/A until the paddle reaches the left edge, then hold Right/D until it reaches the right edge | Paddle responds to both control pairs and never leaves the visible playfield on either side | Not run yet | - | PENDING |

## Remaining Evaluation Slots

The second project block will add at least:

- one incomplete or invalid scenario;
- one regression scenario based on an observed baseline problem.

The currently observed frame-rate-dependent paddle movement is preserved as a candidate regression case and must not be fixed before its baseline measurement is documented.

## Known Baseline Observations Before Formal Evaluation

These observations were reported during implementation verification but are not yet counted as completed eval cases:

- At approximately 60 FPS, the paddle moved about 115 px during one simulated second.
- At approximately 120 FPS, the paddle moved about 230 px during one simulated second.
- The full playfield and instructions may not fit vertically in a 1280 × 720 viewport.

These observations remain unchanged in baseline commit `936e047`.
