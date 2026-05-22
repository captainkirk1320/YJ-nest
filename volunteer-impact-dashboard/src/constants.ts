/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Volunteer, Goal, Resource, Team, ActivityEvent, Contribution, Committee, PersonalLink, EventAnnouncement, UpcomingMoment, AppNotification, IncentiveTier, ScheduleEvent, Attendance, SocialCalendarEntry } from './types';

export const CURRENT_USER_ID = 'u-1';

export const INCENTIVE_TIERS: IncentiveTier[] = [
  { id: 'bronze', name: 'Bronze', threshold: 2500, reward: 'Bronze Shield Reward', color: '#CD7F32' },
  { id: 'silver', name: 'Silver', threshold: 5000, reward: 'Silver Medal Reward', color: '#C0C0C0' },
  { id: 'gold', name: 'Gold', threshold: 10000, reward: 'Fiesta Bowl Polo', color: '#FEC52E' },
  { id: 'platinum', name: 'Platinum', threshold: 20000, reward: 'VIP Game Tickets', color: '#E5E4E2' },
  { id: 'diamond', name: 'Diamond', threshold: 35000, reward: 'Field Passes', color: '#B9F2FF' },
];

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

// Added more teammates for the Team tab demo
export const VOLUNTEERS: Volunteer[] = [
  {
    id: 'u-1',
    name: 'Kirk Harbaugh',
    initials: 'KH',
    email: 'k.o.harbaugh@gmail.com',
    phone: '555-0123',
    raised: 11450,
    goal: 10000,
    rank: 47,
    team: 'Red Foxes',
    teamId: 't-1',
    tierId: 'gold',
    thresholds: {
      totalFundraising: true,
      rateBowl: false,
      wishesForTeachers: false,
      totalPoints: false,
    },
    metrics: {
      totalFundraising: 11450,
      rateBowl: 1200,
      wishesForTeachers: 450,
      totalPoints: 13100,
    },
  },
  {
    id: 'u-2',
    name: 'Elena Rodriguez',
    initials: 'ER',
    email: 'elena@nest.org',
    phone: '555-0124',
    raised: 12450,
    goal: 10000,
    rank: 1,
    team: 'Blue Jays',
    teamId: 't-2',
    tierId: 'gold',
    thresholds: {
      totalFundraising: true,
      rateBowl: true,
      wishesForTeachers: true,
      totalPoints: true,
    },
    metrics: {
      totalFundraising: 12450,
      rateBowl: 2500,
      wishesForTeachers: 1200,
      totalPoints: 18500,
    },
  },
  {
    id: 'u-3',
    name: 'Sarah Miller',
    initials: 'SM',
    email: 'sarah@nest.org',
    phone: '555-0125',
    raised: 8200,
    goal: 10000,
    rank: 82,
    team: 'Red Foxes',
    teamId: 't-1',
    thresholds: {
      totalFundraising: false,
      rateBowl: true,
      wishesForTeachers: false,
      totalPoints: false,
    },
    metrics: {
      totalFundraising: 8200,
      rateBowl: 2100,
      wishesForTeachers: 300,
      totalPoints: 10600,
    },
  },
  {
    id: 'u-4',
    name: 'Michael Chen',
    initials: 'MC',
    email: 'michael@nest.org',
    phone: '555-0126',
    raised: 15400,
    goal: 10000,
    rank: 12,
    team: 'Red Foxes',
    teamId: 't-1',
    thresholds: {
      totalFundraising: true,
      rateBowl: true,
      wishesForTeachers: true,
      totalPoints: false,
    },
    metrics: {
      totalFundraising: 15400,
      rateBowl: 3200,
      wishesForTeachers: 1500,
      totalPoints: 16800,
    },
  }
];

export const TEAMS: Team[] = [
  { id: 't-1', name: 'Red Foxes', raised: 42102, goal: 50000, rank: 1, volunteerCount: 12, totalPoints: 45000, rateBowl: 12000, wishesForTeachers: 8000 },
  { id: 't-2', name: 'Blue Jays', raised: 38500, goal: 50000, rank: 2, volunteerCount: 10, totalPoints: 42000, rateBowl: 10000, wishesForTeachers: 7000 },
  { id: 't-3', name: 'Green Grove', raised: 15200, goal: 30000, rank: 3, volunteerCount: 8, totalPoints: 18000, rateBowl: 2000, wishesForTeachers: 1500 },
];

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
