import { useEffect, useState } from "react";
import { preloadFFmpeg, onFFmpegStateChange } from "@/lib/ffmpeg-engine";

export function useFFmpegStatus() {
  const [ffmpegState, setFfmpegState] = useState<{ state: string; detail?: string }>({
    state: "idle",
  });

  useEffect(() => {
    void preloadFFmpeg();
    return onFFmpegStateChange((state, detail) => {
      setFfmpegState({ state, detail });
    });
  }, []);

  return ffmpegState;
}
