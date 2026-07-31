import { useEffect, useRef, useState } from "react";
import "./styles/ScreenPlayer.css";

let youtubeApiPromise;

function loadYouTubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT);
    };

    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (existingScript) return;

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("YouTube player could not load."));
    document.head.appendChild(script);
  });

  return youtubeApiPromise;
}

const qualityLabels = {
  auto: "Auto",
  small: "240p",
  medium: "360p",
  large: "480p",
  hd720: "720p",
  hd1080: "1080p",
  hd1440: "1440p",
  hd2160: "2160p",
  highres: "Highest",
};

const formatTime = (seconds = 0) => {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export default function ScreenPlayer({
  room,
  isHost,
  isPlaying,
  isFullScreen = true,
  animateEntrance = true,
  sharedScreenStream = null,
  sharedSurface = "",
  isShowEnded = false,
  youtubeVideoId = "",
  onTogglePlay,
  onToggleFullScreen,
}) {
  const containerRef = useRef(null);
  const sharedScreenRef = useRef(null);
  const youtubeMountRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const [isYouTubePlaying, setIsYouTubePlaying] = useState(false);
  const [youtubeTime, setYoutubeTime] = useState(0);
  const [youtubeDuration, setYoutubeDuration] = useState(0);
  const [qualityLevels, setQualityLevels] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState("auto");
  const [playbackRates, setPlaybackRates] = useState([
    0.25, 0.5, 1, 1.25, 1.5, 1.75, 2,
  ]);
  const [selectedSpeed, setSelectedSpeed] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [youtubeError, setYoutubeError] = useState("");
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const video = sharedScreenRef.current;
    if (!video) return undefined;
    video.srcObject = sharedScreenStream;
    video.play().catch(() => {});
    return () => {
      if (video.srcObject === sharedScreenStream) video.srcObject = null;
    };
  }, [sharedScreenStream]);

  useEffect(() => {
    if (!youtubeVideoId || !youtubeMountRef.current) return undefined;
    let cancelled = false;
    setYoutubeError("");
    setIsSettingsOpen(false);
    setYoutubeTime(0);
    setYoutubeDuration(0);
    setIsYouTubePlaying(false);

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !youtubeMountRef.current) return;
        youtubePlayerRef.current?.destroy?.();
        youtubePlayerRef.current = new YT.Player(youtubeMountRef.current, {
          videoId: youtubeVideoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: ({ target }) => {
              if (cancelled) return;
              setYoutubeDuration(target.getDuration());
              setQualityLevels([
                "auto",
                ...target
                  .getAvailableQualityLevels()
                  .filter((level) => level !== "auto"),
              ]);
              setSelectedQuality(target.getPlaybackQuality() || "auto");
              setPlaybackRates(target.getAvailablePlaybackRates());
              setSelectedSpeed(target.getPlaybackRate());
              if (isHost) {
                target.playVideo();
              }
            },
            onStateChange: ({ data }) => {
              const playing = data === YT.PlayerState.PLAYING;

              setIsYouTubePlaying(playing);

              onTogglePlay?.(playing);
            },
            onError: () =>
              setYoutubeError(
                "This YouTube video cannot be played in the theatre.",
              ),
          },
        });
      })
      .catch((error) => !cancelled && setYoutubeError(error.message));

    return () => {
      cancelled = true;
      youtubePlayerRef.current?.destroy?.();
      youtubePlayerRef.current = null;
    };
  }, [youtubeVideoId]);

  useEffect(() => {
    if (!youtubeVideoId) return undefined;
    const timer = window.setInterval(() => {
      const player = youtubePlayerRef.current;
      if (!player?.getCurrentTime) return;
      setYoutubeTime(player.getCurrentTime());
      setYoutubeDuration(player.getDuration());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [youtubeVideoId]);

  const hasYouTubeVideo = Boolean(youtubeVideoId);
  const playerIsPlaying = hasYouTubeVideo ? isYouTubePlaying : isPlaying;
  const togglePlayback = () => {
    if (!isHost || isShowEnded) return;
    if (hasYouTubeVideo) {
      if (isYouTubePlaying) {
        youtubePlayerRef.current?.pauseVideo();

        setIsYouTubePlaying(false);
      } else {
        youtubePlayerRef.current?.playVideo();

        setIsYouTubePlaying(true);
      }

      onTogglePlay?.(!isYouTubePlaying);
      return;
    }
    onTogglePlay();
  };

  const seekBy = (seconds) => {
    if (!isHost || !hasYouTubeVideo) return;
    const player = youtubePlayerRef.current;
    player?.seekTo(
      Math.max(
        0,
        Math.min(player.getDuration(), player.getCurrentTime() + seconds),
      ),
      true,
    );
    setYoutubeTime(player.getCurrentTime());
  };

  const changeQuality = (quality) => {
    youtubePlayerRef.current?.setPlaybackQuality(
      quality === "auto" ? "default" : quality,
    );

    setSelectedQuality(quality);

    setIsSettingsOpen(false);
  };

  const changeSpeed = (speed) => {
    const rate = Number(speed);
    youtubePlayerRef.current?.setPlaybackRate(rate);
    setSelectedSpeed(rate);
    setIsSettingsOpen(false);
  };

  const changeVolume = (value) => {
    const v = Number(value);
    setVolume(v);
    const player = youtubePlayerRef.current;
    if (player?.setVolume) {
      player.setVolume(v);
      if (v === 0) {
        player.mute?.();
        setIsMuted(true);
      } else {
        if (isMuted) player.unMute?.();
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    const player = youtubePlayerRef.current;
    if (!player) return;
    if (isMuted) {
      player.unMute?.();
      player.setVolume?.(volume === 0 ? 50 : volume);
      if (volume === 0) setVolume(50);
      setIsMuted(false);
    } else {
      player.mute?.();
      setIsMuted(true);
    }
  };

  // When fullscreen button clicked: use browser Fullscreen API if available,
  // and also notify parent to hide seats/chat for the CSS layout switch
  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
    onToggleFullScreen();
  };

  return (
    <div
      className={`screen-wrap ${isFullScreen ? "screen-wrap--fullscreen" : ""} ${animateEntrance ? "screen-wrap--entering" : ""}`}
      ref={containerRef}
    >
      {/* ── Top bar: room label + fullscreen button ── */}
      <div className="screen__topbar">
        <div
          className={`screen__live-badge ${isShowEnded ? "screen__live-badge--ended" : ""}`}
        >
          <span className="screen__live-dot" aria-hidden="true" />
          <span className="mono">{isShowEnded ? "ENDED" : "LIVE"}</span>
        </div>
        <span className="screen__room-title">{room.title}</span>
        <button
          type="button"
          className="screen__fullscreen-btn"
          onClick={handleFullScreen}
          aria-label={isFullScreen ? "Exit full screen" : "Enter full screen"}
          title={isFullScreen ? "Exit full screen" : "Full screen"}
        >
          {isFullScreen ? (
            // Compress icon
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="10" y1="14" x2="3" y2="21" />
              <line x1="21" y1="3" x2="14" y2="10" />
            </svg>
          ) : (
            // Expand icon
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Cinema screen body ── */}
      <div className="screen__body" style={{ "--poster": room.posterColor }}>
        <div className="screen__glow" aria-hidden="true" />

        <div className="screen__frame" aria-hidden="true">
          <div className="screen__frame-line screen__frame-line--left" />
          <div className="screen__frame-line screen__frame-line--right" />
        </div>

        <div className="screen__content">
          {isShowEnded ? (
            <div className="screen__ended">
              <span className="screen__ended-icon" aria-hidden="true">
                ■
              </span>
              <h3>This showing has ended</h3>
              <p>Thanks for watching together.</p>
            </div>
          ) : sharedScreenStream ? (
            <div className="screen__shared-screen">
              <video
                ref={sharedScreenRef}
                autoPlay
                playsInline
                className="screen__shared-video"
              />
              <span className="screen__shared-label mono">
                HOST IS SHARING{" "}
                {sharedSurface === "browser"
                  ? "A BROWSER TAB"
                  : sharedSurface === "window"
                    ? "A WINDOW"
                    : "A SCREEN"}
              </span>
            </div>
          ) : youtubeVideoId ? (
            <div className="screen__youtube">
              <div className="screen__youtube-player">
                <div ref={youtubeMountRef} />
              </div>
              {/* Blocks clicks/right-click reaching the embed so playback only responds to our controls bar below. */}
              <div
                className="screen__youtube-shield"
                onContextMenu={(event) => event.preventDefault()}
              />
              {youtubeError && (
                <p className="screen__youtube-error mono">{youtubeError}</p>
              )}
            </div>
          ) : isPlaying ? (
            <div className="screen__playing">
              <div className="screen__playing-bars" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <p className="mono">NOW PLAYING</p>
            </div>
          ) : (
            <div className="screen__paused">
              <button
                type="button"
                className="screen__big-play"
                onClick={isHost ? onTogglePlay : undefined}
                disabled={!isHost}
                aria-label="Play"
                title={!isHost ? "Only the host can control playback" : "Play"}
              >
                ▶
              </button>
              <p className="screen__paused-label">
                {isHost
                  ? "Press play to start the show"
                  : "Waiting for the host…"}
              </p>
            </div>
          )}
        </div>

        {/* ── Playback controls bar ── */}
        <div className="screen__controls">
          <button
            type="button"
            className="screen__play-btn"
            onClick={togglePlayback}
            disabled={!isHost || isShowEnded}
            aria-label={playerIsPlaying ? "Pause" : "Play"}
            title={
              !isHost
                ? "Only the host can control playback"
                : isShowEnded
                  ? "This showing has ended"
                  : undefined
            }
          >
            {playerIsPlaying ? (
              /* Pause bars */
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="5" y="3" width="4" height="18" rx="1" />
                <rect x="15" y="3" width="4" height="18" rx="1" />
              </svg>
            ) : (
              /* Play triangle */
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          {/* Volume control */}
          <div className="screen__volume">
            <button
              type="button"
              className="screen__ctrl-btn"
              onClick={toggleMute}
              disabled={!hasYouTubeVideo}
              aria-label={isMuted ? "Unmute" : "Mute"}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>
            <input
              type="range"
              className="screen__volume-slider"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => changeVolume(e.target.value)}
              disabled={!hasYouTubeVideo}
              aria-label="Volume"
            />
          </div>

          {/* Rewind 10s */}
          <button
            type="button"
            className="screen__ctrl-btn screen__ctrl-btn--wide"
            onClick={() => seekBy(-10)}
            disabled={!isHost || !hasYouTubeVideo || isShowEnded}
            aria-label="Rewind 10 seconds"
            title="Back 10 seconds"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <polyline points="3 4 3 9 8 9" />
            </svg>
            <span className="screen__ctrl-btn-label">10</span>
          </button>

          {/* Forward 10s */}
          <button
            type="button"
            className="screen__ctrl-btn screen__ctrl-btn--wide"
            onClick={() => seekBy(10)}
            disabled={!isHost || !hasYouTubeVideo || isShowEnded}
            aria-label="Forward 10 seconds"
            title="Forward 10 seconds"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <polyline points="21 4 21 9 16 9" />
            </svg>
            <span className="screen__ctrl-btn-label">10</span>
          </button>

          {/* Progress bar */}
          <div
            className="screen__progress"
            role="slider"
            aria-label="Playback progress"
            aria-valuemin={0}
            aria-valuemax={hasYouTubeVideo ? youtubeDuration : 100}
            aria-valuenow={hasYouTubeVideo ? youtubeTime : 0}
            onClick={(event) => {
              if (!isHost || !hasYouTubeVideo || !youtubeDuration) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const ratio = Math.min(
                1,
                Math.max(0, (event.clientX - bounds.left) / bounds.width),
              );
              const time = ratio * youtubeDuration;

              youtubePlayerRef.current?.seekTo(time, true);

              setYoutubeTime(time);
            }}
          >
            <div
              className="screen__progress-fill"
              style={{
                width: hasYouTubeVideo
                  ? `${youtubeDuration ? (youtubeTime / youtubeDuration) * 100 : 0}%`
                  : isPlaying
                    ? "34%"
                    : "0%",
              }}
            />
          </div>

          <span className="screen__time mono">
            {hasYouTubeVideo
              ? `${formatTime(youtubeTime)} / ${formatTime(youtubeDuration)}`
              : `${isPlaying ? "34:12" : "00:00"} / 1:48:00`}
          </span>

          {!isHost && <span className="screen__synced mono">⟳ SYNCED</span>}

          {/* Settings */}
          <div className="screen__settings">
            <button
              type="button"
              className={`screen__ctrl-btn ${isSettingsOpen ? "screen__ctrl-btn--active" : ""}`}
              onClick={() => setIsSettingsOpen((open) => !open)}
              disabled={!hasYouTubeVideo}
              aria-label="Settings"
              aria-expanded={isSettingsOpen}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            {isSettingsOpen && hasYouTubeVideo && (
              <div className="screen__settings-menu">
                <div className="screen__settings-group">
                  <span className="screen__settings-heading mono">Quality</span>
                  {qualityLevels.length === 0 ? (
                    <span className="screen__settings-empty">
                      Not available yet
                    </span>
                  ) : (
                    qualityLevels.map((level) => (
                      <button
                        type="button"
                        key={level}
                        className={`screen__settings-option ${selectedQuality === level ? "screen__settings-option--active" : ""}`}
                        onClick={() => changeQuality(level)}
                      >
                        {qualityLabels[level] || level}
                      </button>
                    ))
                  )}
                </div>
                <div className="screen__settings-group">
                  <span className="screen__settings-heading mono">Speed</span>
                  {playbackRates.map((rate) => (
                    <button
                      type="button"
                      key={rate}
                      className={`screen__settings-option ${selectedSpeed === rate ? "screen__settings-option--active" : ""}`}
                      onClick={() => changeSpeed(rate)}
                    >
                      {rate === 1 ? "Normal" : `${rate}x`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen in controls too */}
          <button
            type="button"
            className="screen__ctrl-btn"
            onClick={handleFullScreen}
            aria-label={isFullScreen ? "Exit full screen" : "Full screen"}
          >
            {isFullScreen ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="10" y1="14" x2="3" y2="21" />
                <line x1="21" y1="3" x2="14" y2="10" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
