export interface VideoCompressionConfig {
  resolution: number;
  codec: string;
  crf: number;
  preset: "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" | "medium" | "slow";
  audioBitrate: string;
}

export interface VideoCompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
}

export interface VideoCompressor {
  compress(
    file: File,
    config: VideoCompressionConfig,
    onProgress?: (percent: number) => void
  ): Promise<VideoCompressionResult>;
  isAvailable(): boolean;
}

export interface ImageCompressionConfig {
  maxWidth: number;
  quality: number;
  format: "webp" | "avif" | "jpeg";
}

export interface ImageCompressor {
  compress(file: File, config: ImageCompressionConfig): Promise<Blob>;
}
