/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PlayCircle, 
  Phone, 
  MessageCircle, 
  HelpCircle, 
  Send,
  Plus,
  Minus,
  ChevronRight,
  CheckCircle2,
  Search,
  FileText,
  Clock,
  ChevronDown
} from 'lucide-react';
import { RESOURCES } from '../constants';

const VIDEOS = [
  { title: "Nest Basics", duration: "2:45", thumbnail: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=225&fit=crop" },
  { title: "Social Assets 101", duration: "1:20", thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop" },
  { title: "Closing the Deal", duration: "3:15", thumbnail: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=225&fit=crop" },
];

const CAMPAIGN_DOCS = [
  { title: "2026 Overview & Timeline", updatedAt: "Apr 15, 2026", description: "Fast Start to Annual Goal milestones and deadlines." },
  { title: "Points System Explainer", updatedAt: "May 10, 2026", description: "How points are calculated and good standing requirements." },
  { title: "How Donations are Processed", updatedAt: "May 10, 2026", description: "Role of the Foundation vs. the Nest app." },
  { title: "Tax Info for Donors", updatedAt: "Feb 1, 2026", description: "501(c)(3) documentation and receipting guidance." },
  { title: "Sponsor & Partner Overview", updatedAt: "Mar 12, 2026", description: "Summary of current campaign partners." },
  { title: "Yellow Jackets Program History", updatedAt: "Jan 10, 2026", description: "The legacy of Arizona's volunteer ambassadors." },
  { title: "Volunteer Handbook", updatedAt: "May 1, 2026", description: "Official rules, ethics, and campaign policies." },
  { title: "Forms & Disclosures", updatedAt: "May 1, 2026", description: "Required paperwork for active volunteers." },
];

export default function HelpTab() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [issuePayload, setIssuePayload] = useState({ category: 'Bug Report', description: '' });

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...issuePayload, userId: 'Kirk Harbaugh' }),
      });
      setFormSubmitted(true);
      setTimeout(() => setFormSubmitted(false), 5000);
      setIssuePayload({ category: 'Bug Report', description: '' });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Stuck? We've got you.</h1>
          <p className="text-text-secondary font-medium font-sans">Support for the app and the Nest campaign.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
          <input 
            type="text"
            placeholder="Search help or documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* Report an Issue Form */}
          <section className="space-y-6">
            <h2 className="text-xl font-display font-bold border-b border-border pb-4">Report an Issue</h2>
            {!formSubmitted ? (
              <form 
                onSubmit={handleIssueSubmit}
                className="bento-card p-6 space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-text-secondary">Category</label>
                  <select 
                    value={issuePayload.category}
                    onChange={(e) => setIssuePayload({ ...issuePayload, category: e.target.value as any })}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option>Bug Report</option>
                    <option>Question</option>
                    <option>Feedback</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-text-secondary">Description</label>
                  <textarea 
                    value={issuePayload.description}
                    onChange={(e) => setIssuePayload({ ...issuePayload, description: e.target.value })}
                    placeholder="Describe the issue or share your feedback... (500 characters max)"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[120px] resize-none"
                    maxLength={500}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-text-secondary">Screenshot (Optional)</label>
                  <div className="flex items-center gap-4">
                    <button type="button" className="flex-1 border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-surface transition-colors">
                      <Plus size={20} className="text-text-secondary" />
                      <span className="text-[10px] font-bold text-text-secondary uppercase">Click to upload</span>
                    </button>
                    <button type="button" className="flex-1 border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-surface transition-colors">
                      <Phone size={20} className="text-text-secondary" />
                      <span className="text-[10px] font-bold text-text-secondary uppercase">Take Photo</span>
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-4 uppercase tracking-widest">Submit Bug Report</button>
              </form>
            ) : (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bento-card p-12 text-center flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold">Got it. We'll look into it.</h3>
                <p className="text-sm text-text-secondary max-w-sm mx-auto">Your feedback has been logged. We'll follow up if more info is needed.</p>
              </motion.div>
            )}
          </section>

          {/* 2026 Reference docs */}
          <section className="space-y-6">
            <h2 className="text-xl font-display font-bold border-b border-border pb-4">2026 Reference</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CAMPAIGN_DOCS.map((doc) => (
                <div key={doc.title} className="bento-card p-4 flex gap-4 hover:border-primary/30 transition-all cursor-pointer group">
                  <div className="w-10 h-10 bg-primary/5 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text group-hover:text-primary transition-colors">{doc.title}</h4>
                    <p className="text-[10px] text-text-secondary font-medium mb-1 truncate">{doc.description}</p>
                    <p className="text-[9px] font-bold text-text-secondary/40 uppercase">Updated {doc.updatedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-12">
          {/* Training Videos */}
          <section className="space-y-6">
            <h2 className="text-xl font-display font-bold border-b border-border pb-4">Training Videos</h2>
            <div className="space-y-6">
              {VIDEOS.map((video) => (
                <div key={video.title} className="group cursor-pointer">
                  <div className="aspect-video bg-surface rounded-xl overflow-hidden relative mb-2">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/50">
                        <PlayCircle size={28} />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-bold text-white">
                      {video.duration}
                    </div>
                  </div>
                  <p className="text-sm font-bold group-hover:text-primary transition-colors">{video.title}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Contact Support */}
          <section className="bento-card p-6 border-primary/10 space-y-4">
             <h3 className="text-lg font-display font-bold">Still Need Help?</h3>
             <p className="text-sm text-text-secondary leading-relaxed">
               If the AI assistant couldn't answer your question, please use the Report An Issue form or reach out to technical support.
             </p>
             <div className="space-y-2">
               <button className="w-full btn-primary py-3">Technical Support</button>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}
