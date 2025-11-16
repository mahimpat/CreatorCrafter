import React, { useState } from 'react';
import './ThumbnailVariationsPreview.css';

interface Variation {
  index: number;
  name: string;
  template: string;
  background: string;
  description: string;
  path: string;
  success: boolean;
}

interface ThumbnailVariationsPreviewProps {
  variations: Variation[];
  onClose: () => void;
  onSelect?: (variation: Variation) => void;
}

export default function ThumbnailVariationsPreview({
  variations,
  onClose,
  onSelect
}: ThumbnailVariationsPreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (variation: Variation) => {
    setSelectedIndex(variation.index);
    if (onSelect) {
      onSelect(variation);
    }
  };

  const successfulVariations = variations.filter(v => v.success);

  return (
    <div className="variations-preview-overlay" onClick={onClose}>
      <div className="variations-preview-container" onClick={(e) => e.stopPropagation()}>
        <div className="variations-header">
          <h2>📊 A/B Testing Preview - {successfulVariations.length} Variations</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="variations-grid">
          {successfulVariations.map((variation) => (
            <div
              key={variation.index}
              className={`variation-card ${selectedIndex === variation.index ? 'selected' : ''}`}
              onClick={() => handleSelect(variation)}
            >
              <div className="variation-image-container">
                <img
                  src={`file://${variation.path}`}
                  alt={variation.name}
                  className="variation-image"
                />
                {selectedIndex === variation.index && (
                  <div className="selected-badge">✓ Selected</div>
                )}
              </div>

              <div className="variation-info">
                <h3 className="variation-name">
                  #{variation.index} - {variation.name}
                </h3>
                <p className="variation-description">{variation.description}</p>
                <div className="variation-meta">
                  <span className="meta-tag">{variation.template}</span>
                  <span className="meta-tag">{variation.background}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="variations-footer">
          <div className="footer-info">
            <p>💡 <strong>Pro Tip:</strong> Test these variations with your audience to see which performs best!</p>
            <p className="footer-note">Different styles resonate with different audiences. Try A/B testing to optimize click-through rate.</p>
          </div>
          {selectedIndex !== null && onSelect && (
            <button
              className="use-selected-button"
              onClick={() => {
                const selected = variations.find(v => v.index === selectedIndex);
                if (selected) {
                  onSelect(selected);
                  onClose();
                }
              }}
            >
              Use Selected Variation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
