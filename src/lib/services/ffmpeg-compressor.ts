import { getFFmpegInstance, getFetchFile } from "@/lib/ffmpeg-engine";
import type { VideoCompressor, VideoCompressionConfig, VideoCompressionResult } from "./compression";

export function createFFmpegCompressor(): VideoCompressor {
  return {
    isAvailable() {
      return !!getFFmpegInstance() && !!getFetchFile();
    },

    async compress(file, config, onProgress) {
      const ffmpeg = getFFmpegInstance();
      const fetchFile = getFetchFile();

      if (!ffmpeg || !fetchFile) {
        throw new Error("FFmpeg engine is not available");
      }

      const originalSize = file.size;

      ffmpeg.off("progress");
      if (onProgress) {
        ffmpeg.on("progress", ({ progress: p }: { progress: number }) => {
          onProgress(Math.round(p * 100));
        });
      }

      await ffmpeg.writeFile("input.mp4", await fetchFile(file));

      await ffmpeg.exec([
        "-i", "input.mp4",
        "-vf", `scale=-2:${config.resolution}`,
        "-c:v", config.codec,
        "-crf", String(config.crf),
        "-preset", config.preset,
        "-c:a", "aac",
        "-b:a", config.audioBitrate,
        "-movflags", "+faststart",
        "output.mp4",
      ]);

      const data = await ffmpeg.readFile("output.mp4");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = new Blob([data as any], { type: "video/mp4" });

      return {
        blob,
        originalSize,
        compressedSize: blob.size,
      };
    },
  };
}
