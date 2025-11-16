import { useState } from 'react'
import { ThumbnailTemplate, THUMBNAIL_TEMPLATES } from '../types/thumbnail'
import { Sparkles, Filter } from 'lucide-react'
import './TemplateGallery.css'

interface TemplateGalleryProps {
  selectedTemplate: ThumbnailTemplate
  onSelectTemplate: (template: ThumbnailTemplate) => void
}

type Category = 'all' | 'viral' | 'tech' | 'gaming' | 'lifestyle'

export default function TemplateGallery({ selectedTemplate, onSelectTemplate }: TemplateGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('all')

  const categories: { id: Category; name: string; icon: string }[] = [
    { id: 'all', name: 'All Templates', icon: '🎨' },
    { id: 'viral', name: 'Viral/Clickbait', icon: '🔥' },
    { id: 'tech', name: 'Tech/Professional', icon: '💻' },
    { id: 'gaming', name: 'Gaming', icon: '🎮' },
    { id: 'lifestyle', name: 'Vlog/Lifestyle', icon: '📹' }
  ]

  const filteredTemplates = activeCategory === 'all'
    ? THUMBNAIL_TEMPLATES
    : THUMBNAIL_TEMPLATES.filter(t => t.category === activeCategory)

  return (
    <div className="template-gallery">
      <div className="gallery-header">
        <div className="header-title">
          <Sparkles size={20} />
          <h4>Professional Templates</h4>
          <span className="template-count">{filteredTemplates.length} templates</span>
        </div>
        <p className="help-text">
          Choose from 15 professionally designed templates optimized for maximum engagement
        </p>
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        <Filter size={16} />
        <span style={{ fontSize: '13px', color: '#aaa', marginRight: '12px' }}>Filter:</span>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
          >
            <span className="category-icon">{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="template-grid-professional">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className={`template-card-pro ${selectedTemplate.id === template.id ? 'selected' : ''}`}
            onClick={() => onSelectTemplate(template)}
          >
            {/* Color Scheme Preview */}
            <div className="template-preview">
              <div
                className="gradient-preview"
                style={{
                  background: template.colorScheme
                    ? `linear-gradient(135deg, ${template.colorScheme.join(', ')})`
                    : '#1e2029'
                }}
              >
                {/* Simulated text */}
                <div className="preview-text">
                  <span>TEXT</span>
                </div>
              </div>

              {/* Selected Indicator */}
              {selectedTemplate.id === template.id && (
                <div className="selected-badge">
                  <Sparkles size={14} />
                  Selected
                </div>
              )}
            </div>

            {/* Template Info */}
            <div className="template-info-pro">
              <div className="template-name-row">
                <h5>{template.name}</h5>
                <span className="category-badge">{template.category}</span>
              </div>
              <p className="template-description">{template.description}</p>

              {/* Features List */}
              {template.features && template.features.length > 0 && (
                <div className="template-features">
                  {template.features.map((feature, index) => (
                    <span key={index} className="feature-tag">
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
