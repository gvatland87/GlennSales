import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase-klient for bruk i Client Components (kjører i nettleser).
 * Bruk denne i alle 'use client'-komponenter.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
