/**
 * Service Manager
 *
 * Initializes and manages all backend services.
 * Provides singleton access to service instances.
 */

import log from 'electron-log';
import { ProjectService } from './project-service';
import { VideoService } from './video-service';
import { CaptionService } from './caption-service';
import { OverlayService } from './overlay-service';
import { SFXService } from './sfx-service';
import { ExportService } from './export-service';
import { SettingsService } from './settings-service';
import { DatabaseService } from './database-service';
import { PythonBridgeService } from './python-bridge-service';

// Service instances
let projectService: ProjectService;
let videoService: VideoService;
let captionService: CaptionService;
let overlayService: OverlayService;
let sfxService: SFXService;
let exportService: ExportService;
let settingsService: SettingsService;
let databaseService: DatabaseService;
let pythonBridgeService: PythonBridgeService;

/**
 * Initialize all services
 */
export async function initializeServices(): Promise<void> {
  log.info('Initializing services...');

  try {
    // Initialize database first
    databaseService = new DatabaseService();
    await databaseService.initialize();
    log.info('Database service initialized');

    // Initialize settings service
    settingsService = new SettingsService();
    await settingsService.initialize();
    log.info('Settings service initialized');

    // Initialize Python bridge for AI services
    pythonBridgeService = new PythonBridgeService();
    await pythonBridgeService.initialize();
    log.info('Python bridge service initialized');

    // Initialize video processing service
    videoService = new VideoService(pythonBridgeService);
    await videoService.initialize();
    log.info('Video service initialized');

    // Initialize caption service
    captionService = new CaptionService(pythonBridgeService, databaseService);
    await captionService.initialize();
    log.info('Caption service initialized');

    // Initialize overlay service
    overlayService = new OverlayService(databaseService);
    await overlayService.initialize();
    log.info('Overlay service initialized');

    // Initialize SFX service
    sfxService = new SFXService(pythonBridgeService, databaseService);
    await sfxService.initialize();
    log.info('SFX service initialized');

    // Initialize export service
    exportService = new ExportService(videoService);
    await exportService.initialize();
    log.info('Export service initialized');

    // Initialize project service (depends on other services)
    projectService = new ProjectService(
      databaseService,
      videoService,
      captionService,
      overlayService,
      sfxService
    );
    await projectService.initialize();
    log.info('Project service initialized');

    log.info('All services initialized successfully');
  } catch (error) {
    log.error('Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Cleanup all services
 */
export async function cleanupServices(): Promise<void> {
  log.info('Cleaning up services...');

  try {
    if (pythonBridgeService) {
      await pythonBridgeService.cleanup();
    }

    if (databaseService) {
      await databaseService.cleanup();
    }

    log.info('Services cleaned up successfully');
  } catch (error) {
    log.error('Error cleaning up services:', error);
  }
}

// Service getters
export function getProjectService(): ProjectService {
  if (!projectService) {
    throw new Error('Project service not initialized');
  }
  return projectService;
}

export function getVideoService(): VideoService {
  if (!videoService) {
    throw new Error('Video service not initialized');
  }
  return videoService;
}

export function getCaptionService(): CaptionService {
  if (!captionService) {
    throw new Error('Caption service not initialized');
  }
  return captionService;
}

export function getOverlayService(): OverlayService {
  if (!overlayService) {
    throw new Error('Overlay service not initialized');
  }
  return overlayService;
}

export function getSFXService(): SFXService {
  if (!sfxService) {
    throw new Error('SFX service not initialized');
  }
  return sfxService;
}

export function getExportService(): ExportService {
  if (!exportService) {
    throw new Error('Export service not initialized');
  }
  return exportService;
}

export function getSettingsService(): SettingsService {
  if (!settingsService) {
    throw new Error('Settings service not initialized');
  }
  return settingsService;
}

export function getDatabaseService(): DatabaseService {
  if (!databaseService) {
    throw new Error('Database service not initialized');
  }
  return databaseService;
}

export function getPythonBridgeService(): PythonBridgeService {
  if (!pythonBridgeService) {
    throw new Error('Python bridge service not initialized');
  }
  return pythonBridgeService;
}
