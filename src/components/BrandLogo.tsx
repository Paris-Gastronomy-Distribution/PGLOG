/**
 * Logo Paris Gastronomy Distribution (ovale bleu), détouré, 1200 px de large :
 * net jusqu'à ~400 px d'affichage sur écran Retina.
 */
const WIDTH = 1200;
const HEIGHT = 463;

export function BrandLogo({ height, className = "", priority = false }: { height: number; className?: string; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo-pgd.webp"
      alt="Paris Gastronomy Distribution"
      width={Math.round((WIDTH * height) / HEIGHT)}
      height={height}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      draggable={false}
      className={`block select-none ${className}`}
    />
  );
}
