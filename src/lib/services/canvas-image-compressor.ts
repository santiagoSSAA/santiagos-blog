import type { ImageCompressor, ImageCompressionConfig } from "./compression";

function compressWithCanvas(file: File, config: ImageCompressionConfig): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const scale = Math.min(1, config.maxWidth / img.width);
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No canvas context"));

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        `image/${config.format}`,
        config.quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Formato de imagen no soportado por el navegador"));
    };
    img.src = URL.createObjectURL(file);
  });
}

export function createCanvasImageCompressor(): ImageCompressor {
  return {
    compress: compressWithCanvas,
  };
}
