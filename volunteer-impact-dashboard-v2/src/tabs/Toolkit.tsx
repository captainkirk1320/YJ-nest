/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MessageSquare, 
  Mail, 
  Share2, 
  CheckCircle2, 
  Download,
  MessageCircle,
  Clock,
  TrendingUp,
  ChevronRight,
  Info,
  Zap,
  ArrowUpRight,
  Copy,
  Calendar
} from 'lucide-react';
import { RESOURCES, ACTIVITIES, PERSONAL_LINKS } from '../constants';
import { ToolkitEventType, Resource, PersonalLink as PersonalLinkType } from '../types';
import EventSummaryCard from '../components/EventSummaryCard';
import ResourceCard from '../components/ResourceCard';

interface ToolkitTabProps {
  initialSearch?: string;
  onClearSearch?: () => void;
  onNavigateToResources?: (event: ToolkitEventType) => void;
}

export default function ToolkitTab({ initialSearch = '', onClearSearch, onNavigateToResources }: ToolkitTabProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedEvent, setSelectedEvent] = useState<ToolkitEventType | null>('Football Kickoff');
  const [activeChannel, setActiveChannel] = useState<'All' | 'SMS' | 'Email' | 'Social'>('All');
  const [sharedId, setSharedId] = useState<string | null>(null);

  const [showSocialCalendar, setShowSocialCalendar] = useState(false);
  const [showStinger, setShowStinger] = useState(false);
  const [stingerStep, setStingerStep] = useState(1);
  const [stingerData, setStingerData] = useState({
    event: 'Football Kickoff' as ToolkitEventType,
    recipient: 'Business / Sponsor Lead',
    channel: 'SMS',
    tier: 'Tier 1 ($3,650)'
  });

  const handleStingerSelect = (key: string, value: string) => {
    setStingerData(prev => ({ ...prev, [key]: value }));
    
    // Step logic: advancement logic
    if (stingerStep === 1) {
       setStingerStep(2);
    } else if (stingerStep === 2) {
       setStingerStep(3);
    } else if (stingerStep === 3) {
       if (stingerData.event === 'Football Kickoff' || value === 'Football Kickoff') {
          setStingerStep(4);
       } else {
          setStingerStep(5); // Show Result
       }
    } else if (stingerStep === 4) {
       setStingerStep(5);
    }
  };

  const stingerEvents: ToolkitEventType[] = ['Football Kickoff', 'Par 3 Challenge', 'Wishes for Teachers', 'Rate Bowl', 'Fiesta Bowl', 'Evergreen'];
  const stingerRecipients = ['Business / Sponsor Lead', 'Personal Contact', 'Social Post'];
  const stingerChannels = ['SMS', 'Email', 'Social'];
  const stingerTiers = ['Tier 1 ($3,650)', 'Tier 2 ($3,400)', 'Tier 3 ($3,150)', 'VIP Table ($9,250)', 'Event Sponsorship ($15,000)'];

  const generatedCopy = useMemo(() => {
    if (stingerData.event === 'Football Kickoff') {
       if (stingerData.recipient === 'Business / Sponsor Lead') {
          if (stingerData.channel === 'Email') {
             return `Subject: Front-row networking at the Football Kickoff, Aug 21\n\nDear [first name],\n\nI am helping with the UMB Bank Fiesta Sports Foundation Football Kickoff on Aug 21 at the Fairmont Scottsdale Princess. Coach Mike Gundy and Jack Swarbrick are headlining. \n\nOur ${stingerData.tier} option would be an excellent way to host clients or teammates while getting significant brand exposure in front of 1,000+ local leaders. This event sells out every year. \n\nWould you like me to lock in a table for your company?`;
          }
          return `Hey [first name], I'm helping with the UMB Bank Fiesta Sports Foundation Football Kickoff on Aug 21! Coach Mike Gundy is headlining. A ${stingerData.tier} table is available for your team—premier networking and visibility. Want me to lock one in?`;
       }
       return `Hey [first name], I'd love for you to join us at the Football Kickoff on Aug 21! Coach Mike Gundy is speaking. It's a great event for a great cause (Wishes for Teachers). I've got a ${stingerData.tier} table and would love to have you there. Interested?`;
    }
    return `Hey [first name], I'm fundraising for the ${stingerData.event} and would love your support. Every donation helps the Fiesta Sports Foundation impact Arizona youth and teachers. You can see more and contribute here: [Personal Link]\n\nThanks for considering!`;
  }, [stingerData]);

  React.useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  const events: ToolkitEventType[] = ['Football Kickoff', 'Par 3 Challenge', 'Wishes for Teachers', 'Rate Bowl', 'Fiesta Bowl', 'Evergreen'];
  const channels = ['All', 'SMS', 'Email', 'Social'] as const;

  const featuredItems = useMemo(() => RESOURCES.filter(r => r.isFeatured), []);
  const personalLinks = useMemo(() => PERSONAL_LINKS, []);
  
  const filteredTemplates = useMemo(() => {
    // 1. Base filtering logic
    const baseTemplates = RESOURCES.filter(r => {
      if (r.type === 'document' || r.type === 'faq' || r.type === 'script') return false;
      
      const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (r.tier && r.tier.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (r.placements && r.placements.some(p => p.toLowerCase().includes(searchQuery.toLowerCase())));
      
      const matchesEvent = !selectedEvent || (r.event === selectedEvent);
      const matchesChannel = activeChannel === 'All' || r.type.toLowerCase() === activeChannel.toLowerCase();
      
      return matchesSearch && matchesEvent && matchesChannel;
    });

    return baseTemplates;
  }, [searchQuery, selectedEvent, activeChannel]);

  const eventPersonalLink = useMemo(() => {
     if (!selectedEvent) return null;
     return personalLinks.find(l => l.event === selectedEvent) || null;
  }, [selectedEvent, personalLinks]);

  const showEventSummary = selectedEvent && selectedEvent !== 'Evergreen' && searchQuery === '';

  const recentlyUsed = useMemo(() => {
    return ACTIVITIES
      .filter(a => a.userId === 'u-1' && a.type === 'share')
      .slice(0, 5)
      .map(activity => {
        // Try to find the template, this is just for display
        return { ...activity, title: activity.action.split('shared the ')[1]?.split(' template')[0] || 'Template' };
      });
  }, []);

  const mostShared = useMemo(() => {
    // Mocking most shared org-wide
    return RESOURCES.filter(r => r.type !== 'document' && !r.isFeatured).slice(0, 5);
  }, []);

  const handleShare = (id: string, channel: string) => {
    console.log(`Tracking share event: User u-1, Template ${id}, Channel ${channel}, Timestamp: ${new Date().toISOString()}`);
    setSharedId(id);
    setTimeout(() => {
      setSharedId(null);
      if (onClearSearch) onClearSearch();
    }, 3000);
    
    // Simulate share sheet
    if (navigator.share) {
      // navigator.share(...)
    }
  };

  const toggleEvent = (event: ToolkitEventType) => {
    setSelectedEvent(prev => prev === event ? null : event);
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Hot Resources Section */}
      <section className="-mx-4 px-4 lg:mx-0 lg:px-0">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-secondary" />
              <h3 className="eyebrow !text-secondary !tracking-[0.2em]">Hot Resources</h3>
           </div>
           <span className="text-[10px] font-black uppercase text-text-secondary opacity-60">Trending Org-Wide</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {featuredItems.map((item) => (
            <motion.div 
              key={item.id}
              whileHover={{ y: -4 }}
              className="flex-shrink-0 w-[240px] bento-card p-4 flex flex-col gap-3 group cursor-pointer border-brand-yellow/20 bg-brand-yellow/5"
              onClick={() => handleShare(item.id, item.type.toUpperCase())}
            >
              <div className="aspect-[4/3] bg-white rounded-xl overflow-hidden relative border border-brand-yellow/10">
                {item.type === 'social' ? (
                  <img src={item.content} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex flex-col justify-center p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">{item.type}</p>
                    <p className="text-[11px] font-medium text-text line-clamp-4 italic leading-relaxed">"{item.content}"</p>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <div className="bg-brand-yellow text-primary text-[9px] font-black px-2 py-0.5 rounded shadow-sm uppercase tracking-widest">
                    Hot
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-text mb-1 group-hover:text-primary transition-colors">{item.title}</h4>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{item.event}</p>
              </div>
              <button className="mt-auto w-full py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded shadow-md group-hover:bg-secondary transition-all flex items-center justify-center gap-2">
                <Share2 size={12} /> Share Now
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stinger Section */}
      <section>
        <div className="bento-card p-6 bg-gradient-to-r from-primary to-secondary text-white relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-brand-yellow fill-brand-yellow" />
              <h3 className="text-xl font-display font-bold text-white">Stinger</h3>
            </div>
            <p className="text-sm text-white/90 font-medium max-w-md">
              Get a message written for your specific ask. Answer four quick questions and receive ready-to-share copy.
            </p>
            <button 
              onClick={() => {
                setShowStinger(true);
                setStingerStep(1);
              }}
              className="px-6 py-3 bg-white text-primary font-bold rounded-xl shadow-lg hover:bg-surface transition-all active:scale-[0.98]"
            >
              Craft a message
            </button>
          </div>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-yellow/10 rounded-full -ml-10 -mb-10 blur-2xl" />
        </div>
      </section>

      {/* Social Calendar Section */}
      <section className="bento-card p-6 border-border bg-white">
        <div className="flex flex-col gap-4">
           <div className="flex items-center justify-between">
              <div>
                 <p className="eyebrow !text-[12px] mb-1">This Week's Share</p>
                 <h3 className="text-lg font-display font-bold text-text">Football Kickoff Awareness</h3>
              </div>
              <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                 <Calendar size={20} />
              </div>
           </div>
           
           <div className="p-4 bg-surface rounded-xl border border-border/50 flex flex-col md:flex-row gap-4 items-center">
              <div className="w-full md:w-24 aspect-square bg-surface-subtle rounded-lg overflow-hidden border border-border shadow-sm">
                 <img src="https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 space-y-1">
                 <p className="text-xs font-bold text-text mb-1">Recommended Social Post</p>
                 <p className="text-xs text-text-secondary line-clamp-2 italic">"Lead with the August 21 date. Warm up your network before the ask."</p>
              </div>
              <button 
                onClick={() => handleShare('cal-1', 'SOCIAL')}
                className="btn-primary !py-2 !px-4 text-xs whitespace-nowrap min-w-[120px]"
              >
                 Share Now
              </button>
           </div>
           
           <button 
            onClick={() => setShowSocialCalendar(true)}
            className="text-xs font-bold text-link hover:underline text-left"
           >
            See full calendar
           </button>
        </div>
      </section>


      {/* Sticky Filters */}
      <div className="sticky top-16 lg:top-20 z-10 bg-white/95 backdrop-blur-md pt-4 pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 border-b border-border shadow-sm lg:shadow-none">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* 1. Event Chips (Mobile prioritized order) */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedEvent(null)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                selectedEvent === null ? 'bg-primary border-primary text-white shadow-md' : 'bg-surface border-border text-text-secondary hover:border-primary/30'
              }`}
            >
              All
            </button>
            {events.map((event) => (
              <button
                key={event}
                onClick={() => toggleEvent(event)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedEvent === event ? 'bg-primary border-primary text-white shadow-md' : 'bg-surface border-border text-text-secondary hover:border-primary/30'
                }`}
              >
                {event}
              </button>
            ))}
          </div>

          {/* 2. Channel Chips */}
          <div className="flex gap-2 lg:bg-surface lg:p-1 lg:rounded-xl lg:border lg:border-border lg:w-fit overflow-x-auto no-scrollbar">
            {channels.map((channel) => (
              <button
                key={channel}
                onClick={() => setActiveChannel(channel)}
                className={`flex-1 lg:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeChannel === channel ? 'bg-primary lg:bg-white text-white lg:text-primary shadow-sm' : 'bg-surface lg:bg-transparent text-text-secondary hover:text-text'
                }`}
              >
                {channel}
              </button>
            ))}
          </div>

          {/* 3. Search Field */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input 
              type="text"
              placeholder="Search templates or assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl pl-11 pr-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-text-secondary/50 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Event Summary Card (Conditional) */}
      {showEventSummary && (
        <EventSummaryCard 
          event={selectedEvent} 
          onViewResources={onNavigateToResources!}
        />
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        <AnimatePresence mode="popLayout">
          {eventPersonalLink && (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bento-card p-6 border-primary bg-primary/5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-display font-black text-primary">Your Personal Link</h3>
                    <p className="text-xs text-text-secondary font-medium">{eventPersonalLink.event} Ticketing</p>
                  </div>
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <ArrowUpRight size={20} />
                  </div>
                </div>
                <div className="bg-white border border-primary/20 p-3 rounded-xl flex items-center justify-between overflow-hidden">
                  <code className="text-xs text-text-secondary truncate mr-2 font-mono">{eventPersonalLink.url}</code>
                  <button 
                    onClick={() => navigator.clipboard.writeText(eventPersonalLink.url)}
                    className="p-1.5 hover:bg-surface rounded-lg transition-colors text-primary"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <button className="btn-primary w-full py-3 text-xs flex items-center justify-center gap-2">
                  <Share2 size={14} /> Share Link
                </button>
                <p className="text-[10px] text-text-secondary font-medium italic text-center">
                  Direct ticket sales count toward your goal.
                </p>
              </div>
            </motion.div>
          )}

          {filteredTemplates.map((template) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={template.id}
            >
              <ResourceCard 
                resource={template} 
                onShare={handleShare}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-20 bento-card-surface border-dashed">
          <p className="text-text-secondary font-medium">No templates found matching your filters.</p>
          <button 
            onClick={() => {
              setSearchQuery('');
              setSelectedEvent('Football Kickoff');
              setActiveChannel('All');
            }} 
            className="text-primary font-bold mt-2 hover:underline text-sm"
          >
            Reset all filters
          </button>
        </div>
      )}

      {/* Bottom Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-border">
        {/* Recently Used By You */}
        {recentlyUsed.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-text-secondary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Recently used by you</h3>
            </div>
            <div className="space-y-3">
              {recentlyUsed.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border group cursor-pointer hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <MessageCircle size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text capitalize">{activity.title}</p>
                      <p className="text-[10px] text-text-secondary">{activity.timestamp}</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-text-secondary group-hover:translate-x-0.5 transition-transform" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Most Shared This Week (Org-wide) */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-text-secondary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Most shared recently</h3>
          </div>
          <div className="space-y-3">
            {mostShared.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border group cursor-pointer hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-primary w-4">{idx + 1}</span>
                  <div>
                    <p className="text-xs font-bold text-text">{item.title}</p>
                    <p className="text-[10px] text-text-secondary">
                      {Math.floor(Math.random() * 20 + 20)} Yellow Jackets shared this {item.event} template recently
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="text-[10px] font-bold bg-success/10 text-success px-2 py-0.5 rounded">Popular</div>
                   <ChevronRight size={14} className="text-text-secondary" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      {/* Stinger Bottom Sheet */}
      <AnimatePresence>
        {showStinger && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowStinger(false)}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border flex items-center justify-between bg-surface/30">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                      <Zap size={18} className="fill-white" />
                   </div>
                   <h3 className="text-lg font-display font-bold">Stinger Generator</h3>
                </div>
                <button 
                  onClick={() => setShowStinger(false)}
                  className="p-2 hover:bg-surface rounded-full transition-colors text-text-secondary"
                >
                  <ChevronRight size={20} className="rotate-90" />
                </button>
              </div>

              <div className="p-6">
                {stingerStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Step 1: What are you sharing?</p>
                    <div className="grid grid-cols-1 gap-2">
                       {stingerEvents.map(e => (
                         <button 
                           key={e}
                           onClick={() => handleStingerSelect('event', e)}
                           className="w-full p-4 text-left border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all font-bold text-sm"
                         >
                           {e}
                         </button>
                       ))}
                    </div>
                  </div>
                )}

                {stingerStep === 2 && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Step 2: Who's the recipient?</p>
                    <div className="grid grid-cols-1 gap-2">
                       {stingerRecipients.map(r => (
                         <button 
                           key={r}
                           onClick={() => handleStingerSelect('recipient', r)}
                           className="w-full p-4 text-left border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all font-bold text-sm"
                         >
                           {r}
                         </button>
                       ))}
                    </div>
                  </div>
                )}

                {stingerStep === 3 && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Step 3: What channel?</p>
                    <div className="grid grid-cols-1 gap-2">
                       {stingerChannels.map(c => (
                         <button 
                           key={c}
                           onClick={() => handleStingerSelect('channel', c)}
                           className="w-full p-4 text-left border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all font-bold text-sm"
                         >
                           {c}
                         </button>
                       ))}
                    </div>
                  </div>
                )}

                {stingerStep === 4 && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Step 4: Select Tier</p>
                    <div className="grid grid-cols-1 gap-2">
                       {stingerTiers.map(t => (
                         <button 
                           key={t}
                           onClick={() => handleStingerSelect('tier', t)}
                           className="w-full p-4 text-left border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all font-bold text-sm"
                         >
                           {t}
                         </button>
                       ))}
                    </div>
                  </div>
                )}

                {stingerStep === 5 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Your Benefit-First Message</p>
                      <div className="p-6 bg-surface border border-border rounded-2xl">
                        <p className="text-text font-medium leading-relaxed whitespace-pre-wrap">
                          {generatedCopy}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button 
                        onClick={() => {
                          handleShare('stinger-' + Date.now(), stingerData.channel.toUpperCase());
                          setShowStinger(false);
                        }}
                        className="btn-primary w-full py-4 text-lg"
                      >
                        <Share2 size={20} /> Share via {stingerData.channel}
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setStingerStep(1)}
                          className="btn-secondary !py-3 text-sm"
                        >
                          Start Over
                        </button>
                        <button 
                          onClick={() => {
                             navigator.clipboard.writeText(generatedCopy);
                             // Toast...
                          }}
                          className="btn-secondary !py-3 text-sm"
                        >
                          Copy Text
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {stingerStep > 1 && (
                <div className="px-6 pb-6 pt-2">
                   <button 
                     onClick={() => setStingerStep(prev => prev - 1)}
                     className="text-xs font-bold text-text-secondary hover:text-primary flex items-center gap-1"
                   >
                     <ChevronRight size={14} className="rotate-180" /> Back to previous step
                   </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
        {/* Social Calendar Modal */}
        <AnimatePresence>
          {showSocialCalendar && (
            <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSocialCalendar(false)}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <h3 className="text-xl font-display font-bold">Social Calendar</h3>
                  <button onClick={() => setShowSocialCalendar(false)} className="p-2 hover:bg-surface rounded-full text-text-secondary">
                    <ChevronRight size={24} className="rotate-90" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Past Weeks - Collapsed */}
                  <div className="space-y-2 opacity-50">
                     <button className="w-full flex items-center gap-3 p-3 bg-surface rounded-xl border border-border text-xs font-bold text-text-secondary">
                        <Clock size={14} />
                        View past week (Week of Jun 30)
                        <ChevronRight size={14} className="ml-auto" />
                     </button>
                  </div>

                  {/* Current Week - Expanded */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="px-2 py-0.5 rounded bg-primary text-white text-[10px] font-black uppercase tracking-wider">Active This Week</span>
                       <span className="text-xs font-bold text-text-secondary">Week of July 7</span>
                    </div>
                    <div className="p-6 bg-surface border-2 border-primary/20 rounded-2xl space-y-4 shadow-sm relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-5">
                          <Zap size={80} />
                       </div>
                       <div className="flex items-start gap-4">
                          <div className="w-20 h-20 bg-white rounded-xl border border-border overflow-hidden shadow-sm flex-shrink-0">
                             <img src="https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover" />
                          </div>
                          <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Football Kickoff — Awareness</p>
                             <h4 className="text-lg font-display font-bold text-text leading-tight">Recommended Story Asset</h4>
                             <div className="flex gap-2 mt-2">
                                <span className="px-2 py-0.5 rounded-full bg-white border border-border text-[9px] font-bold text-text-secondary">Instagram Story</span>
                                <span className="px-2 py-0.5 rounded-full bg-white border border-border text-[9px] font-bold text-text-secondary">Facebook Story</span>
                             </div>
                          </div>
                       </div>
                       <p className="text-sm font-medium text-text-secondary italic">
                         "Lead with the August 21 date. Warm up your network before the ask."
                       </p>
                       <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button 
                            onClick={() => { handleShare('cal-jul7', 'SOCIAL'); setShowSocialCalendar(false); }}
                            className="btn-primary flex-1 py-4 text-base"
                          >
                            Share Now
                          </button>
                          <button className="btn-secondary !py-4 text-base flex-1">View Asset</button>
                       </div>
                    </div>
                  </div>

                  {/* Future Weeks - Collapsed */}
                  <div className="space-y-2">
                    {[
                      { week: 'Jul 14', title: 'Speaker Spotlight: Mike Gundy', event: 'Football Kickoff' },
                      { week: 'Jul 21', title: 'Table Availability Push', event: 'Football Kickoff' },
                      { week: 'Aug 4', title: 'Renewal Deadline Reminder', event: 'Football Kickoff' },
                    ].map((w) => (
                      <div key={w.week} className="p-4 bg-white border border-border rounded-xl flex items-center justify-between opacity-60">
                         <div className="flex items-center gap-4">
                            <div className="text-center">
                               <p className="text-[10px] font-bold text-text-secondary uppercase leading-none">Week of</p>
                               <p className="text-sm font-black text-text">{w.week}</p>
                            </div>
                            <div className="h-4 w-px bg-border" />
                            <div>
                               <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{w.event}</p>
                               <p className="text-xs font-bold text-text">{w.title}</p>
                            </div>
                         </div>
                         <ChevronRight size={16} className="text-text-secondary" />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
