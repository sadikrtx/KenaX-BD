import { GoogleDriveParsedInfo } from './types';

/**
 * GoogleDriveProvider
 *
 * Provides Google Drive link verification and direct image rendering for Sellers and Resellers.
 * Files remain 100% on Google Drive and stream directly via CDN,
 * consuming 0 MB on server storage.
 */
export class GoogleDriveProvider {
  /**
   * Checks whether the provided URL is a Google Drive file or shareable link.
   */
  static isGoogleDriveUrl(url: string | null | undefined): boolean {
    if (!url || typeof url !== 'string') return false;
    const clean = url.trim().toLowerCase();
    return (
      clean.includes('drive.google.com') ||
      clean.includes('docs.google.com/file') ||
      clean.includes('drive.usercontent.google.com') ||
      clean.includes('lh3.googleusercontent.com/d/')
    );
  }

  /**
   * Extracts the Google Drive File ID from various link formats:
   * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
   * - https://drive.google.com/file/d/FILE_ID/view
   * - https://drive.google.com/open?id=FILE_ID
   * - https://drive.google.com/uc?id=FILE_ID&export=download
   * - https://drive.google.com/uc?export=view&id=FILE_ID
   * - https://lh3.googleusercontent.com/d/FILE_ID
   */
  static extractFileId(url: string | null | undefined): string | null {
    if (!url || typeof url !== 'string') return null;
    const clean = url.trim();

    // Match /d/FILE_ID
    const pathMatch = clean.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }

    // Match id=FILE_ID
    const paramMatch = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (paramMatch && paramMatch[1]) {
      return paramMatch[1];
    }

    // Match /file/d/FILE_ID
    const fileMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch && fileMatch[1]) {
      return fileMatch[1];
    }

    return null;
  }

  /**
   * Generates a direct image display URL for embedding inside img tags or CSS backgrounds.
   * Uses Google's fast global CDN proxy (lh3.googleusercontent.com/d/{id}) with thumbnail fallback.
   */
  static getDirectImageUrl(url: string | null | undefined): string {
    if (!url) return '';
    const fileId = this.extractFileId(url);
    if (!fileId) return url;

    // Google's direct web preview CDN: fast, responsive, and handles CORS for WebP/PNG/JPG
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  /**
   * Alternative high-resolution thumbnail link (useful for fallback or gallery rendering)
   */
  static getHighResThumbnailUrl(url: string | null | undefined, width = 1000): string {
    if (!url) return '';
    const fileId = this.extractFileId(url);
    if (!fileId) return url;
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
  }

  /**
   * Parses and validates a Google Drive URL
   */
  static parse(url: string): GoogleDriveParsedInfo {
    const isDrive = this.isGoogleDriveUrl(url);
    const fileId = isDrive ? this.extractFileId(url) : null;
    const directUrl = fileId ? this.getDirectImageUrl(url) : url;

    return {
      isGoogleDrive: isDrive,
      fileId,
      directUrl,
      originalUrl: url,
    };
  }
}
