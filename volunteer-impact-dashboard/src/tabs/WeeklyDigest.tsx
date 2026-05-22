/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  TrendingUp, 
  Users, 
  Zap, 
  ArrowRight,
  CheckCircle2,
  Trophy,
  Sparkles
} from 'lucide-react';
import { VOLUNTEERS } from '../constants';

interface WeeklyDigestProps {
  onBack: () => void;
  onTakeAction: () => void;
}

export default function WeeklyDigest({ onBack, onTakeAction }: WeeklyDigestProps) {
  const currentUser = VOLUNTEERS.find(v => v.id === 'u-1')!;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 px-4 pt-4">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-primary transition-colors group"
      >
        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Back to Nest
      </button>

      <div className="flex flex-col gap-2 mb-8">
        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em]">Weekly Digest</p>
        <h1 className="text-[28px] font-display font-bold text-text leading-tight">Friday, May 15, 2026</h1>
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.1em]">Yellow Jackets Fundraising</p>
        <div className="h-4" />
        <h2 className="text-xl font-display font-bold text-text leading-tight tracking-tight">Your Nest recap, {currentUser.name.split(' ')[0]}.</h2>
        <p className="text-text-secondary font-medium font-sans italic text-sm">Last week: 14 shares. Football Kickoff push starts this week.</p>
      </div>

      {/* Last Week - You */}
      <section className="bento-card p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <TrendingUp size={20} className="text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-text-secondary">Last Week — You</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-secondary uppercase">Templates Shared</p>
            <p className="text-2xl font-display font-bold text-text">12</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-secondary uppercase">Social Assets Shared</p>
            <p className="text-2xl font-display font-bold text-text">2</p>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-between items-end">
           <div className="space-y-1">
              <p className="text-[10px] font-bold text-text-secondary uppercase">Total Fundraising to date</p>
              <p className="text-3xl font-display font-bold text-primary">${currentUser.metrics.totalFundraising.toLocaleString()}</p>
           </div>
           <div className="flex items-center gap-1.5 px-3 py-1 bg-success-light text-success rounded-full text-[10px] font-bold uppercase">
             <CheckCircle2 size={12} />
             Forward Motion
           </div>
        </div>
      </section>

      {/* Last Week - Your Team */}
      <section className="bento-card p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <Users size={20} className="text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-text-secondary">Last Week — Your Team</h2>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl p-4 border border-border/50">
            <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Team Shares</p>
            <p className="text-xl font-bold">128</p>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border/50">
            <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Active Members</p>
            <p className="text-xl font-bold">7 of 12</p>
          </div>
        </div>

        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-1">
          <p className="text-[10px] font-bold text-primary uppercase flex items-center gap-1.5">
            <Sparkles size={12} /> Top share this week
          </p>
          <p className="text-sm font-bold text-text">Football Kickoff Sponsorship Pitch</p>
          <p className="text-[10px] text-text-secondary font-medium italic">Shared 37 times by Yellow Jackets recently.</p>
        </div>
      </section>

      {/* Coming Up This Week */}
      <section className="bento-card p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <Zap size={20} className="text-warning fill-warning" />
          <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-text-secondary">Coming Up This Week</h2>
        </div>

        <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border/40 group cursor-pointer hover:border-primary/30 transition-all">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">June 12, 2026</span>
                  <span className="text-sm font-bold text-text group-hover:text-primary transition-colors">Football Kickoff Renewal Deadline</span>
                </div>
                <ArrowRight size={14} className="text-text-secondary group-hover:text-primary transition-all" />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border/40 group cursor-pointer hover:border-primary/30 transition-all">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">June 20, 2026</span>
                  <span className="text-sm font-bold text-text group-hover:text-primary transition-colors">Football Kickoff Committee Meeting</span>
                </div>
                <ArrowRight size={14} className="text-text-secondary group-hover:text-primary transition-all" />
            </div>
        </div>
      </section>

      {/* Suggested Action */}
      <section className="space-y-4">
        <h2 className="eyebrow px-1">One Suggested Action</h2>
        <div className="bento-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-primary/30 bg-gradient-to-r from-primary-light to-white shadow-xl shadow-primary/5">
          <div className="space-y-2 text-center md:text-left">
            <h4 className="text-xl font-display font-bold text-text">Reach out for Kickoff renewals.</h4>
            <p className="text-sm text-text-secondary font-medium">The deadline is this Friday. 12 renewals came in yesterday.</p>
          </div>
          <button 
            onClick={onTakeAction}
            className="btn-primary w-full md:w-auto py-5 px-10 text-xl shadow-lg bg-primary hover:bg-secondary text-white font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-[0.99] transition-all whitespace-nowrap"
          >
            Take Action
            <ArrowRight size={22} className="group-hover:translate-x-1.5 transition-transform" />
          </button>
        </div>
      </section>
    </div>
  );
}
