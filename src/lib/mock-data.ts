import type { Company, User, Meeting, Interest, Notification } from './types';

export const COMPANIES: Company[] = [
  {
    id: 'c-bergen',
    name: 'GMC Bergen AS',
    shortName: 'GMC Bergen',
    color: 'bg-sky-100 text-sky-800',
  },
  {
    id: 'c-oslo',
    name: 'GMC Oslo AS',
    shortName: 'GMC Oslo',
    color: 'bg-violet-100 text-violet-800',
  },
  {
    id: 'c-stavanger',
    name: 'GMC Stavanger AS',
    shortName: 'GMC Stavanger',
    color: 'bg-emerald-100 text-emerald-800',
  },
];

export const USERS: User[] = [
  {
    id: 'u-kari',
    companyId: 'c-bergen',
    name: 'Kari Holm',
    email: 'k.holm@gmcbergen.no',
    role: 'rep',
  },
  {
    id: 'u-paal',
    companyId: 'c-bergen',
    name: 'Pål Svensson',
    email: 'p.svensson@gmcbergen.no',
    role: 'rep',
  },
  {
    id: 'u-lars',
    companyId: 'c-oslo',
    name: 'Lars Berg',
    email: 'l.berg@gmcoslo.no',
    role: 'rep',
  },
  {
    id: 'u-anne',
    companyId: 'c-oslo',
    name: 'Anne Moe',
    email: 'a.moe@gmcoslo.no',
    role: 'leder',
  },
  {
    id: 'u-glenn',
    companyId: 'c-stavanger',
    name: 'Glenn Vatland',
    email: 'glenn.vatland@gmc.no',
    role: 'leder',
  },
];

export const INITIAL_MEETINGS: Meeting[] = [
  {
    id: 'm-1',
    ownerUserId: 'u-kari',
    companyId: 'c-bergen',
    customerName: 'Wallenius Wilhelmsen',
    startsAt: '2026-06-25T10:00:00',
    location: 'Bergen',
    agenda: 'Presentasjon av havnetjenester og agentavtale for Vestlandet-ruten.',
    status: 'active',
  },
  {
    id: 'm-2',
    ownerUserId: 'u-lars',
    companyId: 'c-oslo',
    customerName: 'Stolt-Nielsen',
    startsAt: '2026-06-28T13:00:00',
    location: 'Oslo',
    agenda: 'Diskutere bunkringsavtale og logistikk for kjemikalietankere 2026/2027.',
    status: 'active',
  },
  {
    id: 'm-3',
    ownerUserId: 'u-glenn',
    companyId: 'c-stavanger',
    customerName: 'DOF ASA',
    startsAt: '2026-07-02T09:00:00',
    location: 'Stavanger',
    agenda: 'Strategimøte — offshore supply vessels, Nordsjøen Q3/Q4.',
    status: 'active',
  },
  {
    id: 'm-4',
    ownerUserId: 'u-paal',
    companyId: 'c-bergen',
    customerName: 'Odfjell SE',
    startsAt: '2026-07-10T11:00:00',
    location: 'Bergen',
    agenda: 'Kjemikalietankere — agentoppdrag Vestlandet, mulig rammeavtale.',
    status: 'active',
  },
  {
    id: 'm-5',
    ownerUserId: 'u-anne',
    companyId: 'c-oslo',
    customerName: 'Siem Industries',
    startsAt: '2026-07-15T14:00:00',
    location: 'Oslo',
    status: 'active',
  },
];

/**
 * Demo-scenario:
 *   i-1: Lars → Karis møte (Wallenius)     → PENDING   (Kari må godkjenne/avslå)
 *   i-2: Glenn → Lars sitt møte (Stolt)     → APPROVED  (Glenn ser «Legg til kalender»)
 *   i-3: Kari → Glenns møte (DOF)          → PENDING   (Glenn må godkjenne/avslå)
 */
export const INITIAL_INTERESTS: Interest[] = [
  {
    id: 'i-1',
    meetingId: 'm-1',
    userId: 'u-lars',
    createdAt: '2026-06-16T08:30:00',
    status: 'pending',
    reviewedAt: null,
  },
  {
    id: 'i-2',
    meetingId: 'm-2',
    userId: 'u-glenn',
    createdAt: '2026-06-16T09:00:00',
    status: 'approved',
    reviewedAt: '2026-06-16T10:30:00',
  },
  {
    id: 'i-3',
    meetingId: 'm-3',
    userId: 'u-kari',
    createdAt: '2026-06-16T09:15:00',
    status: 'pending',
    reviewedAt: null,
  },
];

/**
 * Varsler:
 *   n-1: Til Kari — Lars meldte interesse (ulest, venter godkjenning)
 *   n-2: Til Lars — Glenn meldte interesse (lest — Lars har allerede godkjent)
 *   n-3: Til Glenn — Kari meldte interesse (lest — Glenn ser det i Mine møter)
 *   n-4: Til Glenn — Lars godkjente Glenns interesse for Stolt-Nielsen (ULEST!)
 *        → Glenn logger inn og ser 🔴1 + «Legg til kalender» på Stolt-Nielsen
 */
export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-1',
    recipientUserId: 'u-kari',
    fromUserId: 'u-lars',
    meetingId: 'm-1',
    type: 'new_interest',
    readAt: null,
    createdAt: '2026-06-16T08:30:00',
  },
  {
    id: 'n-2',
    recipientUserId: 'u-lars',
    fromUserId: 'u-glenn',
    meetingId: 'm-2',
    type: 'new_interest',
    readAt: '2026-06-16T10:00:00',
    createdAt: '2026-06-16T09:00:00',
  },
  {
    id: 'n-3',
    recipientUserId: 'u-glenn',
    fromUserId: 'u-kari',
    meetingId: 'm-3',
    type: 'new_interest',
    readAt: '2026-06-16T10:00:00',
    createdAt: '2026-06-16T09:15:00',
  },
  {
    id: 'n-4',
    recipientUserId: 'u-glenn',
    fromUserId: 'u-lars',
    meetingId: 'm-2',
    type: 'interest_approved',
    readAt: null, // ULEST — Glenn ser dette ved innlogging
    createdAt: '2026-06-16T10:30:00',
  },
];
