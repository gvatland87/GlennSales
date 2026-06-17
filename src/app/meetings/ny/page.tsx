'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addMeeting, getCurrentUserId, getUser, getCompany } from '@/lib/store';
import type { Meeting } from '@/lib/types';

export default function NyttMotePage() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState('');
  const [startsAt,     setStartsAt]     = useState('');
  const [location,     setLocation]     = useState('');
  const [agenda,       setAgenda]       = useState('');
  const [saving,       setSaving]       = useState(false);

  const currentUserId = getCurrentUserId();
  const user          = getUser(currentUserId);
  const company       = user ? getCompany(user.companyId) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim() || !startsAt || !location.trim() || !user) return;
    setSaving(true);

    const meeting: Meeting = {
      id:           `m-${Date.now()}`,
      ownerUserId:  currentUserId,
      companyId:    user.companyId,
      customerName: customerName.trim(),
      startsAt:     new Date(startsAt).toISOString(),
      location:     location.trim(),
      agenda:       agenda.trim() || undefined,
      status:       'active',
    };

    addMeeting(meeting);
    router.push('/meetings');
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nytt møte</h1>
        {user && company && (
          <p className="text-sm text-gray-500 mt-1">
            Som{' '}
            <span className={`font-medium text-xs px-2 py-0.5 rounded-full ${company.color}`}>
              {company.shortName}
            </span>{' '}
            · {user.name}
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-100 p-6 flex flex-col gap-5 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kunde / selskap <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="F.eks. Wallenius Wilhelmsen"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dato og tid <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sted <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="F.eks. Stavanger"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Agenda <span className="text-gray-400 font-normal">(valgfri)</span>
          </label>
          <textarea
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            rows={3}
            placeholder="Hva skal diskuteres?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/meetings')}
            className="flex-1 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Avbryt
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {saving ? 'Lagrer...' : 'Opprett møte'}
          </button>
        </div>
      </form>
    </div>
  );
}
