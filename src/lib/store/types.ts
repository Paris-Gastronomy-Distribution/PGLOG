import type { CatalogRow } from "../types";

/** Où envoyer un fichier depuis le navigateur de l'admin. */
export type UploadTarget =
  | { path: string; kind: "supabase"; token: string }
  | { path: string; kind: "local"; url: string };

/** `is_active` est omis : la base le met à true par défaut. */
export type NewCatalog = Omit<CatalogRow, "id" | "created_at" | "is_active">;

export type CatalogPatch = Partial<
  Pick<CatalogRow, "title" | "description" | "accent_color" | "allow_download" | "pdf_url" | "is_active">
>;

/** Erreur métier affichable telle quelle à l'utilisateur. */
export class StoreError extends Error {}

/**
 * Persistance des catalogues : Supabase en production, système de fichiers
 * local en développement quand Supabase n'est pas encore configuré.
 */
export interface CatalogStore {
  readonly kind: "supabase" | "local";
  list(): Promise<CatalogRow[]>;
  getBySlug(slug: string): Promise<CatalogRow | null>;
  getById(id: string): Promise<CatalogRow | null>;
  slugExists(slug: string): Promise<boolean>;
  insert(row: NewCatalog): Promise<CatalogRow>;
  update(id: string, patch: CatalogPatch): Promise<CatalogRow>;
  /** Supprime la ligne et tous les fichiers du dossier {slug}/. */
  remove(id: string): Promise<CatalogRow | null>;
  /** Vide le dossier {slug}/ (fichiers orphelins d'un envoi interrompu). */
  purgeFiles(slug: string): Promise<void>;
  createUploadTargets(paths: string[]): Promise<UploadTarget[]>;
  publicUrl(path: string): string;
}
