/**
 * Main Process Entry Point
 *
 * This is the Electron main process that manages application lifecycle,
 * creates windows, and handles system-level operations.
 *
 * SECURITY NOTES:
 * - No nodeIntegration in renderers
 * - Context isolation enabled
 * - Sandbox mode enabled for all renderers
 * - All IPC communication goes through preload scripts
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { IPC_CHANNELS } from '../common/types';
import { registerIPCHandlers } from './ipc/ipc-handlers';
import { initializeServices } from './services/service-manager';
import { createApplicationMenu } from './menu';

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// Global reference to main window
let mainWindow: BrowserWindow | null = null;

// Flag to track if app is in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Disable hardware acceleration if needed (can be controlled via settings)
// app.disableHardwareAcceleration();

/**
 * Creates the main application window with security best practices
 */
function createMainWindow(): BrowserWindow {
  log.info('Creating main window...');

  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    show: false, // Don't show until ready-to-show
    backgroundColor: '#1a1a1a',
    title: 'AI Content Creator Assistant',
    titleBarStyle: 'default',
    webPreferences: {
      // SECURITY: Critical security settings
      nodeIntegration: false, // Never enable this
      contextIsolation: true, // Always enable this
      sandbox: true, // Enable sandbox for maximum security
      webSecurity: true,
      allowRunningInsecureContent: false,

      // Preload script is the ONLY bridge between main and renderer
      preload: path.join(__dirname, '../preload/preload.js'),

      // Additional security
      enableRemoteModule: false,
      disableBlinkFeatures: 'Auxclick', // Prevent certain exploits
    },
  });

  // Load the application
  if (isDevelopment) {
    // Development: Load from Vite dev server
    window.loadURL('http://localhost:5173');
    window.webContents.openDevTools();
  } else {
    // Production: Load from built files
    window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready to prevent visual flash
  window.once('ready-to-show', () => {
    log.info('Window ready to show');
    window.show();
    window.focus();
  });

  // Handle external links securely - open in default browser
  window.webContents.setWindowOpenHandler(({ url }) => {
    // Only allow specific protocols
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    } else {
      log.warn(`Blocked opening URL with unsupported protocol: ${url}`);
    }
    return { action: 'deny' };
  });

  // Prevent navigation away from the application
  window.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const currentUrl = window.webContents.getURL();

    // Allow navigation in development (Vite HMR)
    if (isDevelopment && parsedUrl.origin === 'http://localhost:5173') {
      return;
    }

    // Block all other navigation attempts
    if (navigationUrl !== currentUrl) {
      event.preventDefault();
      log.warn(`Blocked navigation to: ${navigationUrl}`);
    }
  });

  // Handle window close
  window.on('closed', () => {
    mainWindow = null;
  });

  // Security: Disable web view tag
  window.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
    log.warn('Blocked webview attachment attempt');
  });

  return window;
}

/**
 * Initialize the application
 */
async function initializeApp() {
  try {
    log.info('Initializing application services...');

    // Initialize all backend services (database, video processor, AI bridge, etc.)
    await initializeServices();

    // Register all IPC handlers
    registerIPCHandlers();

    // Create application menu
    createApplicationMenu();

    // Configure auto-updater (only in production)
    if (!isDevelopment) {
      configureAutoUpdater();
    }

    log.info('Application initialized successfully');
  } catch (error) {
    log.error('Failed to initialize application:', error);

    // Show error dialog
    dialog.showErrorBox(
      'Initialization Error',
      'Failed to initialize the application. Please check the logs and try again.'
    );

    app.quit();
  }
}

/**
 * Configure auto-updater for automatic application updates
 */
function configureAutoUpdater() {
  autoUpdater.logger = log;

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);

    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);

    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'A new version has been downloaded. Restart the application to apply the update.',
      buttons: ['Restart', 'Later'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (error) => {
    log.error('Auto-updater error:', error);
  });

  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 4 * 60 * 60 * 1000);

  // Initial check
  autoUpdater.checkForUpdates();
}

/**
 * Handle application ready event
 */
app.on('ready', async () => {
  log.info('App ready event fired');

  // Initialize application
  await initializeApp();

  // Create main window
  mainWindow = createMainWindow();
});

/**
 * Handle all windows closed
 */
app.on('window-all-closed', () => {
  // On macOS, applications typically stay open until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Handle app activation (macOS)
 */
app.on('activate', () => {
  // On macOS, recreate window when dock icon is clicked and no windows are open
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  }
});

/**
 * Handle app quit - cleanup
 */
app.on('before-quit', () => {
  log.info('Application shutting down...');
  // Cleanup will be handled by service manager
});

/**
 * Prevent multiple instances
 */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  log.warn('Another instance is already running. Quitting...');
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);

  dialog.showErrorBox(
    'An Error Occurred',
    `An unexpected error occurred: ${error.message}\n\nPlease restart the application.`
  );
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled rejection at:', promise, 'reason:', reason);
});

/**
 * Export main window reference for use in other modules
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
