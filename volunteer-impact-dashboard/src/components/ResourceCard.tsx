/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, FC } from 'react';
import { 
  MessageSquare, 
  Mail, 
  Share2, 
  CheckCircle2, 
  Info,
  Clock
} from 'lucide-react';
import { Resource } from '../types';
import { PERSONAL_LINKS } from '../constants';
import { AnimatePresence, motion } from 'motion/react';

interface ResourceCardProps {
  resource: Resource;
  onShare?: (id: string, type: string) => void;
}

const ResourceCard: FC<ResourceCardProps> = ({ resource, onShare }) => {
  const [isShared, setIsShared] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const handleShareClick = () => {
    if (onShare) {
      onShare(resource.id, resource.type.toUpperCase());
    }
    setIsShared(true);

    // Auto-copy ticket link for Rate Bowl/Fiesta Bowl social assets
    if (resource.type === 'social' && (resource.event === 'Rate Bowl' || resource.event === 'Fiesta Bowl')) {
      const link = PERSONAL_LINKS.find(l => l.event === resource.event);
      if (link) {
        navigator.clipboard.writeText(link.url);
        setShowGuide(true);
        setTimeout(() => setShowGuide(false), 6000);
      }
    }

    setTimeout(() => setIsShared(false), 3000);
  };

  return (
    <div className="bento-card flex flex-col group h-full">
      <div className="p-5 flex-1 space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-wrap gap-2">
            {resource.stage && (
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider">
                {resource.stage}
              </span>
            )}
            {resource.tier && (
              <span className="text-[10px] font-bold bg-link/10 text-link px-2 py-0.5 rounded uppercase tracking-wider">
                {resource.tier}
              </span>
            )}
            {resource.statusTag && (
              <span className="text-[10px] font-bold bg-warning/10 text-warning px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                <Clock size={10} /> {resource.statusTag}
              </span>
            )}
          </div>
          <div className="text-text-secondary">
            {resource.type === 'sms' && <MessageSquare size={16} />}
            {resource.type === 'email' && <Mail size={16} />}
            {resource.type === 'social' && <Share2 size={16} />}
          </div>
        </div>
        
        <div>
          <h3 className="text-base font-bold mb-1 group-hover:text-primary transition-colors">{resource.title}</h3>
          <p className="text-xs text-text-secondary font-medium leading-relaxed">{resource.description}</p>
        </div>

        {resource.type === 'social' && (
          <div className="space-y-3">
            <div className="aspect-square bg-surface-subtle rounded-xl flex items-center justify-center border border-border overflow-hidden relative">
              <img 
                src={resource.content} 
                alt={resource.title} 
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              />
            </div>
            {resource.placements && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {resource.placements.map(placement => (
                  <span 
                    key={placement}
                    className="px-2 py-1 rounded bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/10"
                  >
                    {placement}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {resource.type !== 'social' && (
          <div className="p-4 bg-surface rounded-xl border border-dashed border-border relative group/content">
            {resource.subject && (
              <div className="mb-2 pb-2 border-b border-border/50">
                <p className="text-[10px] font-bold text-text-secondary uppercase mb-0.5">Subject</p>
                <p className="text-xs font-semibold text-text">{resource.subject}</p>
              </div>
            )}
            <p className="text-xs font-sans text-text-secondary line-clamp-4 italic">"{resource.content}"</p>
            <div className="absolute top-2 right-2 opacity-0 group-hover/content:opacity-100 transition-opacity">
              <Info size={14} className="text-text-secondary/50" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-surface border-t border-border mt-auto">
        {isShared ? (
          <div className="w-full h-11 flex items-center justify-center text-success font-bold gap-2 animate-in fade-in zoom-in duration-300">
            <CheckCircle2 size={18} />
            Shared. Nest logged it.
          </div>
        ) : (
          <button 
            onClick={handleShareClick}
            className="btn-primary w-full py-2.5 !text-xs gap-2"
          >
            <Share2 size={16} /> Share {resource.type === 'social' ? 'Asset' : 'Template'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-20 left-4 right-4 bg-text text-white p-4 rounded-xl shadow-2xl z-20 pointer-events-none"
          >
            <div className="flex items-start gap-3">
               <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={12} />
               </div>
               <div className="space-y-1">
                  <p className="text-xs font-bold leading-tight">Your ticket link is copied.</p>
                  <p className="text-[10px] text-white/70">In Instagram: tap sticker icon → Link → Paste. In Facebook: paste in caption.</p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResourceCard;
