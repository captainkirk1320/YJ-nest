/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NudgeModal — captain-facing flow for sending an SMS nudge to a teammate.
 *
 * Behavior:
 *   - Captain picks a template from the role-appropriate library
 *   - Tokens are substituted client-side ({firstName}, {sprintName}, {daysLeft})
 *   - "Open in Messages" fires `sms:` URI — captain's native app opens with
 *     recipient + body pre-filled, captain reviews and hits send themselves
 *   - We do NOT track that the nudge was opened. Explicit product decision.
 */

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Copy, ExternalLink, X } from 'lucide-react';
import { NudgeSignalType, NudgeTemplate, Volunteer } from '../types';
import { NUDGE_TEMPLATES, ACTIVE_PUSH } from '../constants';

interface NudgeModalProps {
  recipient: Volunteer | null;
  signalType: NudgeSignalType;
  onClose: () => void;
}

function firstNameOf(v: Volunteer): string {
  return v.name.split(' ')[0];
}

function daysLeft(): number {
  if (!ACTIVE_PUSH) return 0;
  const ms = new Date(ACTIVE_PUSH.endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function renderTemplate(tpl: NudgeTemplate, recipient: Volunteer): string {
  return tpl.bodyTemplate
    .replaceAll('{firstName}', firstNameOf(recipient))
    .replaceAll('{sprintName}', ACTIVE_PUSH?.label ?? 'the active push')
    .replaceAll('{daysLeft}', String(daysLeft()));
}

function smsUri(phone: string, body: string): string {
  // Strip everything except digits and leading +
  const num = phone.replace(/[^\d+]/g, '');
  return `sms:${num}?body=${encodeURIComponent(body)}`;
}

const SIGNAL_LABEL: Record<NudgeSignalType, string> = {
  at_risk:   'At-risk check-in',
  coasting:  'Coasting nudge',
  rising:    'Recognition',
  milestone: 'Milestone congrats',
};

const SIGNAL_TONE: Record<NudgeSignalType, string> = {
  at_risk:   'Soft, relational. No data references.',
  coasting:  'Sprint-relevant. One small action.',
  rising:    'Recognition + leverage. Keep going.',
  milestone: 'Pure congratulations.',
};

export default function NudgeModal({ recipient, signalType, onClose }: NudgeModalProps) {
  const templates = useMemo(
    () => NUDGE_TEMPLATES.filter(t => t.signalType === signalType && t.active)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    [signalType]
  );

  const [selectedId, setSelectedId] = useState<string | null>(templates[0]?.id ?? null);
  const [copied, setCopied] = useState(false);

  if (!recipient) return null;

  const selected = templates.find(t => t.id === selectedId);
  const rendered = selected ? renderTemplate(selected, recipient) : '';
  const uri = selected ? smsUri(recipient.phone, rendered) : '#';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rendered);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-border flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                {SIGNAL_LABEL[signalType]}
              </p>
              <h3 className="font-display font-bold text-lg mt-1">Nudge {firstNameOf(recipient)}</h3>
              <p className="text-xs text-text-secondary mt-1">{SIGNAL_TONE[signalType]}</p>
            </div>
            <button onClick={onClose} className="text-text-secondary hover:text-text">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {recipient.signals.signalReason && (
              <div className="bg-surface p-3 rounded-xl border border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Why</p>
                <p className="text-xs">{recipient.signals.signalReason}</p>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                Pick a template
              </p>
              <div className="space-y-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      selectedId === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-text-secondary'
                    }`}
                  >
                    <p className="text-xs font-bold">{t.label}</p>
                  </button>
                ))}
                {templates.length === 0 && (
                  <p className="text-xs text-text-secondary italic">No templates for this signal type.</p>
                )}
              </div>
            </div>

            {selected && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                  Preview ({rendered.length} chars)
                </p>
                <div className="bg-surface p-4 rounded-xl border border-border text-sm leading-relaxed">
                  {rendered}
                </div>
                <p className="text-[10px] text-text-secondary mt-2 italic">
                  Opens your Messages app with this pre-filled. Review and edit before sending.
                </p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-border space-y-2">
            <a
              href={uri}
              onClick={onClose}
              className={`btn-primary w-full flex items-center justify-center gap-2 py-3 ${!selected ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <MessageSquare size={16} />
              Open in Messages
              <ExternalLink size={14} />
            </a>
            <button
              onClick={handleCopy}
              disabled={!selected}
              className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-text-secondary hover:text-text uppercase tracking-widest"
            >
              <Copy size={14} />
              {copied ? 'Copied' : 'Copy text'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
