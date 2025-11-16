import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit, Check, X, Palette, Type, Image as ImageIcon } from 'lucide-react'
import { BrandKit, BrandColor, DEFAULT_BRAND_KIT } from '../types/brandkit'
import toast from 'react-hot-toast'
import './BrandKitManager.css'

export default function BrandKitManager() {
  const [brandKits, setBrandKits] = useState<BrandKit[]>([])
  const [selectedKit, setSelectedKit] = useState<BrandKit | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingKit, setEditingKit] = useState<BrandKit | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadBrandKits()
  }, [])

  const loadBrandKits = async () => {
    setIsLoading(true)
    try {
      const result = await window.electronAPI.brandkitList()
      if (result.success && result.brandKits) {
        setBrandKits(result.brandKits)
      }
    } catch (error: any) {
      console.error('Failed to load brand kits:', error)
      toast.error('Failed to load brand kits')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateNew = () => {
    const newKit: BrandKit = {
      ...DEFAULT_BRAND_KIT,
      id: `brand-kit-${Date.now()}`,
      name: 'New Brand Kit',
      description: 'Custom brand kit',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setEditingKit(newKit)
    setIsEditing(true)
  }

  const handleEdit = async (kitId: string) => {
    try {
      const result = await window.electronAPI.brandkitLoad(kitId)
      if (result.success && result.brandKit) {
        setEditingKit(result.brandKit)
        setIsEditing(true)
      }
    } catch (error: any) {
      toast.error('Failed to load brand kit')
    }
  }

  const handleSave = async () => {
    if (!editingKit) return

    try {
      const result = await window.electronAPI.brandkitSave(editingKit)
      if (result.success) {
        toast.success('Brand kit saved successfully!')
        setIsEditing(false)
        setEditingKit(null)
        loadBrandKits()
      } else {
        toast.error(result.error || 'Failed to save brand kit')
      }
    } catch (error: any) {
      toast.error('Failed to save brand kit')
    }
  }

  const handleDelete = async (kitId: string) => {
    if (!confirm('Are you sure you want to delete this brand kit?')) return

    try {
      const result = await window.electronAPI.brandkitDelete(kitId)
      if (result.success) {
        toast.success('Brand kit deleted')
        loadBrandKits()
        if (selectedKit?.id === kitId) {
          setSelectedKit(null)
        }
      } else {
        toast.error(result.error || 'Failed to delete brand kit')
      }
    } catch (error: any) {
      toast.error('Failed to delete brand kit')
    }
  }

  const handleColorChange = (colorKey: keyof BrandKit, newHex: string) => {
    if (!editingKit) return

    const hex = newHex.replace('#', '')
    const rgb: [number, number, number] = [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16)
    ]

    const colorObj = editingKit[colorKey] as BrandColor
    setEditingKit({
      ...editingKit,
      [colorKey]: {
        ...colorObj,
        hex: newHex,
        rgb
      }
    })
  }

  if (isEditing && editingKit) {
    return (
      <div className="brand-kit-editor">
        <div className="editor-header">
          <h3>
            {editingKit.id.startsWith('brand-kit-') && editingKit.id.includes(Date.now().toString().slice(0, 10))
              ? 'Create New Brand Kit'
              : 'Edit Brand Kit'}
          </h3>
          <div className="editor-actions">
            <button className="btn-secondary" onClick={() => setIsEditing(false)}>
              <X size={16} />
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave}>
              <Check size={16} />
              Save
            </button>
          </div>
        </div>

        <div className="editor-content">
          {/* Basic Info */}
          <div className="editor-section">
            <h4>Basic Information</h4>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={editingKit.name}
                onChange={(e) => setEditingKit({ ...editingKit, name: e.target.value })}
                placeholder="My Brand Kit"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={editingKit.description}
                onChange={(e) => setEditingKit({ ...editingKit, description: e.target.value })}
                placeholder="Brand kit description"
              />
            </div>
          </div>

          {/* Colors */}
          <div className="editor-section">
            <h4><Palette size={18} /> Brand Colors</h4>
            <div className="color-grid">
              <div className="color-input-group">
                <label>Primary Color</label>
                <div className="color-input">
                  <input
                    type="color"
                    value={editingKit.primaryColor.hex}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  />
                  <input
                    type="text"
                    value={editingKit.primaryColor.hex}
                    onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                    placeholder="#FFD700"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Secondary Color</label>
                <div className="color-input">
                  <input
                    type="color"
                    value={editingKit.secondaryColor.hex}
                    onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  />
                  <input
                    type="text"
                    value={editingKit.secondaryColor.hex}
                    onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                    placeholder="#FFA500"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Accent Color</label>
                <div className="color-input">
                  <input
                    type="color"
                    value={editingKit.accentColor.hex}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                  />
                  <input
                    type="text"
                    value={editingKit.accentColor.hex}
                    onChange={(e) => handleColorChange('accentColor', e.target.value)}
                    placeholder="#FF0000"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Text Color</label>
                <div className="color-input">
                  <input
                    type="color"
                    value={editingKit.textColor.hex}
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                  />
                  <input
                    type="text"
                    value={editingKit.textColor.hex}
                    onChange={(e) => handleColorChange('textColor', e.target.value)}
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label>Outline Color</label>
                <div className="color-input">
                  <input
                    type="color"
                    value={editingKit.outlineColor.hex}
                    onChange={(e) => handleColorChange('outlineColor', e.target.value)}
                  />
                  <input
                    type="text"
                    value={editingKit.outlineColor.hex}
                    onChange={(e) => handleColorChange('outlineColor', e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Text Style */}
          <div className="editor-section">
            <h4><Type size={18} /> Text Style</h4>
            <div className="style-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editingKit.textStyle.enableGradients}
                  onChange={(e) => setEditingKit({
                    ...editingKit,
                    textStyle: { ...editingKit.textStyle, enableGradients: e.target.checked }
                  })}
                />
                <span>Enable Gradient Text</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editingKit.textStyle.enable3D}
                  onChange={(e) => setEditingKit({
                    ...editingKit,
                    textStyle: { ...editingKit.textStyle, enable3D: e.target.checked }
                  })}
                />
                <span>Enable 3D Effects</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editingKit.textStyle.enableNeon}
                  onChange={(e) => setEditingKit({
                    ...editingKit,
                    textStyle: { ...editingKit.textStyle, enableNeon: e.target.checked }
                  })}
                />
                <span>Enable Neon Glow</span>
              </label>
            </div>

            <div className="form-group">
              <label>Outline Width: {editingKit.textStyle.outlineWidth}px</label>
              <input
                type="range"
                min="2"
                max="12"
                value={editingKit.textStyle.outlineWidth}
                onChange={(e) => setEditingKit({
                  ...editingKit,
                  textStyle: { ...editingKit.textStyle, outlineWidth: parseInt(e.target.value) }
                })}
              />
            </div>

            <div className="form-group">
              <label>Text Size: {editingKit.textStyle.defaultSize}%</label>
              <input
                type="range"
                min="10"
                max="25"
                value={editingKit.textStyle.defaultSize}
                onChange={(e) => setEditingKit({
                  ...editingKit,
                  textStyle: { ...editingKit.textStyle, defaultSize: parseInt(e.target.value) }
                })}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="brand-kit-manager">
      <div className="manager-header">
        <h3>Brand Kits</h3>
        <button className="btn-primary" onClick={handleCreateNew}>
          <Plus size={16} />
          Create New
        </button>
      </div>

      {isLoading ? (
        <div className="loading-message">Loading brand kits...</div>
      ) : brandKits.length === 0 ? (
        <div className="empty-state">
          <Palette size={48} />
          <p>No brand kits yet</p>
          <p className="help-text">Create your first brand kit to maintain consistent branding across all thumbnails</p>
        </div>
      ) : (
        <div className="brand-kits-grid">
          {brandKits.map((kit) => (
            <div key={kit.id} className="brand-kit-card">
              <div className="kit-header">
                <h4>{kit.name}</h4>
                <div className="kit-actions">
                  <button className="icon-btn" onClick={() => handleEdit(kit.id)} title="Edit">
                    <Edit size={16} />
                  </button>
                  <button className="icon-btn danger" onClick={() => handleDelete(kit.id)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="kit-description">{kit.description}</p>
              <div className="kit-preview">
                <div className="color-swatches">
                  <div className="color-swatch" style={{ background: '#FFD700' }} title="Primary" />
                  <div className="color-swatch" style={{ background: '#FFA500' }} title="Secondary" />
                  <div className="color-swatch" style={{ background: '#FF0000' }} title="Accent" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
