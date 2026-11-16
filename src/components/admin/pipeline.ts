"use client";

import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  abortUploadAction,
  finalizeCatalogAction,
  prepareUploadAction,
} from "@/app/admin/actions";
import { coverPath, ogImagePath, PAGE_RENDER_WIDTH, pagePath, pdfPath, STORAGE_BUCKET } from "@/lib/catalog-urls";
import { buildImagePdf, POINTS_PER_PIXEL, type PdfPageImage } from "@/lib/image-pdf";
import type { UploadTarget } from "@/lib/store/types";
import { getBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Conversion PDF → images, ENTIÈREMENT dans le navigateur de l'admin :
 * pdf.js rend chaque page sur un <canvas> (1600 px de large), export WebP
 * 0,82, puis envoi direct vers le stockage (4 envois en parallèle, 3 essais).
 * Le PDF téléchargeable est assemblé à partir des mêmes rendus : il montre
 * exactement les pages du lecteur.
 */

const MAX_PDF_BYTES = 50 * 1024 * 1024;
const WEBP_QUALITY = 0.82;
const COVER_WIDTH = 400;
const UPLOAD_CONCURRENCY = 4;
const MAX_BUFFERED = 8; // pages rendues en attente d'envoi (mémoire)
const RETRY_DELAYS = [800, 2000, 5000];

/** PDF téléchargeable : sous la limite de 50 Mo par fichier du stockage, avec une marge. */
const PDF_BUDGET_BYTES = 46 * 1024 * 1024;
/** Plafond par page, même pour un petit catalogue. */
const PDF_PAGE_MAX_BYTES = 1.5 * 1024 * 1024;
/** Réglages JPEG essayés dans l'ordre jusqu'à tenir dans le budget de la page. */
const PDF_JPEG_STEPS = [
  { width: 1600, quality: 0.86 },
  { width: 1600, quality: 0.74 },
  { width: 1280, quality: 0.72 },
  { width: 1024, quality: 0.68 },
  { width: 800, quality: 0.62 },
] as const;

export class PublishError extends Error {}

/* ---------- pdf.js ---------- */

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let pdfjsPromise: Promise<PdfJs> | null = null;

function loadPdfjs(): Promise<PdfJs> {
  pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    return pdfjs;
  });
  return pdfjsPromise;
}

function webpSupported(): boolean {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  return c.toDataURL("image/webp").startsWith("data:image/webp");
}

export function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo` : `${Math.round(bytes / 1024)} Ko`;
}

/** Ouvre et valide le PDF choisi par l'admin. */
export async function openPdf(file: File): Promise<PDFDocumentProxy> {
  const looksPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!looksPdf) throw new PublishError("Ce fichier n'est pas un PDF. Sur Canva : Partager → Télécharger → PDF.");
  if (file.size > MAX_PDF_BYTES) {
    throw new PublishError(
      `Ce PDF pèse ${formatBytes(file.size)}, la limite est de 50 Mo. Sur Canva, choisissez « PDF Standard » plutôt que « PDF Impression ».`,
    );
  }
  if (!webpSupported()) {
    throw new PublishError("Ce navigateur ne sait pas créer d'images WebP. Utilisez Chrome, Edge ou Firefox sur ordinateur.");
  }
  const pdfjs = await loadPdfjs();
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    return await pdfjs.getDocument({ data }).promise;
  } catch (err) {
    if (err instanceof Error && err.name === "PasswordException") {
      throw new PublishError("Ce PDF est protégé par un mot de passe. Exportez-le à nouveau sans protection.");
    }
    throw new PublishError("Impossible de lire ce PDF. Il est peut-être endommagé : exportez-le à nouveau depuis Canva.");
  }
}

async function renderPage(page: PDFPageProxy, width: number, canvas: HTMLCanvasElement) {
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: width / base.width });
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvas, viewport, background: "#ffffff" }).promise;
}

/** Miniature d'aperçu (zone de dépôt). */
export async function renderThumbnail(pdf: PDFDocumentProxy, width = 360): Promise<string> {
  const page = await pdf.getPage(1);
  const canvas = document.createElement("canvas");
  await renderPage(page, width, canvas);
  page.cleanup();
  return canvas.toDataURL("image/webp", 0.8);
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new PublishError("Conversion de l'image impossible."))), type, quality),
  );
}

function scaledCopy(source: HTMLCanvasElement, width: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = Math.round((source.height * width) / source.width);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, c.width, c.height);
  return c;
}

/** Aperçu réseaux sociaux 1200×630 : couverture centrée sur fond sombre. */
async function makeOgImage(cover: HTMLCanvasElement): Promise<Blob> {
  const W = 1200;
  const H = 630;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const bg = ctx.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.45, W * 0.75);
  bg.addColorStop(0, "#2a2a2e");
  bg.addColorStop(1, "#111113");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const h = 540;
  const w = Math.min(Math.round((cover.width * h) / cover.height), W - 80);
  const drawH = Math.round((cover.height * w) / cover.width);
  const x = Math.round((W - w) / 2);
  const y = Math.round((H - drawH) / 2);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, w, drawH);
  ctx.restore();
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(cover, x, y, w, drawH);
  return toBlob(c, "image/jpeg", 0.86);
}

/* ---------- PDF téléchargeable ---------- */

/** Budget JPEG d'une page pour que le PDF complet tienne sous la limite de stockage. */
const pdfPageBudget = (pageCount: number) => Math.min(PDF_PAGE_MAX_BYTES, PDF_BUDGET_BYTES / pageCount);

/**
 * Encode une page rendue en JPEG pour le PDF, en réduisant qualité puis
 * définition jusqu'à tenir dans le budget de la page.
 */
async function encodePdfPage(
  source: HTMLCanvasElement,
  budget: number,
  points: { width: number; height: number },
): Promise<PdfPageImage> {
  let image: PdfPageImage | null = null;
  for (const step of PDF_JPEG_STEPS) {
    const canvas = step.width < source.width ? scaledCopy(source, step.width) : source;
    const jpeg = await toBlob(canvas, "image/jpeg", step.quality);
    image = {
      jpeg,
      pixelWidth: canvas.width,
      pixelHeight: canvas.height,
      pointWidth: points.width,
      pointHeight: points.height,
    };
    if (canvas !== source) canvas.width = canvas.height = 0;
    if (jpeg.size <= budget) break;
  }
  return image!;
}

function assemblePdf(pages: PdfPageImage[], title: string): Blob {
  const pdf = buildImagePdf(pages, title);
  if (pdf.size > MAX_PDF_BYTES) {
    throw new PublishError(
      `Le PDF téléchargeable dépasserait 50 Mo (${formatBytes(pdf.size)}). Désactivez le téléchargement pour ce catalogue.`,
    );
  }
  return pdf;
}

/* ---------- Envois ---------- */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_DELAYS.length) await sleep(RETRY_DELAYS[attempt]);
    }
  }
  throw lastError;
}

async function uploadFile(target: UploadTarget | undefined, body: Blob, contentType: string, label: string) {
  if (!target) throw new PublishError(`Destination d'envoi manquante (${label}).`);
  try {
    await withRetry(async () => {
      if (target.kind === "supabase") {
        const { error } = await getBrowserSupabase()
          .storage.from(STORAGE_BUCKET)
          .uploadToSignedUrl(target.path, target.token, body, { contentType, upsert: true, cacheControl: "604800" });
        if (error) throw error;
      } else {
        const res = await fetch(target.url, { method: "PUT", body, headers: { "content-type": contentType } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
    });
  } catch (err) {
    console.error(err);
    throw new PublishError(`L'envoi ${label} a échoué après ${RETRY_DELAYS.length + 1} essais. Vérifiez votre connexion puis réessayez.`);
  }
}

/** File d'envois à concurrence limitée. */
function createQueue(concurrency: number) {
  const pending: Array<() => Promise<void>> = [];
  let running = 0;
  let failure: unknown = null;
  let waiters: Array<() => void> = [];

  const notify = () => {
    const w = waiters;
    waiters = [];
    w.forEach((fn) => fn());
  };
  const wait = () => new Promise<void>((r) => waiters.push(r));
  const pump = () => {
    while (!failure && running < concurrency && pending.length > 0) {
      const task = pending.shift()!;
      running++;
      task()
        .catch((err) => {
          failure ??= err;
        })
        .finally(() => {
          running--;
          notify();
          pump();
        });
    }
  };

  return {
    push(task: () => Promise<void>) {
      pending.push(task);
      pump();
    },
    async waitBelow(limit: number) {
      while (!failure && running + pending.length >= limit) await wait();
      if (failure) throw failure;
    },
    async drain() {
      while (!failure && running + pending.length > 0) await wait();
      if (failure) throw failure;
    },
    /** Abandonne ce qui n'a pas démarré et attend la fin des envois en cours. */
    async cancel() {
      pending.length = 0;
      while (running > 0) await wait();
    },
  };
}

/* ---------- Publication ---------- */

export type PublishStage = "prepare" | "pages" | "pdf" | "finalize";

export interface PublishProgress {
  stage: PublishStage;
  total: number;
  rendered: number;
  uploaded: number;
  coverPreview?: string;
}

export interface PublishInput {
  pdf: PDFDocumentProxy;
  slug: string;
  title: string;
  description: string;
  accentColor: string;
  allowDownload: boolean;
}

export async function publishCatalog(
  input: PublishInput,
  onProgress: (p: PublishProgress) => void,
  signal: AbortSignal,
): Promise<{ url: string; slug: string }> {
  const { pdf, slug } = input;
  const total = pdf.numPages;
  const withPdf = input.allowDownload;
  const progress: PublishProgress = { stage: "prepare", total, rendered: 0, uploaded: 0 };
  const emit = () => onProgress({ ...progress });
  const checkAbort = () => {
    if (signal.aborted) throw new PublishError("Publication annulée.");
  };
  emit();

  const prep = await prepareUploadAction({ slug, pageCount: total, withPdf });
  if (!prep.ok) throw new PublishError(prep.error);
  const targets = new Map(prep.data.targets.map((t) => [t.path, t]));
  const queue = createQueue(UPLOAD_CONCURRENCY);
  const canvas = document.createElement("canvas");
  const pdfPages: PdfPageImage[] = [];
  const pdfBudget = pdfPageBudget(total);

  try {
    progress.stage = "pages";
    emit();
    let pageWidth = 0;
    let pageHeight = 0;

    for (let n = 1; n <= total; n++) {
      checkAbort();
      const page = await pdf.getPage(n);
      await renderPage(page, PAGE_RENDER_WIDTH, canvas);
      if (withPdf) {
        // Format de page d'origine (points PDF), image identique à celle du lecteur.
        const { width, height } = page.getViewport({ scale: 1 });
        pdfPages.push(await encodePdfPage(canvas, pdfBudget, { width, height }));
      }
      const blob = await toBlob(canvas, "image/webp", WEBP_QUALITY);
      if (blob.type !== "image/webp") {
        throw new PublishError("Ce navigateur ne sait pas créer d'images WebP. Utilisez Chrome, Edge ou Firefox.");
      }

      if (n === 1) {
        pageWidth = canvas.width;
        pageHeight = canvas.height;
        const cover = scaledCopy(canvas, COVER_WIDTH);
        const coverBlob = await toBlob(cover, "image/webp", WEBP_QUALITY);
        const ogBlob = await makeOgImage(scaledCopy(canvas, 800));
        progress.coverPreview = URL.createObjectURL(coverBlob);
        queue.push(() => uploadFile(targets.get(coverPath(slug)), coverBlob, "image/webp", "de la miniature"));
        queue.push(() => uploadFile(targets.get(ogImagePath(slug)), ogBlob, "image/jpeg", "de l'aperçu"));
      }
      page.cleanup();

      queue.push(async () => {
        await uploadFile(targets.get(pagePath(slug, n)), blob, "image/webp", `de la page ${n}`);
        progress.uploaded++;
        emit();
      });
      progress.rendered = n;
      emit();
      await queue.waitBelow(MAX_BUFFERED);
    }

    await queue.drain();
    checkAbort();

    if (withPdf) {
      progress.stage = "pdf";
      emit();
      const file = assemblePdf(pdfPages, input.title.trim());
      pdfPages.length = 0;
      await uploadFile(targets.get(pdfPath(slug)), file, "application/pdf", "du PDF");
      checkAbort();
    }

    progress.stage = "finalize";
    emit();
    const result = await finalizeCatalogAction({
      slug,
      title: input.title,
      description: input.description,
      accentColor: input.accentColor,
      withPdf,
      pageCount: total,
      pageWidth,
      pageHeight,
    });
    if (!result.ok) throw new PublishError(result.error);
    return result.data;
  } catch (err) {
    await queue.cancel();
    await abortUploadAction(slug).catch(() => undefined);
    throw err instanceof PublishError ? err : new PublishError("La publication a échoué. Réessayez.");
  } finally {
    canvas.width = 0;
    canvas.height = 0;
    pdfPages.length = 0;
  }
}

/* ---------- PDF d'un catalogue déjà publié ---------- */

export interface PdfSource {
  pages: string[];
  target: UploadTarget;
  pageWidth: number | null;
  pageHeight: number | null;
}

async function loadPageImage(url: string): Promise<ImageBitmap> {
  return withRetry(async () => {
    const res = await fetch(url, { mode: "cors", cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return createImageBitmap(await res.blob());
  });
}

/**
 * Assemble et envoie le PDF d'un catalogue publié sans PDF, à partir des
 * pages déjà en ligne (les images exactes du lecteur).
 */
export async function generateCatalogPdf(
  source: PdfSource,
  title: string,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const total = source.pages.length;
  const budget = pdfPageBudget(total);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const pdfPages: PdfPageImage[] = [];

  try {
    for (let i = 0; i < total; i++) {
      let bitmap: ImageBitmap;
      try {
        bitmap = await loadPageImage(source.pages[i]);
      } catch {
        throw new PublishError(`La page ${i + 1} n'a pas pu être téléchargée. Vérifiez votre connexion puis réessayez.`);
      }
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();

      const w = source.pageWidth ?? canvas.width;
      const h = source.pageHeight ?? canvas.height;
      pdfPages.push(await encodePdfPage(canvas, budget, { width: w * POINTS_PER_PIXEL, height: h * POINTS_PER_PIXEL }));
      onProgress(i + 1, total);
    }
    await uploadFile(source.target, assemblePdf(pdfPages, title.trim()), "application/pdf", "du PDF");
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
