/**
 * Assemble un PDF à partir d'images JPEG (une image pleine page par page),
 * sans dépendance : le format PDF accepte le JPEG tel quel (filtre DCTDecode).
 *
 * Le document s'ouvre comme le lecteur en ligne : couverture seule puis
 * doubles pages (PageLayout /TwoPageRight), titre affiché dans la fenêtre.
 */

export interface PdfPageImage {
  /** Image JPEG RVB (canvas.toBlob("image/jpeg")). */
  jpeg: Blob;
  /** Dimensions de l'image en pixels. */
  pixelWidth: number;
  pixelHeight: number;
  /** Dimensions de la page en points PDF (1/72 de pouce). */
  pointWidth: number;
  pointHeight: number;
}

/** Points PDF pour une largeur de page rendue à 1600 px : ≈ A4 (595 pt). */
export const POINTS_PER_PIXEL = 72 / 192;

const num = (n: number) => String(Math.round(n * 100) / 100);

/** Chaîne PDF en UTF-16BE (accents, guillemets…) : <FEFF…>. */
function pdfText(text: string): string {
  let hex = "FEFF";
  for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).padStart(4, "0");
  return `<${hex}>`;
}

export function buildImagePdf(pages: PdfPageImage[], title: string): Blob {
  if (pages.length === 0) throw new Error("PDF sans page");

  const encoder = new TextEncoder();
  const parts: BlobPart[] = [];
  const offsets: number[] = [];
  let size = 0;

  const pushText = (s: string) => {
    const bytes = encoder.encode(s);
    parts.push(bytes);
    size += bytes.length;
  };
  const pushBlob = (b: Blob) => {
    parts.push(b);
    size += b.size;
  };
  const beginObject = (id: number) => {
    offsets[id] = size;
    pushText(`${id} 0 obj\n`);
  };

  // Objets : 1 catalogue, 2 arbre des pages, 3 infos, puis 3 objets par page.
  const pageId = (i: number) => 4 + i * 3;
  const contentId = (i: number) => 5 + i * 3;
  const imageId = (i: number) => 6 + i * 3;
  const objectCount = 3 + pages.length * 3;

  // En-tête ; la ligne de commentaire binaire signale un fichier binaire aux outils de transfert.
  const header = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]);
  parts.push(header);
  size += header.length;

  beginObject(1);
  pushText(
    "<< /Type /Catalog /Pages 2 0 R /PageLayout /TwoPageRight /PageMode /UseNone " +
      "/ViewerPreferences << /DisplayDocTitle true >> /Lang (fr-FR) >>\nendobj\n",
  );

  beginObject(2);
  const kids = pages.map((_, i) => `${pageId(i)} 0 R`).join(" ");
  pushText(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);

  beginObject(3);
  pushText(`<< /Title ${pdfText(title)} >>\nendobj\n`);

  pages.forEach((p, i) => {
    const w = num(p.pointWidth);
    const h = num(p.pointHeight);

    beginObject(pageId(i));
    pushText(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] ` +
        `/Resources << /XObject << /Im0 ${imageId(i)} 0 R >> >> /Contents ${contentId(i)} 0 R >>\nendobj\n`,
    );

    const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    beginObject(contentId(i));
    pushText(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);

    beginObject(imageId(i));
    pushText(
      `<< /Type /XObject /Subtype /Image /Width ${p.pixelWidth} /Height ${p.pixelHeight} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.size} >>\nstream\n`,
    );
    pushBlob(p.jpeg);
    pushText("\nendstream\nendobj\n");
  });

  const xrefOffset = size;
  let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= objectCount; id++) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pushText(xref);
  pushText(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return new Blob(parts, { type: "application/pdf" });
}
