'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  initStore,
  getMeetings,
  getCurrentUserId,
  getActiveInterests,
  getUser,
  getCompany,
  approveInterest,
  rejectInterest,
  GS_UPDATE_EVENT,
} from '@/lib/store';
import type { Interest, Meeting } from '@/lib/types';

export default function MineMoeterPage() {
  const [myMeetings,    setMyMeetings]    = useState<Meeting[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');

  function loadData() {
    const uid = getCurrentUserId();
    setCurrentUserId(uid);
    setMyMeetings(getMeetings().filter((m) => m.ownerUserId === uid));
  }

  useEffect(() => {
    initStore();
    loadData();
    window.addEventListener(GS_UPDATE_EVENT, loadData);
    return () => window.removeEventListener(GS_UPDATE_EVENT, loadData);
  }, []);

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

  const currentUser    = getUser(currentUserId);
  const currentCompany = currentUser ? getCompany(currentUser.companyId) : null;

  const pendingTotal = myMeetings.reduce(
    (sum, m) => sum + getActiveInterests(m.id).filter((i) => i.status === 'pending').length,
    0
  );

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
        <div className="flex items-center gap-3">
          {pendingTotal > 0 && (
            <span className="bg-amber-100 text-amber-800 text-sm font-semibold px-3 py-1.5 rounded-full">
              {pendingTotal} venter
            </span>
          )}
          <Link
            href="/meetings/ny"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            + Nytt møte
          </Link>
        </div>
      </div>

      {/* Innlogget-info */}
      {currentUser && currentCompany && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${currentCompany.color}`}>
          <span className="font-semibold">{currentUser.name}</span>
          <span>·</span>
          <span>{currentCompany.name}</span>
          <span>·</span>
          <span className="capitalize">{currentUser.role}</span>
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
              currentUserId={currentUserId}
              formatDate={formatDate}
              formatShort={formatShort}
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
}: {
  meeting: Meeting;
  currentUserId: string;
  formatDate: (s: string) => string;
  formatShort: (s: string) => string;
}) {
  const [interests, setInterests] = useState<Interest[]>([]);

  function loadInterests() {
    setInterests(getActiveInterests(meeting.id));
  }

  useEffect(() => {
    loadInterests();
    window.addEventListener(GS_UPDATE_EVENT, loadInterests);
    return () => window.removeEventListener(GS_UPDATE_EVENT, loadInterests);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id]);

  const pending  = interests.filter((i) => i.status === 'pending');
  const approved = interests.filter((i) => i.status === 'approved');

  function handleApprove(interest: Interest) {
    approveInterest(interest.id, currentUserId);
  }

  function handleReject(interest: Interest) {
    rejectInterest(interest.id, currentUserId);
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

      {/* ── Venter på godkjenning ── */}
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
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-all active:scale-95 shadow-sm"
                    >
                      ✓ Godkjenn
                    </button>
                    <button
                      onClick={() => handleReject(interest)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-all active:scale-95"
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

      {/* ── Godkjente interesser ── */}
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

      {/* Tom tilstand */}
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
  interest: Interest;
  formatShort: (s: string) => string;
  actions: React.ReactNode;
}) {
  const person        = getUser(interest.userId);
  const personCompany = person ? getCompany(person.companyId) : null;

  return (
    <li className="flex items-center gap-3">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600 text-xs shrink-0">
        {person?.name?.charAt(0) ?? '?'}
      </div>

      {/* Navn + selskap */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-800">{person?.name ?? 'Ukjent'}</span>
          {personCompany && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${personCompany.color}`}>
              {personCompany.shortName}
            </span>
          )}
        </div>
        {person && (
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
            <span>{person.email}</span>
            <span>·</span>
            <span>{formatShort(interest.createdAt)}</span>
          </p>
        )}
      </div>

      {/* Handlingsknapper */}
      {actions}
    </li>
  );
}
