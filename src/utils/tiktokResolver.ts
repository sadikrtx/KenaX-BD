/**
 * Utility to resolve TikTok video links into fast, direct MP4 video stream URLs
 * removing TikTok UI branding, logos, titles, and watermarks.
 */

const tiktokCache = new Map<string, string>();

export async function resolveTikTokDirectMp4(tiktokUrl: string): Promise<string | null> {
  if (!tiktokUrl) return null;
  const trimmed = tiktokUrl.trim();

  // If already cached
  if (tiktokCache.has(trimmed)) {
    return tiktokCache.get(trimmed)!;
  }

  // If it's already a direct mp4 URL
  if (trimmed.endsWith('.mp4') || trimmed.includes('.mp4?')) {
    return trimmed;
  }

  try {
    // 1. Primary API: TikWM (Super Fast Direct MP4 No-Watermark API)
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.data) {
        // Prefer no-watermark direct video stream
        const directStream = data.data.play || data.data.wmplay;
        if (directStream) {
          tiktokCache.set(trimmed, directStream);
          return directStream;
        }
      }
    }
  } catch (err) {
    console.warn('TikWM primary resolution failed, trying secondary fallback:', err);
  }

  try {
    // 2. Secondary Fallback API: Tiklydown
    const res2 = await fetch(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(trimmed)}`);
    if (res2.ok) {
      const data2 = await res2.json();
      const directStream2 = data2?.video?.noWatermark || data2?.video?.watermark;
      if (directStream2) {
        tiktokCache.set(trimmed, directStream2);
        return directStream2;
      }
    }
  } catch (err2) {
    console.warn('Tiklydown fallback resolution failed:', err2);
  }

  return null;
}
