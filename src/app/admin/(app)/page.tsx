import Link from "next/link";
import { CatalogList } from "@/components/admin/CatalogList";
import { PlusIcon } from "@/components/admin/icons";
import { buttonClass } from "@/components/admin/styles";
import { toAdminCatalog } from "@/lib/catalogs";
import { getStore } from "@/lib/store";

export default async function AdminHome() {
  const store = getStore();
  const rows = store ? await store.list() : [];
  const catalogs = rows.map(toAdminCatalog);

  return (
    <>
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Vos catalogues</h1>
          <p className="mt-2 text-[15px] text-white/50">
            {catalogs.length === 0
              ? "Publiez votre premier catalogue en quelques secondes."
              : `${catalogs.length} catalogue${catalogs.length > 1 ? "s" : ""} publié${catalogs.length > 1 ? "s" : ""}`}
          </p>
        </div>
        {catalogs.length > 0 && (
          <Link href="/admin/new" className={buttonClass("primary", "lg")}>
            <PlusIcon width={18} height={18} />
            Nouveau catalogue
          </Link>
        )}
      </div>
      <CatalogList catalogs={catalogs} />
    </>
  );
}
