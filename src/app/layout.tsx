import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: "Catalogue",
  // Liens privés envoyés aux clients : rien n'est indexé par les moteurs de recherche.
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#141416",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={inter.variable}>
      {/* suppressHydrationWarning : certaines extensions (Grammarly…) ajoutent des attributs à <body>. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
