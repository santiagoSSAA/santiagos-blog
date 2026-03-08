"use client";

import { useState, useRef, useCallback, useEffect, type ChangeEvent, type DragEvent } from "react";
import { Upload, Loader2, Check, AlertCircle, Film, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import {
  preloadFFmpeg,
  getFFmpegInstance,
  getFetchFile,
  onFFmpegStateChange,
} from "@/lib/ffmpeg-engine";

type UploadState =
  | "idle"
  | "compressing"
  | "uploading"
  | "done"
  | "error"
  | "cancelled";

type FFmpegStatus = "loading" | "ready" | "unavailable";

interface VideoUploaderProps {
  onUpload: (url: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function VideoUploader({ onUpload }: VideoUploaderProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [ffmpegStatus, setFfmpegStatus] = useState<FFmpegStatus>("loading");
  const [ffmpegDetail, setFfmpegDetail] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    originalSize: number;
    compressedSize?: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onFFmpegStateChange((engineState, detail) => {
      if (engineState === "ready") setFfmpegStatus("ready");
      else if (engineState === "error") setFfmpegStatus("unavailable");
      else setFfmpegStatus("loading");
      setFfmpegDetail(detail ?? "");
    });

    preloadFFmpeg();

    return unsubscribe;
  }, []);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    setState("cancelled");
    setTimeout(() => {
      setState("idle");
      setProgress(0);
      setError("");
      setFileInfo(null);
      cancelledRef.current = false;
      if (inputRef.current) inputRef.current.value = "";
    }, 1500);
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) {
        setError("Solo se permiten archivos de video.");
        setState("error");
        return;
      }

      const MAX_SIZE = 500 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        setError(`El archivo es muy grande (${formatBytes(file.size)}). Máximo: 500MB.`);
        setState("error");
        return;
      }

      const ffmpeg = getFFmpegInstance();
      const fetchFile = getFetchFile();

      if (!ffmpeg || !fetchFile) {
        setError(
          "El motor de compresión no está disponible. " +
          "Intenta desde /admin/new o usa Chrome/Firefox con las DevTools cerradas."
        );
        setState("error");
        return;
      }

      cancelledRef.current = false;
      setFileInfo({ name: file.name, originalSize: file.size });
      setError("");

      try {
        setState("compressing");
        setProgress(0);

        ffmpeg.off("progress");
        ffmpeg.on("progress", ({ progress: p }: { progress: number }) => {
          setProgress(Math.round(p * 100));
        });

        await ffmpeg.writeFile("input.mp4", await fetchFile(file));
        if (cancelledRef.current) return;

        await ffmpeg.exec([
          "-i", "input.mp4",
          "-vf", "scale=-2:720",
          "-c:v", "libx264",
          "-crf", "28",
          "-preset", "fast",
          "-c:a", "aac",
          "-b:a", "128k",
          "-movflags", "+faststart",
          "output.mp4",
        ]);
        if (cancelledRef.current) return;

        const data = await ffmpeg.readFile("output.mp4");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const compressedBlob = new Blob([data as any], { type: "video/mp4" });

        setFileInfo((prev) =>
          prev ? { ...prev, compressedSize: compressedBlob.size } : prev
        );

        setState("uploading");
        setProgress(0);
        if (cancelledRef.current) return;

        const supabase = createClient();
        const fileName = `videos/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("videos")
          .upload(fileName, compressedBlob, { contentType: "video/mp4" });

        if (cancelledRef.current) return;
        if (uploadError) throw uploadError;

        if (uploadData) {
          const { data: urlData } = supabase.storage
            .from("videos")
            .getPublicUrl(uploadData.path);
          onUpload(urlData.publicUrl);
        }

        setState("done");
      } catch (err) {
        if (cancelledRef.current) return;
        setState("error");
        setError(err instanceof Error ? err.message : "Error al procesar el video.");
      }
    },
    [onUpload]
  );

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragActive(false);
  }

  function reset() {
    setState("idle");
    setProgress(0);
    setError("");
    setFileInfo(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const savings =
    fileInfo?.originalSize && fileInfo?.compressedSize
      ? Math.round(
          ((fileInfo.originalSize - fileInfo.compressedSize) /
            fileInfo.originalSize) *
            100
        )
      : null;

  const cancelButton = (
    <button
      type="button"
      onClick={handleCancel}
      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
    >
      <XCircle size={16} />
      Cancelar
    </button>
  );

  const statusColor =
    ffmpegStatus === "ready"
      ? "text-emerald-500"
      : ffmpegStatus === "loading"
        ? "text-amber-500"
        : "text-red-500";

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      {state === "idle" && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => ffmpegStatus === "ready" && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors ${
            ffmpegStatus !== "ready"
              ? "border-zinc-200 dark:border-zinc-800 opacity-60 cursor-wait"
              : dragActive
                ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800 cursor-pointer"
                : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer"
          }`}
        >
          {ffmpegStatus === "loading" ? (
            <Loader2 size={32} className="animate-spin text-amber-500" />
          ) : (
            <Upload size={32} className="text-zinc-400 dark:text-zinc-500" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {ffmpegStatus === "loading"
                ? "Preparando compresor de video..."
                : "Arrastra un video o haz clic para seleccionar"}
            </p>
            <p className={`mt-1 text-xs ${statusColor}`}>
              {ffmpegStatus === "loading" && (
                <span className="inline-flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" />
                  {ffmpegDetail || "Preparando motor de compresión..."}
                </span>
              )}
              {ffmpegStatus === "ready" && (ffmpegDetail || "Motor listo · Se comprimirá a 720p")}
              {ffmpegStatus === "unavailable" && (ffmpegDetail || "Motor no disponible")}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={ffmpegStatus !== "ready"}
          />
        </div>
      )}

      {state === "compressing" && (
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 size={32} className="animate-spin text-zinc-600 dark:text-zinc-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Comprimiendo video a 720p...
            </p>
            {fileInfo && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {fileInfo.name} &middot; {formatBytes(fileInfo.originalSize)}
              </p>
            )}
          </div>
          <div className="w-full max-w-xs">
            <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-center text-zinc-500 dark:text-zinc-400">
              {progress}%
            </p>
          </div>
          {cancelButton}
        </div>
      )}

      {state === "uploading" && (
        <div className="flex flex-col items-center gap-4 py-6">
          <Loader2 size={32} className="animate-spin text-zinc-600 dark:text-zinc-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Subiendo video comprimido...
            </p>
            {fileInfo?.compressedSize && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {formatBytes(fileInfo.compressedSize)}
                {savings !== null && ` · ${savings}% más pequeño que el original`}
              </p>
            )}
          </div>
          {cancelButton}
        </div>
      )}

      {state === "cancelled" && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <XCircle size={24} className="text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Subida cancelada
          </p>
        </div>
      )}

      {state === "done" && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Check size={24} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Video subido correctamente
            </p>
            {fileInfo && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {formatBytes(fileInfo.originalSize)} &rarr;{" "}
                {fileInfo.compressedSize ? formatBytes(fileInfo.compressedSize) : "—"}
                {savings !== null && ` (${savings}% de ahorro)`}
              </p>
            )}
          </div>
          <button
            onClick={reset}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Film size={16} />
            Subir otro video
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {error || "Error desconocido"}
            </p>
          </div>
          <button
            onClick={reset}
            className="mt-2 px-4 py-2 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}
