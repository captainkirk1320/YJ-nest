/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Calendar, 
  MapPin, 
  Users, 
  MessageSquare, 
  Mail, 
  Ticket, 
  FileText, 
  Bell,
  ExternalLink,
  Phone,
  Video,
  Copy,
  ChevronRight,
  Sparkles,
  Info,
  Download
} from 'lucide-react';
import { ToolkitEventType, Resource, Committee, EventAnnouncement, PersonalLink } from '../types';
import { RESOURCES, COMMITTEES, ANNOUNCEMENTS, PERSONAL_LINKS } from '../constants';
import ResourceCard from '../components/ResourceCard'; // Assuming we have or will update this

interface EventsTabProps {
  initialEvent?: string;
}

const EVENTS: { name: ToolkitEventType; date: string; status?: string; pill?: { text: string, type: 'active' | 'upcoming' | 'closed' } }[] = [
  { name: 'Football Kickoff', date: 'Aug 21, 2026', pill: { text: 'Renewal Push: Active', type: 'active' } },
  { name: 'Par 3 Challenge', date: 'Oct 21-23, 2026', pill: { text: 'Recruiting: Upcoming', type: 'upcoming' } },
  { name: 'Wishes for Teachers', date: 'Fall 2026', pill: { text: 'Recruiting: Upcoming', type: 'upcoming' } },
  { name: 'Rate Bowl', date: 'Dec 2026', pill: { text: 'Recruiting: Upcoming', type: 'upcoming' } },
  { name: 'Fiesta Bowl', date: 'Jan 2027', pill: { text: 'Recruiting: Upcoming', type: 'upcoming' } },
  { name: 'Parade', date: 'Dec 2026', pill: { text: 'Recruiting: Upcoming', type: 'upcoming' } },
];

export default function EventsTab({ initialEvent }: EventsTabProps) {
  const [selectedEvent, setSelectedEvent] = useState<ToolkitEventType | null>(initialEvent as ToolkitEventType || null);

  const handleBack = () => setSelectedEvent(null);

  if (selectedEvent) {
    return <EventHub event={selectedEvent} onBack={handleBack} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold text-text">Events</h1>
          <p className="text-text-secondary font-medium font-sans">Your hub for every Nest event.</p>
        </div>
        <button className="btn-secondary gap-2 px-4 py-2 border-border text-xs font-black uppercase tracking-widest hover:border-primary transition-all">
          <Download size={14} /> Download Full Schedule
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {EVENTS.map((event) => {
          const hasRole = COMMITTEES.some(c => c.event === event.name);
          const hasLink = PERSONAL_LINKS.some(l => l.event === event.name);
          const needsDot = hasRole || hasLink;

          return (
            <motion.div
              key={event.name}
              whileHover={{ y: -4 }}
              onClick={() => setSelectedEvent(event.name)}
              className="bento-card p-6 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-display font-bold text-text group-hover:text-primary transition-colors">
                    {event.name}
                  </h3>
                  {needsDot && (
                    <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(200,16,46,0.6)]" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary font-medium mb-3">
                  <Calendar size={14} className="text-primary/60" />
                  {event.date}
                </div>
                {event.pill && (
                  <span className={`inline-block px-2 py-1 rounded text-[9px] font-black uppercase tracking-[0.1em] border ${
                    event.pill.type === 'active' ? 'bg-success/5 text-success border-success/20' :
                    event.pill.type === 'upcoming' ? 'bg-info/5 text-info border-info/20' :
                    'bg-surface text-text-secondary border-border'
                  }`}>
                    {event.pill.text}
                  </span>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between text-xs font-bold text-text-secondary group-hover:text-primary transition-colors">
                View Event Hub
                <ChevronRight size={16} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function EventHub({ event, onBack }: { event: ToolkitEventType; onBack: () => void }) {
  const committee = COMMITTEES.find(c => c.event === event);
  const announcements = ANNOUNCEMENTS.filter(a => a.eventId === event);
  const resources = RESOURCES.filter(r => r.event === event && r.type === 'document');
  const shareables = RESOURCES.filter(r => r.event === event && r.type !== 'document');
  const personalLink = PERSONAL_LINKS.find(l => l.event === event);

  return (
    <div className="space-y-8 pb-12">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-primary transition-colors group"
      >
        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Back to Events
      </button>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold text-text">{event} Hub</h1>
        <p className="text-text-secondary font-medium font-sans">Everything you need for {event}.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* 1. Event Summary (Detailed) */}
          <section className="bento-card p-6 bg-surface-subtle border-primary/10">
            <h2 className="eyebrow mb-4">Event Summary</h2>
            <EventDetailContent event={event} />
          </section>

          {/* 2. Opportunities (NEW) */}
          <section className="bento-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="eyebrow">Opportunities</h2>
              <span className="text-[10px] text-text-secondary font-medium">Updated 15 min ago</span>
            </div>
            <OpportunityList event={event} />
          </section>

          {/* 4. My Ticket Link */}
          {personalLink && (
            <section className="bento-card p-6 border-primary/20">
              <h2 className="eyebrow mb-4">Your Personal Ticket Link</h2>
              <div className="space-y-4">
                <div className="bg-white border border-border p-4 rounded-xl flex items-center justify-between group">
                  <code className="text-sm text-text-secondary font-mono truncate mr-2">{personalLink.url}</code>
                  <button 
                    onClick={() => navigator.clipboard.writeText(personalLink.url)}
                    className="flex-shrink-0 p-2 hover:bg-surface rounded-lg transition-colors text-primary"
                  >
                    <Copy size={18} />
                  </button>
                </div>
                <div className="flex gap-3">
                  <button className="flex-1 btn-secondary gap-2 border-border text-text hover:border-primary">
                    <MessageSquare size={16} /> SMS
                  </button>
                  <button className="flex-1 btn-secondary gap-2 border-border text-text hover:border-primary">
                    <Mail size={16} /> Email
                  </button>
                </div>
                <p className="text-xs text-text-secondary font-medium italic">Any ticket purchased through your link counts toward your fundraising.</p>
              </div>
            </section>
          )}

          {/* 5. Templates and Shareables */}
          <section className="space-y-4">
            <h2 className="eyebrow">Templates and Shareables</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {shareables.length > 0 ? shareables.map(item => (
                <ResourceCard key={item.id} resource={item} />
              )) : (
                <p className="p-8 bg-surface rounded-xl text-center text-text-secondary italic text-sm border border-border sm:col-span-2">No specific shareables yet for this event.</p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {/* 2 & 3. My Role & Meetings */}
          <section className="bento-card p-6 space-y-4 shadow-md bg-white border-primary/10">
            <h2 className="eyebrow">My Role on This Event</h2>
            {committee ? (
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-sans text-text-secondary mb-1">Your role:</p>
                  <p className="text-lg font-display font-bold text-primary">{committee.role}</p>
                </div>
                <div className="pt-4 border-t border-border">
                  <p className="text-xs font-bold text-text-secondary uppercase mb-3">Committee Chair</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-text">{committee.chairName}</p>
                      <p className="text-[10px] text-text-secondary font-medium">{committee.chairContact}</p>
                    </div>
                    <button className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all">
                      <Mail size={16} />
                    </button>
                  </div>
                </div>

                {committee.nextMeeting && (
                  <div className="pt-4 border-t border-border space-y-3">
                    <p className="text-xs font-bold text-text-secondary uppercase">Next Meeting</p>
                    <div className="p-3 bg-surface rounded-xl border border-border/50">
                      <p className="text-xs font-bold text-text mb-1">{committee.nextMeeting.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-text-secondary mb-2">
                        <Calendar size={10} /> {committee.nextMeeting.date}
                        <span className="w-1 h-1 bg-border rounded-full" />
                        {committee.nextMeeting.time}
                      </div>
                      <div className="flex gap-2">
                        {committee.nextMeeting.link && (
                          <a 
                            href={committee.nextMeeting.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 py-1.5 bg-primary text-white text-[10px] font-bold rounded flex items-center justify-center gap-1.5 hover:bg-secondary transition-all"
                          >
                            <Video size={12} /> Join Meeting
                          </a>
                        )}
                        <button className="flex-1 py-1.5 border border-border text-[10px] font-bold rounded hover:bg-surface transition-all">
                          RSVP
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary font-medium leading-relaxed">
                  All Yellow Jackets are fundraising for this event. 
                </p>
                <div className="p-3 bg-surface rounded-xl border border-border/50">
                  <p className="text-[10px] font-bold text-text-secondary uppercase mb-2 text-center">Event Contact</p>
                  <p className="text-xs font-bold text-center">Bryce Hancock</p>
                  <p className="text-[10px] text-text-secondary text-center mt-1 mb-3">Sponsorships Lead</p>
                  <div className="flex flex-col gap-2">
                    <button className="flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary rounded-lg text-[10px] font-bold hover:bg-primary hover:text-white transition-all">
                      <Phone size={12} /> Call Bryce
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary rounded-lg text-[10px] font-bold hover:bg-primary hover:text-white transition-all">
                      <MessageSquare size={12} /> Text Bryce
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2 bg-surface text-text-secondary rounded-lg text-[10px] font-bold hover:bg-border transition-all">
                      <Mail size={12} /> Email Bryce
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 6. Event Resources */}
          <section className="bento-card p-6 space-y-4">
            <h2 className="eyebrow">Event Resources</h2>
            <div className="space-y-3">
              {resources.length > 0 ? resources.map(res => (
                <div key={res.id} className="flex gap-3 p-3 hover:bg-surface rounded-xl transition-all cursor-pointer border border-transparent hover:border-border">
                  <div className="w-10 h-10 bg-primary/5 rounded-lg flex items-center justify-center text-primary">
                    <FileText size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-text truncate">{res.title}</p>
                    <p className="text-[10px] text-text-secondary font-medium truncate">{res.description}</p>
                    <p className="text-[9px] text-text-secondary font-bold uppercase mt-1">Updated {res.updatedAt}</p>
                  </div>
                </div>
              )) : (
                <div className="py-8 text-center bg-surface rounded-xl border border-dashed border-border">
                   <Info size={24} className="mx-auto text-text-secondary/30 mb-2" />
                   <p className="text-xs text-text-secondary font-medium">No resources found.</p>
                </div>
              )}
            </div>
          </section>

          {/* 7. Event Announcements */}
          <section className="bento-card p-6 space-y-4">
            <h2 className="eyebrow">Announcements</h2>
            <div className="space-y-6">
              {announcements.length > 0 ? announcements.map(ann => (
                <div key={ann.id} className="space-y-1 relative pl-4 before:absolute before:left-0 before:top-2 before:bottom-0 before:w-0.5 before:bg-primary/20">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-sm font-bold text-text">{ann.title}</h4>
                    <span className="text-[9px] font-bold text-text-secondary/50 uppercase whitespace-nowrap">{ann.date}</span>
                  </div>
                  <p className="text-xs text-text-secondary font-medium line-clamp-3">{ann.content}</p>
                  <p className="text-[9px] font-bold text-primary uppercase pt-1">From {ann.author}</p>
                </div>
              )) : (
                <p className="text-xs text-text-secondary font-medium italic">No new announcements.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function OpportunityList({ event }: { event: ToolkitEventType }) {
  if (event === 'Football Kickoff') {
    const opportunities = [
      { label: 'Tier 1 tables', count: 12, total: 30 },
      { label: 'Tier 2 tables', count: 4, total: 40 },
      { label: 'Tier 3 tables', count: 28, total: 50 },
      { label: 'VIP Tables', count: 2, total: 10 },
      { label: 'Event Sponsorships', count: 1, total: 5, contact: 'Bryce Hancock' },
    ];

    return (
      <div className="space-y-3">
        {opportunities.map((opp) => {
          const ratio = opp.count / opp.total;
          let statusLabel = '';
          let statusColor = 'text-text';

          if (opp.count === 0) {
            statusLabel = 'Sold out';
            statusColor = 'text-text-secondary';
          } else if (ratio <= 0.2) {
            statusLabel = 'Almost gone';
            statusColor = 'text-primary';
          } else if (ratio < 0.5) {
            statusLabel = 'Limited';
            statusColor = 'text-warning';
          }

          return (
            <div key={opp.label} className={`flex flex-col gap-3 p-4 rounded-xl border border-border ${opp.count === 0 ? 'opacity-50 grayscale bg-surface' : 'bg-white'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-text">{opp.label}</p>
                </div>
                <div className="flex items-center gap-3">
                  {statusLabel && (
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                      statusLabel === 'Sold out' ? 'bg-surface text-text-secondary border-border' :
                      statusLabel === 'Almost gone' ? 'bg-primary/10 text-primary border-primary/20' :
                      'bg-warning/10 text-warning border-warning/20'
                    }`}>
                      {statusLabel}
                    </span>
                  )}
                  <p className={`text-sm font-bold ${statusColor}`}>{opp.count} remaining</p>
                </div>
              </div>
              
              {opp.contact && (
                <div className="pt-3 border-t border-border flex flex-col gap-2">
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Close with {opp.contact}:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button className="flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary rounded-lg text-[10px] font-bold hover:bg-primary hover:text-white transition-all">
                      <Phone size={12} /> Call
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2 bg-primary/10 text-primary rounded-lg text-[10px] font-bold hover:bg-primary hover:text-white transition-all">
                      <MessageSquare size={12} /> Text
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2 bg-surface text-text-secondary rounded-lg border border-border text-[10px] font-bold hover:bg-border transition-all">
                      <Mail size={12} /> Email
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <p className="text-[10px] text-text-secondary font-medium italic mt-2 text-center">Updated 15 min ago</p>
      </div>
    );
  }

  if (event === 'Par 3 Challenge') {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-white">
        <p className="text-sm font-bold text-text">Foursomes available</p>
        <p className="text-sm font-bold text-text">8 remaining</p>
      </div>
    );
  }

  return (
    <div className="py-6 text-center bg-surface rounded-xl border border-dashed border-border flex flex-col items-center gap-2">
      <Info size={16} className="text-text-secondary/40" />
      <p className="text-xs text-text-secondary font-medium italic">Opportunities coming soon.</p>
    </div>
  );
}

function EventDetailContent({ event }: { event: ToolkitEventType }) {
  if (event === 'Football Kickoff') {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-xl font-display font-bold text-text">Football Kickoff</p>
          <div className="flex flex-wrap gap-4 text-sm font-medium text-text-secondary">
            <div className="flex items-center gap-1.5"><Calendar size={16} /> Friday, Aug 21, 2026</div>
            <div className="flex items-center gap-1.5"><MapPin size={16} /> Fairmont Scottsdale Princess</div>
          </div>
          <span className="inline-block px-2 py-0.5 bg-success/10 text-success text-[10px] font-bold uppercase rounded border border-success/10">Sells out annually</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-white border border-border rounded-xl">
             <p className="text-[10px] font-bold text-text-secondary uppercase">Tier 1</p>
             <p className="text-lg font-bold text-primary">$3,650</p>
             <p className="text-[10px] text-text-secondary">Front of room</p>
          </div>
          <div className="p-3 bg-white border border-border rounded-xl">
             <p className="text-[10px] font-bold text-text-secondary uppercase">Tier 2</p>
             <p className="text-lg font-bold text-primary">$3,400</p>
             <p className="text-[10px] text-text-secondary">Mid-room</p>
          </div>
          <div className="p-3 bg-white border border-border rounded-xl">
             <p className="text-[10px] font-bold text-text-secondary uppercase">Tier 3</p>
             <p className="text-lg font-bold text-primary">$3,150</p>
             <p className="text-[10px] text-text-secondary">Standard</p>
          </div>
          <div className="p-3 bg-white border border-border rounded-xl bg-primary/5 border-primary/20">
             <p className="text-[10px] font-bold text-primary uppercase">VIP Table</p>
             <p className="text-lg font-bold text-primary">$9,250</p>
             <p className="text-[10px] text-text-secondary">Meet & Greet</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-bold border-b border-border pb-1">Featured Speakers</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-bold">Mike Gundy</p>
              <p className="text-xs text-text-secondary leading-normal">Former OSU Head Coach, 2x Fiesta Bowl winner. 170-90 record across 20 seasons.</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold">Jack Swarbrick</p>
              <p className="text-xs text-text-secondary leading-normal">Former Notre Dame AD, CFP expansion architect. 2x Fiesta Bowl appearance.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-border">
          <div className="space-y-3">
             <p className="text-xs font-bold uppercase text-text-secondary tracking-widest">Day-of Schedule</p>
             <ul className="space-y-2 text-xs font-medium">
               <li className="flex justify-between"><span>11:00 AM</span><span className="text-text font-bold">VIP Session</span></li>
               <li className="flex justify-between"><span>11:30 AM</span><span className="text-text font-bold">Doors Open</span></li>
               <li className="flex justify-between"><span>12:00 PM</span><span className="text-text font-bold">Main Program</span></li>
               <li className="flex justify-between"><span>1:30 PM</span><span className="text-text font-bold">Overtime Happy Hour</span></li>
             </ul>
          </div>
          <div className="space-y-3">
             <p className="text-xs font-bold uppercase text-text-secondary tracking-widest">Key Deadlines</p>
             <div className="p-3 bg-warning/5 border border-warning/10 rounded-xl">
               <p className="text-xs font-bold text-warning">June 12, 2026</p>
               <p className="text-[10px] text-text-secondary">Table renewal deadline. Tables released to waitlist on June 13.</p>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (event === 'Par 3 Challenge') {
     return (
       <div className="space-y-6">
         <div className="space-y-2">
           <p className="text-xl font-display font-bold text-text">Par 3 Challenge</p>
           <div className="flex flex-wrap gap-4 text-sm font-medium text-text-secondary">
             <div className="flex items-center gap-1.5"><Calendar size={16} /> Oct 21 to 23, 2026</div>
             <div className="flex items-center gap-1.5"><MapPin size={16} /> Short Course at Mountain Shadows</div>
           </div>
         </div>
         
         <div className="p-4 bg-white border border-border rounded-xl space-y-2">
            <p className="text-sm font-bold">Format: 18 Holes of Closest-to-the-Pin</p>
            <p className="text-xs text-text-secondary leading-relaxed">
             18 chances to win on every hole. Hole-in-one opportunities for cash prizes, luxury trips, or a brand-new car.
            </p>
         </div>

         <div className="pt-4 border-t border-border">
            <p className="text-sm font-medium text-text-secondary leading-relaxed">
              Supports statewide impact of the Fiesta Sports Foundation. Three-day experience with gourmet hospitality and breathtaking views.
            </p>
         </div>
       </div>
     );
  }

  return (
    <div className="py-12 text-center space-y-4">
      <Info size={48} className="mx-auto text-primary/20" />
      <h3 className="text-xl font-display font-bold">Coming Soon</h3>
      <p className="text-text-secondary max-w-sm mx-auto text-sm">Foundation materials for {event} are arriving shortly. Stay tuned for full event details, pricing, and speaker bios.</p>
      <div className="pt-8 flex flex-col items-center gap-2">
        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Contact</p>
        <p className="text-sm font-bold text-text">480.350.0911</p>
      </div>
    </div>
  );
}
