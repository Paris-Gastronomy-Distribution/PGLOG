/**
 * Brouillon d'e-mail sobre : texte simple, un seul lien écrit en clair (le
 * texte affiché et la destination sont identiques, ce que les filtres
 * anti-spam vérifient). Retours à la ligne CRLF, attendus par Outlook.
 */
export function mailtoHref(title: string, url: string): string {
  const body = [
    "Bonjour,",
    "",
    `Veuillez trouver ci-dessous le lien vers notre catalogue « ${title} », consultable en ligne :`,
    url,
    "",
    "Nous restons à votre disposition pour toute question.",
    "",
    "Bien cordialement,",
  ].join("\r\n");
  return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

export function whatsappHref(title: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${title} : ${url}`)}`;
}
