import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: { default: "Catalogues", template: "%s · Catalogues" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f6f8fb",
  colorScheme: "light",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="admin-root min-h-dvh bg-canvas text-navy antialiased">{children}</div>
    </ToastProvider>
  );
}
