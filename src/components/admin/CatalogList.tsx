"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteCatalogAction, preparePdfAction, setCatalogActiveAction, updateCatalogAction } from "@/app/admin/actions";
import type { AdminCatalog } from "@/lib/catalogs";
import { BookIcon, ExternalIcon, LinkIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "./icons";
import { generateCatalogPdf, PublishError } from "./pipeline";
import { AccentPicker, Button, DEFAULT_ACCENT, buttonClass, cardClass, copyToClipboard, Dialog, Field, IconButton, inputClass, Spinner, Toggle, useToast } from "./ui";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function CatalogList({ catalogs }: { catalogs: AdminCatalog[] }) {
  const [editing, setEditing] = useState<AdminCatalog | null>(null);
  const [deleting, setDeleting] = useState<AdminCatalog | null>(null);
  const [query, setQuery] = useState("");
  const toast = useToast();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? catalogs.filter((c) => c.title.toLowerCase().includes(q) || c.slug.includes(q)) : catalogs;
  }, [catalogs, query]);

  return (
    <section>
      {/* En-tête de section */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-[20px] font-bold text-navy">Mes catalogues</h2>
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[13px] font-semibold text-brand">{catalogs.length}</span>
        </div>
        <div className="flex items-center gap-3">
          {catalogs.length > 0 && (
            <label className="relative block w-full sm:w-64">
              <span className="sr-only">Rechercher un catalogue</span>
              <SearchIcon width={16} height={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-mist" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                className="h-10 w-full rounded-full border border-line bg-white pr-4 pl-10 text-[14px] text-navy outline-none placeholder:text-mist hover:border-mist focus:border-brand focus:ring-4 focus:ring-brand/15"
              />
            </label>
          )}
          <Link href="/admin/new" className={buttonClass("primary")}>
            <PlusIcon width={18} height={18} />
            <span>Nouveau</span>
          </Link>
        </div>
      </div>

      {catalogs.length === 0 ? (
        <div className={`${cardClass} mt-8 flex flex-col items-center px-6 py-16 text-center`}>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
            <BookIcon width={28} height={28} />
          </span>
          <h3 className="mt-5 text-[18px] font-bold text-navy">Aucun catalogue pour l&apos;instant</h3>
          <p className="mt-2 max-w-sm text-[15px] text-slate">Importez un PDF exporté depuis Canva : vous obtiendrez un lien à envoyer à vos clients.</p>
          <Link href="/admin/new" className={`${buttonClass("primary", "lg")} mt-7`}>
            <PlusIcon width={18} height={18} />
            Créer mon premier catalogue
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-center text-[15px] text-slate">Aucun catalogue ne correspond à « {query} ».</p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((c) => (
            <li key={c.id} className={`${cardClass} group flex flex-col overflow-hidden transition hover:shadow-[0_8px_24px_rgba(27,36,83,0.12)]`}>
              <div className="h-1.5 shrink-0" style={{ background: c.accentColor }} aria-hidden="true" />

              <a
                href={c.publicUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Ouvrir ${c.title}`}
                className="relative flex h-52 items-center justify-center bg-canvas p-5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
              >
                {!c.active && (
                  <span className="absolute top-3 left-3 z-10 rounded-full bg-navy px-2.5 py-1 text-[12px] font-semibold text-white">Lien désactivé</span>
                )}
                {c.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.coverUrl}
                    alt=""
                    loading="lazy"
                    className={`max-h-full max-w-full rounded-[3px] bg-white shadow-[0_8px_22px_rgba(27,36,83,0.2)] transition duration-300 group-hover:-translate-y-0.5 ${c.active ? "" : "opacity-45 grayscale"}`}
                    style={{ aspectRatio: c.coverRatio }}
                  />
                ) : (
                  <BookIcon width={32} height={32} className="text-mist" />
                )}
              </a>

              <div className="flex flex-1 flex-col px-5 pt-4 pb-3">
                <h3 className="line-clamp-2 text-[16px] leading-snug font-bold text-navy" title={c.title}>
                  {c.title}
                </h3>
                <p className="mt-1 text-[13px] text-slate">
                  {c.pageCount} pages · {dateFmt.format(new Date(c.createdAt))}
                  {c.allowDownload && c.hasPdf && " · PDF"}
                </p>
                <a href={c.publicUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex w-fit items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
                  Voir le catalogue
                  <ExternalIcon width={13} height={13} />
                </a>
              </div>

              <div className="flex items-center justify-between border-t border-line-soft px-3 py-2">
                <button
                  type="button"
                  onClick={async () => toast((await copyToClipboard(c.publicUrl)) ? "Lien copié" : "Copie impossible", "ok")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-brand transition hover:bg-brand-soft"
                >
                  <LinkIcon width={16} height={16} />
                  Copier le lien
                </button>
                <div className="flex items-center">
                  <IconButton label="Renommer / modifier" onClick={() => setEditing(c)}>
                    <PencilIcon width={16} height={16} />
                  </IconButton>
                  <IconButton label="Supprimer" onClick={() => setDeleting(c)} className="hover:!bg-danger/10 hover:!text-danger">
                    <TrashIcon width={16} height={16} />
                  </IconButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <EditDialog key={editing?.id ?? "none"} catalog={editing} onClose={() => setEditing(null)} />
      <DeleteDialog catalog={deleting} onClose={() => setDeleting(null)} />
    </section>
  );
}

function EditDialog({ catalog, onClose }: { catalog: AdminCatalog | null; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(catalog?.title ?? "");
  const [description, setDescription] = useState(catalog?.description ?? "");
  const [accent, setAccent] = useState(catalog?.accentColor ?? DEFAULT_ACCENT);
  const [allowDownload, setAllowDownload] = useState(Boolean(catalog?.allowDownload && catalog.hasPdf));
  const [active, setActive] = useState(catalog?.active ?? true);
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Le PDF n'existe pas encore : il est assemblé ici à partir des pages en ligne.
  const needsPdf = Boolean(catalog && allowDownload && !catalog.hasPdf);

  const buildPdf = async (c: AdminCatalog): Promise<string | null> => {
    const prep = await preparePdfAction(c.id);
    if (!prep.ok) return prep.error;
    try {
      setPdfProgress("Création du PDF…");
      await generateCatalogPdf(prep.data, title, (done, total) => setPdfProgress(`Création du PDF : page ${done}/${total}`));
      return null;
    } catch (err) {
      return err instanceof PublishError ? err.message : "La création du PDF a échoué. Réessayez.";
    } finally {
      setPdfProgress(null);
    }
  };

  const save = () =>
    startTransition(async () => {
      if (!catalog) return;
      setError(null);

      if (active !== catalog.active) {
        const res = await setCatalogActiveAction(catalog.id, active);
        if (!res.ok) return setError(res.error);
      }

      const pdfError = needsPdf ? await buildPdf(catalog) : null;
      if (pdfError) return setError(pdfError);

      const res = await updateCatalogAction({
        id: catalog.id,
        title,
        description,
        accentColor: accent,
        allowDownload,
        pdfUploaded: needsPdf,
      });
      if (!res.ok) return setError(res.error);

      toast("Modifications enregistrées");
      router.refresh();
      onClose();
    });

  return (
    <Dialog open={Boolean(catalog)} onClose={pending ? () => undefined : onClose} title="Modifier le catalogue" wide>
      {catalog && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-5"
        >
          <Field label="Titre" htmlFor="edit-title">
            <input id="edit-title" className={inputClass} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </Field>
          <Field label="Description" htmlFor="edit-description">
            <textarea
              id="edit-description"
              className={`${inputClass} min-h-20 resize-y`}
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Couleur des boutons du lecteur" htmlFor="edit-accent">
            <AccentPicker id="edit-accent" value={accent} onChange={setAccent} />
          </Field>
          <div className="divide-y divide-line rounded-xl border border-line bg-canvas">
            <div className="p-4">
              <Toggle
                id="edit-download"
                checked={allowDownload}
                onChange={setAllowDownload}
                label="Proposer le téléchargement en PDF"
                description={
                  catalog.hasPdf
                    ? "Affiche le bouton « Télécharger » dans le lecteur."
                    : "Le PDF sera créé à l'enregistrement, à partir des pages du catalogue en ligne."
                }
              />
            </div>
            <div className="p-4">
              <Toggle
                id="edit-active"
                checked={active}
                onChange={setActive}
                label="Lien actif"
                description={
                  active
                    ? "Le catalogue est accessible à toute personne qui a le lien, sans limite de durée."
                    : "Le lien affiche « Ce catalogue n'est plus en ligne ». Rien n'est supprimé : vous pouvez le réactiver à tout moment."
                }
              />
            </div>
          </div>
          <p className="text-[13px] text-slate">Le lien ne change pas : les clients qui l&apos;ont déjà reçu voient la nouvelle version.</p>
          {error && (
            <p className="text-[13px] text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-5">
            {pdfProgress && <span className="mr-auto text-[13px] tabular-nums text-slate">{pdfProgress}</span>}
            <Button variant="ghost" onClick={onClose} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" disabled={pending || !title.trim()}>
              {pending && <Spinner />}
              Enregistrer
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function DeleteDialog({ catalog, onClose }: { catalog: AdminCatalog | null; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      if (!catalog) return;
      const res = await deleteCatalogAction(catalog.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast("Catalogue supprimé");
      router.refresh();
      onClose();
    });

  return (
    <Dialog
      open={Boolean(catalog)}
      onClose={() => {
        setError(null);
        onClose();
      }}
      title="Supprimer ce catalogue ?"
    >
      {catalog && (
        <div className="space-y-5">
          <p className="text-[15px] leading-relaxed text-slate">
            « <span className="font-semibold text-navy">{catalog.title}</span> » et toutes ses pages seront effacés. Le lien{" "}
            <span className="rounded bg-canvas px-1.5 py-0.5 text-[13px] font-medium text-navy">/c/{catalog.slug}</span> ne fonctionnera plus. Cette action est définitive.
          </p>
          {error && (
            <p className="text-[13px] text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-line-soft pt-5">
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirm} disabled={pending}>
              {pending && <Spinner />}
              Supprimer définitivement
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
