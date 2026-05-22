/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Filter, 
  Zap,
  Info,
  X,
  Phone,
  MessageSquare,
  Mail,
  Trophy
} from 'lucide-react';
import { SCHEDULE_EVENTS } from '../constants';
import { ScheduleEvent } from '../types';

interface ScheduleTabProps {
  onTakeAction: (event?: string) => void;
}

export default function Schedule({ onTakeAction }: ScheduleTabProps) {
  const [activeCategory, setActiveCategory] = useState<'Engagement' | 'Volunteering' | 'Meetings'>('Engagement');
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  const categories = ['Engagement', 'Volunteering', 'Meetings'];

  const filteredEvents = SCHEDULE_EVENTS.filter(event => {
    if (activeCategory === 'Engagement') return event.type === 'Meetup' || event.type === 'Formal Event';
    if (activeCategory === 'Volunteering') return event.type === 'Volunteering';
    if (activeCategory === 'Meetings') return event.type === 'Committee Meeting';
    return false;
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4">
        <div className="flex bg-surface p-1 rounded-xl border border-border">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as any)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                activeCategory === cat 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-text-secondary hover:text-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredEvents.map((event) => (
          <motion.div
            key={event.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedEvent(event)}
            className="bento-card p-5 bg-white cursor-pointer group hover:border-primary/30 transition-all border border-border"
          >
            <div className="flex justify-between items-start gap-4 mb-3">
              <div className="space-y-1">
                 <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-surface text-text-secondary border border-border">
                      {event.roleNeeded || event.type}
                    </span>
                    {event.hasFundraisingOpportunity && (
                       <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-warning/10 text-warning border border-warning/20">
                         <Trophy size={10} />
                         Fundraising Opportunity
                       </span>
                    )}
                 </div>
                 <h3 className="text-lg font-display font-bold text-text group-hover:text-primary transition-colors leading-snug">
                   {event.name}
                 </h3>
              </div>
              <ChevronRight size={20} className="text-text-secondary/30 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-y-2">
               <div className="flex items-center gap-2 text-xs text-text-secondary font-medium">
                  <Calendar size={14} className="text-primary/60" />
                  {event.date}
               </div>
               <div className="flex items-center gap-2 text-xs text-text-secondary font-medium">
                  <Clock size={14} className="text-primary/60" />
                  {event.time || 'Time TBD'}
               </div>
               <div className="flex items-center gap-2 text-xs text-text-secondary font-medium col-span-2">
                  <MapPin size={14} className="text-primary/60" />
                  <span className="truncate">{event.location}</span>
               </div>
               {event.cost && (
                <div className="flex items-center gap-2 text-xs text-text-secondary font-bold">
                    <Info size={14} className="text-primary/60" />
                    {event.cost}
                </div>
               )}
            </div>

            {event.hasFundraisingOpportunity && (
              <p className="mt-4 text-[11px] font-bold text-text bg-warning/5 border border-warning/10 p-2 rounded-lg italic">
                Tickets sold to others count toward your fundraising. Tap to grab a template.
              </p>
            )}

            {event.type === 'Volunteering' && event.signUpUrl && (
              <div className="mt-4 pt-4 border-t border-border">
                 <button 
                  onClick={(e) => { e.stopPropagation(); window.open(event.signUpUrl, '_blank'); }}
                  className="btn-primary w-full py-2.5 text-xs uppercase tracking-widest"
                 >
                    Sign Up
                 </button>
              </div>
            )}
          </motion.div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="text-center py-20 px-8 bento-card border-dashed bg-surface/30">
            <Calendar size={48} className="mx-auto text-text-secondary/20 mb-4" />
            <p className="text-text-secondary font-medium">No {activeCategory.toLowerCase()} scheduled right now.</p>
          </div>
        )}
      </div>

      <div className="pt-8 border-t border-border">
         <button className="w-full flex items-center justify-between p-4 bg-surface rounded-2xl border border-border group active:scale-[0.98] transition-all">
            <span className="text-sm font-bold text-text-secondary">Past items</span>
            <ChevronRight size={18} className="text-text-secondary/50 group-hover:rotate-90 transition-transform" />
         </button>
      </div>

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedEvent(null)}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="relative w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="sticky top-0 z-10 bg-white border-b border-border p-4 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface text-text-secondary">
                  {selectedEvent.roleNeeded || selectedEvent.type}
                </span>
                <button 
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 hover:bg-surface rounded-full transition-colors text-text-secondary"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-3xl font-display font-bold text-text leading-tight">
                    {selectedEvent.name}
                  </h3>
                  <p className="text-text-secondary font-display font-bold leading-relaxed">
                    {selectedEvent.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface p-6 rounded-2xl border border-border/50 shadow-inner">
                   <div className="space-y-4">
                      <div className="flex items-start gap-3">
                         <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary flex-shrink-0">
                           <Calendar size={18} />
                         </div>
                         <div>
                            <p className="text-[10px] font-bold text-text-secondary uppercase">Date</p>
                            <p className="text-sm font-bold">{selectedEvent.date}</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary flex-shrink-0">
                           <Clock size={18} />
                         </div>
                         <div>
                            <p className="text-[10px] font-bold text-text-secondary uppercase">Time</p>
                            <p className="text-sm font-bold">{selectedEvent.time || 'Time TBD'}</p>
                         </div>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="flex items-start gap-3">
                         <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary flex-shrink-0">
                           <MapPin size={18} />
                         </div>
                         <div>
                            <p className="text-[10px] font-bold text-text-secondary uppercase">Location</p>
                            <p className="text-sm font-bold">{selectedEvent.location}</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary flex-shrink-0">
                           <Info size={18} />
                         </div>
                         <div>
                            <p className="text-[10px] font-bold text-text-secondary uppercase">More Info</p>
                            <p className="text-sm font-bold">{selectedEvent.cost || 'Free to attend'}</p>
                         </div>
                      </div>
                   </div>
                </div>

                {selectedEvent.hasFundraisingOpportunity && (
                  <div className="p-6 bg-gradient-to-r from-warning/10 to-white rounded-2xl border border-warning/30 shadow-lg shadow-warning/5 space-y-4 relative overflow-hidden">
                    <div className="relative z-10 space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap size={20} className="text-warning fill-warning" />
                        <h4 className="text-lg font-display font-bold text-text">Fundraising Opportunity</h4>
                      </div>
                      <p className="text-sm text-text-secondary font-medium leading-relaxed italic">
                        {selectedEvent.opportunityDetail}
                      </p>
                      <button 
                        onClick={() => {
                          onTakeAction(selectedEvent.toolkitLink);
                          setSelectedEvent(null);
                        }}
                        className="btn-primary !bg-warning border-none !text-white w-full py-4 text-xs tracking-[0.1em]"
                      >
                         Grab a Template & Share
                      </button>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                       <Trophy size={100} />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="eyebrow">Engagement</h4>
                  <div className="divide-y divide-border">
                    {selectedEvent.capacity && (
                      <div className="py-3 flex justify-between items-center text-sm">
                        <span className="text-text-secondary font-medium">Capacity</span>
                        <span className="font-bold">Capped at {selectedEvent.capacity} volunteers</span>
                      </div>
                    )}
                    <div className="py-3 flex justify-between items-center text-sm">
                      <span className="text-text-secondary font-medium">Organizer</span>
                      <div className="flex gap-2">
                         <button className="w-8 h-8 rounded-full bg-surface flex items-center justify-center hover:text-primary transition-colors">
                           <Phone size={14} />
                         </button>
                         <button className="w-8 h-8 rounded-full bg-surface flex items-center justify-center hover:text-primary transition-colors">
                           <MessageSquare size={14} />
                         </button>
                         <button className="w-8 h-8 rounded-full bg-surface flex items-center justify-center hover:text-primary transition-colors">
                           <Mail size={14} />
                         </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  {selectedEvent.type === 'Volunteering' ? (
                     <button 
                      className="btn-primary w-full py-5 text-xl rounded-2xl shadow-xl shadow-primary/10"
                      onClick={() => {
                        if (selectedEvent.signUpUrl) window.open(selectedEvent.signUpUrl, '_blank');
                        setSelectedEvent(null);
                      }}
                     >
                       Sign Up to Volunteer
                     </button>
                  ) : (
                    <button 
                      className="btn-primary w-full py-5 text-xl rounded-2xl shadow-xl shadow-primary/10"
                      onClick={() => setSelectedEvent(null)}
                    >
                      RSVP to this Event
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
