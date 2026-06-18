'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EnrichedMeeting, Interest } from '@/lib/types';
import {
  getUserInterest,
  getInterestCount,
  registerInterest,
  withdrawInterest,
} from '@/lib/store';

type Props = {
  meeting: EnrichedMeeting;
  currentUserId: string;
};

// ── ICS-generator (Outlook / Google Calendar) ────────────

function toICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function downloadICS(meeting: EnrichedMeeting): void {
  const start = new Date(meeting.startsAt);
  const end   = new Date(start.getTime() + 60 * 60 * 1000);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GlennSales//GlennSales//NO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:Møte med ${meeting.customerName}`,
    `LOCATION:${meeting.location}`,
    meeting.agenda ? `DESCRIPTION:${meeting.agenda.replace(/[\r\n]+/g, '\\n')}` : '',
    `UID:glennsales-${meeting.id}@gmc.no`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `mote-${meeting.customerName.toLowerCase().replace(/[\s/]+/g, '-')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Komponent ─────────────────────────────────────────────

export default function MeetingCard({ meeting, currentUserId }: Props) {
  const isOwner = meeting.ownerUserId === currentUserId;

  const [myInterest,    setMyInterest]    = useState<Interest | null>(null);
  const [interestCount, setInterestCount] = useState(0);
  const [loading,       setLoading]       = useState(false);

  const loadState = useCallback(async () => {
    if (!currentUserId) return;
    const [interest, count] = await Promise.all([
      isOwner ? Promise.resolve(null) : getUserInterest(meeting.id, currentUserId),
      getInterestCount(meeting.id),
    ]);
    setMyInterest(interest);
    setInterestCount(count);
  }, [meeting.id, currentUserId, isOwner]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  async function handleMeldInteresse() {
    if (isOwner || loading) return;
    const s = myInterest?.status;
    if (s && s !== 'rejected') return;
    setLoading(true);
    await registerInterest(meeting.id, currentUserId, meeting.ownerUserId);
    await loadState();
    setLoading(false);
  }

  async function handleTrekkTilbake() {
    if (loading) return;
    setLoading(true);
    await withdrawInterest(meeting.id, currentUserId);
    setMyInterest(null);
    setInterestCount((c) => Math.max(0, c - 1));
    setLoading(false);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('nb-NO', {
      weekday: 'short', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit',
    });
  }

  const status = myInterest?.status;

  const borderClass =
    status === 'approved' ? 'border-green-300 bg-green-50/30 shadow-sm' :
    status === 'pending'  ? 'border-blue-200 bg-blue-50/20' :
                            'border-gray-100';

  return (
    <div className={`bg-white rounded-xl border p-5 flex flex-col gap-3 transition-all hover:shadow-md ${borderClass}`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-base">{meeting.customerName}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            📍 {meeting.location} · {formatDate(meeting.startsAt)}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${meeting.ownerCompanyColor}`}>
          {meeting.ownerCompanyShortName}
        </span>
      </div>

      {meeting.agenda && (
        <p className="text-sm text-gray-600 leading-relaxed">{meeting.agenda}</p>
      )}

      {/* Footer: eier + interesserte + handlingsknapp */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50 gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>👤 {meeting.ownerName}</span>
          {interestCount > 0 && (
            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              🔥 {interestCount} interessert{interestCount === 1 ? '' : 'e'}
            </span>
          )}
        </div>

        {isOwner ? (
          <span className="text-xs text-gray-400 italic">Ditt møte</span>
        ) : (
          <InterestControl
            status={status}
            loading={loading}
            onMeld={handleMeldInteresse}
            onTrekkTilbake={handleTrekkTilbake}
            onDownloadICS={() => downloadICS(meeting)}
          />
        )}
      </div>
    </div>
  );
}

// ── Interesse-kontroll ────────────────────────────────────

type InterestControlProps = {
  status: Interest['status'] | undefined;
  loading: boolean;
  onMeld: () => void;
  onTrekkTilbake: () => void;
  onDownloadICS: () => void;
};

function InterestControl({ status, loading, onMeld, onTrekkTilbake, onDownloadICS }: InterestControlProps) {
  if (status === 'approved') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
          ✓ Godkjent
        </span>
        <button
          onClick={onDownloadICS}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-all active:scale-95 shadow-sm"
        >
          📅 Legg til kalender
        </button>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-blue-700 font-medium bg-blue-100 px-2 py-1 rounded-full">
          ⏳ Venter på godkjenning
        </span>
        <button
          onClick={onTrekkTilbake}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors disabled:opacity-50"
        >
          Trekk tilbake
        </button>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded-full">
          ✕ Avslått
        </span>
        <button
          onClick={onMeld}
          disabled={loading}
          className="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors disabled:opacity-50"
        >
          Meld interesse på nytt
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onMeld}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all active:scale-95 disabled:opacity-50"
    >
      {loading ? '…' : '+ Meld interesse'}
    </button>
  );
}
