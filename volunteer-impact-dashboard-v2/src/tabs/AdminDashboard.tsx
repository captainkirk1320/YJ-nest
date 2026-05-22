/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AdminDashboard (v2) — full-visibility oversight for foundation staff.
 *
 *   - Org goal progress (lives here, not on volunteer Home)
 *   - All teams aggregate table
 *   - All volunteers list with signals visible, donor counts visible
 *   - Filter by signal type
 *
 * Captain activity is explicitly NOT tracked here per product decision 2026-05-19.
 */

import React, { useMemo, useState } from 'react';
import { Search, TrendingUp, Pause, AlertTriangle, ArrowRight } from 'lucide-react';
import { VOLUNTEERS, TEAMS, GOALS } from '../constants';
import { Volunteer, VolunteerSignals } from '../types';

type SignalFilter = 'all' | 'rising' | 'coasting' | 'at_risk' | 'good_standing';

function signalOf(v: Volunteer): SignalFilter {
  // When Stream C signals are null, no signal classification applies —
  // volunteer counts only against the Good Standing bucket (if all four
  // thresholds === true) and otherwise falls through to 'all'.
  if (v.signals?.atRisk === true) return 'at_risk';
  if (v.signals?.coasting === true) return 'coasting';
  if (v.signals?.rising === true) return 'rising';
  if (
    v.thresholds.totalFundraising === true &&
    v.thresholds.rateBowl === true &&
    v.thresholds.wishesForTeachers === true &&
    v.thresholds.totalPoints === true
  ) return 'good_standing';
  return 'all';
}

const FILTER_LABELS: Record<SignalFilter, string> = {
  all: 'All',
  rising: 'Rising',
  coasting: 'Coasting',
  at_risk: 'At risk',
  good_standing: 'Good Standing',
};

interface AdminDashboardProps {
  onDrillIntoVolunteer?: (volunteerId: string) => void;
}

export default function AdminDashboard({ onDrillIntoVolunteer }: AdminDashboardProps) {
  const orgGoal = GOALS.find(g => g.type === 'organization');
  const [filter, setFilter] = useState<SignalFilter>('all');
  const [search, setSearch] = useState('');

  const signalCounts = useMemo(() => {
    const counts = { rising: 0, coasting: 0, at_risk: 0, good_standing: 0 };
    for (const v of VOLUNTEERS) {
      if (v.signals?.atRisk === true) counts.at_risk++;
      else if (v.signals?.coasting === true) counts.coasting++;
      else if (v.signals?.rising === true) counts.rising++;
      if (
        v.thresholds.totalFundraising === true &&
        v.thresholds.rateBowl === true &&
        v.thresholds.wishesForTeachers === true &&
        v.thresholds.totalPoints === true
      ) counts.good_standing++;
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    let list = VOLUNTEERS;
    if (filter !== 'all') {
      list = list.filter(v => {
        if (filter === 'rising') return v.signals?.rising === true;
        if (filter === 'coasting') return v.signals?.coasting === true;
        if (filter === 'at_risk') return v.signals?.atRisk === true;
        if (filter === 'good_standing') {
          return v.thresholds.totalFundraising === true &&
                 v.thresholds.rateBowl === true &&
                 v.thresholds.wishesForTeachers === true &&
                 v.thresholds.totalPoints === true;
        }
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v => v.name.toLowerCase().includes(q) || v.team.toLowerCase().includes(q));
    }
    return list;
  }, [filter, search]);

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Admin Dashboard</p>
        <h1 className="font-display font-bold text-2xl mt-1">Program oversight</h1>
        <p className="text-xs text-text-secondary mt-1">
          {VOLUNTEERS.length} volunteers across {TEAMS.length} teams
        </p>
      </div>

      {/* Org goal */}
      {orgGoal && (
        <div className="bg-white border border-border rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">{orgGoal.title}</p>
              <h2 className="font-display font-bold text-xl mt-1">
                ${orgGoal.current.toLocaleString()} <span className="text-text-secondary text-sm">/ ${orgGoal.target.toLocaleString()}</span>
              </h2>
            </div>
            <div className="text-right">
              <p className="text-2xl font-display font-bold leading-none">{Math.round((orgGoal.current / orgGoal.target) * 100)}%</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mt-1">to goal</p>
            </div>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${(orgGoal.current / orgGoal.target) * 100}%` }} />
          </div>
          {orgGoal.description && (
            <p className="text-[10px] text-text-secondary mt-2">{orgGoal.description}</p>
          )}
        </div>
      )}

      {/* Signal summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SignalCard label="Rising" count={signalCounts.rising} accent="text-success" icon={<TrendingUp size={14} />} onClick={() => setFilter('rising')} active={filter === 'rising'} />
        <SignalCard label="Coasting" count={signalCounts.coasting} accent="text-amber-700" icon={<Pause size={14} />} onClick={() => setFilter('coasting')} active={filter === 'coasting'} />
        <SignalCard label="At risk" count={signalCounts.at_risk} accent="text-error" icon={<AlertTriangle size={14} />} onClick={() => setFilter('at_risk')} active={filter === 'at_risk'} />
        <SignalCard label="In Good Standing" count={signalCounts.good_standing} accent="text-primary" icon={<TrendingUp size={14} />} onClick={() => setFilter('good_standing')} active={filter === 'good_standing'} />
      </div>

      {/* All teams */}
      <div className="bg-white border border-border rounded-3xl p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-3">All teams</p>
        <div className="space-y-2">
          {TEAMS.sort((a, b) => b.raised - a.raised).map(t => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <div className="text-[10px] font-bold w-6 text-text-secondary">#{t.rank}</div>
                <div>
                  <p className="text-xs font-bold">{t.name}</p>
                  <p className="text-[10px] text-text-secondary">{t.volunteerCount} members</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-display font-bold">${t.raised.toLocaleString()}</p>
                <p className="text-[10px] text-text-secondary">{Math.round((t.raised / t.goal) * 100)}% of ${(t.goal / 1000)}k</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All volunteers — filtered list */}
      <div className="bg-white border border-border rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            {filtered.length} volunteer{filtered.length === 1 ? '' : 's'} · filter: {FILTER_LABELS[filter]}
          </p>
          <div className="flex items-center gap-2 bg-surface px-3 py-2 rounded-xl border border-border">
            <Search size={14} className="text-text-secondary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or team..."
              className="bg-transparent text-xs border-none focus:outline-none w-40"
            />
          </div>
        </div>

        {filter !== 'all' && (
          <button
            onClick={() => setFilter('all')}
            className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3 inline-flex items-center gap-1"
          >
            Clear filter <ArrowRight size={10} />
          </button>
        )}

        <div className="space-y-2">
          {filtered.map(v => (
            <button
              key={v.id}
              onClick={() => onDrillIntoVolunteer?.(v.id)}
              className="w-full bg-surface rounded-2xl p-3 flex items-center gap-3 hover:bg-border/30 transition-colors text-left"
            >
              <div className="avatar-circle !w-9 !h-9 !text-xs">{v.initials}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold truncate">{v.name}</p>
                  <SignalPill signals={v.signals} />
                </div>
                <p className="text-[10px] text-text-secondary truncate">
                  {v.team} · ${v.metrics.totalFundraising.toLocaleString()}
                  {v.metrics.currentSprint == null
                    ? ''
                    : v.metrics.currentSprint.sharesThisSprint != null
                      ? ` · ${v.metrics.currentSprint.sharesThisSprint} shares this sprint`
                      : ' · shares not yet measured'}
                </p>
              </div>
              <ArrowRight size={14} className="text-text-secondary flex-shrink-0" />
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-text-secondary italic py-4 text-center">No volunteers match.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SignalCard({ label, count, accent, icon, onClick, active }: { label: string; count: number; accent: string; icon: React.ReactNode; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white border-2 rounded-2xl p-4 text-left transition-all ${active ? 'border-primary shadow-md' : 'border-border hover:border-text-secondary'}`}
    >
      <div className={`flex items-center gap-1 ${accent}`}>
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-widest">{label}</p>
      </div>
      <p className="font-display font-bold text-2xl mt-1">{count}</p>
    </button>
  );
}

function SignalPill({ signals }: { signals: VolunteerSignals | null }) {
  // signals === null ⇒ Stream C disabled. Render nothing (neutral) rather than
  // a "no signal" badge, which would imply we ran the check and found nothing.
  if (signals == null) return null;
  if (signals.atRisk) return <span className="text-[9px] font-bold uppercase tracking-widest bg-error/10 text-error px-2 py-0.5 rounded-full">At risk</span>;
  if (signals.coasting) return <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Coasting</span>;
  if (signals.rising) return <span className="text-[9px] font-bold uppercase tracking-widest bg-success/10 text-success px-2 py-0.5 rounded-full">Rising</span>;
  return null;
}
