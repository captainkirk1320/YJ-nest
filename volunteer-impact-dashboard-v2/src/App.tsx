/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Layout from './components/Layout';
import Login from './components/Login';
import HomeTab from './tabs/Home';
import CaptainHome from './tabs/CaptainHome';
import AdminDashboard from './tabs/AdminDashboard';
import TeamTab from './tabs/Team';
import ToolkitTab from './tabs/Toolkit';
import EventsTab from './tabs/Events';
import ScheduleTab from './tabs/Schedule';
import HelpTab from './tabs/Help';
import ActivityReport from './tabs/ActivityReport';
import { AppNotification, TabType } from './types';
import { NOTIFICATIONS_QUEUE, VOLUNTEERS, CURRENT_USER_ID } from './constants';

import WeeklyDigest from './tabs/WeeklyDigest';

export default function App() {
  const currentUser = VOLUNTEERS.find(v => v.id === CURRENT_USER_ID)!;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('Home');
  const [showActivityReport, setShowActivityReport] = useState<{ show: boolean, initialTab: 'Contributions' | 'Standings' }>({ show: false, initialTab: 'Contributions' });
  const [showDigest, setShowDigest] = useState(false);
  const [toolkitQuery, setToolkitQuery] = useState('');
  const [resourceEvent, setResourceEvent] = useState<string | undefined>(undefined);
  const [logoutMessage, setLogoutMessage] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState<AppNotification[]>([]);
  const [currentPopup, setCurrentPopup] = useState<AppNotification | null>(null);

  const [showA2HS, setShowA2HS] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('fb_session');
    localStorage.removeItem('fb_a2hs_dismissed');
    setIsLoggedIn(false);
    setLogoutMessage(true);
    setPendingNotifications([]);
    setCurrentPopup(null);
    setTimeout(() => setLogoutMessage(false), 3000);
  };

  const handleLogin = (phone: string) => {
    localStorage.setItem('fb_session', phone);
    setIsLoggedIn(true);
    // Queue up notifications
    setPendingNotifications([...NOTIFICATIONS_QUEUE].slice(0, 2));
    
    // Show A2HS prompt if not dismissed or on iOS (mocking condition)
    if (!localStorage.getItem('fb_a2hs_dismissed')) {
      setShowA2HS(true);
    }
  };

  useEffect(() => {
    if (isLoggedIn && !currentPopup && pendingNotifications.length > 0) {
      const next = pendingNotifications[0];
      setCurrentPopup(next);
      setPendingNotifications(prev => prev.slice(1));
    }
  }, [isLoggedIn, currentPopup, pendingNotifications]);

  const handleDismissPopup = () => {
    setCurrentPopup(null);
  };

  const handleCTAPopup = (action?: string, eventId?: string) => {
    if (action === 'events') {
      setActiveTab('Events');
      setResourceEvent(eventId);
    } else if (action === 'toolkit') {
      setActiveTab('Toolkit');
    } else if (action === 'digest') {
      setShowDigest(true);
    }
    setCurrentPopup(null);
  };

  // Check for persisted session
  useEffect(() => {
    const savedSession = localStorage.getItem('fb_session');
    if (savedSession) {
      setIsLoggedIn(true);
    }
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Home': return (
        <HomeTab
          onViewDonors={() => setShowActivityReport({ show: true, initialTab: 'Contributions' })}
          onTakeAction={() => setActiveTab('Toolkit')}
          onViewStandings={() => setShowActivityReport({ show: true, initialTab: 'Standings' })}
        />
      );
      case 'MyTeam':
        // v2: captain-only triage view
        if (currentUser.role !== 'sales_captain' && currentUser.role !== 'admin') {
          return <HomeTab onViewDonors={() => setShowActivityReport({ show: true, initialTab: 'Contributions' })} onTakeAction={() => setActiveTab('Toolkit')} />;
        }
        return <CaptainHome />;
      case 'Admin':
        // v2: admin-only oversight view
        if (currentUser.role !== 'admin') {
          return <HomeTab onViewDonors={() => setShowActivityReport({ show: true, initialTab: 'Contributions' })} onTakeAction={() => setActiveTab('Toolkit')} />;
        }
        return <AdminDashboard />;
      case 'Team': return <TeamTab />;
      case 'Toolkit': return (
        <ToolkitTab
          initialSearch={toolkitQuery}
          onClearSearch={() => setToolkitQuery('')}
          onNavigateToResources={(event) => {
            setResourceEvent(event);
            setActiveTab('Events');
          }}
        />
      );
      case 'Events': return (
        <EventsTab
          initialEvent={resourceEvent}
        />
      );
      case 'Schedule': return (
        <ScheduleTab
          onTakeAction={(eventId) => {
             setToolkitQuery(eventId || '');
             setActiveTab('Toolkit');
          }}
        />
      );
      case 'Help': return <HelpTab />;
      default: return (
        <HomeTab
          onViewDonors={() => setShowActivityReport({ show: true, initialTab: 'Contributions' })}
          onTakeAction={() => setActiveTab('Toolkit')}
        />
      );
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="relative">
        <AnimatePresence>
          {logoutMessage && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-8 left-1/2 -translate-x-1/2 bg-white border border-border px-8 py-4 rounded-2xl shadow-2xl z-[100] text-center"
            >
               <p className="font-display font-bold text-lg text-primary">See you in Nest.</p>
            </motion.div>
          )}
        </AnimatePresence>
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  if (showActivityReport.show) {
    return (
      <ActivityReport 
        initialTab={showActivityReport.initialTab}
        onBack={() => setShowActivityReport({ ...showActivityReport, show: false })} 
        onSendThankYou={(donorName) => {
          setToolkitQuery(`thank you ${donorName}`);
          setActiveTab('Toolkit');
          setShowActivityReport({ ...showActivityReport, show: false });
        }}
      />
    );
  }

  if (showDigest) {
    return (
      <WeeklyDigest 
        onBack={() => setShowDigest(false)}
        onTakeAction={() => {
          setActiveTab('Toolkit');
          setShowDigest(false);
        }}
      />
    );
  }

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        currentUser={currentUser}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setShowActivityReport({ ...showActivityReport, show: false });
          if (tab !== 'Events') setResourceEvent(undefined);
        }}
        onAvatarClick={() => setShowActivityReport({ show: true, initialTab: 'Contributions' })}
        onLogout={handleLogout}
      >
        {renderTabContent()}
      </Layout>

      {/* Add to Home Screen Prompt */}
      <AnimatePresence>
        {showA2HS && (
          <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
              onClick={() => {
                setShowA2HS(false);
                localStorage.setItem('fb_a2hs_dismissed', 'true');
              }}
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-6 text-center space-y-4"
            >
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <span className="text-white font-display font-bold text-2xl">N</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-display font-bold">Add Nest to Home Screen</h4>
                <p className="text-xs text-text-secondary font-medium">
                  Install Nest on your home screen for quick access and to receive push notifications.
                </p>
              </div>

              <div className="bg-surface p-4 rounded-2xl border border-border space-y-3 text-left">
                <p className="text-[10px] font-bold text-text-secondary uppercase">How to install on iOS:</p>
                <ol className="text-xs space-y-2 font-medium">
                  <li className="flex gap-2">
                    <span className="bg-primary/10 text-primary w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Tap the share icon <span className="inline-block px-1 bg-white border border-border rounded">⎙</span> in Safari</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-primary/10 text-primary w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Scroll down and tap "Add to Home Screen"</span>
                  </li>
                </ol>
              </div>
              
              <button 
                onClick={() => {
                  setShowA2HS(false);
                  localStorage.setItem('fb_a2hs_dismissed', 'true');
                }}
                className="btn-primary w-full py-4 text-sm"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* In-App Pop-ups */}
      <AnimatePresence>
        {currentPopup && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={handleDismissPopup}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h4 className="text-xl font-display font-bold text-text">{currentPopup.title}</h4>
                <p className="text-text-secondary font-medium leading-relaxed">
                  {currentPopup.body}
                </p>
              </div>
              
              <div className="flex flex-col gap-3 pt-2">
                {currentPopup.ctaLabel && (
                  <button 
                    onClick={() => handleCTAPopup(currentPopup.ctaAction, currentPopup.eventId)}
                    className="btn-primary w-full py-4"
                  >
                    {currentPopup.ctaLabel}
                  </button>
                )}
                <button 
                  onClick={handleDismissPopup}
                  className="text-sm font-bold text-text-secondary hover:text-text transition-colors py-2 uppercase tracking-widest"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
