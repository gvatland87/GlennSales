'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  initStore,
  getUsers,
  getCompany,
  getUser,
  getCurrentUserId,
  setCurrentUserId,
  getNotificationsForUser,
  getUnreadCount,
  markAllRead,
  getMeetings,
  GS_UPDATE_EVENT,
} from '@/lib/store';
import type { User, Notification } from '@/lib/types';

export default function Navbar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser]   = useState<User | null>(null);
  const [users, setUsers]               = useState<User[]>([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs]     = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  function loadData() {
    const uid    = getCurrentUserId();
    const allUsers = getUsers();
    const me     = allUsers.find((u) => u.id === uid) ?? allUsers[0];
    setCurrentUser(me);
    setUsers(allUsers);
    if (me) {
      setUnreadCount(getUnreadCount(me.id));
      setNotifications(getNotificationsForUser(me.id));
    }
  }

  useEffect(() => {
    initStore();
    loadData();
    window.addEventListener(GS_UPDATE_EVENT, loadData);
    return () => window.removeEventListener(GS_UPDATE_EVENT, loadData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lukk varselpanel ved klikk utenfor
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  function handleUserSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    setCurrentUserId(e.target.value);
    setShowNotifs(false);
  }

  function handleOpenNotifs() {
    const next = !showNotifs;
    setShowNotifs(next);
    if (next && currentUser) {
      markAllRead(currentUser.id);
    }
  }

  function formatTs(iso: string) {
    return new Date(iso).toLocaleDateString('nb-NO', {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function notifText(n: Notification): string {
    const from        = getUser(n.fromUserId);
    const fromCompany = from ? getCompany(from.companyId) : null;
    const meeting     = getMeetings().find((m) => m.id === n.meetingId);
    const who         = from
      ? `${from.name}${fromCompany ? ` (${fromCompany.shortName})` : ''}`
      : 'Noen';
    const customer = meeting?.customerName ?? 'et møte';

    if (n.type === 'interest_approved') {
      return `✅ ${who} godkjente interessen din for møtet med ${customer}`;
    }
    if (n.type === 'interest_rejected') {
      return `❌ ${who} avslo interessen din for møtet med ${customer}`;
    }
    // new_interest
    return `${who} har meldt interesse i møtet ditt med ${customer}`;
  }

  const currentCompany = currentUser ? getCompany(currentUser.companyId) : null;

  // Grupper brukere per selskap for <optgroup>
  const usersByCompany = users.reduce<Record<string, User[]>>((acc, u) => {
    const cn = getCompany(u.companyId)?.shortName ?? u.companyId;
    (acc[cn] = acc[cn] ?? []).push(u);
    return acc;
  }, {});

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

        {/* Brukerbytte + varsler */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${currentCompany?.color ?? 'bg-gray-100 text-gray-600'}`}>
                {currentCompany?.shortName}
              </span>
              <select
                value={currentUser.id}
                onChange={handleUserSwitch}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                title="Bytt demo-bruker"
              >
                {Object.entries(usersByCompany).map(([companyName, companyUsers]) => (
                  <optgroup key={companyName} label={companyName}>
                    {companyUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
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
        </div>
      </div>

      {/* Demo-banner */}
      <div className="bg-amber-50 border-t border-amber-100 text-center text-xs text-amber-700 py-1 px-4">
        🧪 Demo — bytt bruker i rullegardinmenyen for å simulere ulike selskaper · Kjør <code className="font-mono bg-amber-100 px-1 rounded">gsReset()</code> i konsollen for å tømme data
      </div>
    </nav>
  );
}
