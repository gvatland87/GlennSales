/**
 * GlennSales — Supabase-basert datalager
 *
 * Alle funksjoner er asynkrone og bruker Supabase-klienten.
 * Kalles fra Client Components via useEffect + useState.
 */

import { createClient } from './supabase/client';
import type {
  Company,
  Profile,
  Meeting,
  EnrichedMeeting,
  Interest,
  InterestStatus,
  EnrichedInterest,
  EnrichedNotification,
} from './types';

// ── Hjelpere ──────────────────────────────────────────────

function mapMeeting(row: Record<string, unknown>): EnrichedMeeting {
  const owner = row.owner as Record<string, unknown> | null;
  const ownerCompany = owner?.companies as Record<string, unknown> | null;
  return {
    id:                   row.id as string,
    ownerUserId:          row.owner_user_id as string,
    companyId:            row.company_id as string,
    customerName:         row.customer_name as string,
    startsAt:             row.starts_at as string,
    location:             row.location as string,
    agenda:               (row.agenda as string | null) ?? undefined,
    status:               row.status as Meeting['status'],
    ownerName:            (owner?.name as string) ?? '—',
    ownerCompanyShortName:(ownerCompany?.short_name as string) ?? '',
    ownerCompanyColor:    (ownerCompany?.color as string) ?? 'bg-gray-100 text-gray-600',
  };
}

function mapInterest(row: Record<string, unknown>): EnrichedInterest {
  const up = row.user_profile as Record<string, unknown> | null;
  const uc = up?.companies as Record<string, unknown> | null;
  return {
    id:                   row.id as string,
    meetingId:            row.meeting_id as string,
    userId:               row.user_id as string,
    createdAt:            row.created_at as string,
    status:               row.status as InterestStatus,
    reviewedAt:           (row.reviewed_at as string | null) ?? null,
    userName:             (up?.name as string) ?? '—',
    userEmail:            (up?.email as string) ?? '',
    userCompanyShortName: (uc?.short_name as string) ?? '',
    userCompanyColor:     (uc?.color as string) ?? 'bg-gray-100 text-gray-600',
  };
}

function mapNotification(row: Record<string, unknown>): EnrichedNotification {
  const fp = row.from_profile as Record<string, unknown> | null;
  const fc = fp?.companies as Record<string, unknown> | null;
  const mt = row.meeting as Record<string, unknown> | null;
  return {
    id:                       row.id as string,
    recipientUserId:          row.recipient_user_id as string,
    fromUserId:               (row.from_user_id as string) ?? '',
    meetingId:                (row.meeting_id as string) ?? '',
    type:                     row.type as EnrichedNotification['type'],
    readAt:                   (row.read_at as string | null) ?? null,
    createdAt:                row.created_at as string,
    fromUserName:             (fp?.name as string) ?? 'Noen',
    fromUserCompanyShortName: (fc?.short_name as string) ?? '',
    meetingCustomerName:      (mt?.customer_name as string) ?? 'et møte',
  };
}

// ── Innlogget bruker ──────────────────────────────────────

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('name, email, role, company_id, companies(id, name, short_name, color)')
    .eq('id', user.id)
    .single();

  if (!data) return null;

  // Supabase types nested joins as arrays without generated types; handle both cases.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyRaw = (data as any).companies;
  const c: Record<string, string> | null = Array.isArray(companyRaw)
    ? (companyRaw[0] ?? null)
    : (companyRaw ?? null);

  return {
    id:        user.id,
    email:     user.email ?? '',
    name:      data.name,
    role:      data.role as Profile['role'],
    companyId: data.company_id,
    company:   c ? { id: c.id, name: c.name, shortName: c.short_name, color: c.color } : null,
  };
}

export async function logout(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

// ── Selskaper ─────────────────────────────────────────────

export async function getCompanies(): Promise<Company[]> {
  const supabase = createClient();
  const { data } = await supabase.from('companies').select('*').order('name');
  return (data ?? []).map((row) => ({
    id:        row.id,
    name:      row.name,
    shortName: row.short_name,
    color:     row.color,
  }));
}

// ── Møter ─────────────────────────────────────────────────

/** Alle aktive møter med eier-info — brukes i /meetings */
export async function getMeetings(): Promise<EnrichedMeeting[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('meetings')
    .select(`
      id, owner_user_id, company_id, customer_name, starts_at, location, agenda, status,
      owner:profiles!owner_user_id (name, companies (short_name, color))
    `)
    .eq('status', 'active')
    .order('starts_at', { ascending: true });
  return (data ?? []).map(mapMeeting);
}

/** Møter der brukeren er godkjent deltaker (ikke eier) — brukes i /mine */
export async function getApprovedMeetings(userId: string): Promise<EnrichedMeeting[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('meeting_interests')
    .select(`
      meeting:meetings!meeting_id (
        id, owner_user_id, company_id, customer_name, starts_at, location, agenda, status,
        owner:profiles!owner_user_id (name, companies (short_name, color))
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'approved');

  if (!data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[])
    .map((row) => {
      const m = Array.isArray(row.meeting) ? row.meeting[0] : row.meeting;
      return m ? mapMeeting(m as Record<string, unknown>) : null;
    })
    .filter(Boolean) as EnrichedMeeting[];
}

/** Møter eiet av én bruker — brukes i /mine */
export async function getMyMeetings(userId: string): Promise<EnrichedMeeting[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('meetings')
    .select(`
      id, owner_user_id, company_id, customer_name, starts_at, location, agenda, status,
      owner:profiles!owner_user_id (name, companies (short_name, color))
    `)
    .eq('owner_user_id', userId)
    .eq('status', 'active')
    .order('starts_at', { ascending: true });
  return (data ?? []).map(mapMeeting);
}

export async function addMeeting(input: {
  ownerUserId: string;
  companyId:   string;
  customerName:string;
  startsAt:    string;
  location:    string;
  agenda?:     string;
}): Promise<void> {
  const supabase = createClient();
  await supabase.from('meetings').insert({
    owner_user_id: input.ownerUserId,
    company_id:    input.companyId,
    customer_name: input.customerName,
    starts_at:     input.startsAt,
    location:      input.location,
    agenda:        input.agenda ?? null,
    status:        'active',
  });
}

// ── Interessemeldinger ────────────────────────────────────

/** Pending + approved interesser for ett møte (med brukerinfo) */
export async function getActiveInterests(meetingId: string): Promise<EnrichedInterest[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('meeting_interests')
    .select(`
      id, meeting_id, user_id, status, reviewed_at, created_at,
      user_profile:profiles!user_id (name, email, companies (short_name, color))
    `)
    .eq('meeting_id', meetingId)
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: true });
  return (data ?? []).map(mapInterest);
}

/** Antall aktive interesser for ett møte (for badge-visning) */
export async function getInterestCount(meetingId: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from('meeting_interests')
    .select('*', { count: 'exact', head: true })
    .eq('meeting_id', meetingId)
    .in('status', ['pending', 'approved']);
  return count ?? 0;
}

/** Brukerens gjeldende interesse for ett møte (ekskluderer withdrawn) */
export async function getUserInterest(
  meetingId: string,
  userId: string
): Promise<Interest | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('meeting_interests')
    .select('id, meeting_id, user_id, status, reviewed_at, created_at')
    .eq('meeting_id', meetingId)
    .eq('user_id', userId)
    .neq('status', 'withdrawn')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    id:         data.id,
    meetingId:  data.meeting_id,
    userId:     data.user_id,
    status:     data.status as InterestStatus,
    reviewedAt: data.reviewed_at,
    createdAt:  data.created_at,
  };
}

/**
 * Meld interesse — bruker upsert så én bruker alltid har én rad per møte.
 * Re-aktiverer en eventuelt avslått eller trukket interesse.
 */
export async function registerInterest(
  meetingId:   string,
  userId:      string,
  ownerUserId: string
): Promise<void> {
  const supabase = createClient();

  await supabase.from('meeting_interests').upsert(
    {
      meeting_id:  meetingId,
      user_id:     userId,
      status:      'pending',
      reviewed_at: null,
      created_at:  new Date().toISOString(),
    },
    { onConflict: 'meeting_id,user_id' }
  );

  // Varsel til møteeier (from_user_id = innlogget bruker, policy-krav)
  await supabase.from('notifications').insert({
    recipient_user_id: ownerUserId,
    from_user_id:      userId,
    meeting_id:        meetingId,
    type:              'new_interest',
  });
}

export async function withdrawInterest(meetingId: string, userId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('meeting_interests')
    .update({ status: 'withdrawn', reviewed_at: new Date().toISOString() })
    .eq('meeting_id', meetingId)
    .eq('user_id', userId)
    .in('status', ['pending', 'approved']);
}

/** Møteeier godkjenner interesse */
export async function approveInterest(interestId: string, ownerUserId: string): Promise<void> {
  const supabase = createClient();

  const { data: interest } = await supabase
    .from('meeting_interests')
    .select('user_id, meeting_id')
    .eq('id', interestId)
    .single();

  if (!interest) return;

  await supabase
    .from('meeting_interests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', interestId);

  await supabase.from('notifications').insert({
    recipient_user_id: interest.user_id,
    from_user_id:      ownerUserId,
    meeting_id:        interest.meeting_id,
    type:              'interest_approved',
  });
}

/** Møteeier avslår interesse */
export async function rejectInterest(interestId: string, ownerUserId: string): Promise<void> {
  const supabase = createClient();

  const { data: interest } = await supabase
    .from('meeting_interests')
    .select('user_id, meeting_id')
    .eq('id', interestId)
    .single();

  if (!interest) return;

  await supabase
    .from('meeting_interests')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', interestId);

  await supabase.from('notifications').insert({
    recipient_user_id: interest.user_id,
    from_user_id:      ownerUserId,
    meeting_id:        interest.meeting_id,
    type:              'interest_rejected',
  });
}

// ── Varsler ───────────────────────────────────────────────

export async function getNotificationsForUser(userId: string): Promise<EnrichedNotification[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('notifications')
    .select(`
      id, recipient_user_id, from_user_id, meeting_id, type, read_at, created_at,
      from_profile:profiles!from_user_id (name, companies (short_name)),
      meeting:meetings!meeting_id (customer_name)
    `)
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapNotification);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_user_id', userId)
    .is('read_at', null);
  return count ?? 0;
}

export async function markAllRead(userId: string): Promise<void> {
  const supabase = createClient();
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', userId)
    .is('read_at', null);
}
