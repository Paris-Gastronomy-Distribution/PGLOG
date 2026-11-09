"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileIcon, UploadIcon } from "./icons";
import { Spinner } from "./ui";

export interface LoadedPdf {
  name: string;
  size: string;
  pages: number;
  thumbnail: string;
}

interface Props {
  loaded: LoadedPdf | null;
  loading: boolean;
  error: string | null;
  disabled?: boolean;
  onFile: (file: File) => void;
  onClear: () => void;
}

export function PdfDropzone({ loaded, loading, error, disabled, onFile, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = () => inputRef.current?.click();
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !disabled) onFile(file);
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="application/pdf,.pdf"
      className="sr-only"
      tabIndex={-1}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onFile(file);
        e.target.value = "";
      }}
    />
  );

  if (loaded) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={loaded.thumbnail} alt="" className="h-28 w-auto rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.45)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-white" title={loaded.name}>
            {loaded.name}
          </p>
          <p className="mt-1 text-[13px] text-white/50">
            {loaded.pages} page{loaded.pages > 1 ? "s" : ""} · {loaded.size}
          </p>
          <button
            type="button"
            onClick={() => {
              onClear();
              pick();
            }}
            disabled={disabled}
            className="mt-3 text-[13px] font-medium text-white/70 underline-offset-4 hover:text-white hover:underline disabled:opacity-40"
          >
            Changer de fichier
          </button>
        </div>
        {input}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={pick}
        disabled={disabled || loading}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ${
          over ? "border-white/60 bg-white/[0.08]" : "border-white/15 bg-white/[0.025] hover:border-white/30 hover:bg-white/[0.05]"
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.07] text-white/80">
          {loading ? <Spinner className="h-6 w-6" /> : over ? <FileIcon width={26} height={26} /> : <UploadIcon width={26} height={26} />}
        </span>
        <span className="text-[15px] font-medium text-white">
          {loading ? "Lecture du PDF…" : over ? "Déposez le PDF ici" : "Glissez votre PDF Canva ici"}
        </span>
        {!loading && (
          <span className="text-[13px] text-white/45">
            ou <span className="text-white/80 underline underline-offset-4">choisissez un fichier</span> · 50 Mo maximum
          </span>
        )}
      </button>
      {error && (
        <p className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-200" role="alert">
          {error}
        </p>
      )}
      {input}
    </div>
  );
}
