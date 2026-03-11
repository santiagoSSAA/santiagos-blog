import { useEffect, useState } from "react";
import {
  preloadCompressionRuntime,
  onCompressionRuntimeStateChange,
} from "@/lib/services/video-compression-runtime";

export function useFFmpegStatus() {
  const [ffmpegState, setFfmpegState] = useState<{ state: string; detail?: string }>({
    state: "idle",
  });

  useEffect(() => {
    void preloadCompressionRuntime();
    return onCompressionRuntimeStateChange((state, detail) => {
      setFfmpegState({ state, detail });
    });
  }, []);

  return ffmpegState;
}
