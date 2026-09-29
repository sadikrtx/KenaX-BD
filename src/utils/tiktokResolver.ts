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
    // 1. Primary API: TikWM (Super Fast Direct MP4 No-Watermark API with HD Source Stream)
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(trimmed)}&hd=1`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.data) {
        // Prefer HD no-watermark direct video stream for maximum original quality
        const directStream = data.data.hdplay || data.data.play || data.data.wmplay;
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
      const directStream2 = data2?.video?.noWatermark || data2?.video?.watermark || data2?.video?.noWatermarkHd;
      if (directStream2) {
        tiktokCache.set(trimmed, directStream2);
        return directStream2;
      }
    }
  } catch (err2) {
    console.warn('Tiklydown fallback resolution failed:', err2);
  }

  try {
    // 3. Tertiary Fallback API: TikWM standard proxy endpoint
    const res3 = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(trimmed)}`);
    if (res3.ok) {
      const data3 = await res3.json();
      const directStream3 = data3?.data?.play || data3?.data?.wmplay;
      if (directStream3) {
        tiktokCache.set(trimmed, directStream3);
        return directStream3;
      }
    }
  } catch (err3) {
    console.warn('TikWM tertiary fallback failed:', err3);
  }

  return null;
}
