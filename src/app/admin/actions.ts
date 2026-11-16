"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin, UnauthorizedError } from "@/lib/admin-session";
import { ADMIN_COOKIE, createSessionToken, passwordMatches, SESSION_MAX_AGE } from "@/lib/auth";
import { coverPath, ogImagePath, pagePath, pdfPath, withVersion } from "@/lib/catalog-urls";
import { catalogPublicUrl, pageUrls, toAdminCatalog, type AdminCatalog } from "@/lib/catalogs";
import { slugIssue } from "@/lib/slug";
import { getStore } from "@/lib/store";
import { StoreError, type CatalogStore, type UploadTarget } from "@/lib/store/types";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

const MAX_PAGES = 400;
const ACCENT = /^#[0-9a-fA-F]{6}$/;

class InputError extends Error {}

function failure(err: unknown): { ok: false; error: string } {
  if (err instanceof UnauthorizedError || err instanceof StoreError || err instanceof InputError) {
    return { ok: false, error: err.message };
  }
  console.error(err);
  return { ok: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
}

function requireStore(): CatalogStore {
  const store = getStore();
  if (!store) throw new StoreError("Le stockage n'est pas configuré : renseignez les variables Supabase.");
  return store;
}

function checkSlug(slug: string) {
  const issue = slugIssue(slug);
  if (issue === "empty") throw new InputError("Indiquez la fin du lien.");
  if (issue === "format") throw new InputError("Le lien ne peut contenir que des minuscules, des chiffres et des tirets.");
  if (issue === "reserved") throw new InputError("Ce lien est réservé, choisissez-en un autre.");
}

function checkTexts(title: string, description: string) {
  if (!title.trim()) throw new InputError("Donnez un titre au catalogue.");
  if (title.trim().length > 200) throw new InputError("Le titre est trop long (200 caractères maximum).");
  if (description.length > 1000) throw new InputError("La description est trop longue (1000 caractères maximum).");
}

function revalidateCatalog(slug: string) {
  revalidatePath(`/c/${slug}`);
  revalidatePath("/admin");
}

/** URL du PDF stocké, versionnée pour contourner le cache CDN s'il est régénéré. */
const storedPdfUrl = (store: CatalogStore, slug: string) => withVersion(store.publicUrl(pdfPath(slug)), Date.now());

async function requireCatalog(store: CatalogStore, id: string) {
  const row = await store.getById(id);
  if (!row) throw new InputError("Ce catalogue n'existe plus.");
  return row;
}

/* ---------- Connexion ---------- */

export interface LoginState {
  error?: string;
}

function safeNext(value: string): string {
  return value.startsWith("/admin") && !value.startsWith("//") && !value.startsWith("/admin/login") ? value : "/admin";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { error: "Le mot de passe d'administration n'est pas configuré (variable ADMIN_PASSWORD)." };

  const password = String(formData.get("password") ?? "");
  if (!password || !(await passwordMatches(password, expected))) {
    await new Promise((r) => setTimeout(r, 700)); // freine les essais en série
    return { error: "Mot de passe incorrect." };
  }

  (await cookies()).set(ADMIN_COOKIE, await createSessionToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect(safeNext(String(formData.get("next") ?? "")));
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

/* ---------- Création ---------- */

export async function checkSlugAction(slug: string): Promise<ActionResult<{ available: boolean }>> {
  try {
    await requireAdmin();
    checkSlug(slug);
    return { ok: true, data: { available: !(await requireStore().slugExists(slug)) } };
  } catch (err) {
    return failure(err);
  }
}

export async function prepareUploadAction(input: {
  slug: string;
  pageCount: number;
  withPdf: boolean;
}): Promise<ActionResult<{ targets: UploadTarget[] }>> {
  try {
    await requireAdmin();
    const store = requireStore();
    checkSlug(input.slug);
    if (!Number.isInteger(input.pageCount) || input.pageCount < 1) throw new InputError("Le PDF ne contient aucune page.");
    if (input.pageCount > MAX_PAGES) throw new InputError(`Le PDF dépasse ${MAX_PAGES} pages.`);
    if (await store.slugExists(input.slug)) throw new InputError("Ce lien est déjà utilisé par un autre catalogue.");

    // Restes d'un envoi interrompu sur ce même lien.
    await store.purgeFiles(input.slug);

    const paths = [
      ...Array.from({ length: input.pageCount }, (_, i) => pagePath(input.slug, i + 1)),
      coverPath(input.slug),
      ogImagePath(input.slug),
      ...(input.withPdf ? [pdfPath(input.slug)] : []),
    ];
    return { ok: true, data: { targets: await store.createUploadTargets(paths) } };
  } catch (err) {
    return failure(err);
  }
}

export interface FinalizeInput {
  slug: string;
  title: string;
  description: string;
  accentColor: string;
  withPdf: boolean;
  pageCount: number;
  pageWidth: number;
  pageHeight: number;
}

export async function finalizeCatalogAction(input: FinalizeInput): Promise<ActionResult<{ url: string; slug: string }>> {
  try {
    await requireAdmin();
    const store = requireStore();
    checkSlug(input.slug);
    checkTexts(input.title, input.description);
    if (!ACCENT.test(input.accentColor)) throw new InputError("Couleur d'accent invalide.");
    const dims = [input.pageCount, input.pageWidth, input.pageHeight];
    if (!dims.every((n) => Number.isInteger(n) && n > 0)) throw new InputError("Dimensions de pages invalides.");

    await store.insert({
      slug: input.slug,
      title: input.title.trim(),
      description: input.description.trim() || null,
      page_count: input.pageCount,
      page_width: input.pageWidth,
      page_height: input.pageHeight,
      cover_url: store.publicUrl(coverPath(input.slug)),
      accent_color: input.accentColor,
      allow_download: input.withPdf,
      pdf_url: input.withPdf ? storedPdfUrl(store, input.slug) : null,
    });
    revalidateCatalog(input.slug);
    return { ok: true, data: { url: catalogPublicUrl(input.slug), slug: input.slug } };
  } catch (err) {
    return failure(err);
  }
}

/** Nettoie les fichiers d'un envoi annulé ou échoué (jamais un catalogue publié). */
export async function abortUploadAction(slug: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    checkSlug(slug);
    const store = requireStore();
    if (!(await store.slugExists(slug))) await store.purgeFiles(slug);
    return { ok: true, data: null };
  } catch (err) {
    return failure(err);
  }
}

/* ---------- Modification / suppression ---------- */

export async function updateCatalogAction(input: {
  id: string;
  title: string;
  description: string;
  accentColor: string;
  allowDownload: boolean;
  /** true : le navigateur vient d'envoyer un PDF généré (voir preparePdfAction). */
  pdfUploaded?: boolean;
}): Promise<ActionResult<AdminCatalog>> {
  try {
    await requireAdmin();
    const store = requireStore();
    checkTexts(input.title, input.description);
    if (!ACCENT.test(input.accentColor)) throw new InputError("Couleur d'accent invalide.");

    const current = await requireCatalog(store, input.id);
    const pdfUrl = input.pdfUploaded ? storedPdfUrl(store, current.slug) : current.pdf_url;

    const row = await store.update(input.id, {
      title: input.title.trim(),
      description: input.description.trim() || null,
      accent_color: input.accentColor,
      allow_download: input.allowDownload && Boolean(pdfUrl),
      ...(input.pdfUploaded ? { pdf_url: pdfUrl } : {}),
    });
    revalidateCatalog(row.slug);
    return { ok: true, data: toAdminCatalog(row) };
  } catch (err) {
    return failure(err);
  }
}

/**
 * Pour un catalogue publié sans PDF : URLs de ses pages et destination
 * d'envoi du PDF, que le navigateur de l'admin assemble à partir des pages.
 */
export async function preparePdfAction(id: string): Promise<
  ActionResult<{ pages: string[]; target: UploadTarget; pageWidth: number | null; pageHeight: number | null }>
> {
  try {
    await requireAdmin();
    const store = requireStore();
    const row = await requireCatalog(store, id);
    const [target] = await store.createUploadTargets([pdfPath(row.slug)]);
    return {
      ok: true,
      data: { pages: pageUrls(row, store), target, pageWidth: row.page_width, pageHeight: row.page_height },
    };
  } catch (err) {
    return failure(err);
  }
}

/** Désactive ou réactive le lien public, sans rien supprimer. */
export async function setCatalogActiveAction(id: string, active: boolean): Promise<ActionResult<AdminCatalog>> {
  try {
    await requireAdmin();
    const row = await requireStore().update(id, { is_active: active });
    revalidateCatalog(row.slug);
    return { ok: true, data: toAdminCatalog(row) };
  } catch (err) {
    return failure(err);
  }
}

export async function deleteCatalogAction(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const removed = await requireStore().remove(id);
    if (removed) revalidateCatalog(removed.slug);
    return { ok: true, data: null };
  } catch (err) {
    return failure(err);
  }
}
