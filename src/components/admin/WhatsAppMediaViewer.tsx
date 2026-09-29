import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Download,
  ExternalLink,
  Eye,
  FileText,
  File,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  Volume2,
  VolumeX,
  RefreshCw,
  Trash2,
  Send,
  Square,
  Sparkles,
} from 'lucide-react';
import { extractGoogleDriveFileId, getOptimizedImageUrl, handleImageError } from '../../utils/imageOptimizer';

export interface MediaPreviewTarget {
  type: 'image' | 'video' | 'document' | 'audio' | 'voice' | 'drive' | 'youtube' | 'tiktok';
  url: string;
  filename?: string;
  title?: string;
  mediaId?: string;
  mimeType?: string;
}

/**
 * Transforms any WhatsApp/Meta media link or ID into a safe, authenticated server proxy URL
 * Completely prevents {"title":"Authentication Error","detail":"Authentication Error","status":401}
 */
export function getSafeWhatsAppMediaUrl(
  rawUrl?: string,
  mediaId?: string,
  mimeType?: string,
  filename?: string,
  isDownload = false
): string {
  const url = (rawUrl || '').trim();
  const id = (mediaId || '').trim();

  // If base64 or blob URL, return as-is
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  // If it's a Meta / Facebook Graph / Lookaside CDN link, route through server proxy
  if (
    url.includes('lookaside.fbsbx.com') ||
    url.includes('graph.facebook.com') ||
    url.includes('fbsbx.com') ||
    url.includes('fbcdn.net')
  ) {
    const params = new URLSearchParams();
    params.set('url', url);
    if (isDownload) params.set('download', '1');
    if (filename) params.set('filename', filename);
    return `/api/whatsapp/media-proxy?${params.toString()}`;
  }

  // If it's already our server proxy URL, adjust download parameter if needed
  if (url.startsWith('/api/whatsapp/media/') || url.startsWith('/api/whatsapp/media-cache/') || url.startsWith('/api/whatsapp/media-proxy')) {
    if (isDownload && !url.includes('download=1')) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}download=1${filename ? `&filename=${encodeURIComponent(filename)}` : ''}`;
    }
    return url;
  }

  // If a raw numeric Meta mediaId is provided without a URL
  if (id && (!url || url.length < 15 || /^[0-9]+$/.test(url))) {
    const ext = filename?.split('.').pop() || (mimeType?.includes('audio') || mimeType?.includes('ogg') ? 'ogg' : 'jpg');
    const params = new URLSearchParams();
    if (isDownload) params.set('download', '1');
    if (filename) params.set('filename', filename);
    const q = params.toString();
    return `/api/whatsapp/media/${id}.${ext}${q ? `?${q}` : ''}`;
  }

  // If the URL is just a raw numeric ID
  if (/^[0-9]{10,25}$/.test(url)) {
    const params = new URLSearchParams();
    if (isDownload) params.set('download', '1');
    if (filename) params.set('filename', filename);
    const q = params.toString();
    return `/api/whatsapp/media/${url}${q ? `?${q}` : ''}`;
  }

  return url;
}

/**
 * Triggers a direct, authenticated file download in the browser without navigating away
 */
export async function triggerDirectMediaDownload(url: string, filename = 'download'): Promise<void> {
  try {
    const safeUrl = getSafeWhatsAppMediaUrl(url, undefined, undefined, filename, true);
    const anchor = document.createElement('a');
    anchor.href = safeUrl;
    anchor.download = filename;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } catch (err) {
    console.warn('Direct media download failed, opening in new tab:', err);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Detect media attachments and links inside raw text
 */
export function detectMediaFromText(text?: string): MediaPreviewTarget[] {
  if (!text) return [];
  const results: MediaPreviewTarget[] = [];
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex) || [];

  for (const rawUrl of matches) {
    const cleanUrl = rawUrl.replace(/[),.;]+$/, '');
    const lower = cleanUrl.toLowerCase();

    // 1. Google Drive Link
    const driveId = extractGoogleDriveFileId(cleanUrl);
    if (driveId) {
      if (lower.includes('image') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
        results.push({
          type: 'image',
          url: `https://lh3.googleusercontent.com/d/${driveId}`,
          title: 'Google Drive Image',
        });
      } else if (lower.includes('video') || lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) {
        results.push({
          type: 'video',
          url: cleanUrl,
          title: 'Google Drive Video',
        });
      } else {
        results.push({
          type: 'drive',
          url: cleanUrl,
          title: 'Google Drive File',
        });
      }
      continue;
    }

    // 2. YouTube Video
    if (lower.includes('youtube.com/watch') || lower.includes('youtu.be/') || lower.includes('youtube.com/shorts')) {
      results.push({
        type: 'youtube',
        url: cleanUrl,
        title: 'YouTube Video',
      });
      continue;
    }

    // 3. TikTok Video
    if (lower.includes('tiktok.com/')) {
      results.push({
        type: 'tiktok',
        url: cleanUrl,
        title: 'TikTok Video',
      });
      continue;
    }

    // 4. Direct Images
    if (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.gif') ||
      lower.endsWith('.svg') ||
      lower.includes('images.unsplash.com') ||
      lower.includes('lh3.googleusercontent.com') ||
      lower.startsWith('data:image/')
    ) {
      results.push({
        type: 'image',
        url: cleanUrl,
        title: 'Image Attachment',
      });
      continue;
    }

    // 5. Direct Video
    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.startsWith('data:video/')) {
      results.push({
        type: 'video',
        url: cleanUrl,
        title: 'Video Attachment',
      });
      continue;
    }

    // 6. Direct Audio
    if (lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg') || lower.endsWith('.m4a') || lower.endsWith('.aac') || lower.startsWith('data:audio/')) {
      results.push({
        type: 'audio',
        url: cleanUrl,
        title: 'Voice Note / Audio',
      });
      continue;
    }

    // 7. Documents (PDF, Word, Excel, etc.)
    if (
      lower.endsWith('.pdf') ||
      lower.endsWith('.doc') ||
      lower.endsWith('.docx') ||
      lower.endsWith('.xls') ||
      lower.endsWith('.xlsx') ||
      lower.endsWith('.csv') ||
      lower.endsWith('.txt') ||
      lower.endsWith('.zip') ||
      lower.includes('docs.google.com/document') ||
      lower.includes('docs.google.com/spreadsheets')
    ) {
      const fileName = cleanUrl.split('/').pop()?.split('?')[0] || 'Document';
      results.push({
        type: 'document',
        url: cleanUrl,
        filename: decodeURIComponent(fileName),
        title: 'Document Attachment',
      });
    }
  }

  return results;
}

/**
 * Custom WhatsApp-style Interactive Audio Player
 * Fully solves audio duration, playback issues, and 401 download errors for WhatsApp voice notes (Opus/OGG/AAC/MP3)
 */
export const WhatsAppAudioPlayer: React.FC<{
  src: string;
  isIncoming?: boolean;
  className?: string;
  onExpand?: () => void;
}> = ({ src, isIncoming = false, className = '', onExpand }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const safeSrc = getSafeWhatsAppMediaUrl(src);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !safeSrc) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    // Technique to extract accurate duration from Opus/OGG streams where initial duration is Infinity/NaN
    const checkAndSetDuration = () => {
      if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration)) {
        setDuration(audio.duration);
        setIsLoading(false);
        setHasError(false);
      } else if (audio.duration === Infinity) {
        // Opus stream duration discovery probe
        const onSeeked = () => {
          if (isFinite(audio.duration) && !isNaN(audio.duration)) {
            setDuration(audio.duration);
          }
          audio.currentTime = 0;
          setIsLoading(false);
        };
        audio.addEventListener('seeked', onSeeked, { once: true });
        audio.currentTime = 1e10;
      }
    };

    const handleLoadedMetadata = () => {
      checkAndSetDuration();
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      checkAndSetDuration();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
      if ((!duration || !isFinite(duration)) && isFinite(audio.duration) && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      console.warn('Audio playback error on URL:', safeSrc);
      setHasError(true);
      setIsPlaying(false);
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('durationchange', checkAndSetDuration);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('durationchange', checkAndSetDuration);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [safeSrc]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasError(false);
        })
        .catch((err) => {
          console.warn('Audio play error:', err);
          setIsPlaying(false);
          setHasError(true);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleReload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasError(false);
    setIsLoading(true);
    if (audioRef.current) {
      audioRef.current.load();
    }
  };

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      className={`rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 transition-all ${
        isIncoming
          ? 'bg-slate-100/95 border border-slate-200/90 text-slate-900 shadow-2xs'
          : 'bg-emerald-700/80 border border-emerald-500/40 text-white shadow-xs'
      } ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <audio ref={audioRef} src={safeSrc} preload="metadata" crossOrigin="anonymous" />

      {/* Play / Pause Button */}
      {hasError ? (
        <button
          type="button"
          onClick={handleReload}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer bg-rose-500 text-white hover:bg-rose-600 shadow-sm transition-transform active:scale-95"
          title="Play failed. Click to reload audio."
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={togglePlay}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-sm transition-transform active:scale-95 ${
            isIncoming
              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'bg-white text-emerald-800 hover:bg-emerald-50'
          }`}
          title={isPlaying ? 'Pause Voice Note' : 'Play Voice Note'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>
      )}

      {/* Progress & Waveform Bar */}
      <div className="flex-1 min-w-[130px] flex flex-col justify-center gap-1.5">
        {/* Equalizer / Animated Waveform visualization */}
        <div className="flex items-center gap-0.5 h-3.5 px-0.5">
          {[40, 75, 55, 90, 30, 85, 60, 95, 45, 70, 50, 80, 65, 90, 40, 75, 60, 85, 50, 70].map((h, i) => {
            const barProgress = (i / 20) * 100;
            const isPassed = progressPercent >= barProgress;
            return (
              <span
                key={i}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isPassed
                    ? isIncoming
                      ? 'bg-emerald-600'
                      : 'bg-white'
                    : isIncoming
                    ? 'bg-slate-300'
                    : 'bg-emerald-900/50'
                } ${isPlaying ? 'animate-pulse' : ''}`}
                style={{
                  height: isPlaying ? `${Math.max(25, (h * (0.6 + Math.random() * 0.4)))}%` : `${h * 0.7}%`,
                }}
              />
            );
          })}
        </div>

        {/* Range Scrubber */}
        <div className="relative flex items-center group">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-slate-300 dark:bg-emerald-950/60 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
          />
        </div>

        {/* Time duration readout */}
        <div className="flex items-center justify-between text-[10px] font-mono opacity-85 leading-none">
          <span>{isPlaying ? `${formatTime(currentTime)} / ${formatTime(duration)}` : formatTime(currentTime)}</span>
          <span className="flex items-center gap-1 font-bold">
            <Mic className="w-2.5 h-2.5 inline text-emerald-500" />
            {duration > 0 ? formatTime(duration) : isLoading ? 'Loading...' : 'Voice Note'}
          </span>
        </div>
      </div>

      {/* Playback speed toggle */}
      <button
        type="button"
        onClick={toggleSpeed}
        className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-tight shrink-0 transition-colors cursor-pointer ${
          isIncoming
            ? 'bg-slate-200/90 hover:bg-slate-300 text-slate-800'
            : 'bg-emerald-800/80 hover:bg-emerald-900 text-emerald-100'
        }`}
        title="Playback Speed (1x, 1.5x, 2x)"
      >
        {playbackRate}x
      </button>

      {/* Safe Direct Download */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          triggerDirectMediaDownload(safeSrc, 'whatsapp_voice_note.ogg');
        }}
        className={`p-1.5 rounded-lg shrink-0 transition-colors cursor-pointer ${
          isIncoming
            ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/80'
            : 'text-emerald-100 hover:text-white hover:bg-emerald-600/60'
        }`}
        title="Download Audio"
      >
        <Download className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/**
 * Universal Media Attachment Card for WhatsApp message bubbles
 */
export const WhatsAppMediaCard: React.FC<{
  target: MediaPreviewTarget;
  isIncoming?: boolean;
  onOpenModal: (target: MediaPreviewTarget) => void;
}> = ({ target, isIncoming = false, onOpenModal }) => {
  const { type, url, filename, title, mediaId, mimeType } = target;
  const driveId = extractGoogleDriveFileId(url);
  const safeUrl = getSafeWhatsAppMediaUrl(url, mediaId, mimeType, filename);

  // 1. IMAGE
  if (type === 'image' || (driveId && target.title?.includes('Image'))) {
    const optimizedUrl = getOptimizedImageUrl(safeUrl, 800);
    return (
      <div className="relative group overflow-hidden rounded-2xl border border-black/10 bg-slate-900/5 shadow-2xs max-w-sm">
        <img
          src={optimizedUrl}
          alt={title || 'WhatsApp Image'}
          className="w-full max-h-64 object-cover rounded-2xl cursor-pointer transition-transform duration-200 group-hover:scale-102"
          onClick={() => onOpenModal({ ...target, url: safeUrl })}
          onError={(e) => handleImageError(e, safeUrl)}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2.5 pointer-events-none">
          <span className="text-white text-[11px] font-bold truncate max-w-[180px] drop-shadow-sm">
            {title || filename || 'View Image'}
          </span>
          <div className="flex items-center gap-1 pointer-events-auto">
            <button
              type="button"
              onClick={() => onOpenModal({ ...target, url: safeUrl })}
              className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs cursor-pointer backdrop-blur-xs"
              title="Expand Image"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => triggerDirectMediaDownload(safeUrl, filename || 'whatsapp_image.jpg')}
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs cursor-pointer shadow-xs"
              title="Download Image"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. VIDEO (Google Drive, Direct MP4, YouTube, TikTok)
  if (type === 'video' || type === 'youtube' || type === 'tiktok' || (driveId && target.title?.includes('Video'))) {
    if (driveId) {
      const drivePreviewUrl = `https://drive.google.com/file/d/${driveId}/preview`;
      return (
        <div className="rounded-2xl overflow-hidden border border-purple-200/50 bg-slate-950 shadow-sm max-w-sm">
          <div className="relative aspect-video w-full bg-slate-900 flex items-center justify-center">
            <iframe
              src={drivePreviewUrl}
              title="Google Drive Video Player"
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="p-2.5 bg-slate-900 text-white flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold truncate">
              <VideoIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="truncate">Google Drive Video</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOpenModal({ type: 'video', url: drivePreviewUrl, title: 'Google Drive Video' })}
                className="px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-[10px] text-white flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3 h-3" /> Full View
              </button>
              <button
                type="button"
                onClick={() => triggerDirectMediaDownload(safeUrl, filename || 'video.mp4')}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Download Video"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Direct MP4 / WebM
    return (
      <div className="rounded-2xl overflow-hidden border border-black/10 bg-slate-950 shadow-sm max-w-sm">
        <video src={safeUrl} controls className="w-full max-h-60 rounded-t-xl bg-black" />
        <div className="p-2 bg-slate-900 text-white flex items-center justify-between text-xs">
          <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
            <VideoIcon className="w-3.5 h-3.5 text-purple-400" /> Video
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenModal({ ...target, url: safeUrl })}
              className="px-2 py-1 rounded-md bg-purple-600 hover:bg-purple-500 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
            </button>
            <button
              type="button"
              onClick={() => triggerDirectMediaDownload(safeUrl, filename || 'video.mp4')}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title="Download Video"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. AUDIO / VOICE NOTE (Opus / OGG / MP3 / AAC / Voice Message)
  if (type === 'audio' || type === 'voice') {
    return <WhatsAppAudioPlayer src={safeUrl} isIncoming={isIncoming} onExpand={() => onOpenModal({ ...target, url: safeUrl })} />;
  }

  // 4. DOCUMENT (PDF, Word, Excel, Google Drive document)
  const isPdf = safeUrl.toLowerCase().includes('.pdf') || (filename || '').toLowerCase().endsWith('.pdf');
  const isDoc = safeUrl.toLowerCase().includes('.doc') || safeUrl.toLowerCase().includes('.docx') || (filename || '').toLowerCase().endsWith('.docx');
  const isXls = safeUrl.toLowerCase().includes('.xls') || safeUrl.toLowerCase().includes('.xlsx') || safeUrl.toLowerCase().includes('.csv') || (filename || '').toLowerCase().endsWith('.xlsx');

  return (
    <div
      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-2xs max-w-sm ${
        isIncoming
          ? 'bg-slate-50/95 border-slate-200/90 text-slate-800'
          : 'bg-emerald-700/80 border-emerald-500/40 text-white'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
            isPdf
              ? 'bg-rose-100 text-rose-600'
              : isDoc
              ? 'bg-blue-100 text-blue-600'
              : isXls
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isPdf ? (
            <FileText className="w-5 h-5" />
          ) : isDoc ? (
            <File className="w-5 h-5" />
          ) : isXls ? (
            <FileSpreadsheet className="w-5 h-5" />
          ) : (
            <FileCode className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-xs truncate max-w-[160px] sm:max-w-[200px]">
            {filename || title || 'Document.pdf'}
          </p>
          <span className="text-[10px] opacity-75 font-mono">
            {isPdf ? 'PDF Document' : isDoc ? 'Word Document' : isXls ? 'Spreadsheet' : 'Attached File'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Preview Button */}
        <button
          type="button"
          onClick={() => onOpenModal({ ...target, url: safeUrl, filename: filename || title || 'Document' })}
          className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer transition-all active:scale-95 ${
            isIncoming
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-white hover:bg-emerald-50 text-emerald-800'
          }`}
          title="Preview Document in Inbox"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>দেখুন</span>
        </button>

        {/* Download Button */}
        <button
          type="button"
          onClick={() => triggerDirectMediaDownload(safeUrl, filename || 'Document.pdf')}
          className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
            isIncoming
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              : 'text-emerald-100 hover:text-white hover:bg-emerald-600/70'
          }`}
          title="Download File"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Universal Fullscreen Media & Document Viewer Modal
 */
export const WhatsAppMediaPreviewModal: React.FC<{
  target: MediaPreviewTarget | null;
  onClose: () => void;
}> = ({ target, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setZoomLevel(1);
    setRotation(0);
  }, [target]);

  if (!target) return null;

  const { type, url, filename, title, mediaId, mimeType } = target;
  const safeUrl = getSafeWhatsAppMediaUrl(url, mediaId, mimeType, filename);
  const driveId = extractGoogleDriveFileId(safeUrl);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation((prev) => (prev + 90) % 360);
  };

  // Resolve viewer URL for Documents
  let documentEmbedUrl = safeUrl;
  if (driveId) {
    documentEmbedUrl = `https://drive.google.com/file/d/${driveId}/preview`;
  } else if (!safeUrl.toLowerCase().endsWith('.pdf') && !safeUrl.startsWith('data:')) {
    documentEmbedUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(safeUrl)}&embedded=true`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950/90 border-b border-slate-800 text-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              {type === 'image' && <ImageIcon className="w-4 h-4" />}
              {type === 'video' && <VideoIcon className="w-4 h-4" />}
              {(type === 'audio' || type === 'voice') && <Mic className="w-4 h-4" />}
              {type === 'document' && <FileText className="w-4 h-4" />}
              {type === 'drive' && <Sparkles className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate max-w-xs sm:max-w-md">
                {filename || title || 'WhatsApp Media Preview'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                {type.toUpperCase()} • KenaX BD WhatsApp Live Inbox
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {type === 'image' && (
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => triggerDirectMediaDownload(safeUrl, filename || 'download')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close Preview (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-4">
          {/* IMAGE */}
          {type === 'image' && (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <img
                src={safeUrl}
                alt={title || 'WhatsApp Preview'}
                className="max-w-full max-h-full object-contain transition-transform duration-200 shadow-2xl rounded-xl"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                }}
                onError={(e) => handleImageError(e, safeUrl)}
              />
            </div>
          )}

          {/* VIDEO */}
          {(type === 'video' || type === 'youtube' || type === 'tiktok') && (
            <div className="w-full h-full flex items-center justify-center">
              {driveId || safeUrl.includes('/preview') || type === 'youtube' ? (
                <iframe
                  src={driveId ? `https://drive.google.com/file/d/${driveId}/preview` : safeUrl}
                  title="Video Player"
                  className="w-full h-full rounded-2xl border-0"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={safeUrl} controls autoPlay className="max-w-full max-h-full rounded-2xl bg-black shadow-2xl" />
              )}
            </div>
          )}

          {/* AUDIO / VOICE */}
          {(type === 'audio' || type === 'voice') && (
            <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Mic className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Voice Note Audio</h4>
                <p className="text-xs text-slate-400 mt-0.5">WhatsApp recorded voice message</p>
              </div>
              <WhatsAppAudioPlayer src={safeUrl} className="w-full" />
            </div>
          )}

          {/* DOCUMENT / DRIVE */}
          {(type === 'document' || type === 'drive') && (
            <div className="w-full h-full flex flex-col items-center justify-center rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
              <iframe
                src={documentEmbedUrl}
                title="Document In-App Viewer"
                className="w-full h-full border-0 bg-white rounded-2xl"
                allowFullScreen
              />
            </div>
          )}
        </div>

        {/* Bottom Footer Info */}
        <div className="px-6 py-2.5 bg-slate-950 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
          <span className="truncate max-w-md">Source: {safeUrl}</span>
          <button
            type="button"
            onClick={() => triggerDirectMediaDownload(safeUrl, filename || 'download')}
            className="text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
          >
            Direct Download <Download className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Microphone Voice Recorder Hook & State Helper
 */
export function useWhatsAppVoiceRecorder(
  onSendVoice: (audioDataUrl: string) => Promise<void>
) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const [recorderError, setRecorderError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    setRecorderError(null);
    setRecordedAudioUrl(null);
    audioChunksRef.current = [];

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setRecorderError('Microphone access is not supported on this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Detect best supported audio mime type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
        'audio/aac',
      ];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, selectedMimeType ? { mimeType: selectedMimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission denied or error:', err);
      setRecorderError(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access in browser settings.'
          : 'Failed to access microphone.'
      );
      setIsRecording(false);
    }
  };

  const stopRecording = (autoSend = false): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        cleanupStream();
        resolve(null);
        return;
      }

      clearInterval(timerRef.current);

      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/ogg';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        cleanupStream();

        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          setRecordedAudioUrl(dataUrl);
          setIsRecording(false);

          if (autoSend && dataUrl) {
            setIsSendingVoice(true);
            try {
              await onSendVoice(dataUrl);
              setRecordedAudioUrl(null);
            } catch (e: any) {
              setRecorderError(e.message || 'Failed to send voice note');
            } finally {
              setIsSendingVoice(false);
            }
          }
          resolve(dataUrl);
        };
        reader.onerror = () => {
          setIsRecording(false);
          resolve(null);
        };
        reader.readAsDataURL(audioBlob);
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping MediaRecorder:', err);
        cleanupStream();
        setIsRecording(false);
        resolve(null);
      }
    });
  };

  const cancelRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    cleanupStream();
    setIsRecording(false);
    setRecordingSeconds(0);
    setRecordedAudioUrl(null);
    audioChunksRef.current = [];
  };

  const cleanupStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const sendRecordedAudio = async () => {
    if (!recordedAudioUrl || isSendingVoice) return;
    setIsSendingVoice(true);
    setRecorderError(null);
    try {
      await onSendVoice(recordedAudioUrl);
      setRecordedAudioUrl(null);
      setRecordingSeconds(0);
    } catch (err: any) {
      setRecorderError(err.message || 'Failed to send voice message.');
    } finally {
      setIsSendingVoice(false);
    }
  };

  return {
    isRecording,
    recordingSeconds,
    recordedAudioUrl,
    isSendingVoice,
    recorderError,
    startRecording,
    stopRecording,
    cancelRecording,
    sendRecordedAudio,
    setRecordedAudioUrl,
  };
}
