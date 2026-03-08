"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { extractStoragePath } from "@/lib/utils";
import { ImagePlus, Link2, Upload, Loader2, Check, X, Trash2, XCircle } from "lucide-react";

type Mode = "choose" | "url" | "file";
type UploadState = "idle" | "compressing" | "uploading" | "done" | "error" | "cancelled";

const ACCEPTED_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
  "image/avif",
  "image/tiff",
  "image/heic",
  "image/heif",
].join(",");

interface ThumbnailUploaderProps {
  value: string;
  onChange: (url: string) => void;
}

function compressImage(file: File, maxWidth = 800, quality = 0.6): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const scale = Math.min(1, maxWidth / img.width);
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No canvas context"));

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/webp",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Formato de imagen no soportado por el navegador"));
    };
    img.src = URL.createObjectURL(file);
  });
}

export function ThumbnailUploader({ value, onChange }: ThumbnailUploaderProps) {
  const [mode, setMode] = useState<Mode>("choose");
  const [urlInput, setUrlInput] = useState(value || "");
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fileInfo, setFileInfo] = useState<{ original: number; compressed: number } | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    setState("cancelled");
    setTimeout(() => {
      setState("idle");
      setFileInfo(null);
      setErrorMsg("");
      cancelledRef.current = false;
      if (inputRef.current) inputRef.current.value = "";
    }, 1500);
  }, [localPreview]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Solo se permiten imágenes");
      setState("error");
      return;
    }

    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMsg(`Imagen muy grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 20MB.`);
      setState("error");
      return;
    }

    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);

    cancelledRef.current = false;
    setState("compressing");
    setErrorMsg("");
    const originalSize = file.size;

    try {
      const compressed = await compressImage(file);
      if (cancelledRef.current) return;

      setFileInfo({ original: originalSize, compressed: compressed.size });

      setState("uploading");
      const supabase = createClient();
      const fileName = `thumbnails/thumb-${Date.now()}.webp`;
      const { data, error } = await supabase.storage
        .from("videos")
        .upload(fileName, compressed, { contentType: "image/webp" });

      if (cancelledRef.current) return;
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(data.path);

      URL.revokeObjectURL(preview);
      setLocalPreview(null);
      onChange(urlData.publicUrl);
      setState("done");
    } catch (err) {
      if (cancelledRef.current) return;
      URL.revokeObjectURL(preview);
      setLocalPreview(null);
      setErrorMsg(err instanceof Error ? err.message : "Error al subir imagen");
      setState("error");
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleUrlConfirm = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setState("done");
    }
  };

  const reset = async () => {
    if (value) {
      const path = extractStoragePath(value);
      if (path) {
        const supabase = createClient();
        await supabase.storage.from("videos").remove([path]);
      }
    }
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    setMode("choose");
    setState("idle");
    setFileInfo(null);
    setErrorMsg("");
    setUrlInput("");
    onChange("");
  };

  const previewSrc = localPreview || value;
  const showPreview = previewSrc && state !== "error" && state !== "cancelled";

  if (showPreview) {
    return (
      <div className="space-y-2">
        <div className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
          <img
            src={previewSrc}
            alt="Miniatura"
            crossOrigin="anonymous"
            className="w-full h-40 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).crossOrigin = "";
              (e.target as HTMLImageElement).src = previewSrc;
            }}
          />
          {(state === "compressing" || state === "uploading") && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
              <Loader2 size={24} className="text-white animate-spin" />
              <p className="text-xs text-white">
                {state === "compressing" ? "Comprimiendo..." : "Subiendo..."}
              </p>
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs text-red-300 hover:text-red-100 underline"
              >
                Cancelar
              </button>
            </div>
          )}
          {state !== "compressing" && state !== "uploading" && (
            <button
              type="button"
              onClick={reset}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {fileInfo && (
          <p className="text-xs text-zinc-500">
            {(fileInfo.original / 1024).toFixed(0)}KB → {(fileInfo.compressed / 1024).toFixed(0)}KB
            <span className="ml-1 text-emerald-500">
              (-{Math.round((1 - fileInfo.compressed / fileInfo.original) * 100)}%)
            </span>
          </p>
        )}
      </div>
    );
  }

  if (mode === "choose") {
    return (
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setMode("url")}
          className="flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-brand-500 dark:hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-all"
        >
          <Link2 size={20} className="text-zinc-400" />
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Pegar URL</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className="flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-brand-500 dark:hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-all"
        >
          <ImagePlus size={20} className="text-zinc-400" />
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Subir imagen</span>
        </button>
      </div>
    );
  }

  if (mode === "url") {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://ejemplo.com/imagen.jpg"
            className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400 text-sm"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleUrlConfirm())}
          />
          <button
            type="button"
            onClick={handleUrlConfirm}
            className="px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => state === "idle" && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
          dragOver
            ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/20"
            : "border-zinc-300 dark:border-zinc-700 hover:border-brand-500"
        }`}
      >
        {state === "idle" && (
          <>
            <Upload size={24} className="text-zinc-400" />
            <p className="text-sm text-zinc-500">Arrastra una imagen o haz clic</p>
            <p className="text-xs text-zinc-400">JPG, PNG, WebP, GIF, AVIF, BMP, SVG → se comprime a WebP</p>
          </>
        )}
        {state === "cancelled" && (
          <>
            <XCircle size={24} className="text-amber-500" />
            <p className="text-sm text-zinc-500">Cancelado</p>
          </>
        )}
        {state === "error" && (
          <>
            <X size={24} className="text-red-500" />
            <p className="text-sm text-red-500">{errorMsg}</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {(state === "error" || state === "cancelled") && (
        <button
          type="button"
          onClick={() => { setState("idle"); setErrorMsg(""); }}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Volver a elegir
        </button>
      )}
    </div>
  );
}
