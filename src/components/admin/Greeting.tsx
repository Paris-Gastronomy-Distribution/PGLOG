"use client";

import { useEffect, useState } from "react";

/** « Bonjour » jusqu'à midi, « Bon après-midi » de 12 h à 18 h, « Bonsoir » ensuite. */
function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Bonjour";
  if (h >= 12 && h < 18) return "Bon après-midi";
  return "Bonsoir";
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

/**
 * Salutation à l'heure locale de l'appareil (calculée dans le navigateur : le
 * serveur n'est pas sur le même fuseau). Mise à jour chaque minute.
 */
export function Greeting({ className = "", withDate = false }: { className?: string; withDate?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const fade = `transition-opacity duration-300 ${now ? "opacity-100" : "opacity-0"}`;
  const date = now ? dateFormat.format(now) : null;

  return (
    <div>
      <h1 className={`${fade} ${className}`}>{now ? greetingFor(now) : "Bonjour"}</h1>
      {withDate && (
        <p className={`mt-1.5 text-[15px] text-slate ${fade}`}>{date ? date.charAt(0).toUpperCase() + date.slice(1) : " "}</p>
      )}
    </div>
  );
}
