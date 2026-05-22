/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CaptainHome (v2) — triage console for captains.
 *
 * Three buckets:
 *   ✅ Rising — congratulate
 *   🟡 Coasting — nudge
 *   🔴 At risk — check in (bottom 15% × 15% intersection)
 *
 * Each member row opens <NudgeModal /> with templates for that signal type.
 * Captain sees own team in full; other teams as aggregates only.
 */

import React, { useMemo, useState } from 'react';
import { TrendingUp, AlertTriangle, Pause, ArrowRight, Users } from 'lucide-react';
import { VOLUNTEERS, TEAMS, CURRENT_USER_ID, ACTIVE_PUSH } from '../constants';
import { NudgeSignalType, Volunteer } from '../types';
import NudgeModal from '../components/NudgeModal';

interface CaptainHomeProps {
  onDrillIntoMember?: (memberId: string) => void;
}

interface NudgeTarget {
  member: Volunteer;
  signalType: NudgeSignalType;
}

export default function CaptainHome({ onDrillIntoMember }: CaptainHomeProps) {
  const captain = VOLUNTEERS.find(v => v.id === CURRENT_USER_ID)!;
  const myTeam = TEAMS.find(t => t.id === captain.teamId)!;
  const otherTeams = TEAMS.filter(t => t.id !== captain.teamId);

  const teamMembers = VOLUNTEERS.filter(v => v.teamId === captain.teamId && v.id !== captain.id);

  const rising   = useMemo(() => teamMembers.filter(m => m.signals.rising), [teamMembers]);
  const coasting = useMemo(() => teamMembers.filter(m => m.signals.coasting), [teamMembers]);
  const atRisk   = useMemo(() => teamMembers.filter(m => m.signals.atRisk), [teamMembers]);

  const [nudge, setNudge] = useState<NudgeTarget | null>(null);

  const teamShares = teamMembers.reduce((sum, m) => sum + (m.metrics.currentSprint?.sharesThisSprint ?? 0), 0);
  const goodStanding = teamMembers.filter(m => Object.values(m.thresholds).every(Boolean)).length;

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Captain Dashboard</p>
        <h1 className="font-display font-bold text-2xl mt-1">{myTeam.name} — Triage</h1>
        <p className="text-xs text-text-secondary mt-1">
          {teamMembers.length} members · {goodStanding} in Good Standing · {teamShares} shares this sprint
        </p>
      </div>

      {/* Triage buckets */}
      <BucketSection
        title="At risk"
        subtitle="Bottom 15% in $ and shares. Time to reach out."
        icon={<AlertTriangle size={16} />}
        accent="bg-error/10 text-error border-error/30"
        members={atRisk}
        signalType="at_risk"
        emptyText="Nobody on your team is currently at risk."
        onNudge={(m) => setNudge({ member: m, signalType: 'at_risk' })}
        onDrill={onDrillIntoMember}
      />
      <BucketSection
        title="Coasting"
        subtitle="Quiet but with runway. Send a sprint-relevant nudge."
        icon={<Pause size={16} />}
        accent="bg-amber-100 text-amber-800 border-amber-200"
        members={coasting}
        signalType="coasting"
        emptyText="No coasting members right now."
        onNudge={(m) => setNudge({ member: m, signalType: 'coasting' })}
        onDrill={onDrillIntoMember}
      />
      <BucketSection
        title="Rising"
        subtitle="On a roll. Recognize the work."
        icon={<TrendingUp size={16} />}
        accent="bg-success/10 text-success border-success/30"
        members={rising}
        signalType="rising"
        emptyText="No rising members this sprint."
        onNudge={(m) => setNudge({ member: m, signalType: 'rising' })}
        onDrill={onDrillIntoMember}
      />

      {/* Other teams — aggregates only */}
      <div className="bg-white border border-border rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-text-secondary" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Other Teams (aggregates only)</p>
        </div>
        <div className="space-y-3">
          {otherTeams.map(t => (
            <div key={t.id} className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold">{t.name}</p>
                <p className="text-[10px] text-text-secondary">{t.volunteerCount} members · rank #{t.rank}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-display font-bold">${t.raised.toLocaleString()}</p>
                <p className="text-[10px] text-text-secondary">{t.rateBowl.toLocaleString()} Rate Bowl · {t.wishesForTeachers.toLocaleString()} WfT</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-text-secondary italic mt-3">
          Individual member detail and donor data are private to each team's captain.
        </p>
      </div>

      {nudge && (
        <NudgeModal
          recipient={nudge.member}
          signalType={nudge.signalType}
          onClose={() => setNudge(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Bucket section component
// ============================================================

interface BucketSectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  members: Volunteer[];
  signalType: NudgeSignalType;
  emptyText: string;
  onNudge: (m: Volunteer) => void;
  onDrill?: (memberId: string) => void;
}

function BucketSection({ title, subtitle, icon, accent, members, signalType, emptyText, onNudge, onDrill }: BucketSectionProps) {
  return (
    <div className="bg-white border border-border rounded-3xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${accent.split(' ').slice(0, 2).join(' ')}`}>
              {icon}
            </div>
            <h3 className="font-display font-bold text-base">{title}</h3>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${accent}`}>
              {members.length}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-2 ml-9">{subtitle}</p>
        </div>
      </div>

      {members.length === 0 ? (
        <p className="text-xs text-text-secondary italic ml-9 py-2">{emptyText}</p>
      ) : (
        <div className="space-y-2 mt-3">
          {members.map(m => (
            <div key={m.id} className="bg-surface rounded-2xl p-3 flex items-center justify-between gap-3">
              <button
                onClick={() => onDrill?.(m.id)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="avatar-circle !w-9 !h-9 !text-xs flex-shrink-0">{m.initials}</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{m.name}</p>
                  <p className="text-[10px] text-text-secondary truncate">{m.signals.signalReason ?? '—'}</p>
                </div>
              </button>
              <button
                onClick={() => onNudge(m)}
                className="btn-primary !py-2 !px-3 text-[10px] uppercase tracking-widest whitespace-nowrap flex-shrink-0"
              >
                {signalType === 'rising' ? 'Send congrats' : signalType === 'coasting' ? 'Send nudge' : 'Check in'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
