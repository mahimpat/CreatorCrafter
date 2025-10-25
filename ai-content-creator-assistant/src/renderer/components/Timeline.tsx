import React from 'react';
import { useProjectStore } from '../stores/projectStore';

const Timeline: React.FC = () => {
  const { currentProject } = useProjectStore();

  if (!currentProject) return null;

  const { duration } = currentProject.videoMetadata;
  const { currentTime, zoom } = currentProject.timeline;

  return (
    <div className="timeline">
      <div className="timeline-header">
        <div className="timeline-tools">
          <button title="Zoom In">+</button>
          <button title="Zoom Out">-</button>
          <button title="Fit">⊡</button>
        </div>
      </div>

      <div className="timeline-content">
        {/* Time ruler */}
        <div className="timeline-ruler">
          {Array.from({ length: Math.ceil(duration) }, (_, i) => (
            <div key={i} className="ruler-tick" style={{ left: `${(i / duration) * 100}%` }}>
              {i}s
            </div>
          ))}
        </div>

        {/* Playhead */}
        <div className="timeline-playhead" style={{ left: `${(currentTime / duration) * 100}%` }} />

        {/* Caption track */}
        <div className="timeline-track">
          <div className="track-header">Captions</div>
          <div className="track-content">
            {currentProject.captions.map(caption => (
              <div
                key={caption.id}
                className="track-item caption-item"
                style={{
                  left: `${(caption.startTime / duration) * 100}%`,
                  width: `${((caption.endTime - caption.startTime) / duration) * 100}%`,
                }}
                title={caption.text}
              >
                {caption.text.substring(0, 20)}...
              </div>
            ))}
          </div>
        </div>

        {/* Text overlay track */}
        <div className="timeline-track">
          <div className="track-header">Overlays</div>
          <div className="track-content">
            {currentProject.textOverlays.map(overlay => (
              <div
                key={overlay.id}
                className="track-item overlay-item"
                style={{
                  left: `${(overlay.startTime / duration) * 100}%`,
                  width: `${((overlay.endTime - overlay.startTime) / duration) * 100}%`,
                }}
                title={overlay.text}
              >
                {overlay.text}
              </div>
            ))}
          </div>
        </div>

        {/* SFX track */}
        <div className="timeline-track">
          <div className="track-header">Sound Effects</div>
          <div className="track-content">
            {currentProject.soundEffects.map(sfx => (
              <div
                key={sfx.id}
                className="track-item sfx-item"
                style={{
                  left: `${(sfx.startTime / duration) * 100}%`,
                  width: `${(sfx.duration / duration) * 100}%`,
                }}
                title={sfx.name}
              >
                🔊 {sfx.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
