/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IncentiveTier {
  id: string;
  name: string;
  threshold: number;
  reward: string;
  color: string; // hex color for the badge
}

export interface Volunteer {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  raised: number;
  goal: number;
  rank: number;
  team: string;
  teamId: string;
  tierId?: string;
  thresholds: {
    totalFundraising: boolean;
    rateBowl: boolean;
    wishesForTeachers: boolean;
    totalPoints: boolean;
  };
  metrics: {
    totalFundraising: number;
    rateBowl: number;
    wishesForTeachers: number;
    totalPoints: number;
  };
}

export interface Team {
  id: string;
  name: string;
  raised: number;
  goal: number;
  rank: number;
  volunteerCount: number;
  totalPoints: number;
  rateBowl: number;
  wishesForTeachers: number;
}

export interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  type: 'organization' | 'team' | 'individual';
  description?: string;
  reward?: string;
}

export type TabType = 'Home' | 'Team' | 'Events' | 'Schedule' | 'Toolkit' | 'Help';

export interface ScheduleEvent {
  id: string;
  name: string;
  type: 'Meetup' | 'Formal Event' | 'Committee Meeting' | 'Volunteering';
  date: string;
  time?: string;
  location: string;
  cost?: 'Out of pocket' | 'Comped' | 'Partially covered';
  description: string;
  roleNeeded?: string; // For volunteering
  signUpUrl?: string; // For volunteering
  hasFundraisingOpportunity?: boolean;
  opportunityDetail?: string;
  rsvpCount?: number;
  capacity?: number;
  contact?: string;
  toolkitLink?: string;
  isPast?: boolean;
}
export type ToolkitEventType = 'Football Kickoff' | 'Par 3 Challenge' | 'Wishes for Teachers' | 'Rate Bowl' | 'Fiesta Bowl' | 'Parade' | 'Evergreen';
export type ToolkitStageType = 'Awareness' | 'Ask' | 'Reminder' | 'Thank You' | 'Recap';
export type ToolkitTierType = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'VIP Table' | 'Sponsorship';

export interface UpcomingMoment {
  id: string;
  date: string;
  label: string;
  type: 'deadline' | 'push' | 'event' | 'meeting';
  eventId?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'meeting' | 'rsvp' | 'milestone' | 'deadline' | 'new_content' | 'digest';
  ctaLabel?: string;
  ctaAction?: string;
  eventId?: string;
}

export interface Committee {
  id: string;
  name: string;
  event: ToolkitEventType;
  role: 'Chair' | 'Associate Chair' | 'General Volunteer';
  chairName: string;
  chairContact: string; // phone or email
  nextMeeting?: {
    title: string;
    date: string;
    time: string;
    location?: string;
    link?: string;
  };
}

export interface PersonalLink {
  event: 'Rate Bowl' | 'Fiesta Bowl';
  url: string;
}

export interface EventAnnouncement {
  id: string;
  eventId: string;
  title: string;
  content: string;
  date: string;
  author: string;
}

export interface Resource {
  id: string;
  title: string;
  type: 'sms' | 'email' | 'social' | 'document' | 'faq' | 'script';
  category: string;
  description: string;
  content: string;
  event?: ToolkitEventType;
  stage?: ToolkitStageType;
  tier?: ToolkitTierType;
  isNew?: boolean;
  isTimeSensitive?: boolean;
  statusTag?: string; // "Day of", "Last call", etc.
  subject?: string; // for email
  dimension?: string; 
  placements?: string[]; 
  updatedAt?: string;
  isFeatured?: boolean;
}

export interface ActivityEvent {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  type: 'share' | 'milestone' | 'achievement';
  teamId?: string;
  templateId?: string;
  channel?: 'SMS' | 'Email' | 'Social';
  dimension?: string;
}

export interface Attendance {
  id: string;
  eventName: string;
  points: number;
  date: string;
  status: 'Posted' | 'Pending';
}

export interface Contribution {
  id: string;
  donorName: string;
  type: string; // Dynamic based on event/ticket
  amount: number;
  points: number;
  date: string;
  status: 'Posted' | 'Pending';
  isRecurring?: boolean;
}

export interface SocialCalendarEntry {
  id: string;
  weekStart: string;
  event: ToolkitEventType | 'Evergreen';
  title: string;
  assetId: string;
  assetThumbnail: string;
  context: string;
  audience: 'Business Contact' | 'Personal Contact' | 'Social Post';
  isPast?: boolean;
}

export interface Issue {
  id: string;
  userId: string;
  category: 'Bug Report' | 'Question' | 'Feedback';
  description: string;
  screenshotUrl?: string;
  timestamp: string;
}
