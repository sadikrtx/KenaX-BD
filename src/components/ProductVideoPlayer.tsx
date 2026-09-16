import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertCircle, Loader2 } from 'lucide-react';
import { resolveTikTokDirectMp4 } from '../utils/tiktokResolver';

interface ProductVideoPlayerProps {
  videoUrl: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  title?: string;
}

/**
 * Extracts YouTube 11-character Video ID from various URL formats
 */
export function extractYouTubeId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * Extracts Google Drive File ID from various sharing or view URLs
 */
export function extractGoogleDriveId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;
  
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
    return trimmed;
  }
  
  const match = trimmed.match(/(?:file\/d\/|id=|open\?id=|uc\?id=)([a-zA-Z0-9_-]{25,50})/);
  return match ? match[1] : null;
}

/**
 * Extracts TikTok Video ID from TikTok web links or embed URLs
 */
export function extractTikTokId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  if (/^\d{15,25}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/(?:video\/|v\/|embed\/v2\/|embed\/)(\d{15,25})/);
  if (match) return match[1];

  const paramMatch = trimmed.match(/(?:item_id|video_id)=(\d{15,25})/);
  if (paramMatch) return paramMatch[1];

  return null;
}

export const ProductVideoPlayer: React.FC<ProductVideoPlayerProps> = ({
  videoUrl,
  className = 'w-full h-full object-contain bg-black',
  autoPlay = true,
  loop = true,
  title = 'Product Video',
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [useDriveIframeFallback, setUseDriveIframeFallback] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);

  // TikTok resolution states
  const [tiktokDirectStreamUrl, setTiktokDirectStreamUrl] = useState<string | null>(null);
  const [isResolvingTikTok, setIsResolvingTikTok] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const ytId = extractYouTubeId(videoUrl);
  const driveId = extractGoogleDriveId(videoUrl);
  const tiktokId = extractTikTokId(videoUrl);

  const isYouTube = Boolean(ytId);
  const isGoogleDrive = !isYouTube && Boolean(driveId);
  const isTikTok = !isYouTube && !isGoogleDrive && (Boolean(tiktokId) || videoUrl.toLowerCase().includes('tiktok.com'));
  const isDirectVideo = !isYouTube && !isGoogleDrive && !isTikTok;

  // Resolve TikTok direct stream to strip logos, titles, watermarks and enable super fast native MP4 video playback
  useEffect(() => {
    if (isTikTok) {
      setIsResolvingTikTok(true);
      resolveTikTokDirectMp4(videoUrl).then((streamUrl) => {
        setTiktokDirectStreamUrl(streamUrl);
        setIsResolvingTikTok(false);
      }).catch(() => {
        setIsResolvingTikTok(false);
      });
    } else {
      setTiktokDirectStreamUrl(null);
      setIsResolvingTikTok(false);
    }
  }, [isTikTok, videoUrl]);

  // Direct stream link for Google Drive video tag
  const driveDirectStreamUrl = driveId
    ? `https://lh3.googleusercontent.com/d/${driveId}`
    : '';

  // Google Drive preview iframe fallback
  const driveIframeUrl = driveId
    ? `https://drive.google.com/file/d/${driveId}/preview`
    : '';

  // Fallback TikTok Embed URL if direct stream resolution fails
  const tiktokEmbedUrl = tiktokId
    ? `https://www.tiktok.com/embed/v2/${tiktokId}?lang=en-US`
    : videoUrl.includes('/embed/')
    ? videoUrl
    : `https://www.tiktok.com/embed/v2/${videoUrl}?lang=en-US`;

  // YouTube Embed URL formatted for Max Quality (1080p/Highres), No Controls, No Title/Logo branding
  const ytEmbedUrl = ytId
    ? `https://www.youtube-nocookie.com/embed/${ytId}?enablejsapi=1&autoplay=${
        autoPlay ? 1 : 0
      }&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=0&disablekb=1&playsinline=1&loop=${
        loop ? 1 : 0
      }&playlist=${ytId}&vq=hd1080&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`
    : '';

  // 1-second Auto-hide controls timer logic
  const triggerUserInteraction = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 1000);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 1000);
    } else {
      setShowControls(true);
    }
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isPlaying]);

  // YouTube postMessage controller
  const sendYouTubeCommand = useCallback((func: string, args: any = '') => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch (e) {
        console.error('Failed to send postMessage to YouTube iframe:', e);
      }
    }
  }, []);

  // Sync YouTube playback state when play/pause toggled
  useEffect(() => {
    if (isYouTube) {
      if (isPlaying) {
        sendYouTubeCommand('playVideo');
        sendYouTubeCommand('setPlaybackQuality', 'hd1080');
        sendYouTubeCommand('setPlaybackQuality', 'highres');
      } else {
        sendYouTubeCommand('pauseVideo');
      }
    }
  }, [isPlaying, isYouTube, sendYouTubeCommand]);

  // Sync YouTube mute state
  useEffect(() => {
    if (isYouTube) {
      if (isMuted) {
        sendYouTubeCommand('mute');
      } else {
        sendYouTubeCommand('unMute');
      }
    }
  }, [isMuted, isYouTube, sendYouTubeCommand]);

  // Handle native HTML5 video play/pause
  const toggleNativePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Toggle play / pause ONLY when clicking Play/Pause button
  const handleTogglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDirectVideo || tiktokDirectStreamUrl || (isGoogleDrive && !useDriveIframeFallback)) {
      toggleNativePlayPause();
    } else {
      setIsPlaying((prev) => !prev);
    }
    triggerUserInteraction();
  };

  // Toggle Mute / Unmute
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    triggerUserInteraction();
  };

  if (hasError) {
    return (
      <div className="w-full h-full min-h-[280px] bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-2 animate-bounce" />
        <p className="text-sm font-bold text-slate-200">Unable to load video stream</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Please verify that the video URL is public and valid.
        </p>
      </div>
    );
  }

  return (
    <div
      onMouseMove={triggerUserInteraction}
      onTouchStart={triggerUserInteraction}
      className={`relative group overflow-hidden bg-black select-none ${className}`}
    >
      {/* 1. YOUTUBE PLAYER */}
      {isYouTube && (
        <div className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center">
          <iframe
            ref={iframeRef}
            src={ytEmbedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            className="w-full h-full scale-[1.35] pointer-events-none transition-opacity duration-300"
            style={{ border: 'none' }}
            onLoad={() => {
              if (isMuted) sendYouTubeCommand('mute');
              sendYouTubeCommand('setPlaybackQuality', 'hd1080');
              if (autoPlay) sendYouTubeCommand('playVideo');
            }}
          />
          {/* Transparent overlay over iframe so clicking video does NOT trigger YouTube native pause/seek */}
          <div className="absolute inset-0 z-10 bg-transparent pointer-events-auto" />
        </div>
      )}

      {/* 2. TIKTOK PLAYER (FAST STREAMING DIRECT MP4 OR FALLBACK MASKED 9:16) */}
      {isTikTok && (
        <div className="relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center p-1 sm:p-2">
          {isResolvingTikTok ? (
            <div className="relative h-full aspect-[9/16] w-full max-w-xs rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-400 p-4">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-2" />
              <p className="text-xs font-semibold text-slate-300">Fast Loading TikTok Video...</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Stripping TikTok Logos & Watermarks</p>
            </div>
          ) : tiktokDirectStreamUrl ? (
            /* FAST DIRECT MP4 VIDEO (NO LOGO, NO TITLE, NO WATERMARK) IN ORIGINAL 9:16 VERTICAL RATIO */
            <div className="relative h-full aspect-[9/16] max-w-full rounded-xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center">
              <video
                ref={videoRef}
                src={tiktokDirectStreamUrl}
                autoPlay={autoPlay}
                loop={loop}
                muted={isMuted}
                playsInline
                controls={false}
                className="w-full h-full object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={() => {
                  // Fallback if direct stream URL expires
                  setTiktokDirectStreamUrl(null);
                }}
              />
            </div>
          ) : (
            /* FALLBACK MASKED IFRAME (MASKING TOP & BOTTOM TIKTOK HEADERS/FOOTERS) */
            <div className="relative h-full aspect-[9/16] max-w-full rounded-xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center">
              <iframe
                src={tiktokEmbedUrl}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
                className="w-full h-[125%] -mt-[12%] border-0 pointer-events-none"
              />
              <div className="absolute inset-0 z-10 bg-transparent pointer-events-auto" />
            </div>
          )}
        </div>
      )}

      {/* 3. GOOGLE DRIVE PLAYER */}
      {isGoogleDrive && (
        <div className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center">
          {!useDriveIframeFallback ? (
            <video
              ref={videoRef}
              src={driveDirectStreamUrl}
              autoPlay={autoPlay}
              loop={loop}
              muted={isMuted}
              playsInline
              controls={false}
              className="w-full h-full object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => {
                setUseDriveIframeFallback(true);
              }}
            />
          ) : (
            <div className="relative w-full h-full">
              <iframe
                src={driveIframeUrl}
                title={title}
                className="w-full h-full border-0 pointer-events-none"
                allow="autoplay"
              />
              <div className="absolute inset-0 z-10 bg-transparent pointer-events-auto" />
            </div>
          )}
        </div>
      )}

      {/* 4. DIRECT VIDEO PLAYER (MP4/WebM/Data URL) */}
      {isDirectVideo && (
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay={autoPlay}
          loop={loop}
          muted={isMuted}
          playsInline
          controls={false}
          className="w-full h-full object-contain"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setHasError(true)}
        />
      )}

      {/* CENTER PAUSE / PLAY ICON (AUTOMATICALLY FADES OUT AFTER 1 SECOND OF PLAYING) */}
      <div
        className={`absolute inset-0 z-30 flex items-center justify-center transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={handleTogglePlayPause}
          className="p-4 sm:p-5 rounded-full bg-black/75 hover:bg-black/90 text-white border border-white/25 shadow-2xl backdrop-blur-md active:scale-90 transition-all cursor-pointer flex items-center justify-center"
          title={isPlaying ? 'Pause Video' : 'Play Video'}
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 sm:w-10 sm:h-10 text-sky-400 fill-sky-400" />
          ) : (
            <Play className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 fill-emerald-400 ml-1" />
          )}
        </button>
      </div>

      {/* BOTTOM CONTROLS (PLAY/PAUSE & MUTE - NO 10s SKIP BUTTONS, NO BRANDING, FADES OUT AFTER 1s) */}
      <div
        className={`absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Simple Play/Pause Status Pill */}
        <button
          type="button"
          onClick={handleTogglePlayPause}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/80 hover:bg-black/95 text-white border border-white/20 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer text-xs font-bold"
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              <span>Play</span>
            </>
          )}
        </button>

        {/* Simple Mute/Unmute Toggle Pill */}
        <button
          type="button"
          onClick={handleToggleMute}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/80 hover:bg-black/95 text-white border border-white/20 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer text-xs font-bold"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span>Unmute</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              <span>Sound On</span>
            </>
          )}
        </button>
      </div>

      {/* HD Quality Indicator Badge */}
      <div
        className={`absolute top-3 right-3 z-20 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <span className="px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-xs border border-white/10">
          {isTikTok ? 'TikTok 9:16 Clean Stream' : 'HD Fast Quality'}
        </span>
      </div>
    </div>
  );
};
