'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

const SupabaseContext = createContext<SupabaseClient | null>(null);

export function SupabaseProvider({
  children,
  supabaseClient,
}: {
  children: ReactNode;
  supabaseClient: SupabaseClient;
}) {
  return <SupabaseContext.Provider value={supabaseClient}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error('SupabaseProvider is missing from the component tree.');
  }
  return client;
}
