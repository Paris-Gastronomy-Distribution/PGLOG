import { CatalogList } from "@/components/admin/CatalogList";
import { Greeting } from "@/components/admin/Greeting";
import { toAdminCatalog } from "@/lib/catalogs";
import { getStore } from "@/lib/store";

export default async function AdminHome() {
  const store = getStore();
  const rows = store ? await store.list() : [];
  const catalogs = rows.map(toAdminCatalog);

  return (
    <>
      <div className="mb-10">
        <Greeting withDate className="text-[30px] leading-tight font-bold tracking-tight text-navy sm:text-[34px]" />
      </div>
      <CatalogList catalogs={catalogs} />
    </>
  );
}
