/**
 * IPC Handlers
 *
 * Registers all IPC handlers for communication between renderer and main process.
 * All handlers perform input validation and sanitization.
 */

import { ipcMain, dialog } from 'electron';
import log from 'electron-log';
import { IPC_CHANNELS, AppError, ErrorCode } from '../../common/types';
import { getMainWindow } from '../main';
import {
  getProjectService,
  getVideoService,
  getCaptionService,
  getOverlayService,
  getSFXService,
  getExportService,
  getSettingsService,
} from '../services/service-manager';

/**
 * Validates that a value is a non-empty string
 */
function validateString(value: any, fieldName: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
}

/**
 * Validates that a value is a number within range
 */
function validateNumber(value: any, fieldName: string, min?: number, max?: number): void {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (min !== undefined && value < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }
  if (max !== undefined && value > max) {
    throw new Error(`${fieldName} must be at most ${max}`);
  }
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(error: any): AppError {
  if (error.code && error.message) {
    return error as AppError;
  }

  log.error('IPC Handler Error:', error);

  return {
    code: ErrorCode.UNKNOWN,
    message: error.message || 'An unknown error occurred',
    details: error.stack,
  };
}

/**
 * Wraps an IPC handler with error handling and logging
 */
function wrapHandler<T = any>(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<T>
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      log.debug(`IPC Handler called: ${channel}`, args);
      const result = await handler(event, ...args);
      log.debug(`IPC Handler completed: ${channel}`);
      return { success: true, data: result };
    } catch (error) {
      const errorResponse = createErrorResponse(error);
      log.error(`IPC Handler failed: ${channel}`, errorResponse);
      return { success: false, error: errorResponse };
    }
  });
}

/**
 * Register all IPC handlers
 */
export function registerIPCHandlers(): void {
  log.info('Registering IPC handlers...');

  // ==================== PROJECT MANAGEMENT ====================

  wrapHandler(IPC_CHANNELS.PROJECT_CREATE, async (event, name: string) => {
    validateString(name, 'Project name');
    return await getProjectService().createProject(name);
  });

  wrapHandler(IPC_CHANNELS.PROJECT_OPEN, async (event, projectId: string) => {
    validateString(projectId, 'Project ID');
    return await getProjectService().openProject(projectId);
  });

  wrapHandler(IPC_CHANNELS.PROJECT_SAVE, async (event, project: any) => {
    if (!project || !project.id) {
      throw new Error('Invalid project data');
    }
    return await getProjectService().saveProject(project);
  });

  wrapHandler(IPC_CHANNELS.PROJECT_CLOSE, async (event, projectId: string) => {
    validateString(projectId, 'Project ID');
    return await getProjectService().closeProject(projectId);
  });

  wrapHandler(IPC_CHANNELS.PROJECT_LIST, async () => {
    return await getProjectService().listProjects();
  });

  wrapHandler(IPC_CHANNELS.PROJECT_DELETE, async (event, projectId: string) => {
    validateString(projectId, 'Project ID');
    return await getProjectService().deleteProject(projectId);
  });

  // ==================== VIDEO OPERATIONS ====================

  wrapHandler(IPC_CHANNELS.VIDEO_UPLOAD, async (event, filePath: string) => {
    validateString(filePath, 'File path');
    return await getVideoService().uploadVideo(filePath);
  });

  wrapHandler(IPC_CHANNELS.VIDEO_ANALYZE, async (event, videoPath: string) => {
    validateString(videoPath, 'Video path');
    return await getVideoService().analyzeVideo(videoPath);
  });

  wrapHandler(IPC_CHANNELS.VIDEO_EXTRACT_AUDIO, async (event, videoPath: string) => {
    validateString(videoPath, 'Video path');
    return await getVideoService().extractAudio(videoPath);
  });

  wrapHandler(IPC_CHANNELS.VIDEO_GET_METADATA, async (event, videoPath: string) => {
    validateString(videoPath, 'Video path');
    return await getVideoService().getMetadata(videoPath);
  });

  wrapHandler(IPC_CHANNELS.VIDEO_GET_FRAME, async (event, videoPath: string, timestamp: number) => {
    validateString(videoPath, 'Video path');
    validateNumber(timestamp, 'Timestamp', 0);
    return await getVideoService().getFrame(videoPath, timestamp);
  });

  wrapHandler(IPC_CHANNELS.VIDEO_GET_THUMBNAIL, async (event, videoPath: string) => {
    validateString(videoPath, 'Video path');
    return await getVideoService().getThumbnail(videoPath);
  });

  // ==================== CAPTION OPERATIONS ====================

  wrapHandler(IPC_CHANNELS.CAPTION_GENERATE, async (event, videoPath: string, language: string) => {
    validateString(videoPath, 'Video path');
    validateString(language, 'Language');
    return await getCaptionService().generateCaptions(videoPath, language);
  });

  wrapHandler(IPC_CHANNELS.CAPTION_ADD, async (event, projectId: string, caption: any) => {
    validateString(projectId, 'Project ID');
    if (!caption || !caption.text) {
      throw new Error('Invalid caption data');
    }
    return await getCaptionService().addCaption(projectId, caption);
  });

  wrapHandler(IPC_CHANNELS.CAPTION_UPDATE, async (event, projectId: string, caption: any) => {
    validateString(projectId, 'Project ID');
    if (!caption || !caption.id) {
      throw new Error('Invalid caption data');
    }
    return await getCaptionService().updateCaption(projectId, caption);
  });

  wrapHandler(IPC_CHANNELS.CAPTION_DELETE, async (event, projectId: string, captionId: string) => {
    validateString(projectId, 'Project ID');
    validateString(captionId, 'Caption ID');
    return await getCaptionService().deleteCaption(projectId, captionId);
  });

  wrapHandler(IPC_CHANNELS.CAPTION_EXPORT, async (event, projectId: string, format: string) => {
    validateString(projectId, 'Project ID');
    validateString(format, 'Format');
    return await getCaptionService().exportCaptions(projectId, format);
  });

  // ==================== TEXT OVERLAY OPERATIONS ====================

  wrapHandler(IPC_CHANNELS.OVERLAY_ADD, async (event, projectId: string, overlay: any) => {
    validateString(projectId, 'Project ID');
    if (!overlay || !overlay.text) {
      throw new Error('Invalid overlay data');
    }
    return await getOverlayService().addOverlay(projectId, overlay);
  });

  wrapHandler(IPC_CHANNELS.OVERLAY_UPDATE, async (event, projectId: string, overlay: any) => {
    validateString(projectId, 'Project ID');
    if (!overlay || !overlay.id) {
      throw new Error('Invalid overlay data');
    }
    return await getOverlayService().updateOverlay(projectId, overlay);
  });

  wrapHandler(IPC_CHANNELS.OVERLAY_DELETE, async (event, projectId: string, overlayId: string) => {
    validateString(projectId, 'Project ID');
    validateString(overlayId, 'Overlay ID');
    return await getOverlayService().deleteOverlay(projectId, overlayId);
  });

  // ==================== SOUND EFFECT OPERATIONS ====================

  wrapHandler(IPC_CHANNELS.SFX_GENERATE, async (event, prompt: string, duration: number) => {
    validateString(prompt, 'Prompt');
    validateNumber(duration, 'Duration', 0.1, 30);
    return await getSFXService().generateSFX(prompt, duration);
  });

  wrapHandler(IPC_CHANNELS.SFX_ADD, async (event, projectId: string, sfx: any) => {
    validateString(projectId, 'Project ID');
    if (!sfx) {
      throw new Error('Invalid SFX data');
    }
    return await getSFXService().addSFX(projectId, sfx);
  });

  wrapHandler(IPC_CHANNELS.SFX_UPDATE, async (event, projectId: string, sfx: any) => {
    validateString(projectId, 'Project ID');
    if (!sfx || !sfx.id) {
      throw new Error('Invalid SFX data');
    }
    return await getSFXService().updateSFX(projectId, sfx);
  });

  wrapHandler(IPC_CHANNELS.SFX_DELETE, async (event, projectId: string, sfxId: string) => {
    validateString(projectId, 'Project ID');
    validateString(sfxId, 'SFX ID');
    return await getSFXService().deleteSFX(projectId, sfxId);
  });

  wrapHandler(IPC_CHANNELS.SFX_PREVIEW, async (event, sfxPath: string) => {
    validateString(sfxPath, 'SFX path');
    return await getSFXService().previewSFX(sfxPath);
  });

  // ==================== EXPORT OPERATIONS ====================

  wrapHandler(IPC_CHANNELS.EXPORT_VIDEO, async (event, projectId: string, config: any) => {
    validateString(projectId, 'Project ID');
    if (!config) {
      throw new Error('Invalid export configuration');
    }
    return await getExportService().exportVideo(projectId, config);
  });

  wrapHandler(IPC_CHANNELS.EXPORT_CAPTIONS, async (event, projectId: string, format: string, outputPath: string) => {
    validateString(projectId, 'Project ID');
    validateString(format, 'Format');
    validateString(outputPath, 'Output path');
    return await getExportService().exportCaptions(projectId, format, outputPath);
  });

  wrapHandler(IPC_CHANNELS.EXPORT_PROJECT, async (event, projectId: string, outputPath: string) => {
    validateString(projectId, 'Project ID');
    validateString(outputPath, 'Output path');
    return await getExportService().exportProject(projectId, outputPath);
  });

  // ==================== SETTINGS ====================

  wrapHandler(IPC_CHANNELS.SETTINGS_GET, async () => {
    return await getSettingsService().getSettings();
  });

  wrapHandler(IPC_CHANNELS.SETTINGS_UPDATE, async (event, settings: any) => {
    if (!settings) {
      throw new Error('Invalid settings data');
    }
    return await getSettingsService().updateSettings(settings);
  });

  // ==================== FILE OPERATIONS ====================

  wrapHandler(IPC_CHANNELS.FILE_SELECT, async (event, options: any) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: options?.filters || [],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  wrapHandler(IPC_CHANNELS.FILE_SAVE_DIALOG, async (event, options: any) => {
    const result = await dialog.showSaveDialog({
      defaultPath: options?.defaultPath || '',
      filters: options?.filters || [],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    return result.filePath;
  });

  // ==================== WINDOW OPERATIONS ====================

  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    const window = getMainWindow();
    if (window) {
      window.minimize();
    }
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    const window = getMainWindow();
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
    const window = getMainWindow();
    if (window) {
      window.close();
    }
  });

  log.info('IPC handlers registered successfully');
}

/**
 * Send progress update to renderer
 */
export function sendProgressUpdate(progressInfo: any): void {
  const window = getMainWindow();
  if (window) {
    window.webContents.send(IPC_CHANNELS.PROGRESS_UPDATE, progressInfo);
  }
}

/**
 * Send error notification to renderer
 */
export function sendErrorNotification(error: AppError): void {
  const window = getMainWindow();
  if (window) {
    window.webContents.send(IPC_CHANNELS.ERROR_OCCURRED, error);
  }
}
