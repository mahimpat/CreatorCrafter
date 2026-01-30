/**
 * ClipUploader - Multi-file video clip upload component
 */
import { useState, useRef, useCallback } from 'react'
import { Upload, Film, X, AlertCircle } from 'lucide-react'
import { projectsApi, VideoClip } from '../api'
import './ClipUploader.css'

interface ClipUploaderProps {
  projectId: number
  onClipsUploaded: (clips: VideoClip[]) => void
}

interface UploadingFile {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export default function ClipUploader({ projectId, onClipsUploaded }: ClipUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.type.startsWith('video/'))

    if (fileArray.length === 0) {
      alert('Please select video files only')
      return
    }

    // Initialize upload state
    const initialState: UploadingFile[] = fileArray.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }))
    setUploadingFiles(initialState)

    const uploadedClips: VideoClip[] = []

    // Upload files sequentially
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]

      setUploadingFiles(prev => prev.map((f, idx) =>
        idx === i ? { ...f, status: 'uploading' } : f
      ))

      try {
        const response = await projectsApi.uploadClip(projectId, file)
        uploadedClips.push(response.data)

        setUploadingFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'done', progress: 100 } : f
        ))
      } catch (error) {
        console.error('Upload failed:', error)
        setUploadingFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'error', error: 'Upload failed' } : f
        ))
      }
    }

    // Notify parent of uploaded clips
    if (uploadedClips.length > 0) {
      onClipsUploaded(uploadedClips)
    }

    // Clear after delay
    setTimeout(() => {
      setUploadingFiles([])
    }, 2000)
  }, [projectId, onClipsUploaded])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="clip-uploader">
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
        <Upload size={32} />
        <h4>Upload Video Clips</h4>
        <p>Drag & drop or click to select multiple videos</p>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="upload-list">
          {uploadingFiles.map((item, index) => (
            <div key={index} className={`upload-item ${item.status}`}>
              <Film size={16} />
              <span className="filename">{item.file.name}</span>
              <div className="upload-status">
                {item.status === 'pending' && <span>Waiting...</span>}
                {item.status === 'uploading' && (
                  <div className="progress-bar">
                    <div className="progress" style={{ width: '50%' }} />
                  </div>
                )}
                {item.status === 'done' && <span className="done">Done</span>}
                {item.status === 'error' && (
                  <span className="error">
                    <AlertCircle size={14} />
                    {item.error}
                  </span>
                )}
              </div>
              {item.status !== 'uploading' && (
                <button className="remove-btn" onClick={() => removeFile(index)}>
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
