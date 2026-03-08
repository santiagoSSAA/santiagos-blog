"use client";

interface VideoPlayerProps {
  src: string;
  poster?: string;
}

export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-black">
      <video
        src={src}
        poster={poster}
        controls
        playsInline
        crossOrigin="anonymous"
        preload="metadata"
        className="w-full aspect-video"
      />
    </div>
  );
}
