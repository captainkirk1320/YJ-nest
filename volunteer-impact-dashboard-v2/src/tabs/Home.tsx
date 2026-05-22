/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Home (v2) — Volunteer launchpad. Sprint-oriented. 5 blocks.
 *
 * Per CHANGELOG.md, this replaces v1's 11-widget dashboard. Cuts:
 *   - Hustle Board card (lives in Activity Report only)
 *   - Live Activity Feed firehose (replaced with one peer-proof line)
 *   - 2026 Campaign Progress Bar (moved to Weekly Digest)
 *   - Tier ladder full matrix (collapsed to current + next)
 *   - 8-week streak visual (replaced with momentum line)
 *
 * Structure:
 *   1. Active Sprint banner
 *   2. Today's best action (Smart Action Prompt — sharpened copy)
 *   3. Your Good Standing (compact)
 *   4. Your personal links
 *   5. Coming Up + one peer-proof line
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight, Copy, MessageSquare, Mail, Calendar, Trophy,
  Check, Sparkles, Users, Video, TrendingUp, Award, Clock,
} from 'lucide-react';
import { VOLUNTEERS, CURRENT_USER_ID, PERSONAL_LINKS, ACTIVE_PUSH, UPCOMING_MOMENTS, INCENTIVE_TIERS, COMMITTEES, TEAMS, PROGRAM_SIZE, STANDINGS_BY_USER } from '../constants';
import { Volunteer } from '../types';

function daysAgo(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

interface HomeProps {
  onViewDonors: () => void;
  onTakeAction: () => void;
  onViewStandings?: () => void;
}

function daysLeftInPush(): number {
  if (!ACTIVE_PUSH) return 0;
  const ms = new Date(ACTIVE_PUSH.endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function Home({ onViewDonors, onTakeAction, onViewStandings }: HomeProps) {
  const user = VOLUNTEERS.find(v => v.id === CURRENT_USER_ID)!;
  const metCount = Object.values(user.thresholds).filter(Boolean).length;
  const inGoodStanding = metCount === 4;
  // v2.1.2: tier comparisons use compositePoints (the unified score), not raw dollars.
  const userPoints = STANDINGS_BY_USER[user.id]?.compositePoints ?? user.metrics.totalPoints;
  const currentTier = user.tierId ? INCENTIVE_TIERS.find(t => t.id === user.tierId) : null;
  const nextTier = INCENTIVE_TIERS.find(t => t.threshold > userPoints);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* noop */ }
  };

  // Smart Action Prompt — sharpened: one action, one reason, one button
  const smartAction = (() => {
    if (!inGoodStanding) {
      const unmet = Object.entries(user.thresholds).find(([_, v]) => !v)?.[0] ?? 'rateBowl';
      const label = unmet === 'rateBowl' ? 'Rate Bowl' : unmet === 'wishesForTeachers' ? 'Wishes for Teachers' : unmet === 'totalPoints' ? 'a meeting' : 'fundraising';
      return {
        title: `One Rate Bowl share gets you closer to Good Standing.`,
        body: `Send the Rate Bowl link to 3 people who bought last year. Takes 45 seconds.`,
        cta: 'Send Rate Bowl Link',
      };
    }
    if (ACTIVE_PUSH) {
      return {
        title: `${ACTIVE_PUSH.label} wraps in ${daysLeftInPush()} days.`,
        body: `Your team needs 14 more shares to pass the next team. Send your Football Kickoff link to one prospect.`,
        cta: 'Text 3 Contacts',
      };
    }
    return {
      title: 'Beat your last push.',
      body: 'You averaged 6 shares last sprint. One more this week and you set a new personal best.',
      cta: 'Open Toolkit',
    };
  })();

  return (
    <div className="space-y-6 pb-12 max-w-3xl">
      {/* 0. Greeting */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Hey {user.name.split(' ')[0]}</p>
        <h1 className="font-display font-bold text-2xl mt-1">{inGoodStanding ? "You're in Good Standing." : `${4 - metCount} step${4 - metCount === 1 ? '' : 's'} to Good Standing.`}</h1>
      </div>

      {/* 1. Active Sprint banner */}
      {ACTIVE_PUSH && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-primary text-white rounded-3xl p-5 shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/90">Active Sprint</p>
              <h2 className="font-display font-bold text-2xl text-white mt-1 leading-tight">{ACTIVE_PUSH.label}</h2>
            </div>
            <div className="text-right">
              <p className="text-3xl font-display font-bold leading-none text-white">{daysLeftInPush()}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/90 mt-1">days left</p>
            </div>
          </div>
          {ACTIVE_PUSH.targetShares && (
            <>
              <div className="h-2.5 bg-white/30 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${Math.min(100, ((ACTIVE_PUSH.currentShares ?? 0) / ACTIVE_PUSH.targetShares) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold text-white">
                <span>{ACTIVE_PUSH.currentShares?.toLocaleString()} / {ACTIVE_PUSH.targetShares.toLocaleString()} shares</span>
                <span>Your contribution: {user.metrics.currentSprint?.sharesThisSprint ?? 0}</span>
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* 2. Today's best action */}
      <div className="bg-white border border-border rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Today's Best Action</p>
        </div>
        <h3 className="font-display font-bold text-base mb-1">{smartAction.title}</h3>
        <p className="text-sm text-text-secondary mb-4 leading-relaxed">{smartAction.body}</p>
        <button onClick={onTakeAction} className="btn-primary w-full flex items-center justify-center gap-2">
          {smartAction.cta} <ArrowRight size={14} />
        </button>
      </div>

      {/* 3. Your Good Standing — compact rows w/ $ and target per metric */}
      <button
        onClick={onViewDonors}
        className="w-full bg-white border border-border rounded-3xl p-5 shadow-sm text-left hover:border-text-secondary transition-colors"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Your Good Standing</p>
            <h3 className="font-display font-bold text-base mt-1">
              {inGoodStanding ? 'All 4 metrics met' : `${metCount} of 4 metrics met`}
            </h3>
          </div>
          {inGoodStanding ? (
            <div className="bg-success/10 text-success px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">In</div>
          ) : (
            <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{4 - metCount} to go</div>
          )}
        </div>

        {/* Per-metric rows: label, current/target, slim progress bar */}
        <div className="space-y-2.5">
          {[
            { key: 'totalFundraising',   label: 'Total Fundraising',     unit: '$', current: user.metrics.totalFundraising,   target: 10000, met: user.thresholds.totalFundraising },
            { key: 'rateBowl',           label: 'Rate Bowl',             unit: '$', current: user.metrics.rateBowl,           target: 2000,  met: user.thresholds.rateBowl },
            { key: 'wishesForTeachers',  label: 'Wishes for Teachers',   unit: '$', current: user.metrics.wishesForTeachers,  target: 1000,  met: user.thresholds.wishesForTeachers },
            { key: 'totalPoints',        label: 'Total Points',          unit: '',  current: user.metrics.totalPoints,        target: 17500, met: user.thresholds.totalPoints },
          ].map(m => {
            const pct = Math.min(100, (m.current / m.target) * 100);
            return (
              <div key={m.key}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold flex items-center gap-1.5">
                    {m.met ? <Check size={11} className="text-success" /> : <span className="w-2.5 h-2.5 rounded-full border-2 border-border" />}
                    {m.label}
                  </span>
                  <span className="text-text-secondary">
                    <span className={m.met ? 'text-success font-bold' : 'font-bold text-text'}>
                      {m.unit}{m.current.toLocaleString()}
                    </span>
                    <span className="opacity-60"> / {m.unit}{m.target.toLocaleString()}{m.unit === '' ? ' pts' : ''}</span>
                  </span>
                </div>
                <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${m.met ? 'bg-success' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {currentTier && nextTier && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
            <span className="font-bold">
              <Trophy size={12} className="inline mr-1" style={{ color: currentTier.color }} />
              {currentTier.name}
            </span>
            <span className="text-text-secondary">
              {(nextTier.threshold - userPoints).toLocaleString()} pts to {nextTier.name}
            </span>
          </div>
        )}
        <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
          View all my contributions &amp; points <ArrowRight size={10} />
        </p>
      </button>

      {/* 3.5. Where You Stand — accountability surface */}
      <WhereYouStand user={user} onViewStandings={onViewStandings} />


      {/* 4. Personal links */}
      <div className="bg-white border border-border rounded-3xl p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-3">Your Personal Links</p>
        <div className="space-y-3">
          {PERSONAL_LINKS.map(link => (
            <div key={link.event} className="bg-surface rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold">{link.event}</p>
                <span className="text-[10px] text-text-secondary truncate max-w-[180px]">{link.url}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(link.url)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-white rounded-xl border border-border text-xs font-bold hover:border-text-secondary transition-colors"
                >
                  {copied === link.url ? <Check size={12} /> : <Copy size={12} />}
                  {copied === link.url ? 'Copied' : 'Copy'}
                </button>
                <a
                  href={`sms:?body=${encodeURIComponent(`Check out my ${link.event} link: ${link.url}`)}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-white rounded-xl border border-border text-xs font-bold hover:border-text-secondary transition-colors"
                >
                  <MessageSquare size={12} /> SMS
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(`${link.event} - Fiesta Sports Foundation`)}&body=${encodeURIComponent(`Here's my ${link.event} link: ${link.url}`)}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-white rounded-xl border border-border text-xs font-bold hover:border-text-secondary transition-colors"
                >
                  <Mail size={12} /> Email
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Coming Up + peer-proof line */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-border rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-text-secondary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Coming Up</p>
          </div>
          <div className="space-y-3">
            {UPCOMING_MOMENTS.slice(0, 3).map(m => (
              <div key={m.id} className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">{m.label}</p>
                  <p className="text-[10px] text-text-secondary">{m.date}</p>
                </div>
                <ArrowRight size={12} className="text-text-secondary" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-border rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-text-secondary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Your Team — {user.team}</p>
          </div>
          {/* Peer-proof line, not firehose feed. Team-level pressure, not org firehose. */}
          <p className="text-sm leading-relaxed">
            <span className="font-bold">9 of 12</span> teammates have shared {ACTIVE_PUSH?.label ?? 'this sprint'} this week.
          </p>
          <p className="text-xs text-text-secondary mt-2">Be the 10th before Friday.</p>
          {COMMITTEES[0]?.nextMeeting?.link && (
            <a
              href={COMMITTEES[0].nextMeeting.link}
              target="_blank" rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary"
            >
              <Video size={10} /> {COMMITTEES[0].name} · {COMMITTEES[0].nextMeeting.date}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Where You Stand — accountability surface for committed volunteers
// Numbers are data, not verdicts. Each pairs with a frame, not a label.
// ============================================================

function WhereYouStand({ user, onViewStandings }: { user: Volunteer; onViewStandings?: () => void }) {
  const myTeam = TEAMS.find(t => t.id === user.teamId);
  const lastActionDays = daysAgo(user.momentum.lastActionAt);

  // "Last action" is a unit conversion (date -> recency), not a qualitative frame
  const lastActionLabel =
    lastActionDays === 0 ? 'Today' :
    lastActionDays === 1 ? 'Yesterday' :
    `${lastActionDays} days ago`;

  return (
    <div className="bg-white border border-border rounded-3xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Where You Stand</p>
        {onViewStandings && (
          <button onClick={onViewStandings} className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
            See full standings <ArrowRight size={10} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={12} className="text-text-secondary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Yellow Jackets</p>
          </div>
          <p className="font-display font-bold text-xl leading-none">#{user.rank}</p>
          <p className="text-[10px] text-text-secondary mt-1">of {PROGRAM_SIZE}</p>
        </div>

        <div className="bg-surface rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy size={12} className="text-text-secondary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">{user.team}</p>
          </div>
          <p className="font-display font-bold text-xl leading-none">#{myTeam?.rank ?? '—'}</p>
          <p className="text-[10px] text-text-secondary mt-1">of {TEAMS.length} teams</p>
        </div>

        <div className="bg-surface rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-text-secondary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Momentum</p>
          </div>
          <p className="font-display font-bold text-xl leading-none">
            {user.momentum.activeSprintsLast4}<span className="text-sm text-text-secondary"> of 4</span>
          </p>
          <p className="text-[10px] text-text-secondary mt-1">sprints active</p>
        </div>

        <div className="bg-surface rounded-2xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={12} className="text-text-secondary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Last action</p>
          </div>
          <p className="font-display font-bold text-xl leading-none">{lastActionLabel}</p>
          <p className="text-[10px] text-text-secondary mt-1">{new Date(user.momentum.lastActionAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
