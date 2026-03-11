import { preloadFFmpeg, onFFmpegStateChange, getFFmpegState } from "@/lib/ffmpeg-engine";

export type CompressionRuntimeState = "idle" | "loading" | "ready" | "error";

export type CompressionRuntimeListener = (
  state: CompressionRuntimeState,
  detail?: string
) => void;

export function preloadCompressionRuntime(): Promise<boolean> {
  return preloadFFmpeg();
}

export function onCompressionRuntimeStateChange(fn: CompressionRuntimeListener): () => void {
  return onFFmpegStateChange(fn);
}

export function getCompressionRuntimeState(): { state: CompressionRuntimeState; detail?: string } {
  return getFFmpegState();
}
