# Feature Specification: Neon Breaker: Hazard Arena

**Feature Branch**: `week5/neon-hazard-arena`
**Created**: 2026-10-06
**Status**: Locked gameplay scope; Checkpoints 1–5 implemented and verified; full-arena regression remains pending.
**Input**: Extend the continuing W03/W04 Neon Breaker project before the Week 5 bounded Tactical Planner. This artifact formalizes gameplay only; it does not implement or authorize an agent.

## Goal

Add deterministic tactical complexity to the existing Neon Breaker game while preserving the original game identity and Week 4 AI integration. The five approved mechanics are Armored Bricks, Directional Paddle Bounce, Neon Bumpers, one Portal Pair, and one Moving Shield Gate.

## User Scenarios & Testing

### User Story 1 — Break armored bricks (Priority: P1)

As a player, I can recognize durable bricks and damage them before destroying them.

**Why this priority**: This is the completed first checkpoint and the foundation for the extension.

**Independent Test**: H1–H6 in [the eval matrix](../../docs/EVALS_HAZARD_ARENA.md).

**Acceptance Scenarios**:

1. Given a fresh game, the 40-brick grid contains exactly 8 armored bricks at zero-based indices 2, 5, 10, 13, 18, 21, 26, 29 and 32 normal bricks; index 32 is normal.
2. Given a fresh armored brick, when hit, it remains alive with one hit remaining, visibly changes damage state, reflects the ball, and awards no points. A second valid hit destroys it and awards exactly 10 points total.
3. Given a normal brick, its first valid hit destroys it and awards 10 points. Destroyed bricks never award additional points.
4. Given a won or lost game, restarting restores original brick kinds and durability, score and lives, and launches as before.

### User Story 2 — Aim with the paddle (Priority: P2)

As a player, I can intentionally change the ball trajectory through paddle contact position.

**Why this priority**: Trajectory control should precede additional obstacles.

**Independent Test**: H7–H10, including contact-zone boundaries and repeated contacts.

**Acceptance Scenarios**:

1. For every valid descending paddle contact, the left third sets `vx = -240`, the center third sets `vx = 0`, and the right third sets `vx = +240`; `vy = -abs(previous vy)` in all zones. Exact 1/3 and 2/3 boundaries belong to center. Each contact replaces horizontal velocity from its current zone, with no accumulated spin. Vertical magnitude is preserved; total ball speed is not preserved across zones.
2. Given the same contact and incoming state, repeated simulations produce the same outgoing velocity. After a paddle bounce, horizontal magnitude is at most 240 px/s and vertical magnitude is unchanged; paddle controls and movement speed remain unchanged.

These fixed values intentionally provide deterministic behavior, bounded speed, simple player control and testability, and a tactical aiming action a later Week 5 coach can recommend; no coach or AI contract change is implemented here.

### User Story 3 — Play around Neon Bumpers (Priority: P3)

As a player, I can use or avoid visibly distinct fixed bumpers that redirect the ball.

**Why this priority**: Add fixed collision geometry before teleportation or moving geometry.

**Independent Test**: H11–H14 with isolated collision fixtures and reachable-brick checks.

**Acceptance Scenarios**:

1. Given a ball contacting a fixed circular or clearly bumper-like obstacle, it reflects deterministically and the bumper remains unchanged.
2. Given repeated bumper collisions, score, lives, total brick count and brick durability do not change directly; bumpers do not count toward winning.
3. Given the approved fixed layout, bumpers are visually distinct from bricks and do not seal access to any brick or create an unavoidable permanent trap.

### User Story 4 — Traverse a portal pair (Priority: P4)

As a player, I can route the ball through exactly one linked portal pair.

**Why this priority**: Introduce spatial transfer after fixed obstacle behavior is verified.

**Independent Test**: H15–H19 in both directions, including overlap and lockout expiry.

**Acceptance Scenarios**:

1. Each fresh game creates independent portals A (`id: a`, `pairId: b`, center (100,390)) and B (`id: b`, `pairId: a`, center (700,390)), both radius 20. With cooldown zero, center distance ≤ portal radius + ball radius activates either portal, including exact tangency; just-outside contacts do not activate.
2. Teleport preserves `vx` and `vy` exactly. Exit position is destination center + normalized current velocity × (destination radius + ball radius + `1e-6` pixels); zero speed uses +X. A successful teleport sets `portalCooldown = 0.15` seconds. Each playing substep first decrements cooldown by simulation `dt`, clamped at zero; no wall-clock timer is used. While positive, both portals are blocked. Exit separation and cooldown prevent immediate loops; no additional leave-overlap latch is used. At most one teleport occurs per substep, after bumpers and before miss handling.
3. Teleportation directly changes neither score, lives, status, paddle, bumpers, brick count nor durability; portals do not count toward winning. Miss/ball reset clears cooldown. Full restart restores fresh approved portal objects and cooldown zero. Portals render as purple layered circles without labels.

### User Story 5 — Time shots around the shield (Priority: P5)

As a player, I can anticipate one predictably moving shield and time trajectories around it.

**Why this priority**: Moving geometry is the last mechanic before combined regression.

**Independent Test**: H20–H23, including both travel bounds and repeated step sequences.

**Acceptance Scenarios**:

1. Each fresh game creates one independent shield `{ x: 310, y: 250, width: 180, height: 12, vx: 110 }`, where x is the left edge. During playing, simulation-time movement at 110 px/s reflects overshoot at x=170 and x=450 and reverses direction deterministically. Ready/won/lost freeze movement.
2. Circle-versus-rectangle closest-point contact includes exact tangency. Relative motion decides approach; actual ball velocity reflects around the surface normal without shield momentum or speed gain. Deterministic internal-contact fallback and `1e-6` pixel separation keep state finite. The `shieldContact` latch prevents repeated reflections during continuous contact and clears after detected separation or ball reset. The shield never directly changes score, lives or bricks and is excluded from winning.
3. A miss preserves current shield x and vx; ready freezes them and relaunch resumes from that state. Full restart restores a fresh exact initial shield and cleared contact latch.

### Edge Cases

- First hit on the last surviving armored brick must not win the game.
- Contacts exactly on paddle zone boundaries must have one deterministic classification and an upward result.
- Repeated/tangent obstacle contact must not cause repeated overlap reflections, non-finite velocity or speed growth.
- Portal exits must not place the ball outside the arena or inside another collider; test lockout across several physics steps.
- Shield endpoint overshoot must remain bounded; test large elapsed frames under the existing elapsed-time clamp.
- Simultaneous contacts need a documented deterministic resolution order; no collision may score twice or remove two lives for one miss.
- Won/lost games freeze; ready state preserves launch behavior. Full restart clears transient portal state and restores all hazard state.

## Requirements

### Functional Requirements

- **FR-001 — Baseline**: Keep the same application, 800×600 arena, 40 total bricks, 3 initial lives, score 0–400, and exactly 10 points per destroyed brick. Preserve strict existing game configuration validation.
- **FR-002 — Lifecycle**: Preserve ready/playing/won/lost, win only when all bricks are destroyed, lose when no lives remain, one life lost per miss, and the existing Space launch/restart semantics. Preserve Arrow/A/D horizontal controls and the frame-rate fix.
- **FR-003 — Armor**: Apply only the eight US1 indices; normal bricks start alive with one hit and armored bricks with two. Award score only on destruction and reflect each valid hit. Fresh/damaged armor is visually distinct; normal row colors remain unchanged.
- **FR-004 — Directional paddle**: Use US2's fixed -240/0/+240 horizontal velocities, center-inclusive third boundaries and `vy = -abs(previous vy)`, without accumulating spin or changing paddle speed or controls.
- **FR-005 — Bumpers**: Add a small fixed layout of indestructible, visually distinct bumpers that reflect deterministically and leave the level completable.
- **FR-006 — Portals**: Add exactly two linked portals with bidirectional transfer, exact velocity preservation, the US4 safe exit rule, and a 0.15-second simulation-time cooldown preventing immediate loops.
- **FR-007 — Shield**: Add exactly one defensive barrier moving predictably within fixed bounds and reflecting from its current position. Movement depends only on game state and simulation time steps.
- **FR-008 — Hazard isolation**: Bumpers, portals and shield are not bricks, never award score, never directly change lives or damage bricks, and never enter the win condition. Subsequent ordinary ball/brick collisions and misses still apply normally.
- **FR-009 — Reset**: Full restart restores all original brick/hazard state, transient lockout, score, lives, paddle and ball. Losing a life preserves earned progress and returns to ready as before.
- **FR-010 — AI preservation**: Keep Ask AI for Hint available and functional with its existing request/response contract and backend. No AI-controlled gameplay, automatic AI requests, or AI in the physics loop. Future Tactical Planner context is a motivation, not an API change in this feature.
- **FR-011 — Delivery**: Implement serial checkpoints: armor → directional paddle → bumpers → portals → shield → full regression. Each requires focused automated tests, all previous regressions green, typecheck, production build, applicable manual smoke, and one clean checkpoint commit before proceeding.

### Key Entities

- Game: arena, score, lives, lifecycle, ball, paddle, brick grid and separate hazard state.
- Brick: position/size, normal or armored kind, alive state, remaining durability.
- Paddle contact: left/center/right position determines the outgoing ball trajectory.
- Bumper: fixed indestructible collision geometry.
- Portal pair: two linked entrance/exit regions and transient re-entry lockout.
- Shield gate: one barrier, bounded movement position and direction/phase.

## Success Criteria

- **SC-001**: Every fresh game has 40 bricks, exactly 8 armored; complete clearance requires 48 damaging hits and awards exactly 400 points.
- **SC-002**: Each paddle zone gives its defined upward trajectory with no cumulative speed growth during repeated contacts.
- **SC-003**: Repeating the same starting state and input/time-step sequence produces identical hazard trajectories and collision outcomes.
- **SC-004**: Both portal directions work, no immediate teleport loop occurs, and the shield stays within bounds throughout repeated travel cycles.
- **SC-005**: All H1–H31 evaluations pass on the completed arena; existing controls, win/lose/restart and user-requested hints remain usable.

## Assumptions and Scope Boundaries

- Armored Bricks was verified at checkpoint `0f88c3e6b50fa2160b283754413b3ee8e2ba9015`. The 92-test/typecheck/build results were observed before commit; manual smoke and functioning Hint were reported by the human team. Directional Paddle Bounce is also implemented and verified: 99/99 tests, typecheck/build and human-reported manual smoke PASS; see the dated checkpoint 2 record in the eval matrix. Neon Bumpers is verified at `1999735`; Portal Pair is verified at checkpoint 4 with 120/120 tests, typecheck/build/diff check and human-reported manual smoke PASS. Moving Shield Gate is verified at checkpoint 5 with 133/133 tests, typecheck/build/diff check and human-reported manual smoke PASS; full-arena regression remains pending.
- Paddle thirds, boundary ties and fixed velocities are now defined in US2. Portal geometry, velocity preservation, exit placement and cooldown are defined in US4. Bumper layout is recorded in the checkpoint 3 evidence; shield dimensions/path/speed are defined in US5. Define them and their expected fixtures before changing runtime code; do not introduce randomness or additional mechanic types.
- New hazard motion runs during playing and freezes during ready/won/lost. On a miss, preserve hazard positions and clear portal lockout for the reset ball; full restart restores initial hazard state. These are explicit planning defaults for later tests.
- Week 3 one-hit rules describe the historical baseline. Armor and directional bounce are the only approved changes to those existing collision semantics; other regressions remain protected.
- Out of scope: multi-ball, weapons, enemies, bosses, power-ups, score multipliers, extra levels, procedural generation, arbitrary physics randomness, AI-controlled paddle, automatic AI gameplay, new authentication/backend requirements, and implementing the Week 5 agent.
- Use the smallest coherent changes and independently test each mechanic. The Week 4 constitution/history is preserved, not silently amended or claimed newly compliant by this later scope.
