import type { Metadata } from "next";
import { NotFoundScreen } from "@/components/StatusScreen";

export const metadata: Metadata = {
  title: "Page introuvable",
};

export default function NotFound() {
  return <NotFoundScreen />;
}
