"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCatalogAction, updateCatalogAction } from "@/app/admin/actions";
import type { AdminCatalog } from "@/lib/catalogs";
import { BookIcon, ExternalIcon, LinkIcon, PencilIcon, PlusIcon, TrashIcon } from "./icons";
import { AccentPicker, Button, buttonClass, copyToClipboard, Dialog, Field, IconButton, inputClass, Spinner, Toggle, useToast } from "./ui";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function CatalogList({ catalogs }: { catalogs: AdminCatalog[] }) {
  const [editing, setEditing] = useState<AdminCatalog | null>(null);
  const [deleting, setDeleting] = useState<AdminCatalog | null>(null);
  const toast = useToast();

  if (catalogs.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-white/10 px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] text-white/70">
          <BookIcon width={28} height={28} />
        </span>
        <h2 className="mt-6 text-lg font-semibold">Aucun catalogue pour l&apos;instant</h2>
        <p className="mt-2 max-w-sm text-[15px] text-white/50">Importez un PDF exporté depuis Canva : vous obtiendrez un lien à envoyer à vos clients.</p>
        <Link href="/admin/new" className={`${buttonClass("primary", "lg")} mt-8`}>
          <PlusIcon width={18} height={18} />
          Créer mon premier catalogue
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {catalogs.map((c) => (
          <li key={c.id} className="group flex flex-col">
            <a
              href={c.publicUrl}
              target="_blank"
              rel="noreferrer"
              className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-white/[0.035] p-6 transition hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              aria-label={`Ouvrir ${c.title}`}
            >
              {c.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.coverUrl}
                  alt=""
                  loading="lazy"
                  className="max-h-full max-w-full rounded-[3px] shadow-[0_18px_40px_rgba(0,0,0,0.55)] transition duration-300 group-hover:-translate-y-1"
                  style={{ aspectRatio: c.coverRatio }}
                />
              ) : (
                <BookIcon width={32} height={32} className="text-white/30" />
              )}
              <span className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
                {c.pageCount} p.
              </span>
            </a>

            <div className="mt-4 flex items-start gap-2">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border border-white/20" style={{ background: c.accentColor }} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-[15px] leading-snug font-medium text-white" title={c.title}>
                  {c.title}
                </h3>
                <p className="mt-1 truncate text-[13px] text-white/45">
                  {dateFmt.format(new Date(c.createdAt))} · /c/{c.slug}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="mr-auto"
                onClick={async () => toast((await copyToClipboard(c.publicUrl)) ? "Lien copié" : "Copie impossible", "ok")}
              >
                <LinkIcon width={15} height={15} />
                Copier le lien
              </Button>
              <a
                href={c.publicUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Ouvrir le catalogue"
                title="Ouvrir le catalogue"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/65 transition hover:bg-white/[0.09] hover:text-white"
              >
                <ExternalIcon width={17} height={17} />
              </a>
              <IconButton label="Renommer / modifier" onClick={() => setEditing(c)}>
                <PencilIcon width={17} height={17} />
              </IconButton>
              <IconButton label="Supprimer" onClick={() => setDeleting(c)} className="hover:!bg-red-500/15 hover:!text-red-300">
                <TrashIcon width={17} height={17} />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>

      <EditDialog key={editing?.id ?? "none"} catalog={editing} onClose={() => setEditing(null)} />
      <DeleteDialog catalog={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

function EditDialog({ catalog, onClose }: { catalog: AdminCatalog | null; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(catalog?.title ?? "");
  const [description, setDescription] = useState(catalog?.description ?? "");
  const [accent, setAccent] = useState(catalog?.accentColor ?? "#111111");
  const [allowDownload, setAllowDownload] = useState(catalog?.allowDownload ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      if (!catalog) return;
      const res = await updateCatalogAction({ id: catalog.id, title, description, accentColor: accent, allowDownload });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast("Modifications enregistrées");
      router.refresh();
      onClose();
    });

  return (
    <Dialog open={Boolean(catalog)} onClose={onClose} title="Modifier le catalogue" wide>
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
            <textarea id="edit-description" className={`${inputClass} min-h-[80px] resize-y`} value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Couleur des boutons du lecteur" htmlFor="edit-accent">
            <AccentPicker id="edit-accent" value={accent} onChange={setAccent} />
          </Field>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Toggle
              id="edit-download"
              checked={allowDownload && catalog.hasPdf}
              onChange={setAllowDownload}
              disabled={!catalog.hasPdf}
              label="Autoriser le téléchargement du PDF"
              description={
                catalog.hasPdf
                  ? "Affiche le bouton « Télécharger » dans le lecteur."
                  : "Le PDF original n'a pas été conservé à l'import : recréez le catalogue avec cette option pour l'activer."
              }
            />
          </div>
          <p className="text-[13px] text-white/40">Le lien ne change pas : les clients qui l&apos;ont déjà reçu voient la nouvelle version.</p>
          {error && (
            <p className="text-[13px] text-red-300" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>
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
          <p className="text-[15px] text-white/70">
            « <span className="text-white">{catalog.title}</span> » et toutes ses pages seront effacés. Le lien <span className="font-mono text-[13px] text-white/90">/c/{catalog.slug}</span> ne
            fonctionnera plus. Cette action est définitive.
          </p>
          {error && (
            <p className="text-[13px] text-red-300" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
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
