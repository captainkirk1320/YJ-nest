/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Standings (v2.1) — leaderboards designed to move the middle 60-70%.
 *
 * Principles:
 *   - 3 windows (Sprint / Season / All-Time) so multiple #1s exist
 *   - Top 10 only — bottom is never publicly shown
 *   - "Movers This Week" section specifically rewards mid-rank climbers
 *     (the top 10% can't be movers — they're already at the top)
 *   - 9 football-themed levels with % scarcity drive individual progression
 *   - Composite scoring (not pure $) so middle networks aren't disadvantaged
 *
 * North star: top 10% stays consistent YoY. This UI is engineered for
 * everyone else.
 */

import React, { useMemo, useState } from 'react';
import { TrendingUp, Trophy, Sparkles, ArrowUp, ArrowDown, Minus, Award } from 'lucide-react';
import {
  CURRENT_USER_ID,
  INCENTIVE_TIERS,
  MOCK_LEADERBOARD,
  STANDINGS_BY_USER,
  TEAMS,
  VOLUNTEERS,
  pctAtOrAboveTier,
  ACTIVE_PUSH,
} from '../constants';
import { IncentiveTier, Volunteer } from '../types';

type Window = 'week' | 'sprint' | 'season';

const WINDOW_LABELS: Record<Window, { title: string; subtitle: string }> = {
  week:   { title: 'Week',   subtitle: 'Last 7 days' },
  sprint: { title: 'Sprint', subtitle: ACTIVE_PUSH?.label ?? 'Active push' },
  season: { title: 'Season', subtitle: '2026-27 to date' },
};

// Tier 1 (Walk-On) thresholds depend on volunteer category
function tier1ThresholdFor(category: string | undefined): { pts: number; raised: number } {
  const walkOn = INCENTIVE_TIERS[0];
  if (category === 'Future') {
    return { pts: walkOn.thresholdFuture ?? walkOn.threshold, raised: walkOn.minFundraisingFuture ?? 0 };
  }
  return { pts: walkOn.threshold, raised: walkOn.minFundraising ?? 0 };
}

export default function Standings() {
  const user = VOLUNTEERS.find(v => v.id === CURRENT_USER_ID)!;
  const userStandings = STANDINGS_BY_USER[user.id];
  const [windowChoice, setWindowChoice] = useState<Window>('sprint');

  const isPreTier = userStandings.levelId === 0;
  const userTierIndex = isPreTier ? -1 : Math.max(0, Math.min(INCENTIVE_TIERS.length - 1, userStandings.levelId - 1));
  const userLevel: IncentiveTier | undefined = isPreTier ? undefined : INCENTIVE_TIERS[userTierIndex];
  const nextLevel: IncentiveTier | undefined = isPreTier ? INCENTIVE_TIERS[0] : INCENTIVE_TIERS[userTierIndex + 1];

  // Pre-tier: progress from 0 to Walk-On threshold (role-aware)
  // In-tier: progress from current tier threshold to next tier threshold
  const t1 = tier1ThresholdFor(user.volunteerCategory);
  const progressNumerator   = isPreTier ? userStandings.compositePoints : userStandings.compositePoints - (userLevel?.threshold ?? 0);
  const progressDenominator = isPreTier ? t1.pts : ((nextLevel?.threshold ?? userStandings.compositePoints) - (userLevel?.threshold ?? 0));
  const progressInLevel = progressDenominator > 0 ? (progressNumerator / progressDenominator) * 100 : 100;
  const pointsToNext = nextLevel ? Math.max(0, nextLevel.threshold - userStandings.compositePoints) : 0;
  const ptsToWalkOn = isPreTier ? Math.max(0, t1.pts - userStandings.compositePoints) : 0;
  const fundraisingToWalkOn = isPreTier ? Math.max(0, t1.raised - user.raised) : 0;

  // Helper: tier name by levelId (0 = Pre-tier)
  const tierNameByLevelId = (levelId: number): string => {
    if (levelId === 0) return 'Pre-tier';
    return INCENTIVE_TIERS[Math.max(0, Math.min(INCENTIVE_TIERS.length - 1, levelId - 1))]?.name ?? '—';
  };

  const myTeam = TEAMS.find(t => t.id === user.teamId);

  // Sorted leaderboard by window
  const leaderboard = useMemo(() => {
    const entries = [...MOCK_LEADERBOARD];
    const key: keyof typeof entries[number] =
      windowChoice === 'week'   ? 'weekPoints' :
      windowChoice === 'sprint' ? 'sprintPoints' : 'seasonPoints';
    entries.sort((a, b) => (b[key] as number) - (a[key] as number));
    return entries.slice(0, 10);
  }, [windowChoice]);

  // Movers — top 5 climbers, excluding the absolute top 10% (rankDelta near 0 because already there)
  const movers = useMemo(() => {
    return [...MOCK_LEADERBOARD]
      .filter(e => e.rankDelta7d > 0)
      .sort((a, b) => b.rankDelta7d - a.rankDelta7d)
      .slice(0, 5);
  }, []);

  // User row at the bottom of the leaderboard if not in top 10
  const userInTop10 = leaderboard.find(e => e.id === user.id);
  const userLeaderboardEntry = MOCK_LEADERBOARD.find(e => e.id === user.id);

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* ============================================ */}
      {/* Personal Hero — your level + progression       */}
      {/* ============================================ */}
      <div className="bg-gradient-to-br from-primary to-primary/85 text-white rounded-3xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/90">
              {isPreTier ? 'Working Toward' : 'Your Tier'}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="font-display font-bold text-3xl text-white leading-none">
                {isPreTier ? 'Walk-On' : userLevel?.name}
              </h2>
              {!isPreTier && (
                <span className="text-white/80 text-sm font-bold">Tier {userStandings.levelId} of {INCENTIVE_TIERS.length}</span>
              )}
            </div>
            <p className="text-[10px] text-white/80 mt-2">
              {isPreTier
                ? `Walk-On qualification${user.volunteerCategory === 'Future' ? ' (Futures)' : ''}: ${t1.pts.toLocaleString()} pts + $${t1.raised.toLocaleString()} raised`
                : `${Math.round(pctAtOrAboveTier(userTierIndex) * 100)}% of Yellow Jackets are at this tier or higher`}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Award size={32} className="text-white" />
          </div>
        </div>

        {nextLevel && (
          <>
            <div className="h-2 bg-white/25 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-white rounded-full" style={{ width: `${Math.max(2, Math.min(100, progressInLevel))}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-white">
              <span>{userStandings.compositePoints.toLocaleString()} pts</span>
              <span>
                {isPreTier
                  ? `${ptsToWalkOn.toLocaleString()} pts${fundraisingToWalkOn > 0 ? ` + $${fundraisingToWalkOn.toLocaleString()}` : ''} to Walk-On`
                  : `${pointsToNext.toLocaleString()} to ${nextLevel.name}`}
              </span>
            </div>
          </>
        )}

        {/* Quick stats strip */}
        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Sprint Rank</p>
            <p className="font-display font-bold text-xl text-white">#{userStandings.sprintRank}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Season Rank</p>
            <p className="font-display font-bold text-xl text-white">#{user.rank}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">7-Day Move</p>
            <p className="font-display font-bold text-xl text-white flex items-center justify-center gap-1">
              <DeltaIcon delta={userStandings.rankDelta7d} />
              {userStandings.rankDelta7d > 0 ? `+${userStandings.rankDelta7d}` : userStandings.rankDelta7d}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* Movers This Week — the middle's spotlight     */}
      {/* ============================================ */}
      <div className="bg-white border border-border rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Movers This Week</p>
        </div>
        <p className="text-xs text-text-secondary mb-4">
          Top climbers in the last 7 days. Where the action is.
        </p>
        <div className="space-y-2">
          {movers.map((m, i) => (
            <div key={m.id} className={`rounded-2xl p-3 flex items-center gap-3 ${m.id === user.id ? 'bg-primary/10 border-2 border-primary' : 'bg-surface'}`}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary w-5">#{i + 1}</div>
              <div className="avatar-circle !w-9 !h-9 !text-xs flex-shrink-0">{m.initials}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">
                  {m.name} {m.id === user.id && <span className="text-primary text-[10px]">· You</span>}
                </p>
                <p className="text-[10px] text-text-secondary truncate">{m.team} · {tierNameByLevelId(m.levelId)}</p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-success text-base leading-none">+{m.rankDelta7d}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">spots</p>
              </div>
            </div>
          ))}
          {movers.length === 0 && (
            <p className="text-xs text-text-secondary italic py-2">No climbers this week.</p>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* Leaderboard tabs — Sprint / Season / All-Time */}
      {/* ============================================ */}
      <div className="bg-white border border-border rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-1 mb-4 p-1 bg-surface rounded-xl">
          {(['week', 'sprint', 'season'] as Window[]).map(w => (
            <button
              key={w}
              onClick={() => setWindowChoice(w)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                windowChoice === w ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text'
              }`}
            >
              {WINDOW_LABELS[w].title}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-text-secondary mb-3 px-1">{WINDOW_LABELS[windowChoice].subtitle}</p>

        <div className="space-y-1.5">
          {leaderboard.map((entry, i) => {
            const points =
              windowChoice === 'week'   ? entry.weekPoints :
              windowChoice === 'sprint' ? entry.sprintPoints : entry.seasonPoints;
            const isMe = entry.id === user.id;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            return (
              <div key={entry.id} className={`rounded-2xl p-3 flex items-center gap-3 ${isMe ? 'bg-primary/10 border-2 border-primary' : 'bg-surface'}`}>
                <div className="text-xs font-bold w-6 text-center">
                  {medal ?? `#${i + 1}`}
                </div>
                <div className="avatar-circle !w-9 !h-9 !text-xs flex-shrink-0">{entry.initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">
                    {entry.name} {isMe && <span className="text-primary text-[10px]">· You</span>}
                  </p>
                  <p className="text-[10px] text-text-secondary truncate">{entry.team} · {tierNameByLevelId(entry.levelId)}</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-base leading-none">{points.toLocaleString()}</p>
                  <p className="text-[10px] text-text-secondary mt-0.5">pts</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Your row at the bottom if not in top 10 */}
        {!userInTop10 && userLeaderboardEntry && (
          <>
            <div className="my-3 flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <p className="text-[10px] text-text-secondary uppercase tracking-widest">Your Position</p>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="rounded-2xl p-3 flex items-center gap-3 bg-primary/10 border-2 border-primary">
              <div className="text-xs font-bold w-6 text-center">#{userStandings.sprintRank}</div>
              <div className="avatar-circle !w-9 !h-9 !text-xs flex-shrink-0">{userLeaderboardEntry.initials}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{userLeaderboardEntry.name} <span className="text-primary text-[10px]">· You</span></p>
                <p className="text-[10px] text-text-secondary truncate">{userLeaderboardEntry.team} · {tierNameByLevelId(userLeaderboardEntry.levelId)}</p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-base leading-none">
                  {(windowChoice === 'week'   ? userLeaderboardEntry.weekPoints :
                    windowChoice === 'sprint' ? userLeaderboardEntry.sprintPoints :
                    userLeaderboardEntry.seasonPoints).toLocaleString()}
                </p>
                <p className="text-[10px] text-text-secondary mt-0.5">pts</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ============================================ */}
      {/* Levels Overview — the full ladder              */}
      {/* ============================================ */}
      <div className="bg-white border border-border rounded-3xl p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-3">The Ladder</p>
        <p className="text-xs text-text-secondary mb-4">
          6 tiers. Rewards drawn from the 2025 Yellow Jacket Incentives.
        </p>
        <div className="space-y-3">
          {INCENTIVE_TIERS.map((tier, i) => {
            const isCurrent = i === userTierIndex;
            const isUnlocked = userStandings.compositePoints >= tier.threshold;
            const isLocked = !isUnlocked && !isCurrent;
            return (
              <div key={tier.id} className={`rounded-2xl p-4 ${
                isCurrent ? 'bg-primary/5 border-2 border-primary' :
                isLocked ? 'bg-surface opacity-70' : 'bg-success/5 border border-success/30'
              }`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white border border-border" style={{ borderColor: tier.color }}>
                    <span className="text-xs font-bold" style={{ color: tier.color }}>{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold flex items-center gap-2">
                      {tier.name}
                      {isCurrent && <span className="text-[9px] font-bold uppercase tracking-widest bg-primary text-white px-1.5 py-0.5 rounded">You</span>}
                    </p>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      {tier.threshold.toLocaleString()} pts
                      {tier.thresholdFuture && ` (Actives) · ${tier.thresholdFuture.toLocaleString()} pts (Futures)`}
                      {tier.minFundraising && ` · $${tier.minFundraising.toLocaleString()} raised`}
                      {tier.minFundraisingFuture && ` / $${tier.minFundraisingFuture.toLocaleString()} (Futures)`}
                    </p>
                  </div>
                  <p className="text-[10px] text-text-secondary whitespace-nowrap">{Math.round((tier.pctOfProgram ?? 0) * 100)}% of program</p>
                </div>

                {/* Reward categories: Tickets / Swag / Experiences / Donations */}
                <div className="space-y-2 pl-11">
                  <RewardLine label="Tickets" items={tier.reward.tickets} />
                  <RewardLine label="Swag" items={tier.reward.swag} />
                  {tier.reward.experiences.length > 0 && <RewardLine label="Experiences" items={tier.reward.experiences} />}
                  {tier.reward.donations.length > 0 && <RewardLine label="Donations" items={tier.reward.donations} />}
                  {tier.reward.chooseOne && tier.reward.chooseOne.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mt-2 mb-1">Choose One</p>
                      <ul className="text-[10px] text-text leading-relaxed space-y-0.5">
                        {tier.reward.chooseOne.map((opt, idx) => (
                          <li key={idx} className="flex gap-1.5">
                            <span className="text-text-secondary">{idx + 1}.</span>
                            <span>{opt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footnote — design intent */}
      <p className="text-[10px] text-text-secondary italic text-center px-4">
        Bottom of the leaderboard isn't shown. Only the top 10 and your own position appear publicly.
      </p>
    </div>
  );
}

function DeltaIcon({ delta }: { delta: number }) {
  if (delta > 0) return <ArrowUp size={14} />;
  if (delta < 0) return <ArrowDown size={14} />;
  return <Minus size={14} />;
}

function RewardLine({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex gap-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary w-20 flex-shrink-0 pt-0.5">{label}</p>
      <ul className="text-[11px] text-text leading-relaxed space-y-0.5 flex-1">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}
