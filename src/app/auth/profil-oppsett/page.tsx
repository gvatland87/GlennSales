'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Company } from '@/lib/types';

export default function ProfilOppsettPage() {
  const router = useRouter();
  const [companies,  setCompanies]  = useState<Company[]>([]);
  const [name,       setName]       = useState('');
  const [companyId,  setCompanyId]  = useState('');
  const [loading,    setLoading]    = useState(false);
  const [loadingInit,setLoadingInit]= useState(true);
  const [error,      setError]      = useState('');

  useEffect(() => {
    async function init() {
      const supabase = createClient();

      // Hent selskaper og eventuell eksisterende profil parallelt
      const [{ data: companyRows }, { data: { user } }] = await Promise.all([
        supabase.from('companies').select('id, name, short_name, color').order('name'),
        supabase.auth.getUser(),
      ]);

      setCompanies(
        (companyRows ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          shortName: c.short_name,
          color: c.color,
        }))
      );

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, company_id')
          .eq('id', user.id)
          .single();

        if (profile?.name)       setName(profile.name);
        if (profile?.company_id) setCompanyId(profile.company_id);
      }

      setLoadingInit(false);
    }
    init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !companyId) {
      setError('Fyll inn navn og velg selskap.');
      return;
    }
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/auth/logg-inn');
      return;
    }

    // Lagre profil i profiles-tabellen
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        name:       name.trim(),
        company_id: companyId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      setError('Kunne ikke lagre profilen. Prøv igjen.');
      setLoading(false);
      return;
    }

    // Merk profil som ferdig i JWT-metadata (brukes av middleware, uten ekstra DB-kall)
    await supabase.auth.updateUser({ data: { setup_done: true } });

    router.push('/meetings');
    router.refresh();
  }

  if (loadingInit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Laster…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo + intro */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold tracking-tight">
            <span className="text-blue-600">Glenn</span>
            <span className="text-gray-900">Sales</span>
          </span>
          <p className="font-semibold text-gray-800 mt-4 text-lg">Sett opp profilen din</p>
          <p className="text-gray-500 text-sm mt-1">
            Fortell oss hvem du er og hvilket selskap du tilhører
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Fullt navn */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fullt navn <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="F.eks. Kari Holm"
                required
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {/* Selskap */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selskap <span className="text-red-500">*</span>
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              >
                <option value="" disabled>Velg ditt selskap…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {companies.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠ Ingen selskaper lastet — kjør seed.sql i Supabase Dashboard.
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm mt-1"
            >
              {loading ? 'Lagrer…' : 'Kom i gang →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
