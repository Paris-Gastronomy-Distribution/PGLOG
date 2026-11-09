import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CatalogRow } from "../types";
import { StoreError, type CatalogPatch, type CatalogStore, type NewCatalog } from "./types";

/**
 * Stockage de DÉVELOPPEMENT uniquement (npm run dev sans Supabase) :
 *   .local-data/catalogs.json   les fiches
 *   .local-data/storage/{slug}/ les fichiers, servis par /api/dev-storage/
 * Jamais utilisé en production (voir store/index.ts).
 */
const LOCAL_ROOT = path.join(process.cwd(), ".local-data");
const LOCAL_STORAGE_DIR = path.join(LOCAL_ROOT, "storage");
const DB_FILE = path.join(LOCAL_ROOT, "catalogs.json");

async function readAll(): Promise<CatalogRow[]> {
  try {
    return JSON.parse(await readFile(DB_FILE, "utf8")) as CatalogRow[];
  } catch {
    return [];
  }
}

async function writeAll(rows: CatalogRow[]) {
  await mkdir(LOCAL_ROOT, { recursive: true });
  await writeFile(DB_FILE, JSON.stringify(rows, null, 2), "utf8");
}

/** Chemin disque d'un fichier du stockage, protégé contre `..`. */
export function localFilePath(storagePath: string): string | null {
  const segments = storagePath.split("/");
  if (segments.length < 1 || segments.some((s) => !/^[a-z0-9][a-z0-9._-]*$/i.test(s) || s.includes(".."))) return null;
  return path.join(LOCAL_STORAGE_DIR, ...segments);
}

export function createLocalStore(): CatalogStore {
  async function purgeFiles(slug: string) {
    const dir = localFilePath(slug);
    if (dir) await rm(dir, { recursive: true, force: true });
  }

  return {
    kind: "local",

    async list() {
      return (await readAll()).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async getBySlug(slug) {
      return (await readAll()).find((r) => r.slug === slug) ?? null;
    },

    async getById(id) {
      return (await readAll()).find((r) => r.id === id) ?? null;
    },

    async slugExists(slug) {
      return (await readAll()).some((r) => r.slug === slug);
    },

    async insert(row: NewCatalog) {
      const rows = await readAll();
      if (rows.some((r) => r.slug === row.slug)) throw new StoreError("Ce lien est déjà utilisé par un autre catalogue.");
      const created: CatalogRow = { ...row, id: randomUUID(), created_at: new Date().toISOString() };
      await writeAll([...rows, created]);
      return created;
    },

    async update(id, patch: CatalogPatch) {
      const rows = await readAll();
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) throw new StoreError("Catalogue introuvable.");
      rows[i] = { ...rows[i], ...patch };
      await writeAll(rows);
      return rows[i];
    },

    async remove(id) {
      const rows = await readAll();
      const row = rows.find((r) => r.id === id) ?? null;
      if (!row) return null;
      await purgeFiles(row.slug);
      await writeAll(rows.filter((r) => r.id !== id));
      return row;
    },

    purgeFiles,

    async createUploadTargets(paths) {
      return paths.map((p) => ({ path: p, kind: "local" as const, url: `/api/dev-storage/${p}` }));
    },

    publicUrl(p) {
      return `/api/dev-storage/${p}`;
    },
  };
}
