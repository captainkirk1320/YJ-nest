/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================
// v2 — Personas, sprints, signals, momentum
// See CHANGELOG.md for the full delta vs v1
// ============================================================

export type VolunteerRole = 'volunteer' | 'captain' | 'admin';

export type SignalKind = 'rising' | 'coasting' | 'at_risk' | 'good_standing' | 'milestone';

export interface VolunteerSignals {
  rising: boolean;
  coasting: boolean;
  atRisk: boolean;
  signalReason?: string;
}

export interface VolunteerMomentum {
  activeSprintsLast4: number;
  lastActionAt: string;
  nextMilestoneActions: number;
  sprintParticipationRate: number;
}

export interface SprintMetrics {
  sharesThisSprint: number;
  fundraisingThisSprint: number;
  pointsThisSprint: number;
  rank?: number;
}

// v2.1.4: IncentiveTier matches the 2025 "Yellow Jacket Incentives" PDF.
// Strictly a points threshold (with optional Future-role override and $ gate)
// plus the structured reward.
export interface TierReward {
  tickets: string[];       // ticket allocations
  swag: string[];          // physical goods (helmet stickers, game balls, polos)
  experiences: string[];   // on-field, VIP, etc.
  donations: string[];     // donation-based unlocks (typically empty for 2025; reserved)
  chooseOne?: string[];    // "Select one" upgrade options
}

export interface IncentiveTier {
  id: string;
  name: string;
  threshold: number;              // points required (Active default)
  thresholdFuture?: number;       // alternate Future-role threshold (Tier 1 only in 2025)
  minFundraising?: number;        // $ gate for this tier (Active)
  minFundraisingFuture?: number;  // $ gate for Futures
  reward: TierReward;
  color: string;
  pctOfProgram?: number;          // observed scarcity, used in UI
}

export type VolunteerCategory = 'Active' | 'Future' | 'Life Member' | 'Life Director';

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
  role: VolunteerRole;
  volunteerCategory?: VolunteerCategory;  // v2.1.4 — drives Tier 1 threshold (Actives need 17.5k pts / $10k; Futures 15k / $7.5k)
  signals: VolunteerSignals;
  momentum: VolunteerMomentum;
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
    currentSprint?: SprintMetrics;
  };
  fundraisingPercentile?: number;
  activityPercentile?: number;
  // v2.1: Standings / levels
  levelId?: number;                   // 1..9, per LEVELS
  compositePoints?: number;           // composite score driving level + ranking
  rankDelta7d?: number;               // +N = climbed N spots in last 7 days, -N = dropped
  sprintRank?: number;                // rank within active sprint only
  weekPoints?: number;                // last 7 days only
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
  currentSprintShares?: number;
  currentSprintRank?: number;
  goodStandingCount?: number;
  signalCounts?: {
    rising: number;
    coasting: number;
    atRisk: number;
  };
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

export type TabType =
  | 'Home'
  | 'Team'
  | 'Events'
  | 'Schedule'
  | 'Toolkit'
  | 'Help'
  | 'MyTeam'
  | 'Admin';

export interface ScheduleEvent {
  id: string;
  name: string;
  type: 'Meetup' | 'Formal Event' | 'Committee Meeting' | 'Volunteering';
  date: string;
  time?: string;
  location: string;
  cost?: 'Out of pocket' | 'Comped' | 'Partially covered';
  description: string;
  roleNeeded?: string;
  signUpUrl?: string;
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
  chairContact: string;
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
  statusTag?: string;
  subject?: string;
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
  pushId?: string;
  recognitionCategory?: RecognitionCategoryId;
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
  type: string;
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

// ============================================================
// v2 NEW — sprints, nudges, recognition
// ============================================================

export interface Push {
  id: string;
  label: string;
  eventType: ToolkitEventType;
  startsAt: string;
  endsAt: string;
  targetAmount?: number;
  targetShares?: number;
  currentShares?: number;
  active: boolean;
}

export type RecognitionCategoryId =
  | 'most_improved'
  | 'first_share'
  | 'reactivated'
  | 'committee_mvp'
  | 'rookie_momentum'
  | 'three_donors';

export interface RecognitionCategory {
  id: RecognitionCategoryId;
  label: string;
  description: string;
}

export type NudgeSignalType = 'at_risk' | 'coasting' | 'rising' | 'milestone';

export interface NudgeTemplate {
  id: string;
  signalType: NudgeSignalType;
  label: string;
  bodyTemplate: string;
  active: boolean;
  sortOrder: number;
}

// v2.1.2: Level interface dropped. IncentiveTier IS the level ladder.
