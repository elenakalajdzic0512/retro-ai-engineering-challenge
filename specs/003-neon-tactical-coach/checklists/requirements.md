# Specification Quality Checklist: Neon Tactical Coach

**Purpose**: Validate Week 5 requirements and design completeness before implementation.
**Created**: 2026-10-06
**Feature**: [spec.md](../spec.md)
**Ownership**: `[x]` means the requirement wording has been reviewed against the design artifacts; it does not claim implementation or live evaluation.

## User value and scope

- [x] CHK001 Are player goals, returned tactical value and advisory-only behavior explicit? [Spec §User Story 1, FR-001, FR-003]
- [x] CHK002 Are the five existing arena mechanics, 40 bricks, 400-point ceiling, three lives and Week 4 Hint preservation stated? [Spec FR-002]
- [x] CHK003 Are successful, rejected-candidate, invalid-input and provider-failure scenarios defined? [Spec §User Stories, Edge Cases]
- [x] CHK004 Are completion outcomes measurable without relying on unverified model quality claims? [Spec §Success Criteria]

## Contracts and authority

- [x] CHK005 Are the two allowed tools, their read-only roles and exact argument boundaries defined? [Spec FR-005; Contracts §Tools]
- [x] CHK006 Is the provenance limit of validated client-reported state and the schema-only meaning of `snapshotVersion: 1` explicit? [Spec §Assumptions; Research §Evidence provenance]
- [x] CHK007 Are snapshot fields, value ranges, count consistency and exclusion of raw game arrays specified? [Spec FR-006; Data model §Snapshot consistency]
- [x] CHK008 Are the candidate vocabulary and deterministic evaluation/rejection rules unambiguous? [Spec FR-007; Contracts §Evaluator]
- [x] CHK009 Are final fields, bounds, four-field accepted-candidate equality, both required evidence sources and application-owned success defined? [Spec FR-008; Contracts §Final]
- [x] CHK010 Are secret, provider, file, shell, network and gameplay-write prohibitions specified at each boundary? [Spec FR-003; Plan §Authority]

## Bounds, reliability and evidence

- [x] CHK011 Are normal/retry step-attempt-tool counts, min(5 s, remaining deadline), absolute 22 s scope and outer HTTP boundary check explicit? [Spec FR-009; Plan §Limits]
- [x] CHK012 Are the three exact states, state-first loop control, repeat defense and premature/extra proposals addressed without an open-ended loop? [Spec FR-004/010; Plan §State machine]
- [x] CHK013 Are required failure/stop cases and sanitized public error behavior specified? [Spec FR-010; Plan §Failure]
- [x] CHK014 Are fake-provider success/failure coverage and zero-key/zero-network expectations specified before live use? [Spec FR-012; Quickstart §Matrix]
- [x] CHK015 Are Week 4 and Hazard Arena regressions and game-state immutability part of acceptance? [Spec SC-003; Tasks §Phase 6]
- [x] CHK016 Are human pair review, actual attribution and separate fake/live/manual evidence required? [Spec SC-005; Tasks T026–T028]
- [x] CHK017 Is a separate Week 5 function-calling/structured-output provider adapter required while Week 4 Gemini behavior stays unchanged? [Plan §Request; Research §Provider]

## Notes

The spec describes user outcomes; the plan, research, data model and contracts carry the implementation choices. All checklist items passed this design review. Exact pinned provider integration and deployed outer HTTP timeout remain live checks in `research.md`; no implementation or live provider call is claimed.
