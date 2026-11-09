import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "./timeout-fetch";

let adminClient: SupabaseClient | null = null;

/**
 * Client Supabase côté serveur avec la clé service_role / secret (contourne la RLS).
 * Ne jamais importer ce module depuis un composant client.
 * Retourne null si les variables d'environnement ne sont pas configurées.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  adminClient ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout(20_000) },
  });
  return adminClient;
}
