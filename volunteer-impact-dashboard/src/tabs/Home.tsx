/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  ArrowRight, 
  Sparkles, 
  Trophy, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Copy, 
  MessageSquare, 
  Mail, 
  User, 
  Users, 
  Video, 
  Calendar,
  ChevronDown,
  ChevronUp,
  Circle,
  Phone
} from 'lucide-react';
import { VOLUNTEERS, GOALS, ACTIVITIES, PERSONAL_LINKS, COMMITTEES, UPCOMING_MOMENTS, INCENTIVE_TIERS } from '../constants';

interface HomeTabProps {
  onViewDonors: () => void;
  onViewHustle: () => void;
  onTakeAction: () => void;
}

export default function HomeTab({ onViewDonors, onViewHustle, onTakeAction }: HomeTabProps) {
  const currentUser = VOLUNTEERS.find(v => v.id === 'u-1')!;
  const orgGoal = GOALS.find(g => g.type === 'organization')!;
  const [isCohortExpanded, setIsCohortExpanded] = React.useState(false);
  const [showCelebration, setShowCelebration] = React.useState(false);
  
  React.useEffect(() => {
    // Mock simulation: if user just crossed a tier and hasn't seen it
    const lastSeenTier = localStorage.getItem('last_seen_tier');
    if (currentUser.tierId === 'gold' && lastSeenTier !== 'gold') {
      setShowCelebration(true);
      localStorage.setItem('last_seen_tier', 'gold');
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [currentUser.tierId]);
  
  const thresholds = [
    { name: 'Total Fundraising', current: currentUser.metrics.totalFundraising, target: 10000, prefix: '$', met: currentUser.metrics.totalFundraising >= 10000 },
    { name: 'Rate Bowl', current: currentUser.metrics.rateBowl, target: 2000, prefix: '$', met: currentUser.metrics.rateBowl >= 2000 },
    { name: 'Wishes for Teachers', current: currentUser.metrics.wishesForTeachers, target: 1000, prefix: '$', met: currentUser.metrics.wishesForTeachers >= 1000 },
    { name: 'Total Points', current: currentUser.metrics.totalPoints, target: 17500, prefix: '', met: currentUser.metrics.totalPoints >= 17500 },
  ];

  const metCount = thresholds.filter(t => t.met).length;
  const isAllMet = metCount === 4;

  return (
    <div className="space-y-8 pb-12">
      {/* Header Area */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold text-text">Hey {currentUser.name.split(' ')[0]}.</h1>
        <p className="text-text-secondary font-medium font-sans italic">Yellow Jackets, let me show you where we stand.</p>
      </div>

      {/* Good Standing Scorecard */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary">Good Standing Scorecard</h2>
          
          <div className="flex flex-col md:items-end gap-1">
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 w-fit ${
              isAllMet ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
            }`}>
              {isAllMet ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {isAllMet ? 'In Good Standing' : `${metCount} of 4 Goals Met`}
            </div>
            {!isAllMet && (
              <p className="text-warning text-[10px] font-bold uppercase tracking-wider pl-1">
                {4 - metCount} goals to go
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {thresholds.map((item) => (
            <motion.div 
              key={item.name}
              whileHover={{ y: -4 }}
              onClick={onViewDonors}
              className={`bento-card p-5 flex flex-col justify-between min-h-[180px] cursor-pointer group transition-colors ${
                item.met ? 'bg-gradient-to-b from-success/5 to-white border-success/20' : 'bg-gradient-to-b from-primary/5 to-white border-primary/20'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="eyebrow !text-[10px] leading-tight max-w-[100px]">{item.name}</span>
                {item.met ? (
                  <CheckCircle2 size={18} className="text-success" />
                ) : (
                  <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(208,32,48,0.4)]" />
                )}
              </div>
              
              <div>
                <p className="large-data group-hover:text-primary transition-colors">
                  {item.prefix}{item.current.toLocaleString()}
                </p>
                <div className="flex items-center justify-between mt-1">
                   <p className="text-[11px] font-bold text-text-secondary uppercase">
                     {item.prefix}{item.target.toLocaleString()} Goal
                   </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-700 ${item.met ? 'bg-success' : 'bg-primary'}`} 
                    style={{ width: `${Math.min(100, (item.current / item.target) * 100)}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-start">
          <button onClick={onViewDonors} className="text-sm font-bold text-link hover:underline flex items-center gap-2">
             View my donors <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* My Personal Links */}
      <section className="bento-card p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary">Your Personal Ticket Links</h3>
            <p className="text-xs text-text-secondary font-medium">Any ticket purchased through these links counts toward your fundraising.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PERSONAL_LINKS.map((link) => (
            <div key={link.event} className="space-y-3">
              <p className="text-sm font-bold text-text">{link.event}</p>
              <div className="bg-surface border border-border p-4 rounded-xl space-y-3">
                <p className="text-sm font-sans text-text break-all select-all">
                  {link.url}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button 
                    onClick={() => {
                       navigator.clipboard.writeText(link.url);
                       // Link copied toast would go here
                    }}
                    className="btn-secondary !py-2 !px-4 !text-[11px] h-9 gap-1.5 border-border text-text hover:border-primary"
                  >
                    <Copy size={14} /> Copy link
                  </button>
                  <button className="btn-secondary !py-2 !px-4 !text-[11px] h-9 gap-1.5 border-border text-text hover:border-primary">
                    <MessageSquare size={14} /> Share via SMS
                  </button>
                  <button className="btn-secondary !py-2 !px-4 !text-[11px] h-9 gap-1.5 border-border text-text hover:border-primary">
                    <Mail size={14} /> Share via Email
                  </button>
                </div>
              </div>
              <button className="text-[10px] font-bold text-text-secondary/60 hover:text-error transition-colors uppercase tracking-widest pl-1">Report incorrect link</button>
            </div>
          ))}
        </div>
      </section>

      {/* Personal Cohort Comparison */}
      <section className="bento-card overflow-hidden">
        <div 
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface/50 transition-colors"
          onClick={() => setIsCohortExpanded(!isCohortExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center text-info">
              <Users size={18} />
            </div>
            <p className="text-sm font-display font-bold">
              You're Ranked 24 of 112 in Fundraising this month.
            </p>
          </div>
          <div className="text-text-secondary">
            {isCohortExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>

        <AnimatePresence>
          {isCohortExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 pb-6 pt-2 border-t border-border space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Global Ranking — 112 volunteers</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-text-secondary font-medium">Total Fundraising</span>
                  <span className="font-bold text-primary font-display">Rank 24 of 112</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-text-secondary font-medium">Total Points</span>
                  <span className="font-bold text-primary font-display">Rank 38 of 112</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-text-secondary font-medium">Activity (shares, last 30 days)</span>
                  <span className="font-bold text-primary font-display">Rank 12 of 112</span>
                </div>
              </div>

              <p className="text-[10px] text-text-secondary font-medium italic pt-2">
                Visible only to you.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Your Tier */}
      {(() => {
        const currentTier = INCENTIVE_TIERS.find(t => t.id === currentUser.tierId) || INCENTIVE_TIERS[0];
        const nextTier = INCENTIVE_TIERS[INCENTIVE_TIERS.indexOf(currentTier) + 1];
        const progressToNext = nextTier ? Math.min(100, (currentUser.metrics.totalFundraising / nextTier.threshold) * 100) : 100;
        const [isTierExpanded, setIsTierExpanded] = React.useState(false);
        
        return (
          <section className="relative bento-card p-0 flex flex-col bg-white overflow-hidden border-brand-yellow/20">
            <div className={`p-6 flex flex-col md:flex-row items-center gap-6 bg-gradient-to-b from-brand-yellow-light/30 to-white ${isTierExpanded ? 'border-b border-border' : ''}`}>
              <AnimatePresence>
                {showCelebration && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-10 pointer-events-none"
                  >
                    <div className="absolute inset-0 bg-brand-yellow/30 mix-blend-overlay animate-pulse" />
                    <motion.div 
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 1.5, repeat: 1, ease: 'linear' }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-1/2 -skew-x-12"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="w-20 h-20 bg-white shadow-xl rounded-full flex items-center justify-center p-3 relative flex-shrink-0">
                <div 
                  className="w-full h-full rounded-full flex items-center justify-center shadow-lg border-2 border-white text-white"
                  style={{ backgroundColor: currentTier.color }}
                >
                  <Trophy size={32} />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-success text-white p-1 rounded-full border-2 border-white">
                  <CheckCircle2 size={14} />
                </div>
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary">Your Current Tier</h3>
                  <span 
                    className="text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-widest w-fit mx-auto md:mx-0"
                    style={{ 
                      backgroundColor: `${currentTier.color}15`, 
                      color: currentTier.color,
                      borderColor: `${currentTier.color}30`
                    }}
                  >
                    {currentTier.name} Tier
                  </span>
                </div>
                <p className="text-2xl font-display font-bold text-text mb-1">{currentTier.reward}</p>
                <p className="text-xs text-text-secondary font-medium">
                  {nextTier 
                    ? `You've unlocked the ${currentTier.name} Tier reward! Keep going to reach ${nextTier.name}.`
                    : `You've reached the highest tier! Excellent work.`
                  }
                </p>
              </div>

              {nextTier && (
                <div className="w-full md:w-64 space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">Next: {nextTier.name}</span>
                    <span className="text-[10px] font-bold text-primary italic">${(nextTier.threshold - currentUser.metrics.totalFundraising).toLocaleString()} to go</span>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${progressToNext}%` }} />
                  </div>
                </div>
              )}
            </div>

            {nextTier ? (
              <div className="bg-white">
                <button 
                  onClick={() => setIsTierExpanded(!isTierExpanded)}
                  className="w-full flex items-center justify-between p-4 hover:bg-surface transition-colors"
                >
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">What's at {nextTier.name}?</span>
                  <ChevronDown 
                    size={18} 
                    className={`text-text-secondary transition-transform duration-300 ${isTierExpanded ? 'rotate-180' : ''}`} 
                  />
                </button>
                <AnimatePresence>
                  {isTierExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-border"
                    >
                      <div className="p-4 space-y-1">
                        {[
                          { label: 'Tickets', value: 'Coming soon — rewards will be announced.' },
                          { label: 'Goods', value: 'Coming soon — rewards will be announced.' },
                          { label: 'Experiences', value: 'Coming soon — rewards will be announced.' },
                          { label: 'Donations', value: 'Coming soon — rewards will be announced.' },
                        ].map((reward) => (
                           <div key={reward.label} className="flex flex-col py-3 border-b border-border/50 last:border-0 px-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">{reward.label}</span>
                              <span className="text-sm font-medium text-text-secondary italic">{reward.value}</span>
                           </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
               <div className="p-4 bg-success/5 text-center">
                 <p className="text-xs font-bold text-success uppercase tracking-widest">You've reached the top tier.</p>
               </div>
            )}
          </section>
        );
      })()}

      {/* 2026 Goal Tracking */}
      <section className="bento-card p-6 space-y-8 bg-gradient-to-br from-secondary to-primary/80 border-none text-white overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
           <Trophy size={160} />
        </div>
        <div className="relative z-10 space-y-2">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/70">2026 Overall Campaign Progress</h3>
          <p className="text-4xl font-display font-black">
            $1,142,500 <span className="text-white/60 font-medium">raised</span>
          </p>
        </div>

        <div className="space-y-6 relative z-10">
          <div className="relative pt-10 pb-12">
            {/* Markers above the bar */}
            <div className="absolute left-[30%] top-0 -translate-x-1/2 flex flex-col items-center">
              <div className="text-[12px] font-display font-bold text-white flex items-center gap-1 mb-1">
                $1.5M
                {1142500 >= 1500000 && <CheckCircle2 size={12} className="text-success" />}
              </div>
            </div>
            <div className="absolute left-[84%] top-0 -translate-x-1/2 flex flex-col items-center">
              <div className="text-[12px] font-display font-bold text-white flex items-center gap-1 mb-1">
                $4.2M
                {1142500 >= 4200000 && <CheckCircle2 size={12} className="text-success" />}
              </div>
            </div>
            <div className="absolute right-0 top-0 text-right flex flex-col items-end">
              <div className="text-[12px] font-display font-bold text-white flex items-center gap-1 mb-1 justify-end">
                $5M
                {1142500 >= 5000000 && <CheckCircle2 size={12} className="text-success" />}
              </div>
            </div>

            {/* Progress Bar Track */}
            <div className="h-5 w-full bg-white/20 rounded-full relative overflow-visible shadow-inner backdrop-blur-sm border border-white/10">
               {/* Stretch territory styling */}
               <div className="absolute right-0 top-0 h-full bg-brand-yellow/10 border-l-2 border-dashed border-brand-yellow/20" style={{ left: '84%', borderTopRightRadius: '9999px', borderBottomRightRadius: '9999px' }} />

              {/* Fast Start Segment ($0 to $1.5M) */}
              <div 
                className={`absolute left-0 top-0 h-full rounded-l-full transition-all duration-1000 ${1142500 >= 1500000 ? 'bg-success shadow-[0_0_15px_rgba(27,138,63,0.5)]' : 'bg-brand-yellow shadow-[0_0_15px_rgba(254,197,46,0.5)]'}`}
                style={{ width: `${Math.min(30, (1142500 / 5000000) * 100)}%` }}
              />
              {/* Goal Segment ($1.5M to $4.2M) */}
              {1142500 > 1500000 && (
                <div 
                  className={`absolute top-0 h-full transition-all duration-1000 ${1142500 >= 4200000 ? 'bg-success shadow-[0_0_15px_rgba(27,138,63,0.5)]' : 'bg-brand-yellow shadow-[0_0_15px_rgba(254,197,46,0.5)]'}`}
                  style={{ left: '30%', width: `${Math.min(54, ((Math.min(4200000, 1142500) - 1500000) / 5000000) * 100)}%` }}
                />
              )}
              {/* Stretch Segment ($4.2M to $5M) */}
              {1142500 > 4200000 && (
                <div 
                  className="absolute top-0 h-full bg-white transition-all duration-1000 rounded-r-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                  style={{ left: '84%', width: `${Math.min(16, ((1142500 - 4200000) / 5000000) * 100)}%` }}
                />
              )}

              {/* Milestone Notches */}
              <div className="absolute left-[30%] top-1/2 -translate-y-1/2 -translate-x-1/2 w-[3px] h-10 bg-white z-10 shadow-lg" />
              <div className="absolute left-[84%] top-1/2 -translate-y-1/2 -translate-x-1/2 w-[3px] h-10 bg-white z-10 shadow-lg" />
            </div>

            {/* Labels below the bar */}
            <div className="absolute left-[30%] bottom-0 -translate-x-1/2 flex flex-col items-center">
              <div className="text-[10px] uppercase font-black tracking-widest text-white/60 whitespace-nowrap">Fast Start — 8/21</div>
            </div>
            <div className="absolute left-[84%] bottom-0 -translate-x-1/2 flex flex-col items-center">
              <div className="text-[10px] uppercase font-black tracking-widest text-white/60 whitespace-nowrap">Goal — 12/5</div>
            </div>
            <div className="absolute right-0 bottom-0 text-right flex flex-col items-end">
              <div className="text-[10px] uppercase font-black tracking-widest text-white/60">Stretch Goal</div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between border-t border-white/10 pt-6 gap-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center flex-1">
              <div className="space-y-1">
                {(() => {
                  const now = new Date();
                  const isPostFastStart = now >= new Date('2026-08-21');
                  
                  const diffFs = Math.ceil((new Date('2026-08-21').getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const diffAg = Math.ceil((new Date('2026-12-05').getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <>
                      {!isPostFastStart ? (
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-brand-yellow">
                            Fast Start: {diffFs} days remaining
                          </p>
                          <p className="text-sm text-white/70 font-medium">
                            Annual Goal: {diffAg} days remaining
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-sm text-success flex items-center gap-1 font-bold">
                            <CheckCircle2 size={12} /> Fast Start: Achieved on 8/21
                          </p>
                          <p className="text-sm font-bold text-brand-yellow">
                            Annual Goal: {diffAg} days remaining
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="flex flex-col md:items-end gap-1">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                 <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                 <p className="text-xs font-black uppercase tracking-widest">
                    On pace for Goal
                 </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid: My Committees, Activity, Feed, Hustle */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {/* My Committees */}
        <div className="bento-card p-6 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Users size={20} className="text-primary" />
            My Committees
          </h3>
          
          <div className="space-y-4">
            {COMMITTEES.map((comm) => (
              <div key={comm.id} className="p-4 bg-surface rounded-xl border border-border/50 group cursor-pointer hover:border-primary/30 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-display font-bold text-text group-hover:text-primary transition-colors">{comm.name}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {comm.role}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
                  <span>Chair: {comm.chairName}</span>
                  <button className="p-1.5 hover:bg-white rounded-lg text-primary transition-colors">
                    <Mail size={14} />
                  </button>
                </div>
                {comm.nextMeeting && (
                  <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-text">
                      <Calendar size={12} className="text-primary" />
                      {comm.nextMeeting.date} • {comm.nextMeeting.time}
                    </div>
                    {comm.nextMeeting.link && (
                      <a href={comm.nextMeeting.link} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-primary rounded-lg text-white hover:bg-secondary transition-colors shadow-sm">
                        <Video size={12} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="btn-tertiary text-sm mt-2 justify-start">View all committees</button>
        </div>

        {/* Activity (rolling 30-day window) */}
        <div className="bento-card p-6 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Zap size={20} className="text-warning fill-warning" />
            Activity (rolling 30-day window)
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-border shadow-sm rounded-xl text-center">
                <p className="text-2xl font-bold text-text">14</p>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">My Shares</p>
              </div>
              <div className="p-4 bg-white border border-border shadow-sm rounded-xl text-center">
                <p className="text-2xl font-bold text-text">128</p>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Team Shares</p>
              </div>
            </div>

            {/* Weekly Streak Indicator */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-1 overflow-hidden">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                  const isActive = i > 1; // Mocking activity in last 6 weeks (index 2-7) 
                  return (
                    <div 
                      key={i} 
                      className={`w-full aspect-square max-w-[24px] rounded-full border-2 transition-all ${
                        isActive ? 'bg-primary border-primary shadow-[0_0_6px_rgba(208,32,48,0.2)]' : 'border-border bg-transparent'
                      }`} 
                    />
                  );
                })}
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-text-secondary font-medium">
                  Active 6 weeks running.
                </p>
                <p className="text-[10px] text-text-secondary/50 font-bold italic">Visible only to you.</p>
              </div>
            </div>
            
            <div className="space-y-3 pt-2 border-t border-border pt-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary font-medium">Templates shared</span>
                <span className="font-bold">12</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary font-medium">Social assets shared</span>
                <span className="font-bold">2</span>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Action Prompt */}
        <section className="md:col-span-2">
          {(() => {
            let prompt = {
              title: "Football Kickoff push is live.",
              subtitle: "Here's what's working right now.",
              cta: "Take Action"
            };

            const unmet = thresholds.find(t => !t.met);
            if (unmet) {
              const now = new Date();
              const deadline = unmet.name === 'Wishes for Teachers' ? new Date('2026-09-30') : new Date('2026-08-21');
              const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

              if (diff <= 30 && diff > 0) {
                prompt = {
                  title: `$${(unmet.target - unmet.current).toLocaleString()} to ${unmet.name} good standing.`,
                  subtitle: `${diff} days left — use this now.`,
                  cta: "Close it"
                };
              } else {
                prompt = {
                  title: `$${(unmet.target - unmet.current).toLocaleString()} to ${unmet.name} good standing.`,
                  subtitle: "14 Yellow Jackets crossed this threshold this week.",
                  cta: "Close it"
                };
              }
            } else {
              const currentTier = INCENTIVE_TIERS.find(t => t.id === currentUser.tierId) || INCENTIVE_TIERS[0];
              const nextTier = INCENTIVE_TIERS[INCENTIVE_TIERS.indexOf(currentTier) + 1];
              if (nextTier) {
                 prompt = {
                   title: `Good standing locked. $${(nextTier.threshold - currentUser.metrics.totalFundraising).toLocaleString()} to ${nextTier.name}.`,
                   subtitle: "Use Football Kickoff templates for highest revenue.",
                   cta: "Go for it"
                 };
              } else {
                 prompt = {
                   title: `You're in ${currentTier.name}.`,
                   subtitle: "Don't let up — keep the momentum going.",
                   cta: "Stay Active"
                 };
              }
            }
            
            return (
              <div className="bento-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-primary/20 bg-gradient-to-r from-primary-light to-white">
                <div className="space-y-2 text-center md:text-left">
                  <h4 className="text-xl font-display font-bold text-text">{prompt.title}</h4>
                  <p className="text-sm text-text-secondary font-medium">{prompt.subtitle}</p>
                </div>
                <button 
                  onClick={onTakeAction}
                  className="btn-primary w-full md:w-auto py-5 px-10 text-xl shadow-lg bg-primary hover:bg-secondary text-white font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-[0.99] transition-all whitespace-nowrap"
                >
                  {prompt.cta}
                  <ArrowRight size={22} className="group-hover:translate-x-1.5 transition-transform" />
                </button>
              </div>
            );
          })()}
        </section>

        {/* Coming Up */}
        <div className="bento-card p-6 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Calendar size={20} className="text-primary" />
            Coming Up
          </h3>
          
          <div className="space-y-3">
            {UPCOMING_MOMENTS.map((moment) => (
              <div key={moment.id} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border/40 group cursor-pointer hover:border-primary/30 transition-all">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{moment.date}</span>
                  <span className="text-sm font-bold text-text group-hover:text-primary transition-colors">{moment.label}</span>
                </div>
                <ArrowRight size={14} className="text-text-secondary group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bento-card p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-bold">Live Activity Feed</h3>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface text-[10px] font-bold text-text-secondary border border-border">
              <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
              LAST 14 DAYS
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
            {ACTIVITIES.length > 0 ? ACTIVITIES.map((activity) => (
              <div key={activity.id} className="flex gap-3 text-sm">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-[10px]">
                  {activity.userName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="leading-tight text-text">
                    <span className="font-bold text-link cursor-pointer hover:underline">
                      {activity.userName === currentUser.name ? 'You' : activity.userName}
                    </span>
                    {' '}<span className="text-text">{activity.action}</span>
                  </p>
                  <p className="text-[10px] text-text-secondary font-medium mt-1">{activity.timestamp}</p>
                </div>
              </div>
            )) : (
              <p className="text-text-secondary font-medium italic text-center py-12">Quiet in Nest right now. Be the first to share.</p>
            )}
          </div>
          <button className="text-xs font-bold text-link hover:underline mt-4 text-left">See more activity</button>
        </div>

        {/* Hustle Board Card */}
        <div className="bento-card p-6 bg-surface-subtle border-none flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
              <Sparkles size={24} className="text-warning fill-warning" />
            </div>
            <h3 className="text-xl font-display font-bold mb-2">Hustle Board</h3>
            <p className="text-sm text-text-secondary font-medium">Top of the Hustle for the current push. Engagement recognition for social shares.</p>
          </div>
          
          <div className="mt-8 p-4 bg-white rounded-xl border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-text">Last Week's Winner</span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-success uppercase">
                <CheckCircle2 size={10} />
                Shipped
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="avatar-circle w-8 h-8 text-[10px]">ER</div>
              <p className="text-sm font-bold text-text">Elena Rodriguez</p>
            </div>
            <p className="text-[10px] text-text-secondary mt-2 font-bold">Reward: $50 Amazon Gift Card</p>
          </div>
          
          <button 
            onClick={onViewHustle}
            className="btn-tertiary text-sm mt-4 justify-start"
          >
            View Hustle Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
