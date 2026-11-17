/**
 * PDF téléchargeable = le PDF d'origine exporté de Canva, sans aucune
 * recompression : texte vectoriel (net à tous les zooms, sélectionnable),
 * images, polices et liens restent exactement ceux du fichier.
 *
 * Seuls deux réglages d'affichage sont ajoutés, comme dans le lecteur :
 * ouverture en doubles pages (couverture seule à droite) et titre du
 * catalogue dans la barre de la fenêtre. Si le fichier ne se laisse pas
 * réécrire proprement, il est envoyé tel quel.
 */

import { MAX_PDF_BYTES } from "./catalog-urls";

export async function prepareOriginalPdf(original: Uint8Array, title: string, expectedPages: number): Promise<Blob> {
  const untouched = () => new Blob([original.slice()], { type: "application/pdf" });
  try {
    const { PDFDocument, PDFName } = await import("pdf-lib");
    const doc = await PDFDocument.load(original, { updateMetadata: false });
    if (doc.getPageCount() !== expectedPages) return untouched();

    doc.catalog.set(PDFName.of("PageLayout"), PDFName.of("TwoPageRight"));
    if (title) doc.setTitle(title, { showInWindowTitleBar: true });
    const bytes = await doc.save({ updateFieldAppearances: false });

    // Contrôle : le fichier réécrit se relit, avec le même nombre de pages.
    const check = await PDFDocument.load(bytes, { updateMetadata: false });
    if (check.getPageCount() !== expectedPages || bytes.length > MAX_PDF_BYTES) return untouched();
    return new Blob([bytes.slice()], { type: "application/pdf" });
  } catch (err) {
    console.warn("PDF d'origine envoyé sans réglage d'affichage :", err);
    return untouched();
  }
}
