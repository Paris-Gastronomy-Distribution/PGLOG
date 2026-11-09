/**
 * URL publique du site (liens absolus des aperçus OG / Twitter).
 * Ordre : NEXT_PUBLIC_SITE_URL → domaine de production Vercel → localhost.
 */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit);
    } catch {
      // valeur invalide : on passe au fallback
    }
  }
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}
