type RGB = [number, number, number];

function parseHex(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

/** Luminance relative WCAG. */
function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const WHITE: RGB = [255, 255, 255];
const INK: RGB = [17, 17, 17];

export interface AccentPalette {
  /** Couleur choisie, normalisée. */
  accent: string;
  /** Variante lisible sur le fond sombre du viewer (contraste ≥ 3:1). */
  ui: string;
  /** Couleur du texte/icône posé sur `ui`. */
  onUi: string;
}

/**
 * Dérive les couleurs des contrôles à partir de la couleur d'accent.
 * Une couleur trop sombre (ex. le défaut #111111) serait invisible sur le
 * fond du viewer : on l'éclaircit juste assez pour atteindre 3:1.
 */
export function accentPalette(hex: string, background = "#141416"): AccentPalette {
  const base = parseHex(hex) ?? parseHex("#111111")!;
  const bg = parseHex(background)!;

  let ui = base;
  for (let t = 0.05; contrast(ui, bg) < 3 && t <= 1; t += 0.05) {
    ui = mix(base, WHITE, t);
  }

  return {
    accent: toHex(base),
    ui: toHex(ui),
    onUi: contrast(ui, WHITE) >= contrast(ui, INK) ? "#ffffff" : "#111111",
  };
}
