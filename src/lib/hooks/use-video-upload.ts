import { useCallback, useEffect, useRef, useState } from "react";
import { preloadFFmpeg, onFFmpegStateChange } from "@/lib/ffmpeg-engine";
import { VIDEO_DEFAULTS, VIDEO_MAX_SIZE } from "@/lib/config/compression";
import { createFFmpegCompressor } from "@/lib/services/ffmpeg-compressor";
import { createBrowserStorageService } from "@/lib/services/supabase-storage";

type UploadState = "idle" | "compressing" | "uploading" | "done" | "error" | "cancelled";
type FFmpegStatus = "loading" | "ready" | "unavailable";

interface FileInfo {
  name: string;
  originalSize: number;
  compressedSize?: number;
}

interface UseVideoUploadReturn {
  state: UploadState;
  ffmpegStatus: FFmpegStatus;
  ffmpegDetail: string;
  progress: number;
  error: string;
  fileInfo: FileInfo | null;
  processFile: (file: File) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function useVideoUpload(onUpload: (url: string) => void): UseVideoUploadReturn {
  const [state, setState] = useState<UploadState>("idle");
  const [ffmpegStatus, setFfmpegStatus] = useState<FFmpegStatus>("loading");
  const [ffmpegDetail, setFfmpegDetail] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);

  const cancelledRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setProgress(0);
    setError("");
    setFileInfo(null);
    cancelledRef.current = false;
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setState("cancelled");

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      reset();
    }, 1500);
  }, [reset]);

  useEffect(() => {
    const unsubscribe = onFFmpegStateChange((engineState, detail) => {
      if (engineState === "ready") setFfmpegStatus("ready");
      else if (engineState === "error") setFfmpegStatus("unavailable");
      else setFfmpegStatus("loading");
      setFfmpegDetail(detail ?? "");
    });

    void preloadFFmpeg();

    return () => {
      unsubscribe();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) {
        setError("Solo se permiten archivos de video.");
        setState("error");
        return;
      }

      if (file.size > VIDEO_MAX_SIZE) {
        setError(`El archivo es muy grande (${formatBytes(file.size)}). Máximo: 500MB.`);
        setState("error");
        return;
      }

      const compressor = createFFmpegCompressor();
      if (!compressor.isAvailable()) {
        setError(
          "El motor de compresión no está disponible. Intenta desde /admin/new o usa Chrome/Firefox con las DevTools cerradas."
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

        const compressed = await compressor.compress(file, VIDEO_DEFAULTS, (percent) => {
          if (!cancelledRef.current) setProgress(percent);
        });
        if (cancelledRef.current) return;

        setFileInfo((prev) =>
          prev ? { ...prev, compressedSize: compressed.compressedSize } : prev
        );

        setState("uploading");
        setProgress(0);
        if (cancelledRef.current) return;

        const storage = createBrowserStorageService();
        const fileName = `videos/${Date.now()}-${file.name}`;
        const uploaded = await storage.upload(compressed.blob, fileName, "video/mp4");

        if (cancelledRef.current) return;
        onUpload(uploaded.publicUrl);
        setState("done");
      } catch (err) {
        if (cancelledRef.current) return;
        setState("error");
        setError(err instanceof Error ? err.message : "Error al procesar el video.");
      }
    },
    [onUpload]
  );

  return {
    state,
    ffmpegStatus,
    ffmpegDetail,
    progress,
    error,
    fileInfo,
    processFile,
    cancel,
    reset,
  };
}
