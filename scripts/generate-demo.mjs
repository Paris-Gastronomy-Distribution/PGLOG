#!/usr/bin/env node
/**
 * Génère le catalogue de démonstration servi sur /c/demo.
 *
 *   node scripts/generate-demo.mjs
 *
 * Produit dans public/demo/ exactement les mêmes formats que le pipeline
 * d'upload réel :
 *   page-001.webp … page-024.webp   1600 px de large, WebP qualité 82
 *   cover.webp                      miniature 400 px
 *   og.jpg                          aperçu 1200×630 (WhatsApp, LinkedIn, mail)
 *   demo.pdf                        PDF du catalogue (bouton « Télécharger »)
 *
 * Les pages sont dessinées en SVG (données fictives) puis rastérisées par sharp.
 */
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "demo");

const W = 1600;
const H = 2263; // ratio A4 (1 : 1,4142)
const M = 110; // marge

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const C = {
  paper: "#FBF8F2",
  cream: "#F3ECDF",
  ink: "#1C1B19",
  muted: "#77716A",
  rule: "#DDD3C2",
  green: "#1E3B2F",
  greenDeep: "#152B22",
  gold: "#C99A3B",
  white: "#FFFFFF",
};

const SECTIONS = {
  epicerie: { name: "Épicerie fine", num: "01", main: "#C38E2F", dark: "#8C6119", light: "#F4E3BE", bg: "#FAF1DD" },
  cremerie: { name: "Crèmerie & fromages", num: "02", main: "#7D8C55", dark: "#55623A", light: "#E5EACF", bg: "#F1F3E4" },
  charcuterie: { name: "Charcuterie", num: "03", main: "#B4532A", dark: "#7E3519", light: "#F2D5C5", bg: "#F8E9E0" },
  cave: { name: "La cave", num: "04", main: "#6B2737", dark: "#4A1724", light: "#E8CCD3", bg: "#F4E6E9" },
  douceurs: { name: "Douceurs", num: "05", main: "#C2706A", dark: "#8E4741", light: "#F5D9D3", bg: "#FAECE8" },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function t(x, y, str, o = {}) {
  const {
    size = 30,
    family = SANS,
    weight = 400,
    fill = C.ink,
    anchor = "start",
    ls = 0,
    italic = false,
    opacity = 1,
  } = o;
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}"${italic ? ' font-style="italic"' : ""}${opacity !== 1 ? ` opacity="${opacity}"` : ""}>${esc(str)}</text>`;
}

function lines(x, y, arr, lh, o) {
  return arr.map((s, i) => t(x, y + i * lh, s, o)).join("");
}

function svg(content, bg = C.paper) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${bg}"/>${content}</svg>`;
}

function footer(n, { dark = false } = {}) {
  const fill = dark ? "rgba(255,255,255,0.72)" : C.muted;
  return (
    t(M, H - 86, "MAISON DÉMO  ·  AUTOMNE — HIVER 2026", { size: 21, fill, ls: 3, weight: 600 }) +
    t(W - M, H - 86, String(n).padStart(2, "0"), { size: 24, fill, anchor: "end", weight: 600, ls: 2 })
  );
}

/* ---------- Illustrations vectorielles (repère 200×200) ---------- */

function illo(kind, s) {
  const { main, dark, light } = s;
  const shine = `fill="#FFFFFF" opacity="0.2"`;
  switch (kind) {
    case "bottle":
      return `
        <rect x="84" y="16" width="32" height="22" rx="4" fill="${dark}"/>
        <path d="M86 38 H114 V66 C114 80 142 86 142 108 V172 A8 8 0 0 1 134 180 H66 A8 8 0 0 1 58 172 V108 C58 86 86 80 86 66 Z" fill="${main}"/>
        <rect x="66" y="112" width="68" height="46" rx="4" fill="${light}"/>
        <rect x="76" y="124" width="48" height="6" rx="3" fill="${dark}" opacity="0.65"/>
        <rect x="84" y="138" width="32" height="4" rx="2" fill="${dark}" opacity="0.4"/>
        <rect x="66" y="94" width="7" height="72" rx="3.5" ${shine}/>`;
    case "jar":
      return `
        <rect x="58" y="40" width="84" height="24" rx="5" fill="${dark}"/>
        <rect x="50" y="60" width="100" height="120" rx="20" fill="${main}"/>
        <rect x="62" y="98" width="76" height="52" rx="4" fill="${light}"/>
        <rect x="72" y="112" width="56" height="6" rx="3" fill="${dark}" opacity="0.65"/>
        <rect x="80" y="126" width="40" height="4" rx="2" fill="${dark}" opacity="0.4"/>
        <rect x="59" y="74" width="7" height="88" rx="3.5" ${shine}/>`;
    case "wedge":
      return `
        <path d="M24 118 L176 118 L150 58 Z" fill="${light}"/>
        <path d="M150 58 L176 118 L176 122 Z" fill="${dark}" opacity="0.5"/>
        <rect x="24" y="118" width="152" height="54" fill="${main}"/>
        <rect x="24" y="166" width="152" height="6" fill="${dark}" opacity="0.6"/>
        <circle cx="58" cy="140" r="9" fill="${dark}" opacity="0.45"/>
        <circle cx="104" cy="150" r="6" fill="${dark}" opacity="0.45"/>
        <circle cx="142" cy="136" r="11" fill="${dark}" opacity="0.45"/>
        <circle cx="120" cy="96" r="7" fill="${main}" opacity="0.5"/>`;
    case "round":
      return `
        <ellipse cx="100" cy="132" rx="80" ry="30" fill="${dark}"/>
        <rect x="20" y="96" width="160" height="36" fill="${dark}"/>
        <ellipse cx="100" cy="96" rx="80" ry="30" fill="${main}"/>
        <ellipse cx="100" cy="96" rx="58" ry="20" fill="${light}" opacity="0.55"/>
        <path d="M100 96 L180 96 A80 30 0 0 0 160 76 Z" fill="${light}"/>`;
    case "bar":
      return `
        <rect x="32" y="56" width="136" height="96" rx="8" fill="${main}"/>
        ${[0, 1, 2, 3]
          .map((c) =>
            [0, 1]
              .map((r) => `<rect x="${42 + c * 31}" y="${66 + r * 26}" width="24" height="19" rx="3" fill="${dark}" opacity="0.45"/>`)
              .join(""),
          )
          .join("")}
        <path d="M32 116 H168 V144 A8 8 0 0 1 160 152 H40 A8 8 0 0 1 32 144 Z" fill="${light}"/>
        <rect x="60" y="128" width="80" height="6" rx="3" fill="${dark}" opacity="0.6"/>`;
    case "box":
      return `
        <polygon points="36,74 66,50 168,50 138,74" fill="${light}"/>
        <polygon points="138,74 168,50 168,150 138,174" fill="${dark}"/>
        <rect x="36" y="74" width="102" height="100" fill="${main}"/>
        <circle cx="87" cy="124" r="28" fill="${light}"/>
        <rect x="70" y="120" width="34" height="6" rx="3" fill="${dark}" opacity="0.6"/>`;
    case "slice":
      return `
        <ellipse cx="100" cy="108" rx="80" ry="60" fill="${light}"/>
        <ellipse cx="96" cy="110" rx="68" ry="49" fill="${main}"/>
        <path d="M50 100 q22 -16 44 0 t44 0" stroke="${light}" stroke-width="5" fill="none" opacity="0.7"/>
        <path d="M58 126 q18 -12 36 0 t36 0" stroke="${light}" stroke-width="4" fill="none" opacity="0.5"/>
        <ellipse cx="78" cy="88" rx="10" ry="6" fill="#FFFFFF" opacity="0.25"/>`;
    case "sausage":
      return `
        <g transform="rotate(-14 100 108)">
          <rect x="20" y="86" width="160" height="46" rx="23" fill="${main}"/>
          <circle cx="56" cy="102" r="4" fill="${light}"/><circle cx="84" cy="116" r="3" fill="${light}"/>
          <circle cx="112" cy="100" r="4" fill="${light}"/><circle cx="140" cy="114" r="3" fill="${light}"/>
          <rect x="34" y="94" width="110" height="6" rx="3" fill="#FFFFFF" opacity="0.2"/>
          <path d="M180 109 q14 -4 16 -20" stroke="${dark}" stroke-width="4" fill="none"/>
        </g>`;
    case "macaron":
      return `
        <ellipse cx="128" cy="78" rx="44" ry="17" fill="${light}"/>
        <rect x="88" y="84" width="80" height="10" rx="5" fill="${dark}" opacity="0.5"/>
        <ellipse cx="128" cy="100" rx="44" ry="17" fill="${light}"/>
        <ellipse cx="88" cy="112" rx="60" ry="23" fill="${main}"/>
        <rect x="32" y="122" width="112" height="14" rx="7" fill="${light}"/>
        <ellipse cx="88" cy="146" rx="60" ry="23" fill="${main}"/>
        <ellipse cx="70" cy="104" rx="16" ry="5" fill="#FFFFFF" opacity="0.25"/>`;
    default:
      return "";
  }
}

function placeIllo(kind, sec, cx, cy, size) {
  const k = size / 200;
  return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${k})">${illo(kind, sec)}</g>`;
}

/* ---------- Données fictives ---------- */

const PRODUCTS = {
  epicerie: [
    ["Huile d'olive vierge extra", "Fruité vert, moulin de Provence", "EP-0142 · 50 cl", "14,90", "bottle", "Nouveau"],
    ["Moutarde à l'ancienne", "Graines de Bourgogne", "EP-0218 · 210 g", "4,20", "jar"],
    ["Fleur de sel de Guérande", "Récoltée à la main", "EP-0307 · 125 g", "5,60", "jar"],
    ["Vinaigre de Xérès", "Réserve, vieilli 7 ans", "EP-0411 · 25 cl", "9,80", "bottle"],
    ["Miel de châtaignier", "Cévennes, récolte 2026", "EP-0520 · 250 g", "8,90", "jar", "Bio"],
    ["Pâtes artisanales", "Blé dur, séchage lent", "EP-0633 · 500 g", "3,90", "box"],
    ["Piment d'Espelette AOP", "Poudre, Pays basque", "EP-0702 · 40 g", "7,40", "jar"],
    ["Huile de noix vierge", "Périgord, pression à froid", "EP-0815 · 25 cl", "11,20", "bottle"],
    ["Sardines millésimées", "À l'huile d'olive, 2025", "EP-0921 · 115 g", "6,80", "box", "Édition"],
    ["Confit d'oignons", "Cuisson lente au vin rouge", "EP-1004 · 220 g", "4,60", "jar"],
    ["Riz de Camargue IGP", "Complet, semi-long", "EP-1110 · 1 kg", "5,20", "box"],
    ["Tapenade noire", "Olives de Nyons", "EP-1236 · 180 g", "5,90", "jar"],
  ],
  cremerie: [
    ["Comté AOP 18 mois", "Fruité, notes de noisette", "CR-0105 · le kg", "28,90", "wedge", "Affiné"],
    ["Beurre de baratte", "Demi-sel, Charentes", "CR-0212 · 250 g", "4,80", "bar"],
    ["Brie de Meaux AOP", "Lait cru, coulant", "CR-0330 · le kg", "21,50", "round"],
    ["Crème crue d'Isigny", "AOP, épaisse", "CR-0418 · 50 cl", "5,40", "jar"],
    ["Roquefort AOP", "Caves de Combalou", "CR-0527 · le kg", "31,00", "wedge"],
    ["Tomme de Savoie IGP", "Croûte fleurie, douce", "CR-0611 · le kg", "17,80", "round"],
    ["Saint-Nectaire fermier", "Affiné sur paille de seigle", "CR-0709 · le kg", "22,40", "round", "Fermier"],
    ["Chèvre cendré", "Vallée du Cher", "CR-0816 · 150 g", "4,90", "round"],
    ["Mimolette extra-vieille", "24 mois, Flandres", "CR-0924 · le kg", "26,30", "wedge"],
    ["Yaourt fermier nature", "Lait entier, pot verre", "CR-1003 · 4 × 125 g", "3,60", "jar"],
    ["Bleu d'Auvergne AOP", "Persillé, crémeux", "CR-1119 · le kg", "16,90", "wedge"],
    ["Beurre aux cristaux", "Sel de Noirmoutier", "CR-1207 · 125 g", "3,40", "bar"],
  ],
  charcuterie: [
    ["Jambon de Bayonne IGP", "Affiné 12 mois", "CH-0108 · le kg", "24,90", "slice"],
    ["Saucisson sec pur porc", "Fabrication artisanale", "CH-0215 · 250 g", "6,90", "sausage", "Maison"],
    ["Terrine de campagne", "Au poivre vert", "CH-0322 · 350 g", "7,20", "box"],
    ["Rillettes du Mans", "Cuites au chaudron", "CH-0419 · 220 g", "5,30", "jar"],
    ["Chorizo ibérique", "Bellota, doux", "CH-0526 · 200 g", "8,60", "sausage"],
    ["Coppa de Corse AOP", "Tranchée finement", "CH-0613 · 100 g", "6,40", "slice"],
    ["Pâté en croûte", "Volaille et pistaches", "CH-0731 · le kg", "29,50", "box", "Signature"],
    ["Magret de canard séché", "Sud-Ouest, IGP", "CH-0804 · 150 g", "9,90", "slice"],
    ["Andouille de Guémené", "Fumée au bois de hêtre", "CH-0912 · le kg", "19,80", "sausage"],
    ["Mousse de foie", "Au porto", "CH-1028 · 180 g", "4,70", "jar"],
    ["Lonzo de Corse", "Filet séché, 6 mois", "CH-1117 · 100 g", "7,10", "slice"],
    ["Saucisse de Morteau IGP", "Fumée au tuyé", "CH-1225 · 400 g", "8,40", "sausage"],
  ],
  cave: [
    ["Bourgogne Pinot noir", "Rouge, 2023", "CA-0101 · 75 cl", "16,50", "bottle"],
    ["Sancerre", "Blanc, sauvignon, 2024", "CA-0204 · 75 cl", "18,90", "bottle", "Coup de cœur"],
    ["Champagne brut", "Blanc de blancs", "CA-0311 · 75 cl", "32,00", "bottle"],
    ["Côtes-du-Rhône", "Rouge, grenache-syrah", "CA-0418 · 75 cl", "9,40", "bottle"],
    ["Crémant d'Alsace", "Brut, méthode traditionnelle", "CA-0523 · 75 cl", "12,80", "bottle"],
    ["Cidre fermier", "Brut, pays d'Auge", "CA-0607 · 75 cl", "5,90", "bottle"],
    ["Chablis", "Blanc, chardonnay, 2024", "CA-0714 · 75 cl", "19,60", "bottle"],
    ["Bordeaux supérieur", "Rouge, élevé en fût", "CA-0820 · 75 cl", "13,20", "bottle"],
    ["Muscadet sur lie", "Sèvre-et-Maine, 2025", "CA-0912 · 75 cl", "8,70", "bottle"],
    ["Calvados AOC", "Pays d'Auge, 8 ans", "CA-1006 · 70 cl", "38,00", "bottle", "Rare"],
    ["Jus de pomme", "Artisanal, non filtré", "CA-1113 · 1 L", "4,20", "bottle"],
    ["Coffret dégustation", "3 vins de saison", "CA-1230 · 3 × 75 cl", "44,00", "box"],
  ],
  douceurs: [
    ["Chocolat noir 70 %", "Pérou, grand cru", "DO-0110 · 100 g", "4,90", "bar"],
    ["Caramel beurre salé", "À tartiner", "DO-0216 · 220 g", "6,20", "jar", "Best-seller"],
    ["Calissons d'Aix", "Amande et melon confit", "DO-0322 · 200 g", "12,40", "box"],
    ["Macarons assortis", "Coffret de 12", "DO-0427 · 12 pièces", "16,80", "macaron"],
    ["Nougat de Montélimar", "Miel de lavande", "DO-0509 · 150 g", "7,30", "bar"],
    ["Confiture de fraises", "Cuite au chaudron", "DO-0618 · 320 g", "5,10", "jar"],
    ["Sablés bretons", "Au beurre AOP", "DO-0704 · 250 g", "4,60", "box"],
    ["Pâtes de fruits", "Assortiment de saison", "DO-0811 · 300 g", "9,80", "box"],
    ["Marrons glacés", "Ardèche, à la vanille", "DO-0925 · 8 pièces", "18,50", "macaron", "Fêtes"],
    ["Chocolat au lait 45 %", "Noisettes du Piémont", "DO-1002 · 100 g", "4,40", "bar"],
    ["Madeleines pur beurre", "Commercy", "DO-1115 · 12 pièces", "5,80", "box"],
    ["Pâte à tartiner", "Noisette, sans huile de palme", "DO-1208 · 350 g", "7,90", "jar"],
  ],
};

/* ---------- Gabarits de pages ---------- */

function coverPage() {
  const s = SECTIONS.epicerie;
  const plate = `
    <circle cx="800" cy="1010" r="470" fill="${C.greenDeep}"/>
    <circle cx="800" cy="1010" r="400" fill="#F3ECDF"/>
    <circle cx="800" cy="1010" r="330" fill="none" stroke="${C.gold}" stroke-width="3" opacity="0.7"/>
    ${placeIllo("round", SECTIONS.cremerie, 640, 900, 300)}
    ${placeIllo("bottle", SECTIONS.cave, 950, 880, 340)}
    ${placeIllo("jar", s, 700, 1150, 240)}
    ${placeIllo("slice", SECTIONS.charcuterie, 920, 1160, 230)}
  `;
  return svg(
    `
    <rect x="56" y="56" width="${W - 112}" height="${H - 112}" fill="none" stroke="${C.gold}" stroke-width="2" opacity="0.55"/>
    ${t(W / 2, 210, "MAISON DÉMO", { size: 34, fill: C.gold, anchor: "middle", weight: 600, ls: 14 })}
    ${t(W / 2, 290, "ÉPICERIE FINE  ·  PRODUITS FRAIS  ·  CAVE", { size: 22, fill: "rgba(255,255,255,0.6)", anchor: "middle", ls: 6, weight: 600 })}
    ${plate}
    ${t(W / 2, 1720, "Catalogue", { size: 210, family: SERIF, fill: C.white, anchor: "middle" })}
    ${t(W / 2, 1830, "Automne — Hiver 2026", { size: 72, family: SERIF, fill: C.gold, anchor: "middle", italic: true })}
    <rect x="${W / 2 - 60}" y="1900" width="120" height="2" fill="${C.gold}" opacity="0.7"/>
    ${t(W / 2, 1990, "Sélection professionnelle · Prix HT", { size: 30, fill: "rgba(255,255,255,0.75)", anchor: "middle", ls: 2 })}
  `,
    C.green,
  );
}

function editoPage(n) {
  const body = [
    "Cette saison, nous avons pris le temps. Le temps de",
    "goûter, de comparer, de rencontrer celles et ceux qui",
    "font les produits que vous servez chaque jour.",
    "",
    "Vous trouverez dans ces pages une sélection resserrée :",
    "des huiles pressées à froid, des fromages affinés sans",
    "raccourci, des charcuteries de tradition et une cave",
    "pensée pour accompagner la cuisine de saison.",
    "",
    "Chaque référence est disponible à la commande toute",
    "l'année, livrée sous 48 heures en Île-de-France.",
    "Bonne lecture, et belle saison à vos tables.",
  ];
  return svg(
    `
    ${t(M, 230, "ÉDITO", { size: 26, fill: SECTIONS.charcuterie.main, weight: 700, ls: 8 })}
    ${t(M, 360, "Une saison", { size: 110, family: SERIF })}
    ${t(M, 480, "de goûts francs.", { size: 110, family: SERIF, italic: true, fill: SECTIONS.charcuterie.main })}
    <rect x="${M}" y="560" width="140" height="3" fill="${C.ink}"/>
    ${lines(M, 680, body, 62, { size: 38, family: SERIF, fill: "#3A3631" })}
    ${t(M, 1480, "— L'équipe Maison Démo", { size: 36, family: SERIF, italic: true, fill: C.muted })}
    <rect x="${M}" y="1580" width="${W - 2 * M}" height="520" rx="20" fill="${C.cream}"/>
    ${placeIllo("bottle", SECTIONS.epicerie, 420, 1840, 380)}
    ${placeIllo("round", SECTIONS.cremerie, 800, 1860, 380)}
    ${placeIllo("jar", SECTIONS.douceurs, 1180, 1850, 340)}
    ${footer(n)}
  `,
  );
}

function sommairePage(n, entries) {
  const rows = entries
    .map(([num, name, page, sec], i) => {
      const y = 760 + i * 190;
      const col = sec ? SECTIONS[sec].main : C.muted;
      return `
        ${t(M, y, num, { size: 70, family: SERIF, fill: col })}
        ${t(M + 170, y, name, { size: 56, family: SERIF })}
        <line x1="${M + 170}" y1="${y + 40}" x2="${W - M}" y2="${y + 40}" stroke="${C.rule}" stroke-width="2"/>
        ${t(W - M, y, `p. ${page}`, { size: 36, anchor: "end", fill: C.muted, weight: 600 })}`;
    })
    .join("");
  return svg(
    `
    ${t(M, 230, "SOMMAIRE", { size: 26, fill: SECTIONS.cremerie.main, weight: 700, ls: 8 })}
    ${t(M, 420, "Au fil", { size: 150, family: SERIF })}
    ${t(M, 560, "des pages", { size: 150, family: SERIF, italic: true, fill: SECTIONS.cremerie.main })}
    ${rows}
    ${footer(n)}
  `,
  );
}

function sectionOpener(n, key, tagline, items, kinds) {
  const s = SECTIONS[key];
  return svg(
    `
    ${t(M - 20, 720, s.num, { size: 640, family: SERIF, fill: C.white, opacity: 0.13 })}
    <circle cx="${W - 260}" cy="600" r="330" fill="${s.dark}" opacity="0.35"/>
    ${placeIllo(kinds[0], { main: s.light, dark: s.dark, light: "#FFFFFF" }, W - 330, 560, 420)}
    ${placeIllo(kinds[1], { main: s.dark, dark: s.light, light: s.light }, W - 520, 800, 300)}
    ${t(M, 1380, `SECTION ${s.num}`, { size: 28, fill: "rgba(255,255,255,0.8)", weight: 700, ls: 10 })}
    ${lines(M, 1540, s.name.split(" & ").map((p, i, a) => (i < a.length - 1 ? `${p} &` : p)), 150, { size: 150, family: SERIF, fill: C.white })}
    ${t(M, 1540 + s.name.split(" & ").length * 150 + 40, tagline, { size: 44, family: SERIF, italic: true, fill: "rgba(255,255,255,0.9)" })}
    ${t(M, 2040, items.join("   ·   "), { size: 26, fill: "rgba(255,255,255,0.75)", weight: 600, ls: 2 })}
    ${footer(n, { dark: true })}
  `,
    s.main,
  );
}

function productPage(n, key, title, products) {
  const s = SECTIONS[key];
  const colW = (W - 2 * M - 60) / 2;
  const top = 360;
  const rowH = 600;
  const cards = products
    .map(([name, desc, ref, price, kind, badge], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = M + col * (colW + 60);
      const y = top + row * rowH;
      return `
        <rect x="${x}" y="${y}" width="${colW}" height="360" rx="18" fill="${s.bg}"/>
        ${placeIllo(kind, s, x + colW / 2, y + 185, 300)}
        ${
          badge
            ? `<rect x="${x + 24}" y="${y + 24}" width="${badge.length * 15 + 44}" height="44" rx="22" fill="${s.main}"/>
               ${t(x + 46, y + 54, badge.toUpperCase(), { size: 20, fill: C.white, weight: 700, ls: 2 })}`
            : ""
        }
        ${t(x, y + 425, name, { size: 40, family: SERIF })}
        ${t(x, y + 468, desc, { size: 27, fill: C.muted })}
        <line x1="${x}" y1="${y + 500}" x2="${x + colW}" y2="${y + 500}" stroke="${C.rule}" stroke-width="2"/>
        ${t(x, y + 546, `Réf. ${ref}`, { size: 22, fill: C.muted, weight: 600, ls: 1 })}
        ${t(x + colW, y + 548, `${price} € HT`, { size: 32, weight: 700, anchor: "end" })}`;
    })
    .join("");
  return svg(
    `
    <rect x="0" y="0" width="${W}" height="14" fill="${s.main}"/>
    ${t(M, 170, `${s.num}  ·  ${s.name.toUpperCase()}`, { size: 24, fill: s.main, weight: 700, ls: 6 })}
    ${t(M, 262, title, { size: 70, family: SERIF })}
    ${cards}
    ${footer(n)}
  `,
  );
}

function quotePage(n) {
  const s = SECTIONS.epicerie;
  return svg(
    `
    <path d="M${M + 90} 1250 V700 A${(W - 2 * M - 180) / 2} ${(W - 2 * M - 180) / 2} 0 0 1 ${W - M - 90} 700 V1250 Z" fill="${s.main}"/>
    <path d="M${M + 150} 1250 V720 A${(W - 2 * M - 300) / 2} ${(W - 2 * M - 300) / 2} 0 0 1 ${W - M - 150} 720 V1250 Z" fill="none" stroke="${s.light}" stroke-width="3" opacity="0.6"/>
    ${placeIllo("bottle", { main: s.light, dark: s.dark, light: "#FFFFFF" }, 640, 960, 440)}
    ${placeIllo("jar", { main: s.dark, dark: s.light, light: s.light }, 980, 1040, 320)}
    <rect x="${M + 90}" y="1250" width="${W - 2 * M - 180}" height="16" fill="${s.dark}"/>
    ${t(W / 2, 1520, "« Le goût des choses vraies,", { size: 78, family: SERIF, italic: true, anchor: "middle" })}
    ${t(W / 2, 1620, "choisi pour vos tables. »", { size: 78, family: SERIF, italic: true, anchor: "middle" })}
    ${t(W / 2, 1760, "Producteurs sélectionnés · Circuits courts · Saisonnalité", { size: 28, fill: C.muted, anchor: "middle", ls: 2, weight: 600 })}
    ${footer(n)}
  `,
    C.cream,
  );
}

function focusPage(n, key, p) {
  const s = SECTIONS[key];
  const specs = p.specs
    .map(
      ([k, v], i) => `
      ${t(M, 1660 + i * 84, k.toUpperCase(), { size: 22, fill: C.muted, weight: 700, ls: 3 })}
      ${t(M + 420, 1660 + i * 84, v, { size: 36, family: SERIF })}
      <line x1="${M}" y1="${1660 + i * 84 + 30}" x2="${W - M}" y2="${1660 + i * 84 + 30}" stroke="${C.rule}" stroke-width="2"/>`,
    )
    .join("");
  return svg(
    `
    <rect x="0" y="0" width="${W}" height="1060" fill="${s.bg}"/>
    <circle cx="${W / 2}" cy="560" r="390" fill="${s.light}"/>
    ${placeIllo(p.kind, s, W / 2, 560, 620)}
    <rect x="${M}" y="${M}" width="190" height="56" rx="28" fill="${s.main}"/>
    ${t(M + 95, M + 38, "FOCUS", { size: 24, fill: C.white, weight: 700, ls: 4, anchor: "middle" })}
    ${t(M, 1210, p.name, { size: 96, family: SERIF })}
    ${lines(M, 1300, p.desc, 52, { size: 34, family: SERIF, fill: "#3A3631" })}
    ${specs}
    <rect x="${W - M - 400}" y="1150" width="400" height="120" rx="60" fill="${s.main}"/>
    ${t(W - M - 200, 1229, p.price, { size: 46, fill: C.white, weight: 700, anchor: "middle" })}
    ${footer(n)}
  `,
  );
}

function infoPage(n) {
  const blocks = [
    ["Commander", ["Par téléphone du lundi au vendredi,", "de 7 h à 15 h, ou par e-mail.", "Minimum de commande : 150 € HT."]],
    ["Livraison", ["Sous 48 h en Île-de-France,", "72 h en régions limitrophes.", "Franco de port dès 400 € HT."]],
    ["Conditions", ["Prix HT, hors consignes,", "valables jusqu'au 31 mars 2027,", "sous réserve de disponibilité."]],
    ["Qualité", ["Chaîne du froid contrôlée,", "traçabilité lot par lot,", "fiches techniques sur demande."]],
  ];
  const colW = (W - 2 * M - 80) / 2;
  const cards = blocks
    .map(([h, ls], i) => {
      const x = M + (i % 2) * (colW + 80);
      const y = 720 + Math.floor(i / 2) * 560;
      const s = Object.values(SECTIONS)[i];
      return `
        <rect x="${x}" y="${y}" width="${colW}" height="460" rx="20" fill="${s.bg}"/>
        <circle cx="${x + 80}" cy="${y + 90}" r="34" fill="${s.main}"/>
        ${t(x + 80, y + 103, String(i + 1), { size: 36, family: SERIF, fill: C.white, anchor: "middle" })}
        ${t(x + 50, y + 210, h, { size: 56, family: SERIF })}
        ${lines(x + 50, y + 290, ls, 50, { size: 30, fill: "#4A453F" })}`;
    })
    .join("");
  return svg(
    `
    ${t(M, 230, "INFORMATIONS PRATIQUES", { size: 26, fill: SECTIONS.cave.main, weight: 700, ls: 8 })}
    ${t(M, 420, "Commander,", { size: 130, family: SERIF })}
    ${t(M, 550, "simplement.", { size: 130, family: SERIF, italic: true, fill: SECTIONS.cave.main })}
    ${cards}
    ${footer(n)}
  `,
  );
}

function contactPage(n) {
  const ruled = Array.from({ length: 9 }, (_, i) => `<line x1="${M}" y1="${1240 + i * 88}" x2="${W - M}" y2="${1240 + i * 88}" stroke="${C.rule}" stroke-width="2"/>`).join("");
  return svg(
    `
    ${t(M, 230, "CONTACT", { size: 26, fill: SECTIONS.douceurs.main, weight: 700, ls: 8 })}
    ${t(M, 400, "Une question,", { size: 120, family: SERIF })}
    ${t(M, 520, "une commande ?", { size: 120, family: SERIF, italic: true, fill: SECTIONS.douceurs.main })}
    <rect x="${M}" y="620" width="${W - 2 * M}" height="420" rx="24" fill="${C.cream}"/>
    ${t(M + 70, 740, "TÉLÉPHONE", { size: 22, fill: C.muted, weight: 700, ls: 4 })}
    ${t(M + 70, 810, "01 23 45 67 89", { size: 64, family: SERIF })}
    ${t(M + 70, 900, "E-MAIL", { size: 22, fill: C.muted, weight: 700, ls: 4 })}
    ${t(M + 70, 966, "commandes@exemple.fr", { size: 56, family: SERIF })}
    ${t(M, 1170, "NOTES", { size: 24, fill: C.muted, weight: 700, ls: 6 })}
    ${ruled}
    ${footer(n)}
  `,
  );
}

function backCover() {
  return svg(
    `
    <rect x="56" y="56" width="${W - 112}" height="${H - 112}" fill="none" stroke="${C.gold}" stroke-width="2" opacity="0.55"/>
    <circle cx="${W / 2}" cy="900" r="170" fill="none" stroke="${C.gold}" stroke-width="4"/>
    <circle cx="${W / 2}" cy="900" r="146" fill="none" stroke="${C.gold}" stroke-width="1.5" opacity="0.6"/>
    ${t(W / 2, 950, "MD", { size: 140, family: SERIF, fill: C.gold, anchor: "middle" })}
    ${t(W / 2, 1220, "Maison Démo", { size: 96, family: SERIF, fill: C.white, anchor: "middle" })}
    ${t(W / 2, 1300, "Distribution gastronomique", { size: 40, family: SERIF, italic: true, fill: C.gold, anchor: "middle" })}
    ${lines(W / 2, 1480, ["12 rue de l'Exemple, 75000 Paris", "01 23 45 67 89  ·  commandes@exemple.fr"], 60, { size: 32, fill: "rgba(255,255,255,0.75)", anchor: "middle" })}
    ${t(W / 2, H - 180, "Catalogue de démonstration — données fictives", { size: 24, fill: "rgba(255,255,255,0.45)", anchor: "middle", ls: 2 })}
  `,
    C.green,
  );
}

/* ---------- Assemblage ---------- */

function buildPages() {
  const P = PRODUCTS;
  const pages = [];
  pages.push(coverPage()); // 1
  pages.push(editoPage(2)); // 2
  pages.push(
    sommairePage(3, [
      ["01", "Épicerie fine", 4, "epicerie"],
      ["02", "Crèmerie & fromages", 8, "cremerie"],
      ["03", "Charcuterie", 12, "charcuterie"],
      ["04", "La cave", 15, "cave"],
      ["05", "Douceurs", 19, "douceurs"],
      ["—", "Informations pratiques", 22, null],
    ]),
  ); // 3
  pages.push(sectionOpener(4, "epicerie", "Les bases d'une cuisine sincère.", ["Huiles", "Condiments", "Sels", "Conserves"], ["bottle", "jar"]));
  pages.push(productPage(5, "epicerie", "L'essentiel du placard", P.epicerie.slice(0, 6)));
  pages.push(productPage(6, "epicerie", "Saveurs d'ici", P.epicerie.slice(6, 12)));
  pages.push(quotePage(7));
  pages.push(sectionOpener(8, "cremerie", "Affinés avec patience.", ["Fromages AOP", "Beurres", "Crèmes", "Ultra-frais"], ["wedge", "round"]));
  pages.push(productPage(9, "cremerie", "Le plateau de fromages", P.cremerie.slice(0, 6)));
  pages.push(productPage(10, "cremerie", "Crèmes, beurres et fermiers", P.cremerie.slice(6, 12)));
  pages.push(
    focusPage(11, "cremerie", {
      name: "Comté AOP 24 mois",
      kind: "wedge",
      price: "32,50 € HT / kg",
      desc: [
        "Affiné deux ans dans les caves du Jura, ce comté développe",
        "des notes de noisette grillée et de beurre noisette,",
        "avec de fins cristaux qui craquent sous la dent.",
      ],
      specs: [
        ["Origine", "Massif du Jura, France"],
        ["Affinage", "24 mois minimum"],
        ["Lait", "Cru de vache, montbéliarde"],
        ["Conditionnement", "Meule entière ou coupe 1 kg"],
        ["Conservation", "Entre 4 et 8 °C"],
      ],
    }),
  );
  pages.push(sectionOpener(12, "charcuterie", "Le geste du charcutier.", ["Jambons", "Saucissons", "Terrines", "Salaisons"], ["slice", "sausage"]));
  pages.push(productPage(13, "charcuterie", "Salaisons et jambons", P.charcuterie.slice(0, 6)));
  pages.push(productPage(14, "charcuterie", "Terrines et spécialités", P.charcuterie.slice(6, 12)));
  pages.push(sectionOpener(15, "cave", "Des vins pour la table.", ["Rouges", "Blancs", "Bulles", "Spiritueux"], ["bottle", "box"]));
  pages.push(productPage(16, "cave", "Rouges, blancs et bulles", P.cave.slice(0, 6)));
  pages.push(productPage(17, "cave", "Terroirs et caractère", P.cave.slice(6, 12)));
  pages.push(
    focusPage(18, "cave", {
      name: "Champagne grand cru",
      kind: "bottle",
      price: "39,00 € HT",
      desc: [
        "Un blanc de blancs issu de la Côte des Blancs, à la bulle",
        "fine et persistante. Nez d'agrumes et de brioche, finale",
        "crayeuse. Idéal à l'apéritif comme sur les fruits de mer.",
      ],
      specs: [
        ["Appellation", "Champagne grand cru"],
        ["Cépage", "100 % chardonnay"],
        ["Dosage", "Brut, 6 g/L"],
        ["Conditionnement", "Carton de 6 × 75 cl"],
        ["Service", "Entre 8 et 10 °C"],
      ],
    }),
  );
  pages.push(sectionOpener(19, "douceurs", "Pour finir en beauté.", ["Chocolats", "Confiseries", "Biscuits", "Confitures"], ["macaron", "bar"]));
  pages.push(productPage(20, "douceurs", "Chocolats et confiseries", P.douceurs.slice(0, 6)));
  pages.push(productPage(21, "douceurs", "Le goûter des grands", P.douceurs.slice(6, 12)));
  pages.push(infoPage(22));
  pages.push(contactPage(23));
  pages.push(backCover()); // 24
  return pages;
}

/** PDF minimal : une image JPEG pleine page par page (format A4). */
function buildPdf(jpegs) {
  const PW = 595.28;
  const PH = 841.89;
  const chunks = [];
  const offsets = [];
  let length = 0;
  const push = (buf) => {
    const b = typeof buf === "string" ? Buffer.from(buf, "binary") : buf;
    chunks.push(b);
    length += b.length;
  };
  const obj = (id, body) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    for (const part of body) push(part);
    push("\nendobj\n");
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const n = jpegs.length;
  // ids : 1 catalog, 2 pages, 3 info, puis par page : image, contenu, page
  const pageIds = jpegs.map((_, i) => 4 + i * 3 + 2);
  obj(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  obj(2, [`<< /Type /Pages /Count ${n} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`]);
  obj(3, ["<< /Title (Catalogue de demonstration) /Producer (generate-demo.mjs) >>"]);
  jpegs.forEach(({ data, width, height }, i) => {
    const imgId = 4 + i * 3;
    const contentId = imgId + 1;
    const pageId = imgId + 2;
    obj(imgId, [
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${data.length} >>\nstream\n`,
      data,
      "\nendstream",
    ]);
    const content = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
    obj(contentId, [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]);
    obj(pageId, [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    ]);
  });
  const xrefAt = length;
  const total = 4 + n * 3;
  let xref = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let id = 1; id < total; id++) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
  return Buffer.concat(chunks);
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const pages = buildPages();
  const jpegs = [];
  let total = 0;

  for (let i = 0; i < pages.length; i++) {
    const raster = sharp(Buffer.from(pages[i]), { density: 72 }).resize(W, H).flatten({ background: "#ffffff" });
    const name = `page-${String(i + 1).padStart(3, "0")}.webp`;
    const webp = await raster.clone().webp({ quality: 82 }).toBuffer();
    await writeFile(path.join(OUT, name), webp);
    total += webp.length;

    const jpg = await raster.clone().resize(1240).toColourspace("srgb").jpeg({ quality: 80, mozjpeg: false, progressive: false, chromaSubsampling: "4:2:0" }).toBuffer({ resolveWithObject: true });
    jpegs.push({ data: jpg.data, width: jpg.info.width, height: jpg.info.height });

    if (i === 0) {
      await sharp(webp).resize(400).webp({ quality: 82 }).toFile(path.join(OUT, "cover.webp"));

      // Aperçu réseaux sociaux 1200×630 : couverture centrée sur fond sombre.
      const coverH = 540;
      const coverW = Math.round((coverH * W) / H);
      const cover = await sharp(webp).resize(coverW, coverH).toBuffer();
      const left = Math.round((1200 - coverW) / 2);
      const top = Math.round((630 - coverH) / 2);
      const shadow = await sharp(
        Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect x="${left}" y="${top + 14}" width="${coverW}" height="${coverH}" fill="black" fill-opacity="0.65"/></svg>`,
        ),
      )
        .blur(20)
        .png()
        .toBuffer();
      const bg = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><radialGradient id="g" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#2A2A2E"/><stop offset="1" stop-color="#111113"/></radialGradient></defs><rect width="1200" height="630" fill="url(#g)"/></svg>`,
      );
      await sharp(bg)
        .composite([
          { input: shadow, left: 0, top: 0 },
          { input: cover, left, top },
        ])
        .jpeg({ quality: 86 })
        .toFile(path.join(OUT, "og.jpg"));
    }
    process.stdout.write(`\r${name} (${Math.round(webp.length / 1024)} Ko)   `);
  }

  const pdf = buildPdf(jpegs);
  await writeFile(path.join(OUT, "demo.pdf"), pdf);

  console.log(
    `\n✔ ${pages.length} pages WebP (${(total / 1024 / 1024).toFixed(1)} Mo), cover.webp, og.jpg, demo.pdf (${(pdf.length / 1024 / 1024).toFixed(1)} Mo) → public/demo/`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
