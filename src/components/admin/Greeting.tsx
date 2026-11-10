"use client";

import { useEffect, useState } from "react";

/** « Bonjour » le matin, « Bon après-midi » de 12 h à 18 h, « Bonsoir » ensuite. */
export function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Bonjour Mamie";
  if (h >= 12 && h < 18) return "Bon après-midi Mamie";
  return "Bonsoir Mamie";
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

/**
 * Salutation à l'heure de l'appareil de Mamie (calculée dans le navigateur,
 * pas sur le serveur qui est réglé sur une autre heure). Mise à jour chaque minute.
 */
export function Greeting({ className = "", withDate = false }: { className?: string; withDate?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const date = now ? dateFormat.format(now) : null;

  return (
    <div>
      <h1 className={`transition-opacity duration-300 ${now ? "opacity-100" : "opacity-0"} ${className}`}>
        {now ? greetingFor(now) : "Bonjour Mamie"}
      </h1>
      {withDate && (
        <p className={`mt-1.5 text-[15px] text-slate transition-opacity duration-300 ${now ? "opacity-100" : "opacity-0"}`}>
          {date ? date.charAt(0).toUpperCase() + date.slice(1) : " "}
        </p>
      )}
    </div>
  );
}
