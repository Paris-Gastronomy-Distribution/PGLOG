"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { checkSlugAction } from "@/app/admin/actions";
import { sanitizeSlugInput, slugify, slugIssue, titleFromFilename } from "@/lib/slug";
import { ArrowLeftIcon, CheckIcon, ExternalIcon, LinkIcon, MailIcon, PlusIcon, WhatsAppIcon } from "./icons";
import { PdfDropzone, type LoadedPdf } from "./PdfDropzone";
import { formatBytes, openPdf, publishCatalog, PublishError, renderThumbnail, type PublishProgress } from "./pipeline";
import { AccentPicker, Button, buttonClass, copyToClipboard, Field, inputClass, Spinner, Toggle, useToast } from "./ui";

type SlugCheck = { slug: string; available: boolean | null; error?: string };

type Phase =
  | { name: "form" }
  | { name: "publishing"; progress: PublishProgress; error?: string }
  | { name: "done"; url: string; cover?: string; pages: number };

const SLUG_MESSAGES = {
  empty: "Indiquez la fin du lien.",
  format: "Minuscules, chiffres et tirets uniquement.",
  reserved: "Ce lien est réservé, choisissez-en un autre.",
} as const;

export function NewCatalogFlow({ siteHost, isLocal }: { siteHost: string; isLocal: boolean }) {
  const toast = useToast();

  /* ---------- Formulaire ---------- */
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState("#111111");
  const [allowDownload, setAllowDownload] = useState(false);
  const [check, setCheck] = useState<SlugCheck | null>(null);

  /* ---------- PDF ---------- */
  const fileRef = useRef<File | null>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const [loaded, setLoaded] = useState<LoadedPdf | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  /* ---------- Publication ---------- */
  const [phase, setPhase] = useState<Phase>({ name: "form" });
  const abortRef = useRef<AbortController | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const issue = slugIssue(effectiveSlug);

  // Vérifie la disponibilité du lien (anti-rebond 350 ms).
  useEffect(() => {
    if (issue) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await checkSlugAction(effectiveSlug);
      if (cancelled) return;
      setCheck(res.ok ? { slug: effectiveSlug, available: res.data.available } : { slug: effectiveSlug, available: null, error: res.error });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [effectiveSlug, issue]);

  const slugStatus: { tone: "ok" | "error" | "muted"; text: string } = issue
    ? { tone: issue === "empty" ? "muted" : "error", text: issue === "empty" && !title ? "Se remplit automatiquement depuis le titre." : SLUG_MESSAGES[issue] }
    : check?.slug !== effectiveSlug
      ? { tone: "muted", text: "Vérification…" }
      : check.error
        ? { tone: "error", text: check.error }
        : check.available
          ? { tone: "ok", text: "Lien disponible" }
          : { tone: "error", text: "Ce lien est déjà utilisé : modifiez-le." };

  // Libère le PDF en mémoire au démontage.
  useEffect(
    () => () => {
      void pdfRef.current?.loadingTask.destroy();
    },
    [],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setFileError(null);
      setFileLoading(true);
      setLoaded(null);
      void pdfRef.current?.loadingTask.destroy();
      pdfRef.current = null;
      fileRef.current = null;
      try {
        const pdf = await openPdf(file);
        const thumbnail = await renderThumbnail(pdf);
        pdfRef.current = pdf;
        fileRef.current = file;
        setLoaded({ name: file.name, size: formatBytes(file.size), pages: pdf.numPages, thumbnail });
        setTitle((t) => t || titleFromFilename(file.name));
      } catch (err) {
        setFileError(err instanceof PublishError ? err.message : "Impossible de lire ce fichier.");
      } finally {
        setFileLoading(false);
      }
    },
    [],
  );

  const clearFile = () => {
    void pdfRef.current?.loadingTask.destroy();
    pdfRef.current = null;
    fileRef.current = null;
    setLoaded(null);
  };

  const canPublish =
    Boolean(title.trim()) && !issue && check?.slug === effectiveSlug && check.available === true && Boolean(loaded) && !fileLoading;

  const blockers = [
    !title.trim() && "un titre",
    !loaded && "le PDF",
    title.trim() && (issue || (check?.slug === effectiveSlug && check.available === false)) && "un lien valide",
  ].filter(Boolean) as string[];

  /* ---------- Publication ---------- */

  const publish = useCallback(async () => {
    const pdf = pdfRef.current;
    const file = fileRef.current;
    if (!pdf || !file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ name: "publishing", progress: { stage: "prepare", total: pdf.numPages, rendered: 0, uploaded: 0 } });
    try {
      const res = await publishCatalog(
        { file, pdf, slug: effectiveSlug, title, description, accentColor: accent, allowDownload },
        (progress) => setPhase((p) => (p.name === "publishing" ? { ...p, progress } : p)),
        controller.signal,
      );
      setPhase((p) => ({
        name: "done",
        url: res.url,
        cover: p.name === "publishing" ? p.progress.coverPreview : undefined,
        pages: pdf.numPages,
      }));
    } catch (err) {
      const message = err instanceof PublishError ? err.message : "La publication a échoué. Réessayez.";
      if (controller.signal.aborted) {
        setPhase({ name: "form" });
        toast("Publication annulée");
      } else {
        setPhase((p) => (p.name === "publishing" ? { ...p, error: message } : { name: "form" }));
      }
    } finally {
      abortRef.current = null;
    }
  }, [effectiveSlug, title, description, accent, allowDownload, toast]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canPublish) void publish();
  };

  // Chaque étape (formulaire, chargement, lien) s'affiche depuis le haut de page.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [phase.name]);

  // Empêche de fermer l'onglet par erreur pendant l'envoi.
  const publishing = phase.name === "publishing" && !phase.error;
  useEffect(() => {
    if (!publishing) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [publishing]);

  const resetAll = () => {
    clearFile();
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setAccent("#111111");
    setAllowDownload(false);
    setCheck(null);
    setPhase({ name: "form" });
  };

  /* ---------- Rendu ---------- */

  if (phase.name === "publishing") {
    return (
      <PublishingView
        title={title}
        progress={phase.progress}
        withPdf={allowDownload}
        error={phase.error}
        onCancel={() => abortRef.current?.abort()}
        onRetry={() => void publish()}
        onBack={() => setPhase({ name: "form" })}
      />
    );
  }

  if (phase.name === "done") {
    return <SuccessView title={title.trim()} url={phase.url} cover={phase.cover} pages={phase.pages} isLocal={isLocal} onNew={resetAll} />;
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-5xl">
      <Link href="/admin" className="inline-flex items-center gap-2 text-[13px] font-medium text-white/55 transition hover:text-white">
        <ArrowLeftIcon width={16} height={16} />
        Catalogues
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Nouveau catalogue</h1>
      <p className="mt-2 text-[15px] text-white/50">Déposez le PDF exporté depuis Canva, donnez-lui un nom, et récupérez un lien prêt à envoyer.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* PDF */}
        <section className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-[13px] font-semibold tracking-[0.14em] text-white/40 uppercase">1 · Le PDF</h2>
          <PdfDropzone loaded={loaded} loading={fileLoading} error={fileError} onFile={(f) => void handleFile(f)} onClear={clearFile} />
          <p className="text-[12px] leading-relaxed text-white/35">
            Le PDF est converti en images directement dans ce navigateur : rien n&apos;est envoyé avant que vous cliquiez sur « Publier ».
          </p>
        </section>

        {/* Infos */}
        <section className="space-y-6">
          <h2 className="text-[13px] font-semibold tracking-[0.14em] text-white/40 uppercase">2 · Les informations</h2>

          <Field label="Titre du catalogue" htmlFor="title" hint="Visible par vos clients et dans l'aperçu WhatsApp / LinkedIn.">
            <input
              id="title"
              className={inputClass}
              value={title}
              maxLength={200}
              placeholder="Ex. Catalogue Automne — Hiver 2026"
              onChange={(e) => setTitle(e.target.value)}
              autoComplete="off"
            />
          </Field>

          <Field
            label="Lien du catalogue"
            htmlFor="slug"
            hint={
              <span className={slugStatus.tone === "ok" ? "text-emerald-300" : slugStatus.tone === "error" ? "text-red-300" : ""}>
                {slugStatus.tone === "ok" && <CheckIcon width={14} height={14} className="mr-1 inline -translate-y-px" />}
                {slugStatus.text}
              </span>
            }
          >
            <div className="flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] transition focus-within:border-white/30 focus-within:ring-4 focus-within:ring-white/[0.06]">
              <span className="hidden items-center border-r border-white/10 bg-white/[0.03] px-3 text-[14px] whitespace-nowrap text-white/40 sm:flex">
                {siteHost}/c/
              </span>
              <input
                id="slug"
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/30"
                value={effectiveSlug}
                placeholder="mon-catalogue"
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(sanitizeSlugInput(e.target.value));
                }}
                onBlur={() => slugTouched && setSlug((s) => s.replace(/-+$/g, ""))}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </Field>

          <Field label="Description (facultatif)" htmlFor="description" hint="Une phrase qui s'affiche sous le titre dans l'aperçu du lien.">
            <textarea
              id="description"
              className={`${inputClass} min-h-[88px] resize-y`}
              value={description}
              maxLength={1000}
              placeholder="Ex. Notre sélection de la saison, prix professionnels HT."
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <Field label="Couleur des boutons du lecteur" htmlFor="accent">
            <AccentPicker id="accent" value={accent} onChange={setAccent} />
          </Field>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <Toggle
              id="download"
              checked={allowDownload}
              onChange={setAllowDownload}
              label="Autoriser le téléchargement du PDF"
              description="Ajoute un bouton « Télécharger » dans le lecteur. Le PDF original est alors conservé en ligne."
            />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <Button type="submit" variant="primary" size="lg" disabled={!canPublish}>
              Publier le catalogue
            </Button>
            {!canPublish && blockers.length > 0 && !fileLoading && (
              <p className="text-[13px] text-white/40">Il manque {blockers.join(", ")}.</p>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}

/* ---------- Écran de chargement ---------- */

function PublishingView({
  title,
  progress,
  withPdf,
  error,
  onCancel,
  onRetry,
  onBack,
}: {
  title: string;
  progress: PublishProgress;
  withPdf: boolean;
  error?: string;
  onCancel: () => void;
  onRetry: () => void;
  onBack: () => void;
}) {
  const { stage, total, rendered, uploaded } = progress;
  const pagesShare = withPdf ? 84 : 92;
  const percent = Math.round(
    stage === "prepare"
      ? 2
      : stage === "pages"
        ? 3 + ((rendered + uploaded) / (2 * total)) * pagesShare
        : stage === "pdf"
          ? 3 + pagesShare + 4
          : 98,
  );
  const steps: Array<{ label: string; detail?: string; state: "done" | "active" | "todo" }> = [
    { label: "Préparation", state: stage === "prepare" ? "active" : "done" },
    {
      label: "Conversion et envoi des pages",
      detail: stage === "pages" ? `${uploaded}/${total} envoyée${uploaded > 1 ? "s" : ""}` : `${total} pages`,
      state: stage === "prepare" ? "todo" : stage === "pages" ? "active" : "done",
    },
    ...(withPdf
      ? [{ label: "Envoi du PDF original", state: (stage === "pdf" ? "active" : stage === "finalize" ? "done" : "todo") as "done" | "active" | "todo" }]
      : []),
    { label: "Mise en ligne", state: stage === "finalize" ? "active" : "todo" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center py-6 text-center" aria-live="polite">
      <div className="relative">
        <div className="absolute inset-x-6 -bottom-5 h-8 rounded-[50%] bg-black/60 blur-xl" aria-hidden="true" />
        {progress.coverPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={progress.coverPreview} alt="" className="relative h-56 w-auto rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.5)]" />
        ) : (
          <div className="relative h-56 w-40 animate-pulse rounded-md bg-gradient-to-br from-white/15 to-white/5" />
        )}
      </div>

      <h1 className="mt-10 text-xl font-semibold tracking-tight sm:text-2xl">{error ? "La publication s'est interrompue" : "Publication en cours…"}</h1>
      <p className="mt-2 max-w-full truncate text-[15px] text-white/50">« {title.trim()} »</p>

      {error ? (
        <div className="mt-8 w-full rounded-2xl border border-red-400/25 bg-red-500/10 p-5 text-left">
          <p className="text-[14px] text-red-100" role="alert">
            {error}
          </p>
          <p className="mt-2 text-[13px] text-red-100/60">Les fichiers déjà envoyés ont été nettoyés : vous pouvez relancer sans risque.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="primary" onClick={onRetry}>
              Réessayer
            </Button>
            <Button variant="ghost" onClick={onBack}>
              Modifier les informations
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 w-full">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-medium text-white/80">
                {stage === "pages"
                  ? rendered < total
                    ? `Conversion de la page ${rendered + 1}/${total}`
                    : "Envoi des dernières pages…"
                  : steps.find((s) => s.state === "active")?.label}
              </span>
              <span className="tabular-nums text-white/50">{percent} %</span>
            </div>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label="Progression de la publication"
            >
              <div className="h-full rounded-full bg-white transition-[width] duration-300 ease-out" style={{ width: `${percent}%` }} />
            </div>
          </div>

          <ol className="mt-8 w-full space-y-3 text-left">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${s.state === "done" ? "bg-emerald-400/90 text-[#0c1a12]" : s.state === "active" ? "bg-white/10 text-white" : "border border-white/15"}`}
                >
                  {s.state === "done" ? <CheckIcon width={14} height={14} strokeWidth={3} /> : s.state === "active" ? <Spinner className="h-3.5 w-3.5" /> : null}
                </span>
                <span className={`text-[14px] ${s.state === "todo" ? "text-white/35" : "text-white/85"}`}>{s.label}</span>
                {s.detail && s.state !== "todo" && <span className="ml-auto text-[13px] tabular-nums text-white/45">{s.detail}</span>}
              </li>
            ))}
          </ol>

          <p className="mt-8 text-[13px] text-white/40">Gardez cet onglet ouvert jusqu&apos;à la fin : la conversion se fait dans votre navigateur.</p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={onCancel}>
            Annuler
          </Button>
        </>
      )}
    </div>
  );
}

/* ---------- Lien prêt à envoyer ---------- */

function SuccessView({
  title,
  url,
  cover,
  pages,
  isLocal,
  onNew,
}: {
  title: string;
  url: string;
  cover?: string;
  pages: number;
  isLocal: boolean;
  onNew: () => void;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast("Lien copié");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast("Copie impossible : sélectionnez le lien à la main", "error");
    }
  };

  const message = `${title} : ${url}`;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center py-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/90 text-[#0c1a12] shadow-[0_0_0_8px_rgba(52,211,153,0.12)]">
        <CheckIcon width={28} height={28} strokeWidth={2.6} />
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">{isLocal ? "Votre catalogue est prêt" : "Votre catalogue est en ligne"}</h1>
      <p className="mt-2 text-[15px] text-white/50">
        {isLocal
          ? "Mode local : ce lien ne fonctionne que sur cet ordinateur. Une fois Supabase configuré, il sera accessible à vos clients."
          : "Envoyez ce lien à vos clients : il ouvre le catalogue feuilletable."}
      </p>

      <div className="mt-8 flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-20 w-auto rounded shadow-[0_8px_20px_rgba(0,0,0,0.45)]" />
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium">{title}</p>
          <p className="text-[13px] text-white/45">{pages} pages</p>
        </div>
      </div>

      <div className="mt-4 flex w-full flex-col gap-2 rounded-2xl border border-white/15 bg-black/30 p-2 sm:flex-row sm:items-center">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Lien du catalogue"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-[14px] text-white/90 outline-none"
        />
        <Button variant="primary" onClick={() => void copy()}>
          {copied ? <CheckIcon width={16} height={16} /> : <LinkIcon width={16} height={16} />}
          {copied ? "Copié" : "Copier le lien"}
        </Button>
      </div>

      <div className="mt-4 grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
        <a href={url} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
          <ExternalIcon width={16} height={16} />
          Ouvrir
        </a>
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
          <WhatsAppIcon width={16} height={16} />
          WhatsApp
        </a>
        <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Bonjour,\n\nVoici notre catalogue : ${url}\n\nBonne lecture !`)}`} className={buttonClass("secondary")}>
          <MailIcon width={16} height={16} />
          E-mail
        </a>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button variant="ghost" onClick={onNew}>
          <PlusIcon width={16} height={16} />
          Créer un autre catalogue
        </Button>
        <Link href="/admin" className={buttonClass("ghost")}>
          Retour aux catalogues
        </Link>
      </div>
    </div>
  );
}
