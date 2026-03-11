import type { ImageCompressionConfig, VideoCompressionConfig } from "@/lib/services/compression";

export const VIDEO_DEFAULTS: VideoCompressionConfig = {
  resolution: 720,
  codec: "libx264",
  crf: 28,
  preset: "fast",
  audioBitrate: "128k",
};

export const IMAGE_DEFAULTS: ImageCompressionConfig = {
  maxWidth: 800,
  quality: 0.6,
  format: "webp",
};

export const VIDEO_MAX_SIZE = 500 * 1024 * 1024;
export const IMAGE_MAX_SIZE = 20 * 1024 * 1024;
