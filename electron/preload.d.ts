export interface ElectronAPI {
    openFileDialog: () => Promise<string | null>;
    saveFileDialog: (defaultPath: string) => Promise<string | null>;
    extractAudio: (videoPath: string) => Promise<string>;
    getVideoMetadata: (videoPath: string) => Promise<VideoMetadata>;
    renderVideo: (options: RenderOptions) => Promise<string>;
    analyzeVideo: (videoPath: string, audioPath: string) => Promise<VideoAnalysis>;
    generateSFX: (prompt: string, duration: number, modelType?: 'audiogen' | 'musicgen') => Promise<string>;
    elevenlabsGenerate: (prompt: string, duration: number | undefined, apiKey: string) => Promise<{
        success: boolean;
        filePath?: string;
        duration?: number;
        creditsUsed?: number;
        error?: string;
    }>;
    elevenlabsValidateKey: (apiKey: string) => Promise<{
        valid: boolean;
    }>;
    elevenlabsGetCredits: (apiKey: string) => Promise<{
        credits: number | null;
    }>;
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    createProject: (options: {
        projectName: string;
        projectPath: string;
        videoPath: string;
    }) => Promise<{
        projectPath: string;
        videoRelativePath: string;
    }>;
    saveProject: (projectPath: string, projectData: any) => Promise<boolean>;
    loadProject: (projectPath: string) => Promise<any>;
    openProjectFolder: () => Promise<string | null>;
    openProjectFile: () => Promise<string | null>;
    getRecentProjects: () => Promise<any[]>;
    removeRecentProject: (projectPath: string) => Promise<boolean>;
    copyAssetToProject: (sourcePath: string, projectPath: string, assetType: 'source' | 'sfx' | 'exports' | 'audio' | 'music') => Promise<string>;
    resolveProjectPath: (projectPath: string, relativePath: string) => Promise<string>;
    getProjectSFXFiles: (projectPath: string) => Promise<string[]>;
    getProjectExports: (projectPath: string) => Promise<string[]>;
    fileExists: (filePath: string) => Promise<boolean>;
    deleteFile: (filePath: string) => Promise<boolean>;
    showInFolder: (filePath: string) => Promise<boolean>;
    isValidProject: (projectPath: string) => Promise<boolean>;
    freesoundSearch: (params: any) => Promise<{
        success: boolean;
        results?: any;
        error?: string;
    }>;
    freesoundGetSound: (soundId: number) => Promise<{
        success: boolean;
        sound?: any;
        error?: string;
    }>;
    freesoundDownloadPreview: (previewUrl: string, outputPath: string) => Promise<{
        success: boolean;
        filePath?: string;
        error?: string;
    }>;
    setUnsavedChanges: (hasChanges: boolean) => Promise<boolean>;
    getUnsavedChanges: () => Promise<boolean>;
}
export interface VideoMetadata {
    format: {
        duration: number;
        size: number;
        bit_rate: number;
    };
    streams: Array<{
        codec_type: string;
        codec_name: string;
        width?: number;
        height?: number;
        r_frame_rate?: string;
    }>;
}
export interface VideoAnalysis {
    scenes: Array<{
        timestamp: number;
        type: 'action' | 'dialogue' | 'transition' | 'emotional';
        confidence: number;
        description: string;
    }>;
    suggestedSFX: Array<{
        timestamp: number;
        prompt: string;
        reason?: string;
        visual_context?: string;
        action_context?: string;
        confidence?: number;
    }>;
    transcription: Array<{
        text: string;
        start: number;
        end: number;
        confidence: number;
    }>;
}
export interface RenderOptions {
    videoPath: string;
    outputPath: string;
    subtitles?: Array<{
        text: string;
        start: number;
        end: number;
    }>;
    sfxTracks?: Array<{
        path: string;
        start: number;
    }>;
    overlays?: Array<{
        text: string;
        start: number;
        end: number;
        style: any;
    }>;
}
declare global {
    interface Window {
        electronAPI: ElectronAPI;
        electron: {
            ipcRenderer: {
                on: (channel: string, func: (...args: any[]) => void) => void;
                removeListener: (channel: string, func: (...args: any[]) => void) => void;
            };
        };
    }
}
