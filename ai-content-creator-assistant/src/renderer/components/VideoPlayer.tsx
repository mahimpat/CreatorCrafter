import React, { useRef, useEffect, useState } from 'react';
import { useProjectStore } from '../stores/projectStore';

const VideoPlayer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { currentProject, updateProject } = useProjectStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (currentProject) {
        updateProject({
          timeline: {
            ...currentProject.timeline,
            currentTime: video.currentTime,
          },
        });
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [currentProject, updateProject]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  if (!currentProject?.videoPath) {
    return (
      <div className="video-player-empty">
        <div className="empty-state">
          <p>No video loaded</p>
          <button className="btn-primary">Import Video</button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-player">
      <div className="video-container">
        <video ref={videoRef} src={`file://${currentProject.videoPath}`} />

        {/* Captions overlay */}
        <div className="captions-overlay">
          {currentProject.captions
            .filter(c => currentTime >= c.startTime && currentTime <= c.endTime)
            .map(caption => (
              <div
                key={caption.id}
                className="caption"
                style={{
                  fontFamily: caption.style.fontFamily,
                  fontSize: caption.style.fontSize,
                  color: caption.style.color,
                  backgroundColor: caption.style.backgroundColor,
                }}
              >
                {caption.text}
              </div>
            ))}
        </div>

        {/* Text overlays */}
        <div className="overlays-container">
          {currentProject.textOverlays
            .filter(o => currentTime >= o.startTime && currentTime <= o.endTime)
            .map(overlay => (
              <div
                key={overlay.id}
                className="text-overlay"
                style={{
                  left: `${overlay.position.x}%`,
                  top: `${overlay.position.y}%`,
                  fontFamily: overlay.style.fontFamily,
                  fontSize: overlay.style.fontSize,
                  color: overlay.style.color,
                  zIndex: overlay.layer,
                }}
              >
                {overlay.text}
              </div>
            ))}
        </div>
      </div>

      <div className="video-controls">
        <button onClick={togglePlayPause}>{isPlaying ? '⏸' : '▶'}</button>
        <span className="time-display">
          {formatTime(currentTime)} / {formatTime(currentProject.videoMetadata.duration)}
        </span>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default VideoPlayer;
