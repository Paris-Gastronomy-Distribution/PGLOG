/**
 * Cron Netlify (fonction planifiée) : chaque jour à 6 h UTC, appelle
 * /api/keepalive pour éviter la mise en pause du projet Supabase gratuit
 * (pause après 7 jours sans activité). Remplace l'ancien cron Vercel.
 *
 * URL est fournie par Netlify (adresse principale du site) ; CRON_SECRET est
 * la variable d'environnement du site, exigée par /api/keepalive.
 */
export default async function keepalive(): Promise<Response> {
  const site = process.env.URL;
  if (!site) {
    console.error("keepalive : variable URL absente");
    return new Response("URL absente", { status: 500 });
  }

  const secret = process.env.CRON_SECRET;
  const res = await fetch(new URL("/api/keepalive", site), {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
  const body = await res.text();
  if (!res.ok) console.error(`keepalive : HTTP ${res.status} ${body}`);
  else console.log(`keepalive : ${body}`);
  return new Response(body, { status: res.status });
}

export const config = { schedule: "0 6 * * *" };
