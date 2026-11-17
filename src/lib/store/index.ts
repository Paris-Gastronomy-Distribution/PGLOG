import "server-only";
import { isHosted } from "../site";
import { getSupabaseAdmin } from "../supabase/server";
import { createLocalStore } from "./local-store";
import { createSupabaseStore } from "./supabase-store";
import type { CatalogStore } from "./types";

export type BackendStatus =
  | { kind: "supabase" }
  | { kind: "local" }
  | { kind: "missing"; missing: string[] };

const SUPABASE_VARS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

/**
 * Supabase dès que ses 3 variables sont définies. Sinon, sur votre ordinateur
 * (npm run dev ou npm run start), stockage local sur le disque pour pouvoir
 * tout tester. Jamais chez un hébergeur : son disque n'est pas conservé.
 */
export function getBackendStatus(): BackendStatus {
  const missing = SUPABASE_VARS.filter((name) => !process.env[name]);
  if (missing.length === 0) return { kind: "supabase" };
  if (!isHosted()) return { kind: "local" };
  return { kind: "missing", missing: [...missing] };
}

let cached: CatalogStore | null = null;

export function getStore(): CatalogStore | null {
  if (cached) return cached;
  const status = getBackendStatus();
  if (status.kind === "supabase") {
    const db = getSupabaseAdmin();
    cached = db ? createSupabaseStore(db) : null;
  } else if (status.kind === "local") {
    cached = createLocalStore();
  }
  return cached;
}
