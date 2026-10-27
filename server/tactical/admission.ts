import { performance } from 'node:perf_hooks';

export const MAX_ACTIVE_TACTICAL_RUNS = 2;
export const MAX_TACTICAL_ADMISSIONS = 5;
export const TACTICAL_ADMISSION_WINDOW_MS = 60_000;

export type AdmissionRejection = 'RATE_LIMIT' | 'ACTIVE_LIMIT';
export interface TacticalAdmissionSnapshot {
  activeRuns: number;
  admittedRuns: number;
  releasedRuns: number;
}
export interface TacticalAdmissionLease { release(): void }
export type TacticalAdmissionDecision =
  | { admitted: true; lease: TacticalAdmissionLease }
  | { admitted: false; reason: AdmissionRejection };

export interface TacticalAdmission {
  tryAdmit(): TacticalAdmissionDecision;
  snapshot(): TacticalAdmissionSnapshot;
}

// One admission object is created per HTTP server instance. The check and
// reservation contain no await, so arrivals cannot pass the same capacity test.
export function createTacticalAdmission(now: () => number = () => performance.now()): TacticalAdmission {
  let activeRuns = 0;
  let releasedRuns = 0;
  let timestamps: number[] = [];

  function prune(at: number): void {
    timestamps = timestamps.filter((timestamp) => timestamp > at - TACTICAL_ADMISSION_WINDOW_MS);
  }

  return {
    tryAdmit(): TacticalAdmissionDecision {
      const at = now();
      prune(at);
      if (timestamps.length >= MAX_TACTICAL_ADMISSIONS) return { admitted: false, reason: 'RATE_LIMIT' };
      if (activeRuns >= MAX_ACTIVE_TACTICAL_RUNS) return { admitted: false, reason: 'ACTIVE_LIMIT' };
      timestamps.push(at);
      activeRuns++;
      let released = false;
      return { admitted: true, lease: {
        release() {
          if (released) return;
          released = true;
          activeRuns--;
          releasedRuns++;
        },
      } };
    },
    snapshot(): TacticalAdmissionSnapshot {
      prune(now());
      return { activeRuns, admittedRuns: timestamps.length, releasedRuns };
    },
  };
}
