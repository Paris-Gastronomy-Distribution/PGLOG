import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Appelé chaque jour par le cron de l'hébergeur (Netlify :
 * netlify/functions/keepalive.mts ; Vercel : vercel.json) : une requête
 * légère sur la base suffit à éviter la mise en pause du projet Supabase
 * gratuit (pause après 7 jours sans activité).
 *
 * Si CRON_SECRET est défini, le cron envoie « Authorization: Bearer
 * <CRON_SECRET> » : toute autre requête est refusée.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Non autorisé" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) return Response.json({ ok: true, skipped: "Supabase non configuré" });

  const { error } = await db.from("catalogs").select("id", { head: true, count: "exact" }).limit(1);
  if (error) {
    console.error("keepalive", error.message);
    return Response.json({ ok: false, error: "Base injoignable" }, { status: 502 });
  }
  return Response.json({ ok: true, at: new Date().toISOString() });
}
