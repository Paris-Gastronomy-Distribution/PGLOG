/**
 * true sur un hébergeur (Vercel ou Netlify), false sur votre ordinateur.
 * Netlify ne fournit à l'exécution que URL, SITE_NAME et SITE_ID : SITE_ID
 * sert donc de marqueur.
 */
export function isHosted(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.SITE_ID);
}

/**
 * URL publique du site (liens absolus des aperçus OG / Twitter).
 * Ordre : NEXT_PUBLIC_SITE_URL → adresse principale Netlify (domaine
 * personnalisé s'il y en a un) → domaine de production Vercel → localhost.
 */
export function getSiteUrl(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    process.env.SITE_ID ? process.env.URL : undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
  ];
  for (const value of candidates) {
    if (!value) continue;
    try {
      return new URL(value);
    } catch {
      // valeur invalide : on passe à la suivante
    }
  }
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}
