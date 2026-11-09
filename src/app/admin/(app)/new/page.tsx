import type { Metadata } from "next";
import { NewCatalogFlow } from "@/components/admin/NewCatalogFlow";
import { getSiteUrl } from "@/lib/site";
import { getBackendStatus } from "@/lib/store";

export const metadata: Metadata = { title: "Nouveau catalogue" };

export default function NewCatalogPage() {
  return <NewCatalogFlow siteHost={getSiteUrl().host} isLocal={getBackendStatus().kind === "local"} />;
}
