import { useCallback, useRef, useState } from "react";
import { IMAGE_DEFAULTS, IMAGE_MAX_SIZE } from "@/lib/config/compression";
import { createCanvasImageCompressor } from "@/lib/services/canvas-image-compressor";
import { createBrowserStorageService } from "@/lib/services/supabase-storage";

type UploadState = "idle" | "compressing" | "uploading" | "done" | "error" | "cancelled";

interface ThumbnailFileInfo {
  original: number;
  compressed: number;
}

interface UseThumbnailUploadReturn {
  state: UploadState;
  errorMsg: string;
  fileInfo: ThumbnailFileInfo | null;
  localPreview: string | null;
  handleFile: (file: File) => Promise<void>;
  handleCancel: () => void;
  reset: () => void;
}

export function useThumbnailUpload(
  onChange: (url: string) => void
): UseThumbnailUploadReturn {
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fileInfo, setFileInfo] = useState<ThumbnailFileInfo | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const cancelledRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadedPathRef = useRef<string | null>(null);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }

    setState("cancelled");
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setState("idle");
      setFileInfo(null);
      setErrorMsg("");
      cancelledRef.current = false;
    }, 1500);
  }, [localPreview]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Solo se permiten imágenes");
        setState("error");
        return;
      }

      if (file.size > IMAGE_MAX_SIZE) {
        setErrorMsg(`Imagen muy grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 20MB.`);
        setState("error");
        return;
      }

      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }

      const preview = URL.createObjectURL(file);
      setLocalPreview(preview);

      cancelledRef.current = false;
      setState("compressing");
      setErrorMsg("");
      const originalSize = file.size;

      try {
        const compressor = createCanvasImageCompressor();
        const compressed = await compressor.compress(file, IMAGE_DEFAULTS);
        if (cancelledRef.current) return;

        setFileInfo({ original: originalSize, compressed: compressed.size });
        setState("uploading");

        const storage = createBrowserStorageService();
        const extension = IMAGE_DEFAULTS.format;
        const fileName = `thumbnails/thumb-${Date.now()}.${extension}`;
        const contentType = `image/${extension}`;
        const uploaded = await storage.upload(compressed, fileName, contentType);

        if (cancelledRef.current) return;

        uploadedPathRef.current = uploaded.path;
        URL.revokeObjectURL(preview);
        setLocalPreview(null);
        onChange(uploaded.publicUrl);
        setState("done");
      } catch (err) {
        if (cancelledRef.current) return;
        URL.revokeObjectURL(preview);
        setLocalPreview(null);
        setErrorMsg(err instanceof Error ? err.message : "Error al subir imagen");
        setState("error");
      }
    },
    [localPreview, onChange]
  );

  const reset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    void (async () => {
      if (uploadedPathRef.current) {
        const storage = createBrowserStorageService();
        await storage.remove([uploadedPathRef.current]);
        uploadedPathRef.current = null;
      }
    })();

    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }

    cancelledRef.current = false;
    setState("idle");
    setFileInfo(null);
    setErrorMsg("");
    onChange("");
  }, [localPreview, onChange]);

  return {
    state,
    errorMsg,
    fileInfo,
    localPreview,
    handleFile,
    handleCancel,
    reset,
  };
}
