/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Award,
  Zap,
  Search,
  User,
  History,
  MessageCircle,
  Copy,
  Mail,
  ChevronRight,
  Trophy,
  Sparkles,
  Target
} from 'lucide-react';
import { CONTRIBUTIONS, VOLUNTEERS, CURRENT_USER_ID, TEAMS, ATTENDANCES } from '../constants';
import { Contribution, Attendance } from '../types';
import Standings from './Standings';

interface ActivityReportProps {
  onBack: () => void;
  onSendThankYou: (donorName: string) => void;
  initialTab?: 'Contributions' | 'Standings';
}

export default function ActivityReport({ onBack, onSendThankYou, initialTab = 'Contributions' }: ActivityReportProps) {
  const [activeTab, setActiveTab] = useState<'Contributions' | 'Standings'>(initialTab);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Rate Bowl' | 'Wishes for Teachers' | 'Other Donations' | 'Ticket Sales' | 'Event Attendance'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'Recent' | 'Amount' | 'Alpha'>('Recent');
  const [selectedDonor, setSelectedDonor] = useState<Contribution | null>(null);
  const [thankYouModal, setThankYouModal] = useState<string | null>(null);
  const [hustleView, setHustleView] = useState<'Individual' | 'Team'>('Individual');

  const filteredContributions = CONTRIBUTIONS.filter(c => {
    const matchesSearch = c.donorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'All' || 
                         (activeFilter === 'Rate Bowl' && c.type.includes('Rate Bowl')) ||
                         (activeFilter === 'Wishes for Teachers' && c.type.includes('Wishes for Teachers')) ||
                         (activeFilter === 'Other Donations' && c.type.includes('Other donation')) ||
                         (activeFilter === 'Ticket Sales' && c.type.includes('ticket purchase'));
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    if (sortBy === 'Recent') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'Amount') return b.amount - a.amount;
    return a.donorName.localeCompare(b.donorName);
  });

  const filteredAttendance = ATTENDANCES.filter(a => {
    const matchesSearch = a.eventName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'All' || activeFilter === 'Event Attendance';
    return matchesSearch && matchesFilter;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totals = {
    raised: CONTRIBUTIONS.reduce((acc, c) => acc + c.amount, 0),
    points: CONTRIBUTIONS.reduce((acc, c) => acc + c.points, 0) + ATTENDANCES.reduce((acc, a) => acc + a.points, 0)
  };

  const individualLeaders = [
    { rank: 1, name: 'Elena Rodriguez', team: 'Blue Jays', shares: 84 },
    { rank: 2, name: 'Michael Chen', team: 'Blue Jays', shares: 72 },
    { rank: 3, name: 'Sarah Wilson', team: 'Green Grove', shares: 68 },
    { rank: 4, name: 'John Smith', team: 'Red Foxes', shares: 54 },
    { rank: 5, name: 'Kirk Harbaugh', team: 'Red Foxes', shares: 14 },
  ];

  const teamLeaders = [
    { rank: 1, name: 'Blue Jays', shares: 412 },
    { rank: 2, name: 'Red Foxes', shares: 284 },
    { rank: 3, name: 'Green Grove', shares: 198 },
  ];

  const THANK_YOU_TEMPLATES = [
    { type: 'sms', title: 'Short and Sweet', content: `Hey ${thankYouModal}, thank you so much for your support! Your contribution to the Nest campaign means a lot to me and the Foundation.` },
    { type: 'email', title: 'Impact-Focused', content: `Dear ${thankYouModal}, I wanted to reach out and personally thank you for your generous gift. Your support directly impacts youth sports in Arizona and helps us reach our $5M target.` },
    { type: 'sms', title: 'Personal/Fun', content: `You're a rockstar, ${thankYouModal}! 🎸 Thanks for the donation. Catch you at the game!` }
  ];

  return (
    <div className="min-h-screen bg-bg">
      {/* Stick Header */}
      <div className="sticky top-0 z-[100] bg-white/80 backdrop-blur-md border-b border-border p-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-surface rounded-full transition-all flex-shrink-0"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div className="flex bg-surface p-1 rounded-xl border border-border">
            {['Contributions', 'Standings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-text-secondary hover:text-text'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-8">
        {activeTab === 'Contributions' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bento-card p-5 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Total Raised</p>
                <p className="text-2xl font-display font-black text-primary">${totals.raised.toLocaleString()}</p>
              </div>
              <div className="bento-card p-5 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Total Points</p>
                <p className="text-2xl font-display font-black text-text">{totals.points.toLocaleString()}</p>
              </div>
              <div className="bento-card p-5 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Unique Donors</p>
                <p className="text-2xl font-display font-black text-text">14</p>
              </div>
              <div className="bento-card p-5 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Attended</p>
                <p className="text-2xl font-display font-black text-success">{ATTENDANCES.length}</p>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {['All', 'Rate Bowl', 'Wishes for Teachers', 'Other Donations', 'Ticket Sales', 'Event Attendance'].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f as any)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    activeFilter === f 
                    ? 'bg-primary text-white border-primary shadow-md' 
                    : 'bg-white text-text-secondary border-border hover:border-primary/30'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                <input 
                  type="text" 
                  placeholder="Search donors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl py-3 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-surface border border-border rounded-xl px-4 py-3 text-sm font-bold text-text-secondary outline-none w-full md:w-auto"
              >
                <option value="Recent">Most Recent</option>
                <option value="Amount">Largest Amount</option>
                <option value="Alpha">Alphabetical</option>
              </select>
            </div>

            <div className="space-y-4">
              {filteredContributions.map((contribution) => (
                <motion.div
                  layout
                  key={contribution.id}
                  onClick={() => setSelectedDonor(contribution)}
                  className="bento-card p-5 cursor-pointer hover:bg-surface-subtle transition-all group flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <h3 className="font-display font-bold group-hover:text-primary transition-colors text-base">{contribution.donorName}</h3>
                    <p className="text-[13px] text-text-secondary font-medium">{contribution.type}</p>
                    <p className="text-[12px] text-text-secondary font-medium mt-1">{new Date(contribution.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-display font-black text-text">${contribution.amount.toLocaleString()}</p>
                    <p className="text-[13px] text-text-secondary font-medium">{contribution.points} points</p>
                    <div className="flex items-center gap-2 justify-end mt-2">
                       <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                         contribution.status === 'Posted' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                       }`}>
                         {contribution.status}
                       </span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {filteredAttendance.map((attendance) => (
                <motion.div
                  layout
                  key={attendance.id}
                  className="bento-card p-5 hover:bg-surface-subtle transition-all group flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-base transition-colors">{attendance.eventName}</h3>
                    <p className="text-[13px] text-text-secondary font-medium">Event Attendance</p>
                    <p className="text-[12px] text-text-secondary font-medium mt-1">{new Date(attendance.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-display font-black text-text">{attendance.points} pts</p>
                    <div className="flex items-center gap-2 justify-end mt-2">
                       <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                         attendance.status === 'Posted' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                       }`}>
                         {attendance.status}
                       </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          // v2.1: Standings replaces Hustle Board
          <Standings />
        )}
      </div>

      {/* Donor Detail Modal */}
      <AnimatePresence>
        {selectedDonor && (
          <div className="fixed inset-0 z-[200] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDonor(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <button onClick={() => setSelectedDonor(null)} className="p-2 hover:bg-surface rounded-full transition-all">
                  <ArrowLeft size={24} />
                </button>
                <div className="flex items-center gap-2">
                   <span className="px-3 py-1 rounded-full bg-success/10 text-success text-[10px] font-black uppercase tracking-widest">
                     Posted
                   </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12 space-y-12">
                <div className="flex items-center gap-6">
                   <div className="w-24 h-24 bg-surface border border-border rounded-full flex items-center justify-center text-text-secondary shadow-inner">
                     <User size={48} />
                   </div>
                   <div>
                     <h2 className="text-4xl font-display font-black text-text leading-tight">{selectedDonor.donorName}</h2>
                     <p className="text-text-secondary font-medium italic">Yellow Jacket Supporter since 2024</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bento-card p-6 bg-primary/5 border-primary/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Lifetime Impact</p>
                    <p className="text-3xl font-display font-black text-text">$1,750</p>
                  </div>
                  <div className="bento-card p-6 bg-surface border-border">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Total Points</p>
                    <p className="text-3xl font-display font-black text-text">1,750</p>
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary flex items-center gap-2">
                        <History size={14} /> Interaction History
                      </h3>
                   </div>
                   <div className="space-y-3">
                      {CONTRIBUTIONS.filter(c => c.donorName === selectedDonor.donorName).map((c, idx) => (
                        <div key={idx} className="p-5 bg-surface border border-border rounded-2xl flex justify-between items-center group hover:border-primary/30 transition-all">
                           <div>
                              <p className="text-sm font-bold text-text group-hover:text-primary transition-colors">{c.type}</p>
                              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1">{new Date(c.date).toLocaleDateString()}</p>
                           </div>
                           <p className="text-xl font-display font-black text-text">${c.amount.toLocaleString()}</p>
                        </div>
                      ))}
                   </div>
                </div>

                <button 
                  onClick={() => setThankYouModal(selectedDonor.donorName)}
                  className="btn-primary w-full py-5 text-xl rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
                >
                  <MessageCircle size={24} />
                  Send Official Thank You
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Thank You Note Modal */}
      <AnimatePresence>
        {thankYouModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setThankYouModal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-border bg-surface/50">
                <h3 className="text-2xl font-display font-black text-text">Thank {thankYouModal}</h3>
                <p className="text-sm text-text-secondary font-medium">Select a personalized note to send</p>
              </div>
              <div className="p-8 space-y-6">
                {THANK_YOU_TEMPLATES.map((tmpl, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      onSendThankYou(thankYouModal!);
                      setThankYouModal(null);
                    }}
                    className="w-full text-left p-6 bg-surface hover:bg-white border border-border hover:border-primary rounded-2xl transition-all group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{tmpl.type} Template</span>
                      <span className="text-xs font-bold text-text group-hover:text-primary transition-colors">{tmpl.title}</span>
                    </div>
                    <p className="text-sm text-text-secondary font-medium leading-relaxed italic opacity-80 group-hover:opacity-100 Transition-opacity">"{tmpl.content}"</p>
                  </button>
                ))}
              </div>
              <div className="p-6 bg-surface flex justify-end gap-4 border-t border-border">
                <button 
                  onClick={() => setThankYouModal(null)}
                  className="px-6 py-2 text-xs font-black uppercase tracking-widest text-text-secondary hover:text-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
