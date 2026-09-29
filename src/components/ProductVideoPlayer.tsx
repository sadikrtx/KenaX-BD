import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertCircle, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { resolveTikTokDirectMp4 } from '../utils/tiktokResolver';

export interface VideoQualityInfo {
  width: number;
  height: number;
  qualityLabel: string;
  isLossless: boolean;
}

export interface ProductVideoPlayerProps {
  videoUrl: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  title?: string;
  aspectRatio?: 'auto' | '9:16' | '16:9' | '1:1' | '4:3';
  /**
   * Disables browser/player downscaling and compression artifacts, locking renderer
   * to 100% native source pixels.
   * Default: true
   */
  disableDownscaling?: boolean;
  /**
   * Continuously enforces the highest original source resolution (e.g. 4K, 1080p),
   * overriding adaptive bitrate (ABR) downscaling drops.
   * Default: true
   */
  maintainSourceResolution?: boolean;
  /**
   * Display source resolution & lossless indicator badge.
   * Default: true
   */
  showResolutionBadge?: boolean;
  onEnded?: () => void;
  onDurationChange?: (duration: number) => void;
  onRatioDetected?: (ratio: '9:16' | '16:9' | '1:1' | '4:3') => void;
  onQualityDetected?: (quality: VideoQualityInfo) => void;
}

/**
 * Auto-detects aspect ratio from video URL
 */
export function detectVideoAspectRatio(url?: string): '9:16' | '16:9' | '1:1' | '4:3' {
  if (!url) return '16:9';
  const lower = url.toLowerCase();
  if (lower.includes('tiktok.com') || lower.includes('/shorts/') || lower.includes('/reel/') || lower.includes('/reels/')) {
    return '9:16';
  }
  return '16:9';
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

/**
 * Extracts Facebook Video URL / ID from Facebook sharing or reel URLs
 */
export function extractFacebookVideoUrl(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('facebook.com') ||
    lower.includes('fb.watch') ||
    lower.includes('fb.com')
  ) {
    return trimmed;
  }
  return null;
}

export const ProductVideoPlayer: React.FC<ProductVideoPlayerProps> = ({
  videoUrl,
  className = 'w-full h-full object-contain bg-black',
  autoPlay = true,
  loop = false,
  title = 'Product Video',
  aspectRatio = 'auto',
  disableDownscaling = true,
  maintainSourceResolution = true,
  showResolutionBadge = false,
  onEnded,
  onDurationChange,
  onRatioDetected,
  onQualityDetected,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [useDriveIframeFallback, setUseDriveIframeFallback] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isDownscaleDisabled, setIsDownscaleDisabled] = useState<boolean>(disableDownscaling);
  const [detectedQuality, setDetectedQuality] = useState<VideoQualityInfo | null>(null);

  useEffect(() => {
    setIsDownscaleDisabled(disableDownscaling);
  }, [disableDownscaling]);

  const [detectedRatio, setDetectedRatio] = useState<'9:16' | '16:9' | '1:1' | '4:3'>(() => {
    if (aspectRatio && aspectRatio !== 'auto') return aspectRatio;
    return detectVideoAspectRatio(videoUrl);
  });

  useEffect(() => {
    if (aspectRatio && aspectRatio !== 'auto') {
      setDetectedRatio(aspectRatio);
    } else {
      setDetectedRatio(detectVideoAspectRatio(videoUrl));
    }
  }, [aspectRatio, videoUrl]);

  const effectiveRatio = (aspectRatio && aspectRatio !== 'auto') ? aspectRatio : detectedRatio;

  // Lossless video hardware-rasterization & pixel-preservation styles (prevents blur & software downscaling)
  const losslessVideoStyle: React.CSSProperties = isDownscaleDisabled
    ? {
        imageRendering: '-webkit-optimize-contrast',
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        objectFit: 'contain',
        willChange: 'transform',
        maxHeight: '100%',
        maxWidth: '100%',
      }
    : {
        objectFit: 'contain',
      };

  // TikTok resolution states
  const [tiktokDirectStreamUrl, setTiktokDirectStreamUrl] = useState<string | null>(null);
  const [isResolvingTikTok, setIsResolvingTikTok] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const ytId = extractYouTubeId(videoUrl);
  const driveId = extractGoogleDriveId(videoUrl);
  const tiktokId = extractTikTokId(videoUrl);
  const fbUrl = extractFacebookVideoUrl(videoUrl);

  const isYouTube = Boolean(ytId);
  const isGoogleDrive = !isYouTube && Boolean(driveId);
  const isTikTok = !isYouTube && !isGoogleDrive && (Boolean(tiktokId) || videoUrl.toLowerCase().includes('tiktok.com'));
  const isFacebook = !isYouTube && !isGoogleDrive && !isTikTok && Boolean(fbUrl);
  const isDirectVideo = !isYouTube && !isGoogleDrive && !isTikTok && !isFacebook;

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const { videoWidth, videoHeight, duration } = e.currentTarget;
    if (videoWidth && videoHeight) {
      const ratio = videoWidth / videoHeight;
      let detected: '9:16' | '16:9' | '1:1' | '4:3' = '16:9';
      if (ratio < 0.75) detected = '9:16';
      else if (ratio >= 0.75 && ratio <= 1.25) detected = '1:1';
      else if (ratio > 1.25 && ratio < 1.5) detected = '4:3';
      else detected = '16:9';

      if (!aspectRatio || aspectRatio === 'auto') {
        setDetectedRatio(detected);
      }
      if (onRatioDetected) onRatioDetected(detected);

      // Determine accurate native source resolution label
      let qualityLabel = `${videoWidth}×${videoHeight}`;
      if (videoHeight >= 2160 || videoWidth >= 2160) qualityLabel = '4K UHD (Source)';
      else if (videoHeight >= 1440 || videoWidth >= 1440) qualityLabel = '2K QHD (Source)';
      else if (videoHeight >= 1080 || videoWidth >= 1080) qualityLabel = '1080p FHD (Source)';
      else if (videoHeight >= 720 || videoWidth >= 720) qualityLabel = '720p HD (Source)';
      else qualityLabel = `${Math.min(videoWidth, videoHeight)}p (Source)`;

      const qualityData: VideoQualityInfo = {
        width: videoWidth,
        height: videoHeight,
        qualityLabel,
        isLossless: isDownscaleDisabled,
      };
      setDetectedQuality(qualityData);
      if (onQualityDetected) onQualityDetected(qualityData);
    }
    if (duration && !isNaN(duration) && onDurationChange) {
      onDurationChange(duration);
    }
  };

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

  // Facebook Video Embed URL
  const fbEmbedUrl = fbUrl
    ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fbUrl)}&show_text=false&autoplay=${
        autoPlay ? 1 : 0
      }&mute=${isMuted ? 1 : 0}&controls=0`
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
      }${loop ? `&playlist=${ytId}` : ''}&vq=highres&highres=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`
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

  // Enforces highest available source resolution on YouTube embed
  const enforceYouTubeMaxQuality = useCallback(() => {
    if (!isYouTube || !maintainSourceResolution) return;
    sendYouTubeCommand('setPlaybackQuality', 'highres');
    sendYouTubeCommand('setPlaybackQuality', 'hd2160');
    sendYouTubeCommand('setPlaybackQuality', 'hd1440');
    sendYouTubeCommand('setPlaybackQuality', 'hd1080');
    sendYouTubeCommand('setPlaybackQualityRange', ['highres', 'hd2160', 'hd1440', 'hd1080']);
  }, [isYouTube, maintainSourceResolution, sendYouTubeCommand]);

  // Listen to YouTube state changes (0 = ended, 1 = playing, 2 = paused) & quality changes
  useEffect(() => {
    if (!isYouTube) return;
    const handleMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        if (data) {
          const state = typeof data.info === 'number'
            ? data.info
            : (data.info?.playerState !== undefined ? data.info.playerState : data.playerState);

          if (state === 0) {
            // Video finished playing
            setIsPlaying(false);
            if (onEnded) onEnded();
          } else if (state === 1) {
            setIsPlaying(true);
            enforceYouTubeMaxQuality();
          } else if (state === 2) {
            setIsPlaying(false);
          }

          // Counteract adaptive downscaling drops
          if (maintainSourceResolution && (data.event === 'onPlaybackQualityChange' || data.info?.playbackQuality)) {
            const currentQuality = data.event === 'onPlaybackQualityChange' ? data.data : data.info?.playbackQuality;
            if (currentQuality && ['small', 'tiny', 'medium', 'large'].includes(currentQuality)) {
              enforceYouTubeMaxQuality();
            }
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isYouTube, onEnded, maintainSourceResolution, enforceYouTubeMaxQuality]);

  // Periodic heartbeat to continuously prevent YouTube ABR engine from downscaling while playing
  useEffect(() => {
    if (!isYouTube || !isPlaying || !maintainSourceResolution) return;
    enforceYouTubeMaxQuality();
    const interval = setInterval(enforceYouTubeMaxQuality, 4000);
    return () => clearInterval(interval);
  }, [isYouTube, isPlaying, maintainSourceResolution, enforceYouTubeMaxQuality]);

  // Sync YouTube playback state when play/pause toggled
  useEffect(() => {
    if (isYouTube) {
      if (isPlaying) {
        sendYouTubeCommand('playVideo');
        enforceYouTubeMaxQuality();
      } else {
        sendYouTubeCommand('pauseVideo');
      }
    }
  }, [isPlaying, isYouTube, enforceYouTubeMaxQuality, sendYouTubeCommand]);

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
      {/* 1. YOUTUBE PLAYER (100% UNBRANDED, ZERO YOUTUBE LOGO, ZERO TITLE, ZERO WATERMARK) */}
      {isYouTube && (
        <div
          className={`relative w-full h-full overflow-hidden bg-black flex items-center justify-center ${
            effectiveRatio === '9:16'
              ? 'aspect-[9/16] max-w-full mx-auto'
              : effectiveRatio === '1:1'
              ? 'aspect-square max-w-full mx-auto'
              : ''
          }`}
        >
          {/* Zoomed & Studio-Cropped frame: Crops out YouTube top title header, avatar, share buttons, and bottom-right YouTube watermark completely outside visible bounds */}
          <div className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none">
            <iframe
              ref={iframeRef}
              src={ytEmbedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              className="w-[140%] h-[140%] max-w-none pointer-events-none transition-opacity duration-300"
              style={{
                border: 'none',
                transform: 'scale(1.05)',
                transformOrigin: 'center center',
              }}
              onLoad={() => {
                if (isMuted) sendYouTubeCommand('mute');
                sendYouTubeCommand('setPlaybackQuality', 'hd1080');
                sendYouTubeCommand('setPlaybackQuality', 'highres');
                if (autoPlay) sendYouTubeCommand('playVideo');
                sendYouTubeCommand('addEventListener', 'onStateChange');
              }}
            />
          </div>
          {/* Transparent overlay over iframe so clicking video does NOT trigger YouTube native pause/seek */}
          <div className="absolute inset-0 z-10 bg-transparent pointer-events-auto" />
        </div>
      )}

      {/* 2. TIKTOK PLAYER (FAST STREAMING DIRECT MP4 NO-WATERMARK OR FALLBACK MASKED 9:16) */}
      {isTikTok && (
        <div className="relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center p-1 sm:p-2">
          {isResolvingTikTok ? (
            <div className="relative h-full aspect-[9/16] w-full max-w-xs rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-400 p-4">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-2" />
              <p className="text-xs font-semibold text-slate-300">Fast Loading Video...</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Optimizing Video Stream</p>
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
                preload="auto"
                crossOrigin="anonymous"
                controls={false}
                style={losslessVideoStyle}
                className="w-full h-full object-contain"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false);
                  if (onEnded) onEnded();
                }}
                onLoadedMetadata={handleLoadedMetadata}
                onError={() => {
                  // Fallback if direct stream URL expires
                  setTiktokDirectStreamUrl(null);
                }}
              />
            </div>
          ) : (
            /* FALLBACK MASKED IFRAME (MASKING TOP & BOTTOM TIKTOK HEADERS/FOOTERS/WATERMARK) */
            <div className="relative h-full aspect-[9/16] max-w-full rounded-xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center">
              <div className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none">
                <iframe
                  src={tiktokEmbedUrl}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
                  className="w-[145%] h-[155%] -mt-[25%] -mb-[15%] border-0 pointer-events-none"
                />
              </div>
              <div className="absolute inset-0 z-10 bg-transparent pointer-events-auto" />
            </div>
          )}
        </div>
      )}

      {/* 3. GOOGLE DRIVE PLAYER (100% UNBRANDED, ZERO DRIVE UI / POP-OUT BUTTON) */}
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
              preload="auto"
              crossOrigin="anonymous"
              controls={false}
              style={losslessVideoStyle}
              className="w-full h-full object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                if (onEnded) onEnded();
              }}
              onLoadedMetadata={handleLoadedMetadata}
              onError={() => {
                setUseDriveIframeFallback(true);
              }}
            />
          ) : (
            <div className="relative w-full h-full overflow-hidden">
              {/* Mask top Drive header bar (Pop-out icon, filename, sign-in) */}
              <div className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none">
                <iframe
                  src={driveIframeUrl}
                  title={title}
                  className="w-full h-[calc(100%+65px)] -mt-[65px] border-0 pointer-events-none"
                  allow="autoplay"
                />
              </div>
              <div className="absolute inset-0 z-10 bg-transparent pointer-events-auto" />
            </div>
          )}
        </div>
      )}

      {/* 4. FACEBOOK VIDEO PLAYER (100% UNBRANDED, ZERO FB LOGO/CHROME) */}
      {isFacebook && (
        <div
          className={`relative w-full h-full overflow-hidden bg-black flex items-center justify-center ${
            effectiveRatio === '9:16'
              ? 'aspect-[9/16] max-w-full mx-auto'
              : effectiveRatio === '1:1'
              ? 'aspect-square max-w-full mx-auto'
              : ''
          }`}
        >
          <div className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none">
            <iframe
              src={fbEmbedUrl}
              title={title}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              className="w-[140%] h-[140%] max-w-none border-0 pointer-events-none"
              style={{
                transform: 'scale(1.05)',
                transformOrigin: 'center center',
              }}
            />
          </div>
          <div className="absolute inset-0 z-10 bg-transparent pointer-events-auto" />
        </div>
      )}

      {/* 5. DIRECT VIDEO PLAYER (MP4/WebM/Data URL) */}
      {isDirectVideo && (
        <div className={`relative w-full h-full flex items-center justify-center ${
          effectiveRatio === '9:16' ? 'aspect-[9/16] max-w-full mx-auto' : effectiveRatio === '1:1' ? 'aspect-square max-w-full mx-auto' : ''
        }`}>
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay={autoPlay}
            loop={loop}
            muted={isMuted}
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            controls={false}
            style={losslessVideoStyle}
            className="w-full h-full object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              if (onEnded) onEnded();
            }}
            onLoadedMetadata={handleLoadedMetadata}
            onError={() => setHasError(true)}
          />
        </div>
      )}

      {/* CENTER PAUSE / PLAY ICON (AUTOMATICALLY FADES OUT AFTER 1 SECOND OF PLAYING) */}
      <div
        className={`absolute inset-0 z-30 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={handleTogglePlayPause}
          className="pointer-events-auto w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/30 shadow-xl backdrop-blur-md active:scale-90 transition-all cursor-pointer flex items-center justify-center"
          title={isPlaying ? 'Pause Video' : 'Play Video'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white fill-white" />
          ) : (
            <Play className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white fill-white ml-0.5" />
          )}
        </button>
      </div>

      {/* BOTTOM CONTROLS (PLAY/PAUSE & MUTE - FADES OUT AFTER 1s) */}
      <div
        className={`absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Sleek Play/Pause Icon Button */}
        <button
          type="button"
          onClick={handleTogglePlayPause}
          aria-label={isPlaying ? 'Pause Video' : 'Play Video'}
          title={isPlaying ? 'Pause Video' : 'Play Video'}
          className="pointer-events-auto w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/20 shadow-lg backdrop-blur-md transition-all active:scale-90 cursor-pointer flex items-center justify-center shrink-0"
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 text-white fill-white" />
          ) : (
            <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
          )}
        </button>

        {/* Pure Icon Mute/Unmute Toggle (Click toggles sound, no text label) */}
        <button
          type="button"
          onClick={handleToggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          title={isMuted ? 'Unmute' : 'Mute'}
          className="pointer-events-auto w-8 h-8 rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/20 shadow-lg backdrop-blur-md transition-all active:scale-90 cursor-pointer flex items-center justify-center shrink-0"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-rose-300" />
          ) : (
            <Volume2 className="w-4 h-4 text-emerald-300" />
          )}
        </button>
      </div>

      {/* Top-Right Source Resolution & Lossless Status Badge (Hidden when showResolutionBadge is false) */}
      {showResolutionBadge && (
        <div
          className={`absolute top-3 right-3 z-30 transition-opacity duration-300 flex items-center gap-1.5 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 text-white text-[10px] font-bold tracking-wide backdrop-blur-md border border-emerald-500/30 shadow-lg cursor-default select-none"
            title="Source resolution locked. Downscaling disabled for lossless visual fidelity."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>
              {detectedQuality?.qualityLabel ||
                (isYouTube ? '1080p FHD (Source)' : isTikTok ? 'HD 1080p Clean (Source)' : 'Source Resolution')}
            </span>
            {isDownscaleDisabled && (
              <span className="text-[9px] font-semibold text-emerald-300 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-500/40">
                100% Native
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
