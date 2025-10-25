/**
 * Application Menu Configuration
 *
 * Creates native application menus for each platform with proper shortcuts
 */

import { app, Menu, shell, dialog } from 'electron';
import { getMainWindow } from './main';

export function createApplicationMenu(): void {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:new-project');
            }
          },
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:open-project');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:save-project');
            }
          },
        },
        {
          label: 'Save Project As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:save-project-as');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Import Video...',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:import-video');
            }
          },
        },
        {
          label: 'Export...',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:export');
            }
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:settings');
            }
          },
        },
      ],
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Timeline',
          submenu: [
            {
              label: 'Zoom In',
              accelerator: 'CmdOrCtrl+=',
              click: () => {
                const window = getMainWindow();
                if (window) {
                  window.webContents.send('menu:timeline-zoom-in');
                }
              },
            },
            {
              label: 'Zoom Out',
              accelerator: 'CmdOrCtrl+-',
              click: () => {
                const window = getMainWindow();
                if (window) {
                  window.webContents.send('menu:timeline-zoom-out');
                }
              },
            },
            {
              label: 'Fit to Window',
              accelerator: 'CmdOrCtrl+0',
              click: () => {
                const window = getMainWindow();
                if (window) {
                  window.webContents.send('menu:timeline-fit');
                }
              },
            },
          ],
        },
      ],
    },

    // Playback Menu
    {
      label: 'Playback',
      submenu: [
        {
          label: 'Play/Pause',
          accelerator: 'Space',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:play-pause');
            }
          },
        },
        {
          label: 'Stop',
          accelerator: 'Escape',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:stop');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Jump to Start',
          accelerator: 'Home',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:jump-start');
            }
          },
        },
        {
          label: 'Jump to End',
          accelerator: 'End',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:jump-end');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Next Frame',
          accelerator: 'Right',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:next-frame');
            }
          },
        },
        {
          label: 'Previous Frame',
          accelerator: 'Left',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:prev-frame');
            }
          },
        },
      ],
    },

    // Tools Menu
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Analyze Video',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:analyze-video');
            }
          },
        },
        {
          label: 'Generate Captions',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:generate-captions');
            }
          },
        },
        {
          label: 'Generate Sound Effects',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:generate-sfx');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Add Text Overlay',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:add-overlay');
            }
          },
        },
      ],
    },

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },

    // Help Menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/ai-content-creator-assistant/wiki');
          },
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/ai-content-creator-assistant/issues');
          },
        },
        { type: 'separator' },
        {
          label: 'View Logs',
          click: () => {
            const window = getMainWindow();
            if (window) {
              window.webContents.send('menu:view-logs');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About AI Content Creator Assistant',
              message: 'AI Content Creator Assistant',
              detail: `Version: ${app.getVersion()}\n\nAI-powered desktop application for automated video content creation tasks.\n\nCopyright © 2024`,
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
