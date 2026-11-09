import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_BUCKET, storagePublicUrl } from "../catalog-urls";
import { isNetworkError } from "../supabase/timeout-fetch";
import type { CatalogRow } from "../types";
import { StoreError, type CatalogPatch, type CatalogStore, type NewCatalog, type UploadTarget } from "./types";

const COLUMNS =
  "id, slug, title, description, page_count, page_width, page_height, cover_url, accent_color, allow_download, pdf_url, created_at";

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export function createSupabaseStore(db: SupabaseClient): CatalogStore {
  const bucket = () => db.storage.from(STORAGE_BUCKET);

  const fail = (what: string, message: string): never => {
    if (isNetworkError(message)) {
      throw new StoreError(`${what} : Supabase ne répond pas (connexion instable ?). Réessayez dans un instant.`);
    }
    throw new StoreError(`${what} : ${message}`);
  };

  async function listFolder(slug: string): Promise<string[]> {
    const paths: string[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await bucket().list(slug, { limit: 1000, offset });
      if (error) fail("Lecture du stockage impossible", error.message);
      const files = (data ?? []).filter((f) => f.id !== null);
      paths.push(...files.map((f) => `${slug}/${f.name}`));
      if (!data || data.length < 1000) break;
    }
    return paths;
  }

  async function purgeFiles(slug: string) {
    const paths = await listFolder(slug);
    for (let i = 0; i < paths.length; i += 500) {
      const { error } = await bucket().remove(paths.slice(i, i + 500));
      if (error) fail("Suppression des fichiers impossible", error.message);
    }
  }

  return {
    kind: "supabase",

    async list() {
      const { data, error } = await db.from("catalogs").select(COLUMNS).order("created_at", { ascending: false });
      if (error) fail("Lecture des catalogues impossible", error.message);
      return (data ?? []) as CatalogRow[];
    },

    async getBySlug(slug) {
      const { data, error } = await db.from("catalogs").select(COLUMNS).eq("slug", slug).maybeSingle<CatalogRow>();
      if (error) fail("Lecture du catalogue impossible", error.message);
      return data;
    },

    async getById(id) {
      const { data, error } = await db.from("catalogs").select(COLUMNS).eq("id", id).maybeSingle<CatalogRow>();
      if (error) fail("Lecture du catalogue impossible", error.message);
      return data;
    },

    async slugExists(slug) {
      const { count, error } = await db.from("catalogs").select("id", { count: "exact", head: true }).eq("slug", slug);
      if (error) fail("Vérification du lien impossible", error.message);
      return (count ?? 0) > 0;
    },

    async insert(row: NewCatalog) {
      const { data, error } = await db.from("catalogs").insert(row).select(COLUMNS).single<CatalogRow>();
      if (error?.code === "23505") throw new StoreError("Ce lien est déjà utilisé par un autre catalogue.");
      if (error || !data) return fail("Enregistrement impossible", error?.message ?? "réponse vide");
      return data;
    },

    async update(id, patch: CatalogPatch) {
      const { data, error } = await db.from("catalogs").update(patch).eq("id", id).select(COLUMNS).single<CatalogRow>();
      if (error || !data) return fail("Modification impossible", error?.message ?? "catalogue introuvable");
      return data;
    },

    async remove(id) {
      const { data: row, error } = await db.from("catalogs").select(COLUMNS).eq("id", id).maybeSingle<CatalogRow>();
      if (error) fail("Lecture du catalogue impossible", error.message);
      if (!row) return null;
      await purgeFiles(row.slug);
      const { error: delError } = await db.from("catalogs").delete().eq("id", id);
      if (delError) fail("Suppression impossible", delError.message);
      return row;
    },

    purgeFiles,

    async createUploadTargets(paths) {
      return mapLimit(paths, 8, async (path): Promise<UploadTarget> => {
        const { data, error } = await bucket().createSignedUploadUrl(path, { upsert: true });
        if (error || !data) return fail("Préparation de l'envoi impossible", error?.message ?? path);
        return { path, kind: "supabase", token: data.token };
      });
    },

    publicUrl: storagePublicUrl,
  };
}
