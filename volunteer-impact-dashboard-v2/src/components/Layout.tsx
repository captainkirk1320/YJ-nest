/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Home,
  Trophy,
  Briefcase,
  HelpCircle,
  Bell,
  Search,
  Calendar,
  Users,
  Shield,
} from 'lucide-react';
import { motion } from 'motion/react';
import AIChatAssistant from './AIChatAssistant';
import { Volunteer, TabType } from '../types';

// Re-export for convenience to consumers that previously imported TabType from Layout
export type { TabType };

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  currentUser: Volunteer;
  onTabChange: (tab: TabType) => void;
  onAvatarClick: () => void;
  onLogout: () => void;
}

// v2: role-aware navigation. Volunteers see 6, captains 7, admins 8.
const BASE_NAV: { icon: any, label: TabType, displayLabel?: string }[] = [
  { icon: Home, label: 'Home' },
  { icon: Trophy, label: 'Team' },
  { icon: Calendar, label: 'Events' },
  { icon: Calendar, label: 'Schedule' },
  { icon: Briefcase, label: 'Toolkit' },
  { icon: HelpCircle, label: 'Help' },
];
const CAPTAIN_TAB = { icon: Users, label: 'MyTeam' as TabType, displayLabel: 'My Team' };
const ADMIN_TAB   = { icon: Shield, label: 'Admin' as TabType, displayLabel: 'Admin' };

function navForRole(role: Volunteer['role']) {
  if (role === 'admin')         return [...BASE_NAV, CAPTAIN_TAB, ADMIN_TAB];
  if (role === 'sales_captain') return [...BASE_NAV, CAPTAIN_TAB];
  // null (Stream C disabled) or 'volunteer' → base nav only.
  return BASE_NAV;
}

export default function Layout({ children, activeTab, currentUser, onTabChange, onAvatarClick, onLogout }: LayoutProps) {
  // Avatar progress ring reflects Good Standing progress (4 thresholds met).
  // Only render confident progress when every threshold has been measured.
  // For non-YJ/Future members (Board / Life) every threshold is null — the
  // ring renders empty rather than a misleading 0% "you're failing" state.
  const thresholdValues = Object.values(currentUser.thresholds);
  const allMeasured = thresholdValues.every(t => t != null);
  const metCount = thresholdValues.filter(t => t === true).length;
  const progressPercent = allMeasured ? (metCount / 4) * 100 : 0;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progressPercent / 100) * circumference;
  const NAV_ITEMS = navForRole(currentUser.role);

  return (
    <div className="flex min-h-screen bg-bg font-sans">
      {/* Sidebar - Desktop Only */}
      <aside className="w-64 border-r border-border bg-white hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen">
        <div className="p-8">
          <div className="mb-10 pl-2">
            <h1 className="wordmark">YJ NEST</h1>
          </div>
          
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => onTabChange(item.label)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative ${
                  activeTab === item.label 
                    ? 'text-primary bg-surface' 
                    : 'text-text-secondary hover:text-text hover:bg-surface'
                }`}
              >
                <item.icon size={18} strokeWidth={activeTab === item.label ? 2.5 : 2} />
                {(item as any).displayLabel ?? item.label}
                {activeTab === item.label && (
                   <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
                )}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-8 border-t border-border flex flex-col gap-4">
          <button 
            onClick={onAvatarClick}
            className="flex items-center gap-3 w-full hover:bg-surface p-2 rounded-xl transition-all group"
          >
            <div className="relative flex-shrink-0 flex items-center justify-center">
              <svg className="w-11 h-11 transform -rotate-90">
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="2.5"
                  fill="transparent"
                  className="text-border"
                />
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="2.5"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="text-primary transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="avatar-circle !w-8 !h-8 !border-0 !text-[10px] !bg-primary/5 !text-primary font-bold">
                  {currentUser.initials}
                </div>
              </div>
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-[11px] font-bold text-text-secondary leading-none mb-1">Hello, {currentUser.name.split(' ')[0]}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{currentUser.team}</p>
                <span className="text-[10px] font-bold text-text-secondary/30">•</span>
                <p className="text-[10px] font-black text-primary uppercase whitespace-nowrap">
                  {allMeasured ? `${Math.round(progressPercent)}%` : '—'}
                </p>
              </div>
            </div>
          </button>
          <button 
            onClick={onLogout}
            className="text-xs font-bold text-text-secondary/50 hover:text-error text-left pl-2 transition-colors uppercase tracking-widest"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 lg:h-20 border-b border-border bg-white flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <div className="lg:hidden">
            <h1 className="wordmark scale-90 origin-left">YJ NEST</h1>
          </div>

          <div className="flex items-center gap-4 bg-surface px-4 py-2 rounded-xl border border-border hidden lg:flex">
            <Search size={18} className="text-text-secondary" />
            <input 
              type="text" 
              placeholder="Search toolkit or standings..." 
              className="bg-transparent text-sm border-none focus:outline-none w-64 text-text"
            />
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <button className="w-10 h-10 flex items-center justify-center text-text-secondary hover:bg-surface rounded-xl transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary border-2 border-white rounded-full"></span>
            </button>
            <div className="h-8 w-px bg-border mx-1 lg:mx-2"></div>
            <button 
              onClick={onAvatarClick}
              className="lg:hidden avatar-circle w-8 h-8 text-[10px] cursor-pointer"
            >
              {currentUser.initials}
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto w-full">
          {children}
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-1 left-0 right-0 h-16 bg-white border-t border-border flex items-center gap-2 px-2 z-50 overflow-x-auto scrollbar-hide">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => onTabChange(item.label)}
              className={`flex flex-col items-center gap-1 transition-all min-w-[72px] relative px-2 flex-shrink-0 ${
                activeTab === item.label ? 'text-primary' : 'text-text-secondary'
              }`}
            >
              <item.icon size={22} strokeWidth={activeTab === item.label ? 2.5 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {(item as any).displayLabel ?? item.label}
              </span>
              {activeTab === item.label && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <AIChatAssistant />
      </main>
    </div>
  );
}
