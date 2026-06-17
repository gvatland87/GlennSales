/**
 * GlennSales — localStorage-basert datalager (demo)
 *
 * Mønster: seed fra mock-data ved første besøk, les/skriv fra localStorage.
 * Globalt window-event 'gs-store-update' dispatches ved alle skriveoperasjoner
 * slik at komponenter kan abonnere og re-rendre uten prop-drilling eller Context.
 */

import type {
  Company,
  User,
  Meeting,
  Interest,
  InterestStatus,
  Notification,
} from './types';
import {
  COMPANIES,
  USERS,
  INITIAL_MEETINGS,
  INITIAL_INTERESTS,
  INITIAL_NOTIFICATIONS,
} from './mock-data';

/** Øk denne når datamodellen endres — tvinger automatisk reset av demo-data */
const SCHEMA_VERSION = '2';

const KEYS = {
  currentUserId:  'gs_current_user',
  companies:      'gs_companies',
  users:          'gs_users',
  meetings:       'gs_meetings',
  interests:      'gs_interests',
  notifications:  'gs_notifications',
  schemaVersion:  'gs_schema_version',
} as const;

export const GS_UPDATE_EVENT = 'gs-store-update';

// ── Hjelpere ──────────────────────────────────────────────

function getAll<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[];
  } catch {
    return [];
  }
}

function setAll<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function seed<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

export function dispatchUpdate(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(GS_UPDATE_EVENT));
  }
}

// ── Init (idempotent) ─────────────────────────────────────

export function initStore(): void {
  if (typeof window === 'undefined') return;

  // Tving reset av demo-data når datamodellen er endret
  if (localStorage.getItem(KEYS.schemaVersion) !== SCHEMA_VERSION) {
    const keysToRemove = [
      KEYS.companies, KEYS.users, KEYS.meetings,
      KEYS.interests, KEYS.notifications, KEYS.currentUserId,
    ] as string[];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(KEYS.schemaVersion, SCHEMA_VERSION);
  }

  seed(KEYS.companies, COMPANIES);
  seed(KEYS.users, USERS);
  seed(KEYS.meetings, INITIAL_MEETINGS);
  seed(KEYS.interests, INITIAL_INTERESTS);
  seed(KEYS.notifications, INITIAL_NOTIFICATIONS);
  if (!localStorage.getItem(KEYS.currentUserId)) {
    localStorage.setItem(KEYS.currentUserId, 'u-glenn');
  }
}

// Kjør gsReset() i DevTools-konsollen for å nullstille demo-data
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).gsReset = () => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    location.reload();
  };
}

// ── Innlogget bruker ──────────────────────────────────────

export function getCurrentUserId(): string {
  if (typeof window === 'undefined') return 'u-glenn';
  return localStorage.getItem(KEYS.currentUserId) ?? 'u-glenn';
}

export function setCurrentUserId(id: string): void {
  localStorage.setItem(KEYS.currentUserId, id);
  dispatchUpdate();
}

// ── Selskaper ─────────────────────────────────────────────

export function getCompanies(): Company[] {
  return getAll<Company>(KEYS.companies);
}

export function getCompany(id: string): Company | undefined {
  return getCompanies().find((c) => c.id === id);
}

// ── Brukere ───────────────────────────────────────────────

export function getUsers(): User[] {
  return getAll<User>(KEYS.users);
}

export function getUser(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}

// ── Møter ─────────────────────────────────────────────────

export function getMeetings(): Meeting[] {
  return getAll<Meeting>(KEYS.meetings)
    .filter((m) => m.status === 'active')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function addMeeting(meeting: Meeting): void {
  const all = getAll<Meeting>(KEYS.meetings);
  setAll(KEYS.meetings, [...all, meeting]);
  dispatchUpdate();
}

// ── Interessemeldinger ────────────────────────────────────

/**
 * Returnerer pending + approved interesser for et møte.
 * Brukes til: antall-badge i MeetingCard og interesseliste i Mine møter.
 */
export function getActiveInterests(meetingId: string): Interest[] {
  return getAll<Interest>(KEYS.interests).filter(
    (i) =>
      i.meetingId === meetingId &&
      (i.status === 'pending' || i.status === 'approved')
  );
}

/**
 * Returnerer brukerens siste gjeldende interesse for et møte.
 * Inkluderer rejected (så bruker ser «Avslått»), ekskluderer withdrawn.
 */
export function getUserInterest(
  meetingId: string,
  userId: string
): Interest | undefined {
  const matches = getAll<Interest>(KEYS.interests).filter(
    (i) =>
      i.meetingId === meetingId &&
      i.userId === userId &&
      i.status !== 'withdrawn'
  );
  return matches.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function registerInterest(
  meetingId: string,
  userId: string,
  ownerUserId: string
): void {
  const interest: Interest = {
    id:         `i-${Date.now()}`,
    meetingId,
    userId,
    createdAt:  new Date().toISOString(),
    status:     'pending',
    reviewedAt: null,
  };
  const allInterests = getAll<Interest>(KEYS.interests);
  setAll(KEYS.interests, [...allInterests, interest]);

  // Varsel til møteeier
  const notification: Notification = {
    id:              `n-${Date.now()}`,
    recipientUserId: ownerUserId,
    fromUserId:      userId,
    meetingId,
    type:            'new_interest',
    readAt:          null,
    createdAt:       new Date().toISOString(),
  };
  const allNotifs = getAll<Notification>(KEYS.notifications);
  setAll(KEYS.notifications, [...allNotifs, notification]);

  dispatchUpdate();
}

export function withdrawInterest(meetingId: string, userId: string): void {
  const all = getAll<Interest>(KEYS.interests);
  const updated = all.map((i) =>
    i.meetingId === meetingId &&
    i.userId === userId &&
    (i.status === 'pending' || i.status === 'approved')
      ? { ...i, status: 'withdrawn' as InterestStatus, reviewedAt: new Date().toISOString() }
      : i
  );
  setAll(KEYS.interests, updated);
  dispatchUpdate();
}

/** Eier godkjenner en interessemelding → interessent får varsel + kan legge til kalender */
export function approveInterest(interestId: string, ownerUserId: string): void {
  const all      = getAll<Interest>(KEYS.interests);
  const interest = all.find((i) => i.id === interestId);
  if (!interest) return;

  setAll(
    KEYS.interests,
    all.map((i) =>
      i.id === interestId
        ? { ...i, status: 'approved' as InterestStatus, reviewedAt: new Date().toISOString() }
        : i
    )
  );

  // Varsel til interessenten: godkjent!
  const notification: Notification = {
    id:              `n-${Date.now()}`,
    recipientUserId: interest.userId,
    fromUserId:      ownerUserId,
    meetingId:       interest.meetingId,
    type:            'interest_approved',
    readAt:          null,
    createdAt:       new Date().toISOString(),
  };
  const allNotifs = getAll<Notification>(KEYS.notifications);
  setAll(KEYS.notifications, [...allNotifs, notification]);

  dispatchUpdate();
}

/** Eier avslår en interessemelding → interessent får varsel */
export function rejectInterest(interestId: string, ownerUserId: string): void {
  const all      = getAll<Interest>(KEYS.interests);
  const interest = all.find((i) => i.id === interestId);
  if (!interest) return;

  setAll(
    KEYS.interests,
    all.map((i) =>
      i.id === interestId
        ? { ...i, status: 'rejected' as InterestStatus, reviewedAt: new Date().toISOString() }
        : i
    )
  );

  // Varsel til interessenten: avslått
  const notification: Notification = {
    id:              `n-${Date.now() + 1}`,
    recipientUserId: interest.userId,
    fromUserId:      ownerUserId,
    meetingId:       interest.meetingId,
    type:            'interest_rejected',
    readAt:          null,
    createdAt:       new Date().toISOString(),
  };
  const allNotifs = getAll<Notification>(KEYS.notifications);
  setAll(KEYS.notifications, [...allNotifs, notification]);

  dispatchUpdate();
}

// ── Varsler ───────────────────────────────────────────────

export function getNotificationsForUser(userId: string): Notification[] {
  return getAll<Notification>(KEYS.notifications)
    .filter((n) => n.recipientUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getUnreadCount(userId: string): number {
  return getAll<Notification>(KEYS.notifications).filter(
    (n) => n.recipientUserId === userId && n.readAt === null
  ).length;
}

export function markAllRead(userId: string): void {
  const all = getAll<Notification>(KEYS.notifications);
  const updated = all.map((n) =>
    n.recipientUserId === userId && n.readAt === null
      ? { ...n, readAt: new Date().toISOString() }
      : n
  );
  setAll(KEYS.notifications, updated);
  dispatchUpdate();
}
