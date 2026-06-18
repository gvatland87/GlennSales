'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getCurrentProfile,
  getMyMeetings,
  getActiveInterests,
  approveInterest,
  rejectInterest,
} from '@/lib/store';
import type { EnrichedMeeting, EnrichedInterest, Profile } from '@/lib/types';

export default function MineMoeterPage() {
  const [profile,    setProfile]    = useState<Profile | null>(null);
  const [myMeetings, setMyMeetings] = useState<EnrichedMeeting[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    async function load() {
      const p = await getCurrentProfile();
      setProfile(p);
      if (p?.id) {
        const meetings = await getMyMeetings(p.id);
        setMyMeetings(meetings);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function refreshMeetings() {
    if (!profile?.id) return;
    setMyMeetings(await getMyMeetings(profile.id));
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('nb-NO', {
      weekday: 'short', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function formatShort(iso: string) {
    return new Date(iso).toLocaleDateString('nb-NO', {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400 text-sm">
        Laster møter…
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mine møter</h1>
          <p className="text-sm text-gray-500 mt-1">
            Godkjenn eller avslå interessemeldinger fra andre selskaper
          </p>
        </div>
        <Link
          href="/meetings/ny"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          + Nytt møte
        </Link>
      </div>

      {/* Innlogget-info */}
      {profile?.company && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${profile.company.color}`}>
          <span className="font-semibold">{profile.name}</span>
          <span>·</span>
          <span>{profile.company.name}</span>
          <span>·</span>
          <span className="capitalize">{profile.role}</span>
        </div>
      )}

      {myMeetings.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📋</p>
          <p className="font-medium text-gray-500">Ingen møter ennå</p>
          <p className="text-sm mt-2">
            <Link href="/meetings/ny" className="text-blue-600 underline">
              Opprett ditt første møte
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {myMeetings.map((m) => (
            <MeetingWithInterests
              key={m.id}
              meeting={m}
              currentUserId={profile?.id ?? ''}
              formatDate={formatDate}
              formatShort={formatShort}
              onUpdate={refreshMeetings}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Møte med interesseliste ───────────────────────────────

function MeetingWithInterests({
  meeting,
  currentUserId,
  formatDate,
  formatShort,
  onUpdate,
}: {
  meeting:       EnrichedMeeting;
  currentUserId: string;
  formatDate:    (s: string) => string;
  formatShort:   (s: string) => string;
  onUpdate:      () => void;
}) {
  const [interests, setInterests] = useState<EnrichedInterest[]>([]);
  const [loading,   setLoading]   = useState(false);

  async function loadInterests() {
    setInterests(await getActiveInterests(meeting.id));
  }

  useEffect(() => {
    loadInterests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id]);

  const pending  = interests.filter((i) => i.status === 'pending');
  const approved = interests.filter((i) => i.status === 'approved');

  async function handleApprove(interest: EnrichedInterest) {
    if (loading) return;
    setLoading(true);
    await approveInterest(interest.id, currentUserId);
    await loadInterests();
    onUpdate();
    setLoading(false);
  }

  async function handleReject(interest: EnrichedInterest) {
    if (loading) return;
    setLoading(true);
    await rejectInterest(interest.id, currentUserId);
    await loadInterests();
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      {/* Møtehode */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{meeting.customerName}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            📍 {meeting.location} · {formatDate(meeting.startsAt)}
          </p>
          {meeting.agenda && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{meeting.agenda}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {pending.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
              🔔 {pending.length} venter
            </span>
          )}
          {approved.length > 0 && (
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
              ✓ {approved.length} godkjent
            </span>
          )}
        </div>
      </div>

      {/* Venter på godkjenning */}
      {pending.length > 0 && (
        <section className="mb-4">
          <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span>⏳</span> Venter på din godkjenning
          </h4>
          <ul className="flex flex-col gap-3">
            {pending.map((interest) => (
              <InterestRow
                key={interest.id}
                interest={interest}
                formatShort={formatShort}
                actions={
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(interest)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                    >
                      ✓ Godkjenn
                    </button>
                    <button
                      onClick={() => handleReject(interest)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                      ✕ Avslå
                    </button>
                  </div>
                }
              />
            ))}
          </ul>
        </section>
      )}

      {/* Godkjente */}
      {approved.length > 0 && (
        <section className={pending.length > 0 ? 'border-t border-gray-50 pt-4' : ''}>
          <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span>✓</span> Godkjente deltakere
          </h4>
          <ul className="flex flex-col gap-3">
            {approved.map((interest) => (
              <InterestRow
                key={interest.id}
                interest={interest}
                formatShort={formatShort}
                actions={
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full shrink-0">
                    ✓ Godkjent
                  </span>
                }
              />
            ))}
          </ul>
        </section>
      )}

      {interests.length === 0 && (
        <div className="border-t border-gray-50 pt-4">
          <p className="text-sm text-gray-400 italic">
            Ingen har meldt interesse ennå. Møtet er synlig i Møteplan for alle selskaper.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Interessent-rad ───────────────────────────────────────

function InterestRow({
  interest,
  formatShort,
  actions,
}: {
  interest:    EnrichedInterest;
  formatShort: (s: string) => string;
  actions:     React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600 text-xs shrink-0">
        {interest.userName?.charAt(0) ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-800">{interest.userName}</span>
          {interest.userCompanyShortName && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${interest.userCompanyColor}`}>
              {interest.userCompanyShortName}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
          {interest.userEmail && <span>{interest.userEmail}</span>}
          {interest.userEmail && <span>·</span>}
          <span>{formatShort(interest.createdAt)}</span>
        </p>
      </div>
      {actions}
    </li>
  );
}
