// Golden ingest test — the data-accuracy gate.
//
// Runs the orchestrator end-to-end with InMemorySink against the synthetic
// inputs in fixtures/inputs/. Asserts that produced volunteers + teams +
// ingest-error kinds match the hand-derived expectations in
// fixtures/golden_expected.json.
//
// Tolerance: $1 / 1pt per pilot success criterion #1. We compare exactly
// (within JS double precision) because the fixture is deterministic; the
// tolerance only kicks in when reconciling against external sources.

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

import { orchestrate } from '../src/orchestrator.js';
import { InMemorySink } from '../src/write_supabase.js';
import type { TeamOutput, VolunteerOutput } from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(here, '..', 'fixtures');
const INPUTS = resolve(FIXTURES, 'inputs');

type ExpectedVolunteer = Pick<
  VolunteerOutput,
  | 'id'
  | 'full_contact_id'
  | 'sales_rep_id'
  | 'name'
  | 'team'
  | 'team_id'
  | 'member_type'
  | 'active'
  | 'has_nest_access'
  | 'is_sales_captain'
  | 'raised'
  | 'goal'
  | 'metrics'
  | 'thresholds'
  | 'tierId'
  | 'rank'
>;

type Expected = {
  volunteers: ExpectedVolunteer[];
  teams: TeamOutput[];
  ingest_error_kinds: Record<string, number>;
  totals: { errors_count: number; warnings_count: number };
};

const expected: Expected = JSON.parse(
  readFileSync(resolve(FIXTURES, 'golden_expected.json'), 'utf8'),
);

const VOLUNTEER_FIELDS: Array<keyof ExpectedVolunteer> = [
  'id', 'full_contact_id', 'sales_rep_id', 'name', 'team', 'team_id',
  'member_type', 'active', 'has_nest_access', 'is_sales_captain',
  'raised', 'goal', 'metrics', 'thresholds', 'tierId', 'rank',
];

function project<T extends Record<string, unknown>>(obj: T, fields: Array<keyof T>): Partial<T> {
  const out: Partial<T> = {};
  for (const f of fields) out[f] = obj[f];
  return out;
}

describe('golden ingest', () => {
  const sink = new InMemorySink();

  beforeAll(async () => {
    const result = await orchestrate({
      sourceDir: INPUTS,
      rosterPath: resolve(INPUTS, 'Master Roster.xlsx'),
      staffDirectoryPath: resolve(INPUTS, 'Sales Staff Directory.xlsx'),
      exceptionsPath: resolve(INPUTS, 'exceptions.txt'),
      sink,
      // Silent logger — keep test output clean.
      logger: () => {},
    });
    expect(result.fatalError).toBeNull();
    expect(result.status).not.toBe('failed');
  });

  it('produces the expected number of volunteers and teams', () => {
    expect(sink.volunteers.length).toBe(expected.volunteers.length);
    expect(sink.teams.length).toBe(expected.teams.length);
  });

  it('produces the expected volunteers (sorted by id)', () => {
    const actual = [...sink.volunteers]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((v) => project(v, VOLUNTEER_FIELDS));
    const want = [...expected.volunteers].sort((a, b) => a.id.localeCompare(b.id));
    expect(actual).toEqual(want);
  });

  it('produces the expected teams', () => {
    const actual = [...sink.teams].sort((a, b) => a.id.localeCompare(b.id));
    const want = [...expected.teams].sort((a, b) => a.id.localeCompare(b.id));
    expect(actual).toEqual(want);
  });

  it('emits the expected ingest_errors by kind', () => {
    const byKind: Record<string, number> = {};
    for (const e of sink.ingestErrors) byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
    expect(byKind).toEqual(expected.ingest_error_kinds);
  });

  it('emits the expected error + warning totals', () => {
    const errorCount = sink.ingestErrors.filter((e) => e.severity === 'error').length;
    const warnCount = sink.ingestErrors.filter((e) => e.severity === 'warning').length;
    expect(errorCount).toBe(expected.totals.errors_count);
    expect(warnCount).toBe(expected.totals.warnings_count);
  });

  it('emits genuine null for v2 extension fields on every volunteer', () => {
    for (const v of sink.volunteers) {
      expect(v.role).toBeNull();
      expect(v.signals).toBeNull();
      expect(v.momentum).toBeNull();
      expect(v.currentSprint).toBeNull();
      expect(v.levelId).toBeNull();
      expect(v.compositePoints).toBeNull();
      expect(v.rankDelta7d).toBeNull();
      expect(v.sprintRank).toBeNull();
      expect(v.weekPoints).toBeNull();
      expect(v.fundraisingPercentile).toBeNull();
      expect(v.activityPercentile).toBeNull();
    }
  });
});
