/**
 * Preload Script
 *
 * This is the ONLY bridge between the main process and renderer process.
 * It exposes a controlled API to the renderer via contextBridge.
 *
 * SECURITY NOTES:
 * - Never expose entire Electron or Node.js APIs
 * - Only expose specific, validated functions
 * - All IPC calls go through this controlled interface
 * - Input validation happens here AND in main process
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPC_CHANNELS } from '../common/types';

/**
 * Type-safe IPC invoke wrapper
 */
async function invokeIPC<T = any>(channel: string, ...args: any[]): Promise<T> {
  const response = await ipcRenderer.invoke(channel, ...args);

  if (!response.success) {
    throw new Error(response.error?.message || 'IPC call failed');
  }

  return response.data as T;
}

/**
 * Type-safe IPC send wrapper (one-way messages)
 */
function sendIPC(channel: string, ...args: any[]): void {
  ipcRenderer.send(channel, ...args);
}

/**
 * Type-safe IPC event listener
 */
function onIPC(channel: string, callback: (data: any) => void): () => void {
  const handler = (_event: IpcRendererEvent, data: any) => {
    callback(data);
  };

  ipcRenderer.on(channel, handler);

  // Return cleanup function
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

/**
 * Exposed API to renderer process
 */
const electronAPI = {
  // ==================== PROJECT API ====================
  project: {
    create: (name: string) => invokeIPC(IPC_CHANNELS.PROJECT_CREATE, name),
    open: (projectId: string) => invokeIPC(IPC_CHANNELS.PROJECT_OPEN, projectId),
    save: (project: any) => invokeIPC(IPC_CHANNELS.PROJECT_SAVE, project),
    close: (projectId: string) => invokeIPC(IPC_CHANNELS.PROJECT_CLOSE, projectId),
    list: () => invokeIPC(IPC_CHANNELS.PROJECT_LIST),
    delete: (projectId: string) => invokeIPC(IPC_CHANNELS.PROJECT_DELETE, projectId),
  },

  // ==================== VIDEO API ====================
  video: {
    upload: (filePath: string) => invokeIPC(IPC_CHANNELS.VIDEO_UPLOAD, filePath),
    analyze: (videoPath: string) => invokeIPC(IPC_CHANNELS.VIDEO_ANALYZE, videoPath),
    extractAudio: (videoPath: string) => invokeIPC(IPC_CHANNELS.VIDEO_EXTRACT_AUDIO, videoPath),
    getMetadata: (videoPath: string) => invokeIPC(IPC_CHANNELS.VIDEO_GET_METADATA, videoPath),
    getFrame: (videoPath: string, timestamp: number) =>
      invokeIPC(IPC_CHANNELS.VIDEO_GET_FRAME, videoPath, timestamp),
    getThumbnail: (videoPath: string) => invokeIPC(IPC_CHANNELS.VIDEO_GET_THUMBNAIL, videoPath),
  },

  // ==================== CAPTION API ====================
  caption: {
    generate: (videoPath: string, language: string) =>
      invokeIPC(IPC_CHANNELS.CAPTION_GENERATE, videoPath, language),
    add: (projectId: string, caption: any) => invokeIPC(IPC_CHANNELS.CAPTION_ADD, projectId, caption),
    update: (projectId: string, caption: any) => invokeIPC(IPC_CHANNELS.CAPTION_UPDATE, projectId, caption),
    delete: (projectId: string, captionId: string) =>
      invokeIPC(IPC_CHANNELS.CAPTION_DELETE, projectId, captionId),
    export: (projectId: string, format: string) => invokeIPC(IPC_CHANNELS.CAPTION_EXPORT, projectId, format),
  },

  // ==================== OVERLAY API ====================
  overlay: {
    add: (projectId: string, overlay: any) => invokeIPC(IPC_CHANNELS.OVERLAY_ADD, projectId, overlay),
    update: (projectId: string, overlay: any) => invokeIPC(IPC_CHANNELS.OVERLAY_UPDATE, projectId, overlay),
    delete: (projectId: string, overlayId: string) =>
      invokeIPC(IPC_CHANNELS.OVERLAY_DELETE, projectId, overlayId),
  },

  // ==================== SFX API ====================
  sfx: {
    generate: (prompt: string, duration: number) => invokeIPC(IPC_CHANNELS.SFX_GENERATE, prompt, duration),
    add: (projectId: string, sfx: any) => invokeIPC(IPC_CHANNELS.SFX_ADD, projectId, sfx),
    update: (projectId: string, sfx: any) => invokeIPC(IPC_CHANNELS.SFX_UPDATE, projectId, sfx),
    delete: (projectId: string, sfxId: string) => invokeIPC(IPC_CHANNELS.SFX_DELETE, projectId, sfxId),
    preview: (sfxPath: string) => invokeIPC(IPC_CHANNELS.SFX_PREVIEW, sfxPath),
  },

  // ==================== EXPORT API ====================
  export: {
    video: (projectId: string, config: any) => invokeIPC(IPC_CHANNELS.EXPORT_VIDEO, projectId, config),
    captions: (projectId: string, format: string, outputPath: string) =>
      invokeIPC(IPC_CHANNELS.EXPORT_CAPTIONS, projectId, format, outputPath),
    project: (projectId: string, outputPath: string) =>
      invokeIPC(IPC_CHANNELS.EXPORT_PROJECT, projectId, outputPath),
  },

  // ==================== SETTINGS API ====================
  settings: {
    get: () => invokeIPC(IPC_CHANNELS.SETTINGS_GET),
    update: (settings: any) => invokeIPC(IPC_CHANNELS.SETTINGS_UPDATE, settings),
  },

  // ==================== FILE API ====================
  file: {
    select: (options?: any) => invokeIPC(IPC_CHANNELS.FILE_SELECT, options),
    saveDialog: (options?: any) => invokeIPC(IPC_CHANNELS.FILE_SAVE_DIALOG, options),
  },

  // ==================== WINDOW API ====================
  window: {
    minimize: () => sendIPC(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => sendIPC(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => sendIPC(IPC_CHANNELS.WINDOW_CLOSE),
  },

  // ==================== EVENT LISTENERS ====================
  on: {
    progressUpdate: (callback: (progress: any) => void) => onIPC(IPC_CHANNELS.PROGRESS_UPDATE, callback),
    errorOccurred: (callback: (error: any) => void) => onIPC(IPC_CHANNELS.ERROR_OCCURRED, callback),

    // Menu events
    menuNewProject: (callback: () => void) => onIPC('menu:new-project', callback),
    menuOpenProject: (callback: () => void) => onIPC('menu:open-project', callback),
    menuSaveProject: (callback: () => void) => onIPC('menu:save-project', callback),
    menuSaveProjectAs: (callback: () => void) => onIPC('menu:save-project-as', callback),
    menuImportVideo: (callback: () => void) => onIPC('menu:import-video', callback),
    menuExport: (callback: () => void) => onIPC('menu:export', callback),
    menuSettings: (callback: () => void) => onIPC('menu:settings', callback),
    menuPlayPause: (callback: () => void) => onIPC('menu:play-pause', callback),
    menuStop: (callback: () => void) => onIPC('menu:stop', callback),
    menuAnalyzeVideo: (callback: () => void) => onIPC('menu:analyze-video', callback),
    menuGenerateCaptions: (callback: () => void) => onIPC('menu:generate-captions', callback),
    menuGenerateSFX: (callback: () => void) => onIPC('menu:generate-sfx', callback),
    menuAddOverlay: (callback: () => void) => onIPC('menu:add-overlay', callback),
  },

  // ==================== UTILITY ====================
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
};

// Expose the API to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Also expose types for TypeScript
export type ElectronAPI = typeof electronAPI;
