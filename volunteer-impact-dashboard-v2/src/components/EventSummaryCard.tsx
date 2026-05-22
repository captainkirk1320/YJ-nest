/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Phone, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { ToolkitEventType } from '../types';

interface EventSummaryCardProps {
  event: ToolkitEventType;
  onViewResources: (event: ToolkitEventType) => void;
}

const EVENT_SUMMARIES: Record<string, any> = {
  'Football Kickoff': {
    fullName: 'UMB Bank Fiesta Sports Foundation Football Kickoff presented by Fairmont Scottsdale Princess',
    date: 'Friday, August 21, 2026',
    venue: 'Fairmont Scottsdale Princess, Scottsdale',
    status: 'Sells out annually',
    tiers: [
      { name: 'Tier 1', price: '$3,650' },
      { name: 'Tier 2', price: '$3,400' },
      { name: 'Tier 3', price: '$3,150' },
      { name: 'VIP Table of 10', price: '$9,250' },
      { name: 'Event Sponsorship', price: '$15,000' }
    ],
    deadline: 'June 12, 2026',
    contact: '480.350.0911'
  },
  'Par 3 Challenge': {
    fullName: 'Fiesta Sports Foundation Par 3 Challenge presented by Chapman Automotive',
    date: 'October 21 to 23, 2026',
    venue: 'Short Course at Mountain Shadows, Paradise Valley',
    status: 'Presented by Chapman Automotive',
    tiers: [
      { name: 'Foursome registration', price: 'Pricing TBD' }
    ],
    format: '18 holes, closest-to-the-pin prizes on every hole',
    contact: 'FiestaSportsFoundation.org'
  },
  'Wishes for Teachers': {
    fullName: 'Fiesta Bowl Wishes for Teachers',
    date: 'Fall 2026',
    venue: 'Statewide Arizona',
    status: 'Granted nearly $10M since inception',
    tiers: [
      { name: 'Grant Award', price: '$5,000' }
    ],
    contact: 'FiestaSportsFoundation.org'
  },
  'Rate Bowl': {
    fullName: 'Rate Bowl',
    date: 'December 2026',
    venue: 'Chase Field, Phoenix',
    status: 'Youth sports impact focus',
    tiers: [
      { name: 'Tickets', price: 'TBD' }
    ],
    contact: 'FiestaSportsFoundation.org'
  },
  'Fiesta Bowl': {
    fullName: 'Fiesta Bowl',
    date: 'January 2027',
    venue: 'State Farm Stadium, Glendale',
    status: 'CFP Quarterfinal',
    tiers: [
      { name: 'Tickets', price: 'TBD' }
    ],
    contact: 'FiestaSportsFoundation.org'
  }
};

export default function EventSummaryCard({ event, onViewResources }: EventSummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const data = EVENT_SUMMARIES[event];

  if (!data || event === 'Evergreen') return null;

  return (
    <div className="bento-card bg-surface-subtle border-primary/20 overflow-hidden mb-6">
      <div 
        className="p-5 cursor-pointer lg:cursor-default lg:pb-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-lg font-display font-bold text-primary leading-tight">
              {data.fullName}
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary font-medium">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-primary/60" />
                {data.date}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-primary/60" />
                {data.venue}
              </div>
            </div>
            {data.status && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest rounded border border-primary/10">
                {data.status}
              </span>
            )}
          </div>
          <div className="lg:hidden text-primary">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(isExpanded || window.innerWidth >= 1024) && (
          <motion.div
            initial={window.innerWidth < 1024 ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-2 border-t border-border lg:border-none space-y-6">
              {data.tiers && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  {data.tiers.map((tier: any) => (
                    <div key={tier.name} className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm font-semibold text-text">{tier.name}</span>
                      <span className="text-sm font-bold text-primary">{tier.price}</span>
                    </div>
                  ))}
                </div>
              )}

              {data.format && (
                 <p className="text-sm font-medium text-text-secondary">
                   <span className="font-bold text-text">Format:</span> {data.format}
                 </p>
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-border">
                <div className="space-y-4 md:space-y-0 md:flex md:items-center md:gap-8">
                  {data.deadline && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Table renewal deadline</span>
                      <span className="text-sm font-bold text-text">{data.deadline}</span>
                    </div>
                  )}
                  {data.contact && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Contact</span>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-text">
                        <Phone size={14} className="text-primary/60" />
                        {data.contact}
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => onViewResources(event)}
                  className="flex items-center gap-2 text-xs font-bold text-link hover:underline"
                >
                  <ExternalLink size={14} />
                  View full event details
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
