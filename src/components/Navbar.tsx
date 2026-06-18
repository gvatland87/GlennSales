'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  getCurrentProfile,
  getNotificationsForUser,
  getUnreadCount,
  markAllRead,
  logout,
} from '@/lib/store';
import type { Profile, EnrichedNotification } from '@/lib/types';

export default function Navbar() {
  const pathname   = usePathname();
  const router     = useRouter();
  const isAuthPage = pathname.startsWith('/auth');
  const notifRef   = useRef<HTMLDivElement>(null);

  const [profile,       setProfile]       = useState<Profile | null>(null);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [notifications, setNotifications] = useState<EnrichedNotification[]>([]);
  const [showNotifs,    setShowNotifs]    = useState(false);

  async function loadData() {
    const p = await getCurrentProfile();
    setProfile(p);
    if (p?.id) {
      const [count, notifs] = await Promise.all([
        getUnreadCount(p.id),
        getNotificationsForUser(p.id),
      ]);
      setUnreadCount(count);
      setNotifications(notifs);
    }
  }

  useEffect(() => {
    if (isAuthPage) return;
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Supabase Realtime — live varsel-oppdatering
  useEffect(() => {
    if (isAuthPage || !profile?.id) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`navbar-notifs-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${profile.id}`,
        },
        () => { loadData(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, isAuthPage]);

  // Lukk varselpanel ved klikk utenfor
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Alle hooks er kalt — nå er det trygt å returnere tidlig
  if (isAuthPage) return null;

  async function handleOpenNotifs() {
    const next = !showNotifs;
    setShowNotifs(next);
    if (next && profile?.id) {
      await markAllRead(profile.id);
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/auth/logg-inn');
    router.refresh();
  }

  function notifText(n: EnrichedNotification): string {
    const who = n.fromUserCompanyShortName
      ? `${n.fromUserName} (${n.fromUserCompanyShortName})`
      : n.fromUserName;

    if (n.type === 'interest_approved')
      return `✅ ${who} godkjente interessen din for møtet med ${n.meetingCustomerName}`;
    if (n.type === 'interest_rejected')
      return `❌ ${who} avslo interessen din for møtet med ${n.meetingCustomerName}`;
    return `${who} har meldt interesse i møtet ditt med ${n.meetingCustomerName}`;
  }

  function formatTs(iso: string) {
    return new Date(iso).toLocaleDateString('nb-NO', {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function navCls(href: string) {
    return `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      pathname === href
        ? 'bg-blue-600 text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`;
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo + navigasjon */}
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg tracking-tight">
            <span className="text-blue-600">Glenn</span>
            <span className="text-gray-900">Sales</span>
          </span>
          <div className="flex gap-1">
            <Link href="/meetings" className={navCls('/meetings')}>Møteplan</Link>
            <Link href="/mine"     className={navCls('/mine')}>Mine møter</Link>
          </div>
        </div>

        {/* Bruker + varsler + logg ut */}
        <div className="flex items-center gap-3">

          {/* Bruker-badge */}
          {profile && (
            <div className="flex items-center gap-2">
              {profile.company && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${profile.company.color}`}>
                  {profile.company.shortName}
                </span>
              )}
              <span className="text-sm font-medium text-gray-700 hidden sm:block">
                {profile.name}
              </span>
            </div>
          )}

          {/* Varselsklokke */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleOpenNotifs}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Varsler"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-1 leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-gray-800 text-sm">Varsler</span>
                  <span className="text-xs text-gray-400">{notifications.length} totalt</span>
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
                    Ingen varsler ennå
                  </div>
                ) : (
                  <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {notifications.map((n) => (
                      <li key={n.id} className={`px-4 py-3 text-sm ${n.readAt ? 'bg-white' : 'bg-blue-50'}`}>
                        <p className="text-gray-800 leading-snug">{notifText(n)}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatTs(n.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Logg ut */}
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Logg ut
          </button>
        </div>
      </div>
    </nav>
  );
}
