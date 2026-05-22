// Derive volunteers.role per architecture/sop_role.md.
//
// Stream C — runs after compute_metrics. Mutates volunteers in place.
//
// Rule precedence (top-down, first match wins):
//   1. id ∈ adminVolunteerIds       → 'admin'
//   2. roster.is_sales_captain       → 'sales_captain'
//   3. has_nest_access === true      → 'volunteer'
//   4. else                           → null

import type { Roster, VolunteerOutput, VolunteerRole } from './types.js';

export type DeriveRoleOptions = {
  volunteers: VolunteerOutput[];
  roster: Roster;
  adminVolunteerIds?: Set<string> | undefined;
};

export function deriveRole(opts: DeriveRoleOptions): void {
  const admins = opts.adminVolunteerIds ?? new Set<string>();

  for (const v of opts.volunteers) {
    v.role = roleFor(v, opts.roster, admins);
  }
}

function roleFor(
  v: VolunteerOutput,
  _roster: Roster,
  admins: Set<string>,
): VolunteerRole | null {
  if (admins.has(v.id)) return 'admin';
  if (v.is_sales_captain) return 'sales_captain';
  if (v.has_nest_access) return 'volunteer';
  return null;
}
