/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Volunteer, Goal, Resource, Team, ActivityEvent, Contribution, Committee, PersonalLink, EventAnnouncement, UpcomingMoment, AppNotification, IncentiveTier, ScheduleEvent, Attendance, SocialCalendarEntry } from './types';

export const CURRENT_USER_ID = 'u-1';

// v2.1.4: 6-tier ladder from 2025 "Yellow Jacket Incentives" PDF.
// Thresholds and reward content sourced directly from /Incentives_for_Yellow_Jackets_-_2025.pdf.
// Tier names use the new college-football progression confirmed by product.
// Tier 1 (Walk-On) has split thresholds: Actives 17.5k pts / $10k raised; Futures 15k / $7.5k.
export const INCENTIVE_TIERS: IncentiveTier[] = [
  {
    id: 'walk-on', name: 'Walk-On',
    threshold: 17500, thresholdFuture: 15000,
    minFundraising: 10000, minFundraisingFuture: 7500,
    pctOfProgram: 0.28, color: '#8B7355',
    reward: {
      tickets: ['2 Vrbo Fiesta Bowl tickets w/ 2 Club \'71 tickets', '2 Rate Bowl tickets'],
      swag: ['Fiesta Bowl exclusive game helmet stickers'],
      experiences: [],
      donations: [],
    },
  },
  {
    id: 'starter', name: 'Starter',
    threshold: 30000,
    pctOfProgram: 0.18, color: '#6B9080',
    reward: {
      tickets: ['2 Vrbo Fiesta Bowl tickets w/ 2 Club \'71 tickets', '2 Rate Bowl tickets'],
      swag: ['Fiesta Bowl exclusive game helmet stickers'],
      experiences: [],
      donations: [],
      chooseOne: [
        '2 additional Vrbo Fiesta Bowl tickets w/ 2 Club \'71 + 2 additional Rate Bowl tickets',
        'Commemorative Vrbo Fiesta Bowl game ball',
        'Rate Bowl "On Field Experience" for you and up to 3 guests',
      ],
    },
  },
  {
    id: 'captain', name: 'Captain',
    threshold: 50000,
    pctOfProgram: 0.10, color: '#FEC52E',
    reward: {
      tickets: ['2 Vrbo Fiesta Bowl tickets w/ 2 Club \'71 tickets', '2 Rate Bowl suite tickets'],
      swag: ['Fiesta Bowl exclusive game helmet stickers'],
      experiences: [],
      donations: [],
      chooseOne: [
        '2 add\'l Vrbo Fiesta Bowl tickets w/ 2 Club \'71 + commemorative game ball',
        '4 add\'l Vrbo Fiesta Bowl tickets w/ 4 Club \'71 + 4 add\'l Rate Bowl tickets',
        '2 add\'l Vrbo Fiesta Bowl tickets w/ 2 Club \'71 + Rate Bowl "On Field Experience" for you and up to 3 guests',
        'Festivus Trip for one (Hotel, Airfare, Tailgate, Game Ticket)',
      ],
    },
  },
  {
    id: 'all-conference', name: 'All-Conference',
    threshold: 75000,
    pctOfProgram: 0.05, color: '#4A6FA5',
    reward: {
      tickets: ['2 Vrbo Fiesta Bowl premium tickets w/ 2 Club \'71 tickets', '4 Rate Bowl suite tickets'],
      swag: ['Fiesta Bowl exclusive game helmet stickers', 'Commemorative Vrbo Fiesta Bowl game ball'],
      experiences: ['Rate Bowl "On Field Experience" for up to 4 guests'],
      donations: [],
      chooseOne: [
        '4 Vrbo Fiesta Bowl tickets w/ 4 Club \'71 + 4 Rate Bowl tickets in 200-level seats',
        'Festivus Trip for one (Hotel, Airfare, Tailgate, Game Ticket)',
      ],
    },
  },
  {
    id: 'all-american', name: 'All-American',
    threshold: 100000,
    pctOfProgram: 0.025, color: '#C5283D',
    reward: {
      tickets: ['4 Vrbo Fiesta Bowl premium tickets w/ 4 Club \'71 tickets', '4 Rate Bowl tickets in 200-level seats'],
      swag: ['Fiesta Bowl exclusive game helmet stickers', 'Commemorative Vrbo Fiesta Bowl game ball'],
      experiences: ['Vrbo Fiesta Bowl & Rate Bowl "On Field Experience" for up to 6 guests'],
      donations: [],
      chooseOne: [
        '4 Vrbo Fiesta Bowl premium tickets w/ 4 Club \'71 + 4 Rate Bowl tickets in 200-level seats',
        'Festivus Trip for 2 (Hotel, Airfare, Tailgate, Game Ticket)',
      ],
    },
  },
  {
    id: 'heisman', name: 'Heisman',
    threshold: 200000,
    pctOfProgram: 0.005, color: '#5A189A',
    reward: {
      tickets: ['6 Vrbo Fiesta Bowl premium tickets w/ 6 Club \'71 tickets', '6 Rate Bowl tickets in 200-level seats'],
      swag: ['Fiesta Bowl exclusive game helmet stickers', 'Commemorative Vrbo Fiesta Bowl game ball'],
      experiences: [
        'Vrbo Fiesta Bowl & Rate Bowl "On Field Experience" for up to 6 guests',
        'VIP experience: Uber Black XL to and from the Vrbo Fiesta Bowl game',
      ],
      donations: [],
      chooseOne: [
        '4 Vrbo Fiesta Bowl premium tickets w/ 4 Club \'71 + 4 Rate Bowl tickets in 200-level seats',
        'Festivus Trip for 2 (Hotel, Airfare, Tailgate, Game Ticket)',
      ],
    },
  },
];

// Helpers to look up tier info by points or by index
export function tierForPoints(points: number): IncentiveTier {
  let result = INCENTIVE_TIERS[0];
  for (const t of INCENTIVE_TIERS) {
    if (points >= t.threshold) result = t;
  }
  return result;
}

export function pctAtOrAboveTier(tierIndex: number): number {
  return INCENTIVE_TIERS.slice(tierIndex).reduce((sum, t) => sum + (t.pctOfProgram ?? 0), 0);
}

export const PERSONAL_LINKS: PersonalLink[] = [
  { event: 'Rate Bowl', url: 'seatgeek.com/ratebowl/yj-kirk-h-2026' },
  { event: 'Fiesta Bowl', url: 'seatgeek.com/fiestabowl/yj-kirk-h-2026' },
];

export const COMMITTEES: Committee[] = [
  {
    id: 'c-1',
    name: 'Football Kickoff Committee',
    event: 'Football Kickoff',
    role: 'Associate Chair',
    chairName: 'Bryce Hancock',
    chairContact: 'bryce.h@fiestasports.org',
    nextMeeting: {
      title: 'Football Kickoff Committee bi-weekly',
      date: 'May 22, 2026',
      time: '10:00 a.m.',
      location: 'Foundation Boardroom / Zoom',
      link: 'https://zoom.us/j/123456789'
    }
  },
  {
    id: 'c-2',
    name: 'Par 3 Challenge Planning',
    event: 'Par 3 Challenge',
    role: 'General Volunteer',
    chairName: 'Sarah Miller',
    chairContact: 'sarah.m@fiestasports.org',
  }
];

export const ANNOUNCEMENTS: EventAnnouncement[] = [
  {
    id: 'ann-1',
    eventId: 'Football Kickoff',
    title: 'Table Renewal Push',
    content: 'We are 3 weeks out from the renewal deadline. Please follow up with your 2025 table buyers this week!',
    date: '2026-05-14',
    author: 'Bryce Hancock'
  },
  {
    id: 'ann-2',
    eventId: 'Football Kickoff',
    title: 'Speaker Confirmation',
    content: 'Mike Gundy and Jack Swarbrick are officially locked in. Templates have been updated with their bios.',
    date: '2026-05-10',
    author: 'Bryce Hancock'
  }
];

// v2: extended with role, signals, momentum, sprint metrics
export const VOLUNTEERS: Volunteer[] = [
  {
    id: 'u-1',
    name: 'Kirk Harbaugh',
    initials: 'KH',
    email: 'k.o.harbaugh@gmail.com',
    phone: '+15550123',
    raised: 11450,
    goal: 10000,
    rank: 47,
    team: 'Red Foxes',
    teamId: 't-1',
    // v2.1.4: 13.1k pts < 17.5k Walk-On (Active) threshold — no tier yet
    tierId: null,
    role: 'sales_captain',
    volunteerCategory: 'Active',
    signals: { rising: false, coasting: false, atRisk: false, signalReason: null },
    momentum: { activeSprintsLast4: 3, lastActionAt: '2026-05-17', nextMilestoneActions: 1, sprintParticipationRate: 0.75 },
    thresholds: { totalFundraising: true, rateBowl: false, wishesForTeachers: false, totalPoints: false },
    metrics: {
      totalFundraising: 11450, rateBowl: 1200, wishesForTeachers: 450, totalPoints: 13100,
      currentSprint: { sharesThisSprint: 8, fundraisingThisSprint: 3400, pointsThisSprint: 3400 },
    },
    fundraisingPercentile: 0.58,
    activityPercentile: 0.62,
  },
  {
    id: 'u-2',
    name: 'Elena Rodriguez',
    initials: 'ER',
    email: 'elena@nest.org',
    phone: '+15550124',
    raised: 12450,
    goal: 10000,
    rank: 1,
    team: 'Blue Jays',
    teamId: 't-2',
    tierId: 'starter',  // v2.1.4: 38.5k pts >= 30k Starter
    role: 'admin',
    volunteerCategory: 'Active',
    signals: { rising: true, coasting: false, atRisk: false, signalReason: 'Climbed to Gold tier this week' },
    momentum: { activeSprintsLast4: 4, lastActionAt: '2026-05-18', nextMilestoneActions: 0, sprintParticipationRate: 1.0 },
    thresholds: { totalFundraising: true, rateBowl: true, wishesForTeachers: true, totalPoints: true },
    metrics: {
      totalFundraising: 12450, rateBowl: 2500, wishesForTeachers: 1200, totalPoints: 18500,
      currentSprint: { sharesThisSprint: 24, fundraisingThisSprint: 6800, pointsThisSprint: 6800, rank: 1 },
    },
    fundraisingPercentile: 0.98,
    activityPercentile: 0.97,
  },
  {
    id: 'u-3',
    name: 'Sarah Miller',
    initials: 'SM',
    email: 'sarah@nest.org',
    phone: '+15550125',
    raised: 8200,
    goal: 10000,
    rank: 82,
    team: 'Red Foxes',
    teamId: 't-1',
    // v2.1.4: Active, 10.6k pts < 17.5k Walk-On threshold — no tier yet
    tierId: null,
    role: 'volunteer',
    volunteerCategory: 'Active',
    signals: { rising: false, coasting: true, atRisk: false, signalReason: 'No shares in 11 days, runway to Good Standing' },
    momentum: { activeSprintsLast4: 1, lastActionAt: '2026-05-07', nextMilestoneActions: 1, sprintParticipationRate: 0.25 },
    thresholds: { totalFundraising: false, rateBowl: true, wishesForTeachers: false, totalPoints: false },
    metrics: {
      totalFundraising: 8200, rateBowl: 2100, wishesForTeachers: 300, totalPoints: 10600,
      currentSprint: { sharesThisSprint: 0, fundraisingThisSprint: 0, pointsThisSprint: 0 },
    },
    fundraisingPercentile: 0.42,
    activityPercentile: 0.12,
  },
  {
    id: 'u-4',
    name: 'Michael Chen',
    initials: 'MC',
    email: 'michael@nest.org',
    phone: '+15550126',
    raised: 15400,
    goal: 10000,
    rank: 12,
    team: 'Red Foxes',
    teamId: 't-1',
    tierId: 'walk-on',  // v2.1.4: Future, 16.8k pts >= 15k + $15.4k raised >= $7.5k
    role: 'volunteer',
    volunteerCategory: 'Future',
    signals: { rising: true, coasting: false, atRisk: false, signalReason: 'Hit personal-best week' },
    momentum: { activeSprintsLast4: 4, lastActionAt: '2026-05-18', nextMilestoneActions: 1, sprintParticipationRate: 1.0 },
    thresholds: { totalFundraising: true, rateBowl: true, wishesForTeachers: true, totalPoints: false },
    metrics: {
      totalFundraising: 15400, rateBowl: 3200, wishesForTeachers: 1500, totalPoints: 16800,
      currentSprint: { sharesThisSprint: 18, fundraisingThisSprint: 4200, pointsThisSprint: 4200 },
    },
    fundraisingPercentile: 0.91,
    activityPercentile: 0.88,
  },
  // v2 demo volunteers for captain triage display (Kirk's team — Red Foxes)
  {
    id: 'u-5',
    name: 'Jamie Park',
    initials: 'JP',
    email: 'jamie@nest.org',
    phone: '+15550127',
    raised: 1200, goal: 10000, rank: 104,
    team: 'Red Foxes', teamId: 't-1',
    tierId: null, role: 'volunteer', volunteerCategory: 'Future',
    signals: { rising: false, coasting: false, atRisk: true, signalReason: 'No activity in 23 days, bottom 15% in $ and shares' },
    momentum: { activeSprintsLast4: 0, lastActionAt: '2026-04-26', nextMilestoneActions: 1, sprintParticipationRate: 0 },
    thresholds: { totalFundraising: false, rateBowl: false, wishesForTeachers: false, totalPoints: false },
    metrics: {
      totalFundraising: 1200, rateBowl: 0, wishesForTeachers: 0, totalPoints: 1200,
      currentSprint: { sharesThisSprint: 0, fundraisingThisSprint: 0, pointsThisSprint: 0 },
    },
    fundraisingPercentile: 0.08, activityPercentile: 0.05,
  },
  {
    id: 'u-6',
    name: 'Devon Liu',
    initials: 'DL',
    email: 'devon@nest.org',
    phone: '+15550128',
    raised: 2800, goal: 10000, rank: 96,
    team: 'Red Foxes', teamId: 't-1',
    tierId: null, role: 'volunteer', volunteerCategory: 'Future',
    signals: { rising: false, coasting: false, atRisk: true, signalReason: 'Missed last 2 meetings, zero shares this sprint' },
    momentum: { activeSprintsLast4: 0, lastActionAt: '2026-04-30', nextMilestoneActions: 1, sprintParticipationRate: 0 },
    thresholds: { totalFundraising: false, rateBowl: false, wishesForTeachers: false, totalPoints: false },
    metrics: {
      totalFundraising: 2800, rateBowl: 0, wishesForTeachers: 0, totalPoints: 2800,
      currentSprint: { sharesThisSprint: 0, fundraisingThisSprint: 0, pointsThisSprint: 0 },
    },
    fundraisingPercentile: 0.14, activityPercentile: 0.09,
  },
  {
    id: 'u-7',
    name: 'Riley Bennett',
    initials: 'RB',
    email: 'riley@nest.org',
    phone: '+15550129',
    raised: 6400, goal: 10000, rank: 71,
    team: 'Red Foxes', teamId: 't-1',
    tierId: null, role: 'volunteer', volunteerCategory: 'Active',
    signals: { rising: false, coasting: true, atRisk: false, signalReason: '14 days quiet, runway exists' },
    momentum: { activeSprintsLast4: 2, lastActionAt: '2026-05-04', nextMilestoneActions: 1, sprintParticipationRate: 0.5 },
    thresholds: { totalFundraising: false, rateBowl: true, wishesForTeachers: false, totalPoints: false },
    metrics: {
      totalFundraising: 6400, rateBowl: 2000, wishesForTeachers: 200, totalPoints: 8000,
      currentSprint: { sharesThisSprint: 1, fundraisingThisSprint: 200, pointsThisSprint: 200 },
    },
    fundraisingPercentile: 0.33, activityPercentile: 0.18,
  },
  {
    id: 'u-8',
    name: 'Casey Nguyen',
    initials: 'CN',
    email: 'casey@nest.org',
    phone: '+15550130',
    raised: 9100, goal: 10000, rank: 38,
    team: 'Red Foxes', teamId: 't-1',
    tierId: null, role: 'volunteer', volunteerCategory: 'Future',
    signals: { rising: true, coasting: false, atRisk: false, signalReason: 'First donor of the push closed yesterday' },
    momentum: { activeSprintsLast4: 3, lastActionAt: '2026-05-18', nextMilestoneActions: 1, sprintParticipationRate: 0.75 },
    thresholds: { totalFundraising: false, rateBowl: true, wishesForTeachers: true, totalPoints: false },
    metrics: {
      totalFundraising: 9100, rateBowl: 2400, wishesForTeachers: 1100, totalPoints: 11200,
      currentSprint: { sharesThisSprint: 6, fundraisingThisSprint: 2400, pointsThisSprint: 2400 },
    },
    fundraisingPercentile: 0.66, activityPercentile: 0.55,
  },
];

// v2: 12 teams to match the actual program structure
export const TEAMS: Team[] = [
  { id: 't-1',  name: 'Red Foxes',           raised: 42102, goal: 50000, rank: 1,  volunteerCount: 10, totalPoints: 45000, rateBowl: 12000, wishesForTeachers: 8000 },
  { id: 't-2',  name: 'Blue Jays',           raised: 38500, goal: 50000, rank: 2,  volunteerCount: 10, totalPoints: 42000, rateBowl: 10000, wishesForTeachers: 7000 },
  { id: 't-3',  name: 'Peter the Anteaters', raised: 36200, goal: 50000, rank: 3,  volunteerCount: 9,  totalPoints: 39800, rateBowl: 9200,  wishesForTeachers: 6400 },
  { id: 't-4',  name: 'Pistol Petes',        raised: 33850, goal: 50000, rank: 4,  volunteerCount: 9,  totalPoints: 37100, rateBowl: 8600,  wishesForTeachers: 5900 },
  { id: 't-5',  name: 'Fightin\' Artichokes', raised: 30400, goal: 45000, rank: 5,  volunteerCount: 9,  totalPoints: 33200, rateBowl: 7400,  wishesForTeachers: 5200 },
  { id: 't-6',  name: 'Gorlocks',            raised: 27800, goal: 45000, rank: 6,  volunteerCount: 9,  totalPoints: 30500, rateBowl: 6800,  wishesForTeachers: 4400 },
  { id: 't-7',  name: 'Banana Slugs',        raised: 24600, goal: 45000, rank: 7,  volunteerCount: 9,  totalPoints: 27000, rateBowl: 5900,  wishesForTeachers: 3800 },
  { id: 't-8',  name: 'Boll Weevils',        raised: 21100, goal: 40000, rank: 8,  volunteerCount: 9,  totalPoints: 23200, rateBowl: 4800,  wishesForTeachers: 3100 },
  { id: 't-9',  name: 'Demon Deacons',       raised: 18400, goal: 40000, rank: 9,  volunteerCount: 9,  totalPoints: 20200, rateBowl: 3900,  wishesForTeachers: 2400 },
  { id: 't-10', name: 'Stanford Trees',      raised: 16800, goal: 40000, rank: 10, volunteerCount: 9,  totalPoints: 18500, rateBowl: 3400,  wishesForTeachers: 2000 },
  { id: 't-11', name: 'Green Grove',         raised: 15200, goal: 35000, rank: 11, volunteerCount: 9,  totalPoints: 16700, rateBowl: 2900,  wishesForTeachers: 1700 },
  { id: 't-12', name: 'Hokies',              raised: 13400, goal: 35000, rank: 12, volunteerCount: 8,  totalPoints: 14700, rateBowl: 2400,  wishesForTeachers: 1400 },
];

// Total program size — used by UI rather than VOLUNTEERS.length (which is the demo subset)
export const PROGRAM_SIZE = 112;

export const SCHEDULE_EVENTS: ScheduleEvent[] = [
  {
    id: 's-1',
    name: 'PuttShack or Bowling Night',
    type: 'Meetup',
    date: 'July 2026',
    location: 'Location TBD',
    cost: 'Out of pocket',
    description: 'Informal social gathering for Yellow Jackets.'
  },
  {
    id: 's-2',
    name: 'Dbacks Game',
    type: 'Meetup',
    date: 'August 6, 2026',
    time: '6:40 p.m.',
    location: 'Chase Field',
    cost: 'Out of pocket',
    description: 'Group outing to watch the Dbacks vs. San Diego. Suite options TBD.'
  },
  {
    id: 's-3',
    name: 'YJ Classic @ Grass Clippings & Wishes for Teachers Concert',
    type: 'Formal Event',
    date: 'September 12, 2026',
    time: '2:00 p.m.',
    location: 'Grass Clippings at Rolling Hills',
    cost: 'Partially covered',
    description: 'Afternoon shotgun start, dinner and concert in the evening. Capped at 108 golfers.',
    hasFundraisingOpportunity: true,
    opportunityDetail: 'Concert tickets sold to others count toward fundraising. Sponsorship opportunity available.',
    capacity: 108,
    toolkitLink: 'Football Kickoff'
  },
  {
    id: 's-4',
    name: 'ASU Sun Devil Tailgate & Game',
    type: 'Formal Event',
    date: 'October 3, 2026',
    location: 'Mountain Island, Tempe',
    cost: 'Out of pocket',
    description: 'Joint tailgate with ASU Sun Devil Club before the game vs. Baylor.',
    hasFundraisingOpportunity: true,
    opportunityDetail: 'Tickets sold to others may count toward fundraising.'
  },
  {
     id: 's-10',
     name: 'Football Kickoff Committee Meeting',
     type: 'Committee Meeting',
     date: 'May 22, 2026',
     time: '10:00 a.m.',
     location: 'Foundation Boardroom / Zoom',
     description: 'Regular planning sync for the kickoff event.'
  },
  {
    id: 'v-1',
    name: 'Fiesta Bowl Flag Football Classic presented by Oakley',
    type: 'Volunteering',
    roleNeeded: 'Down Marker',
    date: 'April 18–19',
    location: 'ASU Tempe — Fields at Dorsey',
    description: 'Be part of history at the inaugural Fiesta Bowl Flag Football Classic. Sign up to set the tone as a Down Marker for this historic women\'s flag football event.',
    signUpUrl: 'https://fiestabowl.formstack.com/forms/volunteer'
  }
];

export const UPCOMING_MOMENTS: UpcomingMoment[] = [
  { id: 'm-1', date: 'June 12, 2026', label: 'Renewal deadline', type: 'deadline', eventId: 'Football Kickoff' },
  { id: 'm-2', date: 'June 20, 2026 at 5:00 p.m.', label: 'Par 3 committee meeting', type: 'meeting', eventId: 'Par 3 Challenge' },
  { id: 'm-3', date: 'July 21, 2026', label: 'Football Kickoff push starts', type: 'push', eventId: 'Football Kickoff' },
  { id: 'm-4', date: 'August 21, 2026', label: 'Football Kickoff event', type: 'event', eventId: 'Football Kickoff' },
];

export const NOTIFICATIONS_QUEUE: AppNotification[] = [
  {
    id: 'n-3',
    userId: 'u-1',
    title: 'Your Nest recap, Kirk.',
    body: 'Last week: 14 shares. Football Kickoff push starts this week. Tap to see more.',
    type: 'digest',
    ctaLabel: 'View Recap',
    ctaAction: 'digest'
  },
  {
    id: 'n-1',
    userId: 'u-1',
    title: 'Kirk,',
    body: 'Our next Football Kickoff Committee meeting is 6/20/2026 at The Hotel at 5:00 p.m.',
    type: 'meeting',
    ctaLabel: 'RSVP Here',
    ctaAction: 'events',
    eventId: 'Football Kickoff'
  },
  {
    id: 'n-2',
    userId: 'u-1',
    title: 'Kirk,',
    body: 'The Football Kickoff renewal deadline is 6/12/2026. Confirm with your prospects.',
    type: 'deadline',
    ctaLabel: 'View Details',
    ctaAction: 'toolkit',
    eventId: 'Football Kickoff'
  }
];

export const GOALS: Goal[] = [
  {
    id: 'org-2026-goal',
    title: '2026 Progress',
    current: 1142500,
    target: 5000000,
    type: 'organization',
    description: 'Target date: Dec 5, 2026',
  },
];

export const RESOURCES: Resource[] = [
  // FOOTBALL KICKOFF
  {
    id: 'res-fk-sms-vip',
    title: 'FK VIP Table (SMS)',
    type: 'sms',
    category: 'Templates',
    event: 'Football Kickoff',
    stage: 'Ask',
    tier: 'VIP Table',
    description: 'VIP Table pitch via SMS.',
    content: "Hey [first name], the UMB Bank Fiesta Sports Foundation Football Kickoff is Aug 21 at Fairmont Scottsdale Princess. VIP Table of 10 is $9,250, includes a Meet and Greet with Coach Gundy and Jack Swarbrick for 4 of your guests. Tables go fast. Interested?",
  },
  {
    id: 'res-fk-sms-t2',
    title: 'FK Tier 2 Table (SMS)',
    type: 'sms',
    category: 'Templates',
    event: 'Football Kickoff',
    stage: 'Ask',
    tier: 'Tier 2',
    description: 'Tier 2 table pitch.',
    content: "Hey [first name], I'm helping with the UMB Bank Fiesta Sports Foundation Football Kickoff on Aug 21 at Fairmont Scottsdale Princess. Coach Mike Gundy and Jack Swarbrick are headlining. A Tier 2 table is $3,400 for 10, mid-room with strong sightlines. Want me to lock one in?",
    isFeatured: true,
    isNew: true,
  },
  {
    id: 'res-fk-email-sponsor',
    title: 'FK Event Sponsorship (Email)',
    type: 'email',
    category: 'Templates',
    event: 'Football Kickoff',
    stage: 'Ask',
    tier: 'Sponsorship',
    subject: 'Front-row at the Football Kickoff, Aug 21',
    description: 'High-level sponsorship email.',
    content: 'Dear [first name], I am reaching out regarding a unique opportunity at the upcoming UMB Bank Fiesta Sports Foundation Football Kickoff on Aug 21. We have an Event Sponsorship tier at $15,000 which includes a VIP table front of stage and full sponsor benefits...',
  },
  {
    id: 'res-fk-email-followup',
    title: 'FK Tier 3 Follow-up (Email)',
    type: 'email',
    category: 'Templates',
    event: 'Football Kickoff',
    stage: 'Reminder',
    tier: 'Tier 3',
    subject: 'Following up on the Football Kickoff',
    description: 'Tier 3 renewal/follow-up email.',
    content: 'Hi [first name], just following up on our conversation about the Football Kickoff on Aug 21. A Tier 3 table is $3,150. Please let me know if you want to lock this in before the renewal deadline of June 12...',
  },
  {
    id: 'res-fk-story',
    title: 'Kickoff Story',
    type: 'social',
    category: 'Assets',
    event: 'Football Kickoff',
    stage: 'Awareness',
    description: 'Instagram/Facebook Story Asset.',
    content: 'https://drive.google.com/uc?export=view&id=1xtAvKxt6DEkHy5ZOAG_-5IvjEV75KFHj',
    dimension: 'Story',
    placements: ['Instagram Story', 'Facebook Story'],
  },
  {
    id: 'res-fk-feed',
    title: 'Kickoff Feed Asset',
    type: 'social',
    category: 'Assets',
    event: 'Football Kickoff',
    stage: 'Awareness',
    description: 'Social Feed Asset.',
    content: 'https://drive.google.com/uc?export=view&id=14dDh7igiBZ7AU_4ogQ64iIjf9BBVdNUJ',
    dimension: 'Feed Portrait',
    placements: ['Instagram Feed', 'Facebook Feed', 'LinkedIn Feed'],
  },
  {
    id: 'res-fk-link',
    title: 'Kickoff Link Preview',
    type: 'social',
    category: 'Assets',
    event: 'Football Kickoff',
    stage: 'Awareness',
    description: 'Marketing asset.',
    content: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=800&h=420',
    dimension: 'Link Preview',
    placements: ['Facebook Link Preview', 'LinkedIn Link Preview'],
  },

  // PAR 3 CHALLENGE
  {
    id: 'res-p3-sms',
    title: 'Par 3 Invitation (SMS)',
    type: 'sms',
    category: 'Templates',
    event: 'Par 3 Challenge',
    stage: 'Ask',
    description: 'Invite people to the Par 3 Challenge.',
    content: "Hi [first name], I'd love for you to join us at the Fiesta Sports Foundation Par 3 Challenge, Oct 21-23. It's 18 holes of closest-to-the-pin prizes! Interested?",
  },
  {
    id: 'res-p3-story',
    title: 'Par 3 Story Asset',
    type: 'social',
    category: 'Assets',
    event: 'Par 3 Challenge',
    stage: 'Awareness',
    description: 'Social Story Asset.',
    content: 'https://www.dropbox.com/scl/fi/8ie26i2iv3bgrcmwbbuuh/Par-3-1080x1920_P3C.jpg?rlkey=7b5khr6wwb76w4j6uufgf0t2v&raw=1',
    dimension: 'Story',
    placements: ['Instagram Story', 'Facebook Story'],
    isFeatured: true,
  },
  {
    id: 'res-p3-feed',
    title: 'Par 3 Feed Asset',
    type: 'social',
    category: 'Assets',
    event: 'Par 3 Challenge',
    stage: 'Awareness',
    description: 'Social Feed Asset.',
    content: 'https://www.dropbox.com/scl/fi/mnkszc2hsrzmqasoeftbd/Par-3-1200x1500_P3C.jpg?rlkey=ph1jcl3d8h6i4ezlts75qtlnt&raw=1',
    dimension: 'Feed Portrait',
    placements: ['Instagram Feed', 'Facebook Feed', 'LinkedIn Feed'],
  },

  // WISHES FOR TEACHERS
  {
    id: 'res-wft-sms',
    title: 'Wishes Support (SMS)',
    type: 'sms',
    category: 'Templates',
    event: 'Wishes for Teachers',
    stage: 'Ask',
    description: 'Ask for donations to support AZ teachers.',
    content: "Hi [first name], I'm raising funds for Wishes for Teachers. We grant $5,000 to Arizona teachers for classroom projects. Would you consider a donation?",
  },
  {
    id: 'res-wft-email',
    title: 'Wishes Appeal (Email)',
    type: 'email',
    category: 'Templates',
    event: 'Wishes for Teachers',
    stage: 'Ask',
    subject: 'Help us grant wishes for Arizona teachers',
    description: 'Detailed appeal for teachers.',
    content: "Hi [first name], did you know that Arizona teachers spent an average of $600 of their own money on classroom supplies last year? Wishes for Teachers is changing that...",
  },

  // RATE BOWL
  {
    id: 'res-rb-sms',
    title: 'Rate Bowl Ask (SMS)',
    type: 'sms',
    category: 'Templates',
    event: 'Rate Bowl',
    stage: 'Ask',
    description: 'Rate Bowl fundraising push.',
    content: "Hey [first name], I'm working toward my Rate Bowl goal. Any support you can provide goes directly to local youth sports!",
  },

  // FIESTA BOWL
  {
    id: 'res-fb-sms',
    title: 'Fiesta Bowl Tickets (SMS)',
    type: 'sms',
    category: 'Templates',
    event: 'Fiesta Bowl',
    stage: 'Ask',
    description: 'Sell Fiesta Bowl tickets.',
    content: "Fiesta Bowl tickets are live! Help me reach my goal and enjoy the game. Here is my link: [Personal Link]",
  },

  // EVERGREEN
  {
    id: 'res-eg-sms-thanks',
    title: 'Thank You (SMS)',
    type: 'sms',
    category: 'Templates',
    event: 'Evergreen',
    stage: 'Thank You',
    description: 'Simple thank you message.',
    content: 'Thank you so much [first name]! Your support for the Yellow Jackets and the Nest campaign makes a huge difference.',
  },

  // DOCUMENTS
  {
    id: 'doc-timeline',
    title: 'Campaign Overview and Timeline',
    type: 'document',
    category: 'Guides',
    description: 'Fast Start to Annual Goal milestones.',
    content: 'The 2026 Nest Campaign follows a strict milestone path. Kickoff: May 1. Fast Start deadline: August 21 ($1.5M goal). Mid-season Review: October 15. Annual Goal deadline ($5M total): December 5. All contributions are inclusive of the Fast Start total.',
    updatedAt: '2026-04-15',
  },
  {
    id: 'doc-fk-details',
    title: 'Football Kickoff Details',
    type: 'document',
    category: 'Event details',
    event: 'Football Kickoff',
    description: 'Full reference for the kickoff event.',
    content: 'Full name: UMB Bank Fiesta Sports Foundation Football Kickoff presented by Fairmont Scottsdale Princess. Date: Friday, August 21, 2026. Venue: Fairmont Scottsdale Princess, 7575 E Princess Dr, Scottsdale. Tables of 10: Tier 1 $3,650 (premier front), Tier 2 $3,400 (mid-room), Tier 3 $3,150 (standard). VIP Table of 10: $9,250, includes Meet and Greet for 4 with the speakers, premium ballroom location, complimentary valet, 3 drink tickets per guest. Event Sponsorship: $15,000, VIP table front of stage, full sponsor benefits across the program (contact Bryce Hancock for sponsorships). Featured speakers: Mike Gundy (170-90 record across 20 seasons, 2x Fiesta Bowl winner) and Jack Swarbrick (former Athletic Director, Notre Dame). Day-of schedule: VIP session 11:00 a.m. (photo ops, meet and greets), doors 11:30 a.m. (pregame networking), main program, Yellow Jacket Overtime happy hour post-event. Benefits: Wishes for Teachers program. Renewal: existing tables get a reduced price if purchased by June 12, 2026; non-renewed tables released June 13 to waitlist. This event sells out annually. Contact: 480.350.0911, tickets@fiestasports.org.',
    updatedAt: '2026-05-10',
  },
  {
    id: 'doc-p3-details',
    title: 'Par 3 Challenge Details',
    type: 'document',
    category: 'Event details',
    event: 'Par 3 Challenge',
    description: 'Full reference for the Par 3 Challenge.',
    content: 'Full name: Fiesta Sports Foundation Par 3 Challenge presented by Chapman Automotive. Dates: October 21 to 23, 2026. Venue: Short Course at Mountain Shadows, Paradise Valley, AZ. Format: 18 chances to win across 18 holes, closest-to-the-pin prizes on every hole, hole-in-one opportunities for cash prizes, luxury trips, or a brand-new car. Three-day experience with gourmet hospitality and breathtaking views. Supports statewide impact of the Fiesta Sports Foundation. Contact: 480.350.0911.',
    updatedAt: '2026-05-10',
  },
  {
    id: 'doc-points',
    title: 'Points System Explainer',
    type: 'document',
    category: 'Campaign info',
    description: 'How to reach the $17,500 total points threshold.',
    content: 'Every dollar matters. Currently, $1 raised or $1 spent on a Fiesta Bowl ticket equals 1 point. That means dollar and point values will match for most rows today, but multipliers may be added later. Total Fundraising counts donations only ($10,000 goal). Total Points counts everything including tickets ($17,500 goal).',
    updatedAt: '2026-05-10',
  },
  {
    id: 'doc-wft-details',
    title: 'Wishes for Teachers Details',
    type: 'document',
    category: 'Event details',
    event: 'Wishes for Teachers',
    description: 'Grant program details.',
    content: 'Coming soon. Foundation materials arriving shortly.',
    updatedAt: '2026-05-10',
  },
  {
    id: 'doc-rb-details',
    title: 'Rate Bowl Details',
    type: 'document',
    category: 'Event details',
    event: 'Rate Bowl',
    description: 'Game day and fundraising info.',
    content: 'Coming soon. Foundation materials arriving shortly.',
    updatedAt: '2026-05-10',
  },
  {
    id: 'doc-fb-details',
    title: 'Fiesta Bowl Details',
    type: 'document',
    category: 'Event details',
    event: 'Fiesta Bowl',
    description: 'Annual game details.',
    content: 'Coming soon. Foundation materials arriving shortly.',
    updatedAt: '2026-05-10',
  },
];

export const ACTIVITIES: ActivityEvent[] = [
  { id: 'a-1', userId: 'u-2', userName: 'Elena Rodriguez', action: 'shared the Football Kickoff template to Instagram Story', timestamp: '4 min ago', type: 'share' },
  { id: 'a-2', userId: 't-1', userName: 'Red Foxes', action: 'hit 100 templates shared today', timestamp: '1 hour ago', type: 'milestone' },
  { id: 'a-3', userId: 'u-1', userName: 'Kirk Harbaugh', action: 'shared the Par 3 Story via SMS', timestamp: '2 hours ago', type: 'share' },
];

export const CONTRIBUTIONS: Contribution[] = [
  { id: 'c-1', donorName: 'John Smith', type: 'Rate Bowl donation', amount: 500, points: 500, date: '2026-05-12', status: 'Posted' },
  { id: 'c-2', donorName: 'Sarah Wilson', type: 'Wishes for Teachers donation', amount: 250, points: 250, date: '2026-05-11', status: 'Posted' },
  { id: 'c-3', donorName: 'Michael Chen', type: 'Fiesta Bowl ticket purchase', amount: 1200, points: 1200, date: '2026-05-10', status: 'Posted' },
  { id: 'c-4', donorName: 'Emily Davis', type: 'Rate Bowl donation', amount: 100, points: 100, date: '2026-05-14', status: 'Pending' },
  { id: 'c-5', donorName: 'Robert Brown', type: 'Other donation', amount: 50, points: 50, date: '2026-05-09', status: 'Posted' },
  { id: 'c-6', donorName: 'John Smith', type: 'Fiesta Bowl ticket purchase', amount: 1200, points: 1200, date: '2026-04-20', status: 'Posted' },
];

export const ATTENDANCES: Attendance[] = [
  { id: 'att-1', eventName: 'Selection Sunday Event', points: 50, date: '2026-05-01', status: 'Posted' },
  { id: 'att-2', eventName: 'Yellow Jacket Networking', points: 25, date: '2026-05-15', status: 'Pending' },
];

export const SOCIAL_CALENDAR: SocialCalendarEntry[] = [
  {
    id: 'cal-1',
    weekStart: '2026-07-06',
    event: 'Football Kickoff',
    title: 'Awareness Push',
    assetId: 'res-fk-story',
    assetThumbnail: 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&q=80&w=200',
    context: 'Lead with the August 21 date. Warm up your network before the ask.',
    audience: 'Social Post'
  },
  {
    id: 'cal-2',
    weekStart: '2026-07-20',
    event: 'Football Kickoff',
    title: 'Table Availability Push',
    assetId: 'res-fk-sms-t2',
    assetThumbnail: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=200',
    context: 'Tables are moving. Send directly to your best 3 to 5 business prospects.',
    audience: 'Business Contact'
  }
];

// ============================================================
// v2 — Pushes, recognition, nudges
// ============================================================

import type { Push, RecognitionCategory, NudgeTemplate, VolunteerRole } from './types';

export const PUSHES: Push[] = [
  {
    id: 'push-fk-2026',
    label: 'Football Kickoff Sprint',
    eventType: 'Football Kickoff',
    startsAt: '2026-05-12',
    endsAt: '2026-05-26',
    targetAmount: 250000,
    targetShares: 2000,
    currentShares: 1284,
    active: true,
  },
];

export const ACTIVE_PUSH = PUSHES.find(p => p.active);

export const RECOGNITION_CATEGORIES: RecognitionCategory[] = [
  { id: 'most_improved',   label: 'Most Improved',   description: 'Largest week-over-week activity jump' },
  { id: 'first_share',     label: 'First Share',     description: 'First share of the active push' },
  { id: 'reactivated',     label: 'Reactivated',     description: 'Returned after 14+ days quiet' },
  { id: 'committee_mvp',   label: 'Committee MVP',   description: 'Top contributor on a committee this sprint' },
  { id: 'rookie_momentum', label: 'Rookie Momentum', description: 'First-year Future with rising signal' },
  { id: 'three_donors',    label: '3 Donors Closed', description: 'Three confirmed donor contributions this sprint' },
];

export const NUDGE_TEMPLATES: NudgeTemplate[] = [
  // AT-RISK — soft check-in, no data references
  {
    id: 'nt-at-1',
    signalType: 'at_risk',
    label: 'Gentle check-in',
    bodyTemplate: "Hey {firstName} — been a minute. Anything I can help with on your Yellow Jacket stuff? Coffee on me if it'd help.",
    active: true, sortOrder: 1,
  },
  {
    id: 'nt-at-2',
    signalType: 'at_risk',
    label: 'Re-onramp',
    bodyTemplate: "Hi {firstName}, just thinking about you. {sprintName} wraps in {daysLeft} days — even one share would put you back in the mix. Want me to send you the template?",
    active: true, sortOrder: 2,
  },
  // COASTING — sprint-relevant prompt
  {
    id: 'nt-co-1',
    signalType: 'coasting',
    label: 'Sprint nudge',
    bodyTemplate: "Hey {firstName} — {sprintName} push is live for {daysLeft} more days. Got 2 mins to send your link to one person who bought last year?",
    active: true, sortOrder: 1,
  },
  {
    id: 'nt-co-2',
    signalType: 'coasting',
    label: 'Quick ask',
    bodyTemplate: "Hi {firstName}, one share would put our team one closer to passing the next team in the {sprintName}. You in?",
    active: true, sortOrder: 2,
  },
  // RISING — recognition + leverage
  {
    id: 'nt-ri-1',
    signalType: 'rising',
    label: 'Congrats + ask',
    bodyTemplate: "{firstName}! Saw your {sprintName} numbers — you're on a roll. One more share this week and you'd hit your personal best.",
    active: true, sortOrder: 1,
  },
  {
    id: 'nt-ri-2',
    signalType: 'rising',
    label: 'Pure congrats',
    bodyTemplate: "Just had to say — proud of the work you're putting in on {sprintName}. Keep going.",
    active: true, sortOrder: 2,
  },
];

// Demo: current user's role. In production this comes from the Volunteer record.
export const CURRENT_USER_ROLE: VolunteerRole = 'sales_captain';

// ============================================================
// v2.1 — Levels (gamification ladder) + leaderboard mock data
// ============================================================

// v2.1.2: LEVELS array removed. INCENTIVE_TIERS (above) is now the unified
// gamification + reward ladder. Use `tierForPoints()` and `pctAtOrAboveTier()`
// helpers defined alongside INCENTIVE_TIERS.

/**
 * Mock per-volunteer level + composite + rank deltas + sprint/all-time data.
 * Engine ships these; UI just reads.
 *
 * Composite formula (deferred to engine):
 *   compositePoints = totalPoints + (sprintParticipationRate * 1500) + (recognitionCount * 500)
 */
/**
 * v2.1.4: levelId aligned to REAL 2025 thresholds.
 *   0 = below Walk-On (working toward it)
 *   1 = Walk-On (17,500 pts + $10k Active / 15k pts + $7.5k Future)
 *   2 = Starter (30,000 pts)
 *   3 = Captain (50,000 pts)
 *   4 = All-Conference (75,000 pts)
 *   5 = All-American (100,000 pts)
 *   6 = Heisman (200,000 pts)
 *
 * Most demo volunteers are pre-Tier-1, which is realistic — Tier 1 is itself an achievement.
 */
export const STANDINGS_BY_USER: Record<string, {
  levelId: number;
  compositePoints: number;
  rankDelta7d: number;
  sprintRank: number;
  weekPoints: number;
}> = {
  'u-1': { levelId: 0, compositePoints: 13100, rankDelta7d: +3,  sprintRank: 28,  weekPoints: 640 },  // Kirk (Active) — below Walk-On (need 17.5k pts)
  'u-2': { levelId: 2, compositePoints: 38500, rankDelta7d: 0,   sprintRank: 1,   weekPoints: 1100 }, // Elena (Active) — Starter (>30k)
  'u-3': { levelId: 0, compositePoints: 10600, rankDelta7d: -8,  sprintRank: 89,  weekPoints: 60 },   // Sarah (Active) — below Walk-On
  'u-4': { levelId: 1, compositePoints: 16800, rankDelta7d: +12, sprintRank: 9,   weekPoints: 1450 }, // Michael (Future) — Walk-On (16.8k >= 15k Future)
  'u-5': { levelId: 0, compositePoints: 1200,  rankDelta7d: -2,  sprintRank: 110, weekPoints: 0 },    // Jamie (Future) — below
  'u-6': { levelId: 0, compositePoints: 2800,  rankDelta7d: -1,  sprintRank: 98,  weekPoints: 0 },    // Devon (Future) — below
  'u-7': { levelId: 0, compositePoints: 8000,  rankDelta7d: +1,  sprintRank: 72,  weekPoints: 180 },  // Riley (Active) — below
  'u-8': { levelId: 0, compositePoints: 11200, rankDelta7d: +15, sprintRank: 18,  weekPoints: 1620 }, // Casey (Future) — below Walk-On (need 15k Future)
};

/**
 * Mock additional "synthetic" Yellow Jackets for leaderboard rendering.
 * In production, these are real volunteers; for the prototype they fill out
 * the top-10 lists across the 3 windows with plausible activity.
 */
export interface MockStandingsEntry {
  id: string;
  name: string;
  initials: string;
  team: string;
  weekPoints: number;     // last 7 days only
  sprintPoints: number;   // current push window
  seasonPoints: number;   // 2026-27 to date
  rankDelta7d: number;
  levelId: number;
}

/**
 * v2.1.4: levelId aligned to REAL 2025 thresholds.
 *   0 = pre-tier  1 = Walk-On (17.5k Active / 15k Future)  2 = Starter (30k)
 *   3 = Captain (50k)  4 = All-Conf (75k)  5 = All-Amer (100k)  6 = Heisman (200k)
 *
 * The top-of-season cohort lands in Starter (T2) range. Everyone else is in Walk-On (T1)
 * or pre-tier. Heisman is genuinely rare and unrepresented in this demo slice.
 */
export const MOCK_LEADERBOARD: MockStandingsEntry[] = [
  // Top performers — at Starter (T2) since they're past 30k pts
  { id: 'm-1',  name: 'Elena Rodriguez',  initials: 'ER', team: 'Blue Jays',           weekPoints: 1100, sprintPoints: 6800, seasonPoints: 38500, rankDelta7d: 0,   levelId: 2 },
  { id: 'm-2',  name: 'James Watanabe',   initials: 'JW', team: 'Peter the Anteaters', weekPoints: 800,  sprintPoints: 5400, seasonPoints: 34200, rankDelta7d: 0,   levelId: 2 },
  { id: 'm-3',  name: 'Priya Shah',       initials: 'PS', team: 'Pistol Petes',        weekPoints: 700,  sprintPoints: 4900, seasonPoints: 31800, rankDelta7d: +1,  levelId: 2 },
  // Walk-On (T1) — past 17.5k pts (assumed Active w/ $10k+ raised)
  { id: 'm-4',  name: 'Marcus Hill',      initials: 'MH', team: 'Red Foxes',           weekPoints: 540,  sprintPoints: 4200, seasonPoints: 28600, rankDelta7d: -1,  levelId: 1 },
  { id: 'm-5',  name: 'Anna Cho',         initials: 'AC', team: 'Gorlocks',            weekPoints: 620,  sprintPoints: 3800, seasonPoints: 26400, rankDelta7d: +2,  levelId: 1 },
  { id: 'm-10', name: 'Hannah O\'Brien',  initials: 'HO', team: 'Banana Slugs',        weekPoints: 720,  sprintPoints: 3100, seasonPoints: 22400, rankDelta7d: +4,  levelId: 1 },
  // Michael is a Future at 16.8k → just over Future Walk-On threshold (15k)
  { id: 'u-4',  name: 'Michael Chen',     initials: 'MC', team: 'Red Foxes',           weekPoints: 1450, sprintPoints: 4200, seasonPoints: 16800, rankDelta7d: +12, levelId: 1 },
  // Pre-tier — the middle that the dashboard is engineered to move
  { id: 'u-8',  name: 'Casey Nguyen',     initials: 'CN', team: 'Red Foxes',           weekPoints: 1620, sprintPoints: 2400, seasonPoints: 11200, rankDelta7d: +15, levelId: 0 },
  { id: 'm-8',  name: 'Tara Boudreaux',   initials: 'TB', team: 'Fightin\' Artichokes', weekPoints: 980,  sprintPoints: 2800, seasonPoints: 12400, rankDelta7d: +9,  levelId: 0 },
  { id: 'm-9',  name: 'Derek Pham',       initials: 'DP', team: 'Demon Deacons',       weekPoints: 870,  sprintPoints: 2200, seasonPoints: 10800, rankDelta7d: +7,  levelId: 0 },
  { id: 'u-1',  name: 'Kirk Harbaugh',    initials: 'KH', team: 'Red Foxes',           weekPoints: 640,  sprintPoints: 3400, seasonPoints: 13100, rankDelta7d: +3,  levelId: 0 },
];
