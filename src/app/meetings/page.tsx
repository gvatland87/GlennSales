'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMeetings, getCompanies, getCurrentProfile } from '@/lib/store';
import type { Company, EnrichedMeeting } from '@/lib/types';
import MeetingCard from '@/components/MeetingCard';

export default function MeetingsPage() {
  const [meetings,        setMeetings]       = useState<EnrichedMeeting[]>([]);
  const [companies,       setCompanies]      = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany]= useState<string>('all');
  const [currentUserId,   setCurrentUserId]  = useState<string>('');
  const [loading,         setLoading]        = useState(true);

  useEffect(() => {
    async function load() {
      const [meetings, companies, profile] = await Promise.all([
        getMeetings(),
        getCompanies(),
        getCurrentProfile(),
      ]);
      setMeetings(meetings);
      setCompanies(companies);
      setCurrentUserId(profile?.id ?? '');
      setLoading(false);
    }
    load();
  }, []);

  const filtered = selectedCompany === 'all'
    ? meetings
    : meetings.filter((m) => m.companyId === selectedCompany);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400 text-sm">
        Laster møteplan…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Møteplan</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} møte{filtered.length === 1 ? '' : 'r'} på tvers av alle selskaper
          </p>
        </div>
        <Link
          href="/meetings/ny"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          + Nytt møte
        </Link>
      </div>

      {/* Selskapsfilter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCompany('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCompany === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Alle selskaper
        </button>
        {companies.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCompany(c.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCompany === c.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {c.shortName}
          </button>
        ))}
      </div>

      {/* Møteliste */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📅</p>
          <p className="font-medium text-gray-500">Ingen møter her ennå</p>
          <p className="text-sm mt-2">
            <Link href="/meetings/ny" className="text-blue-600 underline">Opprett ditt første møte</Link>
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((m) => (
            <MeetingCard key={m.id} meeting={m} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
