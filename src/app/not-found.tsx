import type { Metadata } from "next";
import { PageNotFoundScreen } from "@/components/StatusScreen";

export const metadata: Metadata = {
  title: "Page introuvable",
};

export default function NotFound() {
  return <PageNotFoundScreen />;
}
