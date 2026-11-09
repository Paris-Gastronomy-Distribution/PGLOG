import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/admin-session";
import { getBackendStatus } from "@/lib/store";
import { localFilePath } from "@/lib/store/local-store";

/**
 * Stockage de fichiers du MODE LOCAL (développement sans Supabase).
 * Désactivé dès que Supabase est configuré, et toujours en production.
 */

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
};
const MAX_BYTES = 52 * 1024 * 1024;

type Ctx = { params: Promise<{ path: string[] }> };

function enabled() {
  return getBackendStatus().kind === "local";
}

async function resolve(ctx: Ctx) {
  const { path: segments } = await ctx.params;
  const storagePath = segments.join("/");
  const file = localFilePath(storagePath);
  const type = TYPES[path.extname(storagePath).toLowerCase()];
  return file && type ? { file, type } : null;
}

export async function GET(_req: Request, ctx: Ctx) {
  if (!enabled()) return new Response("Introuvable", { status: 404 });
  const target = await resolve(ctx);
  if (!target) return new Response("Introuvable", { status: 404 });
  try {
    const body = await readFile(target.file);
    return new Response(new Uint8Array(body), {
      headers: { "content-type": target.type, "cache-control": "no-store" },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  if (!enabled()) return new Response("Introuvable", { status: 404 });
  if (!(await isAdmin())) return Response.json({ error: "Non autorisé" }, { status: 401 });
  const target = await resolve(ctx);
  if (!target) return Response.json({ error: "Chemin invalide" }, { status: 400 });

  const body = new Uint8Array(await req.arrayBuffer());
  if (body.byteLength === 0 || body.byteLength > MAX_BYTES) {
    return Response.json({ error: "Taille de fichier invalide" }, { status: 413 });
  }
  await mkdir(path.dirname(target.file), { recursive: true });
  await writeFile(target.file, body);
  return Response.json({ ok: true });
}
