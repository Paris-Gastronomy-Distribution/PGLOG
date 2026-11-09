import type { Metadata } from "next";
import { ToastProvider } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: { default: "Catalogues", template: "%s · Catalogues" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-dvh bg-[radial-gradient(120%_70%_at_50%_0%,#1f1f23_0%,#141416_55%,#111113_100%)] text-white antialiased">
        {children}
      </div>
    </ToastProvider>
  );
}
