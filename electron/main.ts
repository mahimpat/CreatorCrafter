import { app, BrowserWindow, ipcMain, dialog, protocol, shell } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import * as fs from 'fs/promises'
import { readFile } from 'fs/promises'
import * as projectManager from './projectManager'
import { initializeFreesoundService, getFreesoundService } from './freesoundService'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

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

  // Initialize FreeSound service
  const clientId = process.env.FREESOUND_CLIENT_ID || ''
  const clientSecret = process.env.FREESOUND_CLIENT_SECRET || ''
  const redirectUri = process.env.FREESOUND_REDIRECT_URI || 'http://localhost:3000/freesound/callback'

  if (clientId && clientSecret) {
    initializeFreesoundService(clientId, clientSecret, redirectUri)
    console.log('FreeSound service initialized')
  } else {
    console.warn('FreeSound API credentials not found in environment variables')
  }

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

      console.log('Starting AudioCraft generation:', { prompt, duration, outputPath })

      const python = spawn(pythonPath, [
        pythonScript,
        '--prompt', prompt,
        '--duration', duration.toString(),
        '--output', outputPath
      ])

      let errorOutput = ''
      let isResolved = false

      // Set a timeout for AudioGen model download/generation (5 minutes)
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          python.kill('SIGTERM')
          reject(new Error('SFX generation timed out. AudioGen model may be downloading for the first time. Please try again in a few minutes.'))
        }
      }, 5 * 60 * 1000) // 5 minutes

      python.stderr.on('data', (data) => {
        const output = data.toString()
        errorOutput += output
        console.error('AudioCraft stderr:', output)

        // Show progress for model loading
        if (output.includes('Loading AudioGen model')) {
          console.log('AudioGen model loading...')
        }
        if (output.includes('Model loaded successfully')) {
          console.log('AudioGen model loaded successfully')
        }
        if (output.includes('Generating audio for')) {
          console.log('Generating audio...')
        }
      })

      python.on('close', (code) => {
        clearTimeout(timeout)
        if (isResolved) return
        isResolved = true

        if (code === 0) {
          console.log('AudioCraft generation completed successfully')
          resolve(outputPath)
        } else {
          console.error('AudioCraft generation failed:', errorOutput)
          let errorMessage = `AudioCraft generation failed with code ${code}`

          // Provide more helpful error messages
          if (errorOutput.includes('Repository Not Found')) {
            errorMessage = 'AudioGen model not found. Please check your internet connection.'
          } else if (errorOutput.includes('401 Client Error')) {
            errorMessage = 'Authentication error downloading AudioGen model. Please check your internet connection and try again.'
          } else if (errorOutput.includes('torch.cuda')) {
            errorMessage = 'GPU initialization warning (this is normal and won\'t affect generation)'
          } else if (errorOutput.includes('No module named')) {
            errorMessage = 'AudioCraft dependencies missing. Please reinstall dependencies.'
          }

          reject(new Error(errorMessage))
        }
      })

      python.on('error', (err) => {
        clearTimeout(timeout)
        if (isResolved) return
        isResolved = true
        console.error('Failed to spawn python for AudioCraft:', err)
        reject(new Error(`Failed to start AudioCraft: ${err.message}`))
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

  // Project management handlers
  ipcMain.handle('project:create', async (_, options: { projectName: string; projectPath: string; videoPath: string }) => {
    try {
      const { projectName, projectPath, videoPath } = options
      const fullProjectPath = join(projectPath, projectName)

      // Create project structure
      await projectManager.createProjectStructure(fullProjectPath)

      // Copy video to project
      const videoRelativePath = await projectManager.copyAssetToProject(
        videoPath,
        fullProjectPath,
        'source'
      )

      return {
        projectPath: fullProjectPath,
        videoRelativePath
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      throw error
    }
  })

  ipcMain.handle('project:save', async (_, projectPath: string, projectData: any) => {
    try {
      await projectManager.saveProject(projectPath, projectData)
      await projectManager.addToRecentProjects(projectPath, projectData.projectName)
      return true
    } catch (error) {
      console.error('Failed to save project:', error)
      throw error
    }
  })

  ipcMain.handle('project:load', async (_, projectPath: string) => {
    try {
      const projectData = await projectManager.loadProject(projectPath)
      await projectManager.addToRecentProjects(projectPath, projectData.projectName)
      return projectData
    } catch (error) {
      console.error('Failed to load project:', error)
      throw error
    }
  })

  ipcMain.handle('project:openFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Project Location'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('project:openFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Project Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      title: 'Open Project'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const projectFilePath = result.filePaths[0]
    // Return the directory containing the project.json file
    return join(projectFilePath, '..')
  })

  ipcMain.handle('project:getRecent', async () => {
    try {
      return await projectManager.getRecentProjects()
    } catch (error) {
      console.error('Failed to get recent projects:', error)
      return []
    }
  })

  ipcMain.handle('project:removeRecent', async (_, projectPath: string) => {
    try {
      await projectManager.removeFromRecentProjects(projectPath)
      return true
    } catch (error) {
      console.error('Failed to remove from recent:', error)
      return false
    }
  })

  ipcMain.handle('project:copyAsset', async (_, sourcePath: string, projectPath: string, assetType: 'source' | 'sfx' | 'exports') => {
    try {
      const relativePath = await projectManager.copyAssetToProject(sourcePath, projectPath, assetType)
      return relativePath
    } catch (error) {
      console.error('Failed to copy asset:', error)
      throw error
    }
  })

  ipcMain.handle('project:resolvePath', async (_, projectPath: string, relativePath: string) => {
    return projectManager.resolveProjectPath(projectPath, relativePath)
  })

  ipcMain.handle('project:getSFXFiles', async (_, projectPath: string) => {
    try {
      return await projectManager.getProjectSFXFiles(projectPath)
    } catch (error) {
      console.error('Failed to get SFX files:', error)
      return []
    }
  })

  ipcMain.handle('project:getExports', async (_, projectPath: string) => {
    try {
      return await projectManager.getProjectExports(projectPath)
    } catch (error) {
      console.error('Failed to get exports:', error)
      return []
    }
  })

  ipcMain.handle('project:fileExists', async (_, filePath: string) => {
    return await projectManager.fileExists(filePath)
  })

  ipcMain.handle('project:deleteFile', async (_, filePath: string) => {
    try {
      await projectManager.deleteFile(filePath)
      return true
    } catch (error) {
      console.error('Failed to delete file:', error)
      throw error
    }
  })

  ipcMain.handle('project:showInFolder', async (_, filePath: string) => {
    try {
      shell.showItemInFolder(filePath)
      return true
    } catch (error) {
      console.error('Failed to show in folder:', error)
      return false
    }
  })

  ipcMain.handle('project:isValid', async (_, projectPath: string) => {
    return await projectManager.isValidProject(projectPath)
  })

  // FreeSound API handlers
  ipcMain.handle('freesound:authorize', async () => {
    try {
      const service = getFreesoundService()
      const token = await service.authorize()
      return { success: true, token }
    } catch (error: any) {
      console.error('FreeSound authorization error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('freesound:isAuthenticated', async () => {
    try {
      const service = getFreesoundService()
      return service.isAuthenticated()
    } catch (error) {
      return false
    }
  })

  ipcMain.handle('freesound:getToken', async () => {
    try {
      const service = getFreesoundService()
      return service.getToken()
    } catch (error) {
      return null
    }
  })

  ipcMain.handle('freesound:getMe', async () => {
    try {
      const service = getFreesoundService()
      const user = await service.getMe()
      return { success: true, user }
    } catch (error: any) {
      console.error('FreeSound getMe error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('freesound:search', async (_, params) => {
    try {
      const service = getFreesoundService()
      const results = await service.search(params)
      return { success: true, results }
    } catch (error: any) {
      console.error('FreeSound search error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('freesound:getSound', async (_, soundId: number) => {
    try {
      const service = getFreesoundService()
      const sound = await service.getSound(soundId)
      return { success: true, sound }
    } catch (error: any) {
      console.error('FreeSound getSound error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('freesound:downloadSound', async (_, soundId: number, outputPath: string) => {
    try {
      const service = getFreesoundService()
      const filePath = await service.downloadSound(soundId, outputPath)
      return { success: true, filePath }
    } catch (error: any) {
      console.error('FreeSound download error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('freesound:downloadPreview', async (_, previewUrl: string, outputPath: string) => {
    try {
      const service = getFreesoundService()
      const filePath = await service.downloadPreview(previewUrl, outputPath)
      return { success: true, filePath }
    } catch (error: any) {
      console.error('FreeSound preview download error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('freesound:clearToken', async () => {
    try {
      const service = getFreesoundService()
      await service.clearToken()
      return { success: true }
    } catch (error: any) {
      console.error('FreeSound clear token error:', error)
      return { success: false, error: error.message }
    }
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
