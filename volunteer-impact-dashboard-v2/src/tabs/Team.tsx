/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  CheckCircle2, 
  AlertCircle,
  Users, 
  ChevronRight, 
  Phone, 
  Mail,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { VOLUNTEERS, TEAMS } from '../constants';
import { Volunteer } from '../types';

type MetricType = 'totalFundraising' | 'rateBowl' | 'wishesForTeachers' | 'totalPoints';
type ViewType = 'My Team' | 'All Teams' | 'All Volunteers';

export default function TeamTab() {
  const [view, setView] = useState<ViewType>('My Team');
  const [metric, setMetric] = useState<MetricType>('totalFundraising');
  const currentUser = VOLUNTEERS.find(v => v.id === 'u-1')!;
  const myTeam = TEAMS.find(t => t.id === currentUser.teamId)!;
  const myTeammates = VOLUNTEERS.filter(v => v.teamId === currentUser.teamId);

  const getMetricLabel = (m: MetricType) => {
    switch (m) {
      case 'totalFundraising': return 'Total Fundraising';
      case 'rateBowl': return 'Rate Bowl';
      case 'wishesForTeachers': return 'Wishes for Teachers';
      case 'totalPoints': return 'Total Points';
    }
  };

  // Threshold pills must distinguish three states:
  //   true  → success (measured + cleared)
  //   false → warning (measured + missed)
  //   null  → neutral (rule does not apply: Board / Life Member / Life Director,
  //           OR Stream C hasn't run). Rendering null as "warning" misrepresents
  //           non-Nest members as failing. See sop_v2_frontend_null_guards.md.
  const pillClass = (value: boolean | null) =>
    value === true
      ? 'bg-success text-white'
      : value === false
        ? 'bg-warning text-white'
        : 'bg-surface text-text-secondary border border-border';
  const measuredThresholdCount = (v: Volunteer) =>
    Object.values(v.thresholds).filter(t => t != null).length;
  const metThresholdCount = (v: Volunteer) =>
    Object.values(v.thresholds).filter(t => t === true).length;

  const StandingPills = ({ v }: { v: Volunteer }) => {
    const measured = measuredThresholdCount(v);
    const met = metThresholdCount(v);
    return (
      <div className="flex flex-wrap gap-1.5 min-w-[200px]">
        <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight ${pillClass(v.thresholds.totalFundraising)}`}>
          Dollars
        </div>
        <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight ${pillClass(v.thresholds.rateBowl)}`}>
          Rate
        </div>
        <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight ${pillClass(v.thresholds.wishesForTeachers)}`}>
          Wish
        </div>
        <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight ${pillClass(v.thresholds.totalPoints)}`}>
          Pts
        </div>
        <span className="text-[10px] font-bold text-text-secondary ml-1 bg-surface px-1.5 py-0.5 rounded border border-border">
          {measured === 0 ? '—' : `${met}/${measured}`}
        </span>
      </div>
    );
  };

  const TierIcon = ({ tierId }: { tierId?: string }) => {
    if (!tierId) return null;
    const tierColors: Record<string, string> = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FEC52E',
      platinum: '#E5E4E2',
      diamond: '#B9F2FF'
    };
    return (
      <div 
        className="w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
        style={{ backgroundColor: tierColors[tierId] || '#E5E5E5' }}
        title={`${tierId.charAt(0).toUpperCase() + tierId.slice(1)} Tier`}
      >
        <Trophy size={10} className="text-white" />
      </div>
    );
  };

    const [teamSort, setTeamSort] = useState<'Standing' | 'Name' | 'Raised' | 'Activity'>('Standing');

    const sortedTeammates = useMemo(() => {
      let result = [...myTeammates];
      if (teamSort === 'Standing') {
        result.sort((a, b) => {
          const aMet = Object.values(a.thresholds).filter(Boolean).length;
          const bMet = Object.values(b.thresholds).filter(Boolean).length;
          return aMet - bMet; // Surface those with fewer met first
        });
      } else if (teamSort === 'Name') {
        result.sort((a, b) => a.name.localeCompare(b.name));
      } else if (teamSort === 'Raised') {
        result.sort((a, b) => b.raised - a.raised);
      } else if (teamSort === 'Activity') {
        // Mock activity sort using rank as proxy for now or just random
        result.sort((a, b) => b.metrics.totalPoints - a.metrics.totalPoints);
      }
      return result;
    }, [myTeammates, teamSort]);

  const renderMyTeam = () => (
    <div className="space-y-6">
      {/* Team Header Status */}
      <div className="bento-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-text">{myTeam.name}</h2>
          <div className="flex flex-wrap items-center gap-4 mt-1">
            <p className="text-lg font-display font-bold text-primary">${myTeam.raised.toLocaleString()}</p>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${myTeam.raised >= 40000 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
               {myTeam.raised >= 40000 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
               {myTeam.raised >= 40000 ? 'On Pace' : 'Behind Pace'}
            </div>
            <p className="text-xs text-text-secondary font-medium">
              {myTeammates.filter(v =>
                v.thresholds.totalFundraising === true &&
                v.thresholds.rateBowl === true &&
                v.thresholds.wishesForTeachers === true &&
                v.thresholds.totalPoints === true,
              ).length} of {myTeammates.length} in Good Standing
            </p>
          </div>
        </div>
      </div>

      {/* Teammates List */}
      <div className="bento-card overflow-hidden">
        <div className="bg-surface px-6 py-4 border-b border-border flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none">Teammate Performance</h3>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-text-secondary uppercase">Sort:</span>
            <select 
              value={teamSort}
              onChange={(e) => setTeamSort(e.target.value as any)}
              className="bg-white border border-border rounded-lg px-2 py-1 text-[10px] font-bold text-text outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Standing">Standing Status</option>
              <option value="Name">Name</option>
              <option value="Raised">Dollars Raised</option>
              <option value="Activity">Activity</option>
            </select>
          </div>
        </div>
        <div className="divide-y divide-border">
          {sortedTeammates.map((member) => (
            <div key={member.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 hover:bg-surface-subtle transition-all group ${member.id === currentUser.id ? 'border-l-4 border-l-primary' : ''}`}>
              <div className="flex items-center justify-between flex-1 mb-4 sm:mb-0">
                <div className="flex items-center gap-3">
                  <div className="avatar-circle w-10 h-10 text-[10px]">
                    {member.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display font-bold text-sm text-text group-hover:text-primary transition-colors">
                        {member.name} {member.id === currentUser.id && '(You)'}
                      </p>
                      {/* Sales Captain badge = the team-lead role. Distinct from the
                          50,000-pt "Captain" tier (tierId === 'captain'), which is
                          surfaced separately by TierIcon below. */}
                      {member.role === 'sales_captain' && (
                         <span className="text-[8px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 uppercase tracking-tighter">Sales Captain</span>
                      )}
                      <TierIcon tierId={member.tierId} />
                    </div>
                    <p className="text-[10px] text-text-secondary font-medium uppercase mt-0.5">Active 2h ago</p>
                  </div>
                </div>
                
                <div className="sm:hidden text-right">
                  <p className="font-display font-bold text-sm text-text">${member.raised.toLocaleString()}</p>
                  <p className="text-[10px] text-text-secondary font-bold">12 shares</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <StandingPills v={member} />
                <div className="hidden sm:block text-right w-20">
                  <p className="font-display font-bold text-sm text-text">${member.raised.toLocaleString()}</p>
                  <p className="text-[10px] text-text-secondary font-bold">12 shares</p>
                </div>
                <ChevronRight size={16} className="text-text-secondary/30 group-hover:text-primary group-hover:translate-x-1 transition-all hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Aggregates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Raised', value: `$${myTeam.raised.toLocaleString()}`, sub: `vs $${myTeam.goal.toLocaleString()} target` },
          { label: 'Team Shares', value: '128', sub: 'this week' },
          { 
            label: 'In Good Standing', 
            value: `${myTeammates.filter(v =>
                v.thresholds.totalFundraising === true &&
                v.thresholds.rateBowl === true &&
                v.thresholds.wishesForTeachers === true &&
                v.thresholds.totalPoints === true,
              ).length} of ${myTeammates.length}`, 
            sub: 'Yellow Jackets' 
          },
        ].map((stat) => (
          <div key={stat.label} className="bento-card p-4 bg-white">
            <p className="text-[10px] font-bold text-text-secondary uppercase leading-none mb-2">{stat.label}</p>
            <p className="text-xl font-display font-bold text-text">{stat.value}</p>
            <p className="text-[11px] text-text-secondary font-medium mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAllTeams = () => {
    const sortedTeams = [...TEAMS].sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
    return (
      <div className="bento-card overflow-hidden">
        <div className="bg-surface px-6 py-4 border-b border-border flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Team Rankings</h3>
          <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary">
             BY {getMetricLabel(metric).toUpperCase()} <ArrowUpDown size={12} />
          </div>
        </div>
        <div className="divide-y divide-border">
          {sortedTeams.map((team, index) => (
            <div 
              key={team.id}
              className={`flex items-center justify-between p-5 px-6 hover:bg-surface-subtle transition-all group ${team.id === currentUser.teamId ? 'border-l-4 border-l-primary bg-primary/[0.02]' : ''}`}
            >
              <div className="flex items-center gap-4">
                <span className={`w-6 font-display font-bold text-base ${index < 3 ? 'text-primary' : 'text-text-secondary/50'}`}>
                  {index + 1}
                </span>
                <div>
                  <p className="font-display font-bold text-text group-hover:text-primary transition-colors">{team.name}</p>
                  <p className="text-xs text-text-secondary font-medium">{team.volunteerCount} Volunteers</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-lg text-text">
                  {metric !== 'totalPoints' ? '$' : ''}{(team[metric] || 0).toLocaleString()}
                </p>
                <p className="text-[10px] uppercase font-bold text-text-secondary tracking-widest mt-0.5">
                  Total {getMetricLabel(metric).split(' ').pop()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAllVolunteers = () => {
    const sortedVolunteers = [...VOLUNTEERS].sort((a, b) => b.metrics[metric] - a.metrics[metric]);
    return (
      <div className="space-y-4">
        {/* Anchor User */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
           <div className="flex items-center gap-3">
              <div className="avatar-circle w-10 h-10 border-2 border-white">KH</div>
              <div>
                <p className="text-[10px] font-bold text-primary uppercase">My Ranking</p>
                <p className="text-sm font-bold text-text">#{currentUser.rank} of 112 Yellow Jackets</p>
              </div>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-bold text-text-secondary uppercase">My {getMetricLabel(metric).split(' ').pop()}</p>
              <p className="text-sm font-bold text-text">{metric !== 'totalPoints' ? '$' : ''}{currentUser.metrics[metric].toLocaleString()}</p>
           </div>
        </div>

        <div className="bento-card overflow-hidden">
          <div className="divide-y divide-border">
            {sortedVolunteers.slice(0, 10).map((v, index) => (
              <div key={v.id} className="flex items-center justify-between p-4 px-6 hover:bg-surface-subtle transition-all group">
                <div className="flex items-center gap-4">
                  <span className={`w-6 font-display font-bold text-sm ${index < 3 ? 'text-primary' : 'text-text-secondary/50'}`}>
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="avatar-circle w-8 h-8 text-[10px] bg-surface border border-border text-text-secondary">
                      {v.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-text group-hover:text-primary transition-colors">{v.name}</p>
                        {v.thresholds.totalFundraising && v.thresholds.rateBowl && v.thresholds.wishesForTeachers && v.thresholds.totalPoints && (
                          <CheckCircle2 size={12} className="text-success" />
                        )}
                      </div>
                      <p className="text-[10px] text-text-secondary font-medium">{v.team}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-text">
                    {metric !== 'totalPoints' ? '$' : ''}{v.metrics[metric].toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button className="w-full text-center py-4 text-xs font-bold text-text-secondary hover:text-primary transition-colors">
          View full list of 112 volunteers
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2">
            {view === 'My Team' ? 'Where your team stands.' : 'Campaign Rankings'}
          </h1>
          <p className="text-text-secondary font-medium font-sans">
            {view === 'My Team' ? 'Track accountability and team momentum.' : `Comparing ${view.toLowerCase()} by ${getMetricLabel(metric).toLowerCase()}.`}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* View Toggles */}
          <div className="inline-flex bg-surface p-1 rounded-xl border border-border shadow-sm">
            {(['My Team', 'All Teams', 'All Volunteers'] as ViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  view === v ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Metric Filter */}
          {view !== 'My Team' && (
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest hidden sm:block">View Rank By:</span>
               <div className="relative group">
                 <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary group-hover:text-primary transition-colors" size={14} />
                 <select 
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as MetricType)}
                  className="bg-white border border-border rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-text focus:ring-2 focus:ring-primary/20 appearance-none outline-none cursor-pointer transition-all hover:border-primary/50"
                 >
                    <option value="totalFundraising">Total Fundraising</option>
                    <option value="rateBowl">Rate Bowl</option>
                    <option value="wishesForTeachers">Wishes for Teachers</option>
                    <option value="totalPoints">Total Points</option>
                 </select>
               </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={view + metric}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           transition={{ duration: 0.2 }}
        >
          {view === 'My Team' && renderMyTeam()}
          {view === 'All Teams' && renderAllTeams()}
          {view === 'All Volunteers' && renderAllVolunteers()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
