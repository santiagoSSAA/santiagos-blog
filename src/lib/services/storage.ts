export interface UploadResult {
  publicUrl: string;
  path: string;
}

export interface StorageService {
  upload(file: Blob, fileName: string, contentType: string): Promise<UploadResult>;
  remove(paths: string[]): Promise<void>;
  getPublicUrl(path: string): string;
  extractPath(publicUrl: string): string | null;
}
