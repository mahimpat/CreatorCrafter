import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import * as fs from 'fs/promises'
import { readFile } from 'fs/promises'

// Handle running as root (WSL/Linux) - MUST be before any app initialization
if (process.getuid && process.getuid() === 0) {
  app.commandLine.appendSwitch('no-sandbox')
  app.commandLine.appendSwitch('disable-gpu-sandbox')
}

// Security: Disable remote module
app.on('remote-require', (event) => {
  event.preventDefault()
})

app.on('remote-get-builtin', (event) => {
  event.preventDefault()
})

app.on('remote-get-global', (event) => {
  event.preventDefault()
})

app.on('remote-get-current-window', (event) => {
  event.preventDefault()
})

app.on('remote-get-current-web-contents', (event) => {
  event.preventDefault()
})

let mainWindow: BrowserWindow | null = null
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      // Security best practices
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: false, // Allow local file protocol
      allowRunningInsecureContent: false,
      preload: join(__dirname, 'preload.js')
    },
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'default',
    show: false
  })

  // Graceful show
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Security: Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowedOrigins = isDev ? ['http://localhost:5173'] : []
    const parsedUrl = new URL(url)

    if (!allowedOrigins.includes(parsedUrl.origin)) {
      event.preventDefault()
    }
  })

  // Security: Prevent opening new windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Register custom protocol for local file access
app.whenReady().then(() => {
  // Register protocol to serve local video files
  protocol.registerFileProtocol('localfile', (request, callback) => {
    const url = request.url.replace('localfile://', '')
    try {
      return callback(decodeURIComponent(url))
    } catch (error) {
      console.error('Error loading file:', error)
      return callback({ error: -2 })
    }
  })
})

// App lifecycle
app.whenReady().then(() => {
  createWindow()
  registerIpcHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers
function registerIpcHandlers() {
  // File dialog handlers
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('dialog:saveFile', async (_, defaultPath: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath,
      filters: [
        { name: 'Videos', extensions: ['mp4'] },
        { name: 'Subtitles', extensions: ['srt', 'vtt'] }
      ]
    })

    if (result.canceled) {
      return null
    }

    return result.filePath
  })

  // Get the application root directory
  const appRoot = app.isPackaged
    ? join(process.resourcesPath, 'app')
    : join(__dirname, '..')

  // Video processing handlers
  ipcMain.handle('video:extractAudio', async (_, videoPath: string) => {
    return new Promise((resolve, reject) => {
      const outputPath = join(app.getPath('temp'), `audio-${Date.now()}.wav`)

      // FFmpeg command to extract audio
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '44100',
        '-ac', '2',
        outputPath
      ])

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath)
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`))
        }
      })

      ffmpeg.on('error', reject)
    })
  })

  ipcMain.handle('video:getMetadata', async (_, videoPath: string) => {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoPath
      ])

      let output = ''

      ffprobe.stdout.on('data', (data) => {
        output += data.toString()
      })

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const metadata = JSON.parse(output)
            resolve(metadata)
          } catch (err) {
            reject(err)
          }
        } else {
          reject(new Error(`FFprobe exited with code ${code}`))
        }
      })

      ffprobe.on('error', reject)
    })
  })

  // AudioCraft integration (Python bridge)
  ipcMain.handle('audiocraft:generate', async (_, prompt: string, duration: number) => {
    return new Promise((resolve, reject) => {
      const pythonScript = join(appRoot, 'python', 'audiocraft_generator.py')
      const outputPath = join(app.getPath('temp'), `sfx-${Date.now()}.wav`)
      // Use venv python
      const pythonPath = join(appRoot, 'venv', 'bin', 'python')

      const python = spawn(pythonPath, [
        pythonScript,
        '--prompt', prompt,
        '--duration', duration.toString(),
        '--output', outputPath
      ])

      let errorOutput = ''

      python.stderr.on('data', (data) => {
        errorOutput += data.toString()
        console.error('AudioCraft stderr:', data.toString())
      })

      python.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath)
        } else {
          console.error('AudioCraft generation failed:', errorOutput)
          reject(new Error(`AudioCraft generation failed with code ${code}: ${errorOutput}`))
        }
      })

      python.on('error', (err) => {
        console.error('Failed to spawn python for AudioCraft:', err)
        reject(err)
      })
    })
  })

  // AI analysis handler (video understanding)
  ipcMain.handle('ai:analyzeVideo', async (_, videoPath: string, audioPath: string) => {
    return new Promise((resolve, reject) => {
      const pythonScript = join(appRoot, 'python', 'video_analyzer.py')
      // Use venv python
      const pythonPath = join(appRoot, 'venv', 'bin', 'python')

      console.log('Analyzing video with:', { pythonPath, pythonScript, videoPath, audioPath })

      const python = spawn(pythonPath, [
        pythonScript,
        '--video', videoPath,
        '--audio', audioPath
      ])

      let output = ''
      let errorOutput = ''

      python.stdout.on('data', (data) => {
        output += data.toString()
      })

      python.stderr.on('data', (data) => {
        errorOutput += data.toString()
        console.error('Python stderr:', data.toString())
      })

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const analysis = JSON.parse(output)
            resolve(analysis)
          } catch (err) {
            console.error('Failed to parse JSON:', output)
            reject(new Error(`Failed to parse analysis results: ${err}`))
          }
        } else {
          console.error('Video analysis failed:', errorOutput)
          reject(new Error(`Video analysis failed with code ${code}: ${errorOutput}`))
        }
      })

      python.on('error', (err) => {
        console.error('Failed to spawn python:', err)
        reject(err)
      })
    })
  })

  // File system handlers
  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return content
    } catch (error) {
      throw error
    }
  })

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    try {
      await fs.writeFile(filePath, content, 'utf-8')
      return true
    } catch (error) {
      throw error
    }
  })

  // Render final video
  ipcMain.handle('video:render', async (_, options: RenderOptions) => {
    return new Promise((resolve, reject) => {
      const { videoPath, outputPath, subtitles, sfxTracks, overlays } = options

      // Build complex FFmpeg command with filters
      const ffmpegArgs = buildRenderCommand(videoPath, outputPath, {
        subtitles,
        sfxTracks,
        overlays
      })

      const ffmpeg = spawn('ffmpeg', ffmpegArgs)

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath)
        } else {
          reject(new Error(`Render failed with code ${code}`))
        }
      })

      ffmpeg.on('error', reject)
    })
  })
}

interface RenderOptions {
  videoPath: string
  outputPath: string
  subtitles?: Array<{ text: string; start: number; end: number }>
  sfxTracks?: Array<{ path: string; start: number }>
  overlays?: Array<{ text: string; start: number; end: number; style: any }>
}

function buildRenderCommand(
  videoPath: string,
  outputPath: string,
  options: Omit<RenderOptions, 'videoPath' | 'outputPath'>
): string[] {
  const args = ['-i', videoPath]

  // Add SFX tracks as additional inputs
  options.sfxTracks?.forEach(sfx => {
    args.push('-i', sfx.path)
  })

  // Build filter complex for overlays and mixing audio
  const filters: string[] = []

  if (options.sfxTracks && options.sfxTracks.length > 0) {
    // Mix audio tracks
    const audioInputs = options.sfxTracks.map((_, i) => `[${i + 1}:a]`).join('')
    filters.push(`[0:a]${audioInputs}amix=inputs=${options.sfxTracks.length + 1}[aout]`)
  }

  if (filters.length > 0) {
    args.push('-filter_complex', filters.join(';'))
    args.push('-map', '0:v')
    args.push('-map', '[aout]')
  }

  args.push('-c:v', 'libx264', '-c:a', 'aac', '-y', outputPath)

  return args
}
