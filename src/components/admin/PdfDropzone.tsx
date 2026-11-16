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
      <div className="flex items-center gap-5 rounded-xl border border-line bg-canvas p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={loaded.thumbnail} alt="" className="h-32 w-auto rounded-md bg-white shadow-[0_6px_18px_rgba(27,36,83,0.18)]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-navy" title={loaded.name}>
            {loaded.name}
          </p>
          <p className="mt-1 text-[13px] text-slate">
            {loaded.pages} page{loaded.pages > 1 ? "s" : ""} · {loaded.size}
          </p>
          <button
            type="button"
            onClick={() => {
              onClear();
              pick();
            }}
            disabled={disabled}
            className="mt-3 text-[13px] font-semibold text-brand hover:underline disabled:opacity-40"
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
        className={`flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          over ? "border-brand bg-brand-soft" : "border-line bg-canvas hover:border-brand hover:bg-brand-soft/50"
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          {loading ? <Spinner className="h-6 w-6" /> : over ? <FileIcon width={26} height={26} /> : <UploadIcon width={26} height={26} />}
        </span>
        <span className="text-[15px] font-semibold text-navy">
          {loading ? "Lecture du PDF…" : over ? "Déposez le PDF ici" : "Glissez votre PDF Canva ici"}
        </span>
        {!loading && (
          <span className="text-[13px] text-slate">
            ou <span className="font-semibold text-brand">choisissez un fichier</span> · 50 Mo maximum
          </span>
        )}
      </button>
      {error && (
        <p className="mt-3 rounded-lg border border-danger/25 bg-danger/5 px-4 py-3 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}
      {input}
    </div>
  );
}
