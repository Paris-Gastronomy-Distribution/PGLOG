import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "./timeout-fetch";

let client: SupabaseClient | null = null;

/**
 * Client navigateur (clé publique). Sert uniquement à envoyer les fichiers
 * vers les URLs d'upload signées générées par le serveur.
 */
export function getBrowserSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase n'est pas configuré dans ce navigateur (variables NEXT_PUBLIC_…).");
  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // 2 minutes par fichier : large pour un PDF de 50 Mo, mais jamais bloqué.
    global: { fetch: fetchWithTimeout(120_000) },
  });
  return client;
}
