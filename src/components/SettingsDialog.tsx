import React, { useState, useEffect } from 'react'
import { X, Save, Key, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import './SettingsDialog.css'

interface SettingsDialogProps {
    isOpen: boolean
    onClose: () => void
}

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
    const [elevenLabsKey, setElevenLabsKey] = useState('')
    const [replicateKey, setReplicateKey] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadSettings()
        }
    }, [isOpen])

    const loadSettings = async () => {
        setIsLoading(true)
        try {
            const settings = await window.electronAPI.getAllSettings()
            if (settings) {
                setElevenLabsKey(settings.elevenLabsApiKey || '')
                setReplicateKey(settings.replicateApiKey || '')
            }
        } catch (error) {
            console.error('Failed to load settings:', error)
            toast.error('Failed to load settings')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await window.electronAPI.setSetting('elevenLabsApiKey', elevenLabsKey)
            await window.electronAPI.setSetting('replicateApiKey', replicateKey)
            toast.success('Settings saved successfully')
            onClose()
        } catch (error) {
            console.error('Failed to save settings:', error)
            toast.error('Failed to save settings')
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="settings-dialog-overlay" onClick={onClose}>
            <div className="settings-dialog" onClick={e => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>Settings</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="settings-content">
                    {isLoading ? (
                        <div className="loading-state">
                            <Loader2 className="animate-spin" size={32} />
                            <p>Loading settings...</p>
                        </div>
                    ) : (
                        <div className="settings-form">
                            <div className="setting-group">
                                <div className="setting-label">
                                    <Key size={16} />
                                    <span>ElevenLabs API Key</span>
                                </div>
                                <p className="setting-description">
                                    Required for AI Sound Effects generation.
                                </p>
                                <input
                                    type="password"
                                    value={elevenLabsKey}
                                    onChange={(e) => setElevenLabsKey(e.target.value)}
                                    placeholder="Enter your ElevenLabs API Key"
                                    className="setting-input"
                                />
                            </div>

                            <div className="setting-group">
                                <div className="setting-label">
                                    <Key size={16} />
                                    <span>Replicate API Key</span>
                                </div>
                                <p className="setting-description">
                                    Required for AI Video generation.
                                </p>
                                <input
                                    type="password"
                                    value={replicateKey}
                                    onChange={(e) => setReplicateKey(e.target.value)}
                                    placeholder="Enter your Replicate API Key"
                                    className="setting-input"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="settings-footer">
                    <button className="cancel-btn" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="save-btn"
                        onClick={handleSave}
                        disabled={isLoading || isSaving}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
