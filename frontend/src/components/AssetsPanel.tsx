/**
 * AssetsPanel - File/asset manager for all project files
 * Shows source videos, audio files (SFX/BGM), and exports
 */
import { useState, useEffect, useRef } from 'react'
import { Film, Trash2, RefreshCw, Download, Play, Pause, FolderOpen, Music, FileVideo, Upload } from 'lucide-react'
import { filesApi } from '../api'
import { useToast } from './Toast'
import './AssetsPanel.css'

interface AssetFile {
  filename: string
  url: string
  asset_type: string
}

interface AssetsPanelProps {
  projectId: number
}

type AssetTab = 'all' | 'video' | 'audio' | 'exports'

export default function AssetsPanel({ projectId }: AssetsPanelProps) {
  const { showError, showSuccess } = useToast()
  const [sourceFiles, setSourceFiles] = useState<AssetFile[]>([])
  const [sfxFiles, setSfxFiles] = useState<AssetFile[]>([])
  const [exportFiles, setExportFiles] = useState<AssetFile[]>([])
  const [activeTab, setActiveTab] = useState<AssetTab>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [playingFile, setPlayingFile] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadAssets()
  }, [projectId])

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioElement) {
        audioElement.pause()
        audioElement.src = ''
      }
    }
  }, [audioElement])

  const loadAssets = async () => {
    if (!projectId) return

    setIsLoading(true)
    try {
      const response = await filesApi.list(projectId)
      setSourceFiles(response.data.source || [])
      setSfxFiles(response.data.sfx || [])
      setExportFiles(response.data.exports || [])
    } catch (error) {
      console.error('Failed to load project assets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (file: AssetFile) => {
    if (!confirm(`Delete "${file.filename}"? This cannot be undone.`)) return

    try {
      await filesApi.delete(projectId, file.asset_type, file.filename)
      await loadAssets()
      showSuccess('File deleted successfully')
    } catch (error) {
      console.error('Failed to delete file:', error)
      showError('Failed to delete file')
    }
  }

  const handlePlay = (file: AssetFile) => {
    if (playingFile === file.filename) {
      // Stop playing
      if (audioElement) {
        audioElement.pause()
        audioElement.src = ''
      }
      setPlayingFile(null)
      return
    }

    // Start playing
    const token = localStorage.getItem('access_token')
    const url = `/api/files/${projectId}/stream/${file.asset_type}/${file.filename}${token ? `?token=${encodeURIComponent(token)}` : ''}`

    const audio = new Audio(url)
    audio.onended = () => setPlayingFile(null)
    audio.play()

    if (audioElement) {
      audioElement.pause()
    }
    setAudioElement(audio)
    setPlayingFile(file.filename)
  }

  const handleDownload = (file: AssetFile) => {
    const token = localStorage.getItem('access_token')
    const url = `/api/files/${projectId}/stream/${file.asset_type}/${file.filename}${token ? `?token=${encodeURIComponent(token)}` : ''}`

    const a = document.createElement('a')
    a.href = url
    a.download = file.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Determine asset type from file extension
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm']
    const audioExts = ['wav', 'mp3', 'ogg', 'm4a', 'flac', 'aac']
    let assetType: 'source' | 'sfx' | 'exports' = 'sfx'
    if (videoExts.includes(ext)) assetType = 'source'
    else if (!audioExts.includes(ext)) {
      showError('Unsupported file type. Please upload audio (.wav, .mp3, .ogg, .m4a) or video files.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    try {
      await filesApi.upload(projectId, file, assetType, (percent) => setUploadProgress(percent))
      await loadAssets()
      showSuccess(`${file.name} uploaded successfully`)
    } catch (error) {
      console.error('Upload failed:', error)
      showError('Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Get files based on active tab
  const getFilteredFiles = (): AssetFile[] => {
    switch (activeTab) {
      case 'video':
        return sourceFiles
      case 'audio':
        return sfxFiles
      case 'exports':
        return exportFiles
      case 'all':
      default:
        return [...sourceFiles, ...sfxFiles, ...exportFiles]
    }
  }

  const currentFiles = getFilteredFiles()
  const totalCount = sourceFiles.length + sfxFiles.length + exportFiles.length

  const getFileIcon = (file: AssetFile) => {
    if (file.asset_type === 'source') return <FileVideo size={18} />
    if (file.asset_type === 'sfx') return <Music size={18} />
    return <Film size={18} />
  }

  const isAudioFile = (file: AssetFile) => {
    return file.asset_type === 'sfx' || file.filename.match(/\.(mp3|wav|ogg|m4a)$/i)
  }

  return (
    <div className="assets-panel">
      <div className="panel-header">
        <h3>
          <FolderOpen size={16} />
          Assets
        </h3>
        <div className="panel-header-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*,.wav,.mp3,.ogg,.m4a,.mp4,.mov,.avi,.mkv,.webm"
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Upload SFX or media file"
          >
            <Upload size={14} />
            {isUploading ? `${uploadProgress ?? 0}%` : 'Upload'}
          </button>
          <button className="refresh-btn" onClick={loadAssets} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      <div className="assets-tabs">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All ({totalCount})
        </button>
        <button
          className={`tab-btn ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveTab('video')}
        >
          <FileVideo size={12} />
          {sourceFiles.length}
        </button>
        <button
          className={`tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
          onClick={() => setActiveTab('audio')}
        >
          <Music size={12} />
          {sfxFiles.length}
        </button>
        <button
          className={`tab-btn ${activeTab === 'exports' ? 'active' : ''}`}
          onClick={() => setActiveTab('exports')}
        >
          <Film size={12} />
          {exportFiles.length}
        </button>
      </div>

      <div className="assets-list">
        {isLoading ? (
          <div className="loading-state">Loading...</div>
        ) : currentFiles.length === 0 ? (
          <div className="empty-state">
            <FolderOpen size={28} />
            <p>No files yet</p>
            <span>Upload or generate content</span>
          </div>
        ) : (
          currentFiles.map((file, index) => (
            <div
              key={`${file.asset_type}-${index}`}
              className={`asset-item ${file.asset_type !== 'exports' ? 'draggable' : ''}`}
              draggable={file.asset_type !== 'exports'}
              onDragStart={(e) => {
                if (file.asset_type === 'exports') { e.preventDefault(); return }
                e.dataTransfer.effectAllowed = 'copy'
                e.dataTransfer.setData(
                  'application/x-asset-drop',
                  JSON.stringify({ filename: file.filename, asset_type: file.asset_type, url: file.url })
                )
                // Set type hints so Timeline can check allowed track during dragOver
                // (dragOver can read types but not getData)
                const isAudio = file.asset_type === 'sfx' || file.filename.match(/\.(mp3|wav|ogg|m4a|flac|aac)$/i)
                e.dataTransfer.setData(isAudio ? 'x-asset/audio' : 'x-asset/video', '')
              }}
            >
              <div className="asset-icon">
                {getFileIcon(file)}
              </div>
              <div className="asset-info">
                <span className="asset-name">{file.filename}</span>
                <span className="asset-type">{file.asset_type}</span>
              </div>
              <div className="asset-actions">
                {isAudioFile(file) && (
                  <button
                    className="action-btn"
                    onClick={() => handlePlay(file)}
                    title={playingFile === file.filename ? 'Stop' : 'Play'}
                  >
                    {playingFile === file.filename ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                )}
                <button
                  className="action-btn"
                  onClick={() => handleDownload(file)}
                  title="Download"
                >
                  <Download size={14} />
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(file)}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
