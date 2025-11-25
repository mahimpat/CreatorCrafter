import { app, BrowserWindow, ipcMain, dialog, protocol, shell } from 'electron'
import { join, dirname, basename } from 'path'
import { spawn, exec } from 'child_process'
import * as fs from 'fs/promises'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import * as projectManager from './projectManager'
import { initializeFreesoundService, getFreesoundService } from './freesoundService'
import * as elevenlabsService from './elevenlabsService'
import * as dotenv from 'dotenv'
import { SetupManager } from './setup-manager'

// Load environment variables from default location (for development)
// In production, we'll reload from the correct path after app.whenReady()
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
let setupWindow: BrowserWindow | null = null
let setupManager: SetupManager | null = null
let hasUnsavedChanges = false
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 700,
    height: 600,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: join(__dirname, 'preload.js')
    },
    backgroundColor: '#667eea',
    titleBarStyle: 'hidden',
    frame: false,
    show: false
  })

  // Graceful show
  setupWindow.once('ready-to-show', () => {
    setupWindow?.show()
  })

  // Load the setup page
  if (isDev) {
    setupWindow.loadURL('http://localhost:5173/#/setup')
  } else {
    setupWindow.loadFile(join(__dirname, '../dist/index.html'), { hash: 'setup' })
  }

  setupWindow.on('closed', () => {
    setupWindow = null
  })
}

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

  // Prevent closing with unsaved changes
  mainWindow.on('close', (event) => {
    if (hasUnsavedChanges) {
      event.preventDefault()

      dialog.showMessageBox(mainWindow!, {
        type: 'warning',
        buttons: ['Save and Close', 'Discard Changes', 'Cancel'],
        defaultId: 0,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes.',
        detail: 'Do you want to save your changes before closing?'
      }).then(({ response }) => {
        if (response === 0) {
          // Save and close
          mainWindow?.webContents.send('save-before-close')
          // Wait for save confirmation, then close
          setTimeout(() => {
            hasUnsavedChanges = false
            mainWindow?.close()
          }, 1000)
        } else if (response === 1) {
          // Discard and close
          hasUnsavedChanges = false
          mainWindow?.close()
        }
        // response === 2: Cancel, do nothing
      })
    }
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
app.whenReady().then(async () => {
  // Load .env from userData directory (where setup-manager creates it)
  const appDataPath = app.getPath('userData')
  const envPath = join(appDataPath, '.env')

  if (existsSync(envPath)) {
    console.log('[App] Loading .env from:', envPath)
    dotenv.config({ path: envPath, override: true })
    console.log('[App] PYTHON_PATH loaded:', process.env.PYTHON_PATH || 'not set')
  } else {
    console.log('[App] No .env file found at:', envPath)
    console.log('[App] This is normal on first run before setup')
  }

  // Initialize setup manager
  setupManager = new SetupManager()

  // Check if first run
  const isFirstRun = await setupManager.isFirstRun()

  if (isFirstRun) {
    console.log('[App] First run detected - showing setup wizard')
    createSetupWindow()
  } else {
    console.log('[App] Environment ready - launching main app')
    createWindow()
  }

  registerIpcHandlers()

  // Initialize FreeSound service with API key only (skip on first run)
  if (!isFirstRun) {
    const apiKey = process.env.FREESOUND_CLIENT_ID || ''

    if (apiKey) {
      initializeFreesoundService(apiKey)
      console.log('FreeSound service initialized with API key')
    } else {
      console.warn('FREESOUND_CLIENT_ID not found in .env file')
    }
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
  // Setup handlers
  ipcMain.handle('setup:start', async () => {
    if (!setupManager) {
      throw new Error('Setup manager not initialized')
    }

    // Set up progress callback
    setupManager.onProgress((progress) => {
      if (setupWindow) {
        setupWindow.webContents.send('setup:progress', progress)
      }
    })

    // Run setup
    try {
      await setupManager.runSetup()
      console.log('[App] Setup completed successfully')
    } catch (error: any) {
      console.error('[App] Setup failed:', error)
      throw error
    }
  })

  ipcMain.handle('setup:complete', async () => {
    console.log('[App] Setup complete - closing setup window and launching main app')

    // Reload .env file to get PYTHON_PATH set by setup
    const appDataPath = app.getPath('userData')
    const envPath = join(appDataPath, '.env')
    console.log('[App] Reloading .env from:', envPath)
    dotenv.config({ path: envPath, override: true })
    console.log('[App] PYTHON_PATH:', process.env.PYTHON_PATH)

    // Close setup window
    if (setupWindow) {
      setupWindow.close()
      setupWindow = null
    }

    // Create main window
    createWindow()

    // Initialize services
    const apiKey = process.env.FREESOUND_CLIENT_ID || ''
    if (apiKey) {
      initializeFreesoundService(apiKey)
    }
  })

  // Diagnostic handler to check Python package installation
  ipcMain.handle('setup:checkPackages', async () => {
    return new Promise((resolve) => {
      try {
        const pythonPath = getPythonPath()

        // Test importing critical packages
        const packages = [
          'numpy',
          'cv2',
          'whisper',
          'transformers',
          'spacy',
          'librosa',
          'soundfile',
          'PIL',
          'scipy',
          'scenedetect'
        ]

        const results: { [key: string]: boolean } = {}
        let testsCompleted = 0

        packages.forEach((pkg) => {
          const python = spawn(pythonPath, ['-c', `import ${pkg}; print('OK')`], {
            cwd: join(appRoot, 'python')
          })

          let output = ''
          let errorOutput = ''

          python.stdout.on('data', (data) => {
            output += data.toString()
          })

          python.stderr.on('data', (data) => {
            errorOutput += data.toString()
          })

          python.on('close', (code) => {
            results[pkg] = code === 0 && output.includes('OK')
            testsCompleted++

            if (testsCompleted === packages.length) {
              console.log('[Diagnostics] Package check results:', results)
              resolve({ success: true, packages: results })
            }
          })

          python.on('error', () => {
            results[pkg] = false
            testsCompleted++

            if (testsCompleted === packages.length) {
              console.log('[Diagnostics] Package check results:', results)
              resolve({ success: true, packages: results })
            }
          })
        })

        // Timeout after 30 seconds
        setTimeout(() => {
          if (testsCompleted < packages.length) {
            console.error('[Diagnostics] Package check timed out')
            resolve({ success: false, error: 'Timeout checking packages', packages: results })
          }
        }, 30000)

      } catch (error: any) {
        console.error('[Diagnostics] Error checking packages:', error)
        resolve({ success: false, error: error.message })
      }
    })
  })

  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    await shell.openExternal(url)
  })

  // File dialog handlers
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'All Media', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
        { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] }
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
  // In production, Python scripts are in resources/ directory (extraResources)
  // In development, they're in the project root
  const appRoot = app.isPackaged
    ? process.resourcesPath
    : join(__dirname, '..')

  // Get the installation directory (parent of resources)
  // This is where venv is created by the installer
  const installDir = app.isPackaged
    ? join(process.resourcesPath, '..')
    : join(__dirname, '..')

  // Python scripts directory - used as cwd for Python processes
  const pythonDir = join(appRoot, 'python')

  // Helper functions to get FFmpeg binary paths
  const getFFmpegPath = () => {
    const ffmpegDir = join(appRoot, 'ffmpeg')
    const isWindows = process.platform === 'win32'
    const ffmpegPath = join(ffmpegDir, isWindows ? 'ffmpeg.exe' : 'ffmpeg')

    if (!existsSync(ffmpegPath)) {
      console.error('[FFmpeg] Binary not found at:', ffmpegPath)
      throw new Error(`FFmpeg binary not found at ${ffmpegPath}. Please reinstall the application.`)
    }

    return ffmpegPath
  }

  const getFFprobePath = () => {
    const ffmpegDir = join(appRoot, 'ffmpeg')
    const isWindows = process.platform === 'win32'
    const ffprobePath = join(ffmpegDir, isWindows ? 'ffprobe.exe' : 'ffprobe')

    if (!existsSync(ffprobePath)) {
      console.error('[FFprobe] Binary not found at:', ffprobePath)
      throw new Error(`FFprobe binary not found at ${ffprobePath}. Please reinstall the application.`)
    }

    return ffprobePath
  }

  // Helper function to get Python executable path
  // Reads from .env file (set by setup-manager) or falls back to venv
  const getPythonPath = () => {
    let pythonPath: string

    // Check if .env specifies portable Python marker
    if (process.env.PYTHON_PATH === 'PORTABLE_PYTHON') {
      // Resolve portable Python path at runtime (works even if temp folder changes)
      pythonPath = join(appRoot, 'python-portable', 'python.exe')
      console.log('[Python] Using portable Python (runtime resolved):', pythonPath)
    } else if (process.env.PYTHON_PATH) {
      // Use custom path from .env
      pythonPath = process.env.PYTHON_PATH
      console.log('[Python] Using custom Python from .env:', pythonPath)
    } else {
      // Fallback to venv for backward compatibility (development)
      const isWindows = process.platform === 'win32'
      pythonPath = isWindows
        ? join(installDir, 'venv', 'python.exe')
        : join(installDir, 'venv', 'bin', 'python')
      console.log('[Python] Using venv Python (development fallback):', pythonPath)
    }

    if (!existsSync(pythonPath)) {
      console.error('[Python] Executable not found at:', pythonPath)
      console.error('[Python] appRoot:', appRoot)
      console.error('[Python] process.env.PYTHON_PATH:', process.env.PYTHON_PATH)
      throw new Error(`Python executable not found at ${pythonPath}. Please run the setup wizard again.`)
    }

    return pythonPath
  }

  // Video processing handlers
  ipcMain.handle('video:extractAudio', async (_, videoPath: string) => {
    return new Promise((resolve, reject) => {
      const outputPath = join(app.getPath('temp'), `audio-${Date.now()}.wav`)

      console.log('Extracting audio from:', videoPath)
      console.log('Output path:', outputPath)

      // FFmpeg command to extract audio
      const ffmpeg = spawn(getFFmpegPath(), [
        '-i', videoPath,
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',  // 16kHz for Whisper compatibility
        '-ac', '1',      // Mono for Whisper
        '-y',            // Overwrite output file
        outputPath
      ])

      let errorOutput = ''

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('Audio extraction successful')
          resolve(outputPath)
        } else {
          console.error('FFmpeg error output:', errorOutput)

          // Check if video has no audio stream - this is OK, just return null
          if (errorOutput.includes('does not contain any stream') ||
              errorOutput.includes('No audio') ||
              errorOutput.includes('Output file is empty')) {
            console.log('Video has no audio track - continuing without audio')
            resolve(null) // Return null instead of rejecting
          } else {
            reject(new Error(`FFmpeg exited with code ${code}: ${errorOutput.substring(0, 500)}`))
          }
        }
      })

      ffmpeg.on('error', reject)
    })
  })

  ipcMain.handle('video:getMetadata', async (_, videoPath: string) => {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn(getFFprobePath(), [
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
  ipcMain.handle('audiocraft:generate', async (_, prompt: string, duration: number, modelType: string = 'audiogen') => {
    return new Promise((resolve, reject) => {
      // Always use .py files (cross-version compatible)
      const scriptName = 'audiocraft_generator.py'
      const pythonScript = join(appRoot, 'python', scriptName)
      const outputPath = join(app.getPath('temp'), `sfx-${Date.now()}.wav`)
      // Get Python executable path from .env or venv
      const pythonPath = getPythonPath()

      const modelName = modelType === 'musicgen' ? 'MusicGen' : 'AudioGen'
      console.log(`Starting ${modelName} generation:`, { prompt, duration, outputPath, modelType })

      const python = spawn(pythonPath, [
        pythonScript,
        '--prompt', prompt,
        '--duration', duration.toString(),
        '--output', outputPath,
        '--model', modelType
      ], {
        cwd: pythonDir
      })

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

        // Show progress for model loading (both AudioGen and MusicGen)
        if (output.includes('Loading AudioGen model') || output.includes('Loading MusicGen model')) {
          console.log(`${modelName} model loading...`)
        }
        if (output.includes('Model loaded successfully') || output.includes('model loaded successfully')) {
          console.log(`${modelName} model loaded successfully`)
        }
        if (output.includes('Generating')) {
          console.log(`Generating ${modelType === 'musicgen' ? 'music' : 'sound effect'}...`)
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
            errorMessage = `${modelName} model not found. Please check your internet connection.`
          } else if (errorOutput.includes('401 Client Error')) {
            errorMessage = `Authentication error downloading ${modelName} model. Please check your internet connection and try again.`
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

  // ElevenLabs Sound Effects handler
  ipcMain.handle('elevenlabs:generate', async (_, prompt: string, duration: number | undefined, apiKey: string) => {
    try {
      const outputPath = join(app.getPath('temp'), `sfx-${Date.now()}.wav`)

      console.log('Starting ElevenLabs generation:', { prompt, duration })

      const result = await elevenlabsService.generateSoundEffect(
        { apiKey, defaultDuration: duration },
        { prompt, duration, outputPath }
      )

      console.log('ElevenLabs raw result:', result)

      if (result.success) {
        // Handle snake_case from Python (file_path, credits_used)
        const filePath = (result as any).file_path || result.filePath
        const creditsUsed = (result as any).credits_used || result.creditsUsed

        if (filePath) {
          console.log('ElevenLabs generation successful:', { filePath, duration: result.duration, creditsUsed })
          return {
            success: true,
            filePath,
            duration: result.duration,
            creditsUsed
          }
        }
      }

      throw new Error(result.error || 'Unknown error')
    } catch (error: any) {
      console.error('ElevenLabs generation error:', error)
      return {
        success: false,
        error: error.message || 'Failed to generate sound effect'
      }
    }
  })

  // ElevenLabs API key validation
  ipcMain.handle('elevenlabs:validateKey', async (_, apiKey: string) => {
    try {
      const isValid = await elevenlabsService.validateApiKey(apiKey)
      return { valid: isValid }
    } catch (error) {
      console.error('ElevenLabs key validation error:', error)
      return { valid: false }
    }
  })

  // ElevenLabs credits check
  ipcMain.handle('elevenlabs:getCredits', async (_, apiKey: string) => {
    try {
      const credits = await elevenlabsService.getRemainingCredits(apiKey)
      return { credits }
    } catch (error) {
      console.error('ElevenLabs credits check error:', error)
      return { credits: null }
    }
  })

  // Caption styling AI analysis handler
  ipcMain.handle('captions:analyze', async (_, transcriptionData: any) => {
    return new Promise(async (resolve, reject) => {
      try {
        const scriptName = 'caption_styler.py'
        const pythonScript = join(appRoot, 'python', scriptName)
        const pythonPath = getPythonPath()

        const timestamp = Date.now()
        const inputPath = join(app.getPath('temp'), `captions-input-${timestamp}.json`)
        const outputPath = join(app.getPath('temp'), `captions-output-${timestamp}.json`)

        // Write input data to temp file
        await fs.writeFile(inputPath, JSON.stringify(transcriptionData), 'utf-8')

        console.log('Analyzing captions with:', { pythonPath, pythonScript })

        const python = spawn(pythonPath, [
          pythonScript,
          '--input', inputPath,
          '--output', outputPath
        ], {
          cwd: pythonDir
        })

        let errorOutput = ''

        python.stderr.on('data', (data) => {
          errorOutput += data.toString()
          console.log('Caption analysis:', data.toString())
        })

        python.on('close', async (code) => {
          // Clean up input file
          try {
            await fs.unlink(inputPath)
          } catch (err) {
            console.warn('Failed to delete temp input file:', err)
          }

          if (code === 0) {
            try {
              const resultData = await fs.readFile(outputPath, 'utf-8')
              const result = JSON.parse(resultData)

              // Clean up output file
              await fs.unlink(outputPath)

              resolve(result)
            } catch (err) {
              console.error('Failed to read/parse caption analysis output:', err)
              reject(new Error(`Failed to parse caption analysis: ${err}`))
            }
          } else {
            console.error('Caption analysis failed:', errorOutput)
            reject(new Error(`Caption analysis failed with code ${code}: ${errorOutput}`))
          }
        })

        python.on('error', (err) => {
          console.error('Failed to spawn python for caption analysis:', err)
          reject(err)
        })
      } catch (error) {
        console.error('Caption analysis error:', error)
        reject(error)
      }
    })
  })

  // AI analysis handler (video understanding)
  ipcMain.handle('ai:analyzeVideo', async (_, videoPath: string, audioPath: string) => {
    return new Promise((resolve, reject) => {
      // Always use .py files (cross-version compatible)
      const scriptName = 'video_analyzer.py'
      const pythonScript = join(appRoot, 'python', scriptName)
      // Get Python executable path from .env or venv
      const pythonPath = getPythonPath()

      console.log('Analyzing video with:', { pythonPath, pythonScript, videoPath, audioPath })

      const python = spawn(pythonPath, [
        pythonScript,
        '--video', videoPath,
        '--audio', audioPath
      ], {
        cwd: pythonDir
      })

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

  // Unified video analysis handler (combines thumbnail + SFX analysis)
  ipcMain.handle('video:unifiedAnalyze', async (_, videoPath: string) => {
    return new Promise((resolve, reject) => {
      const scriptName = 'unified_analyzer.py'
      const pythonScript = join(appRoot, 'python', scriptName)
      const pythonPath = getPythonPath()

      const outputPath = join(app.getPath('temp'), `unified-analysis-${Date.now()}.json`)

      console.log('Running unified analysis:', { pythonPath, pythonScript, videoPath })

      const python = spawn(pythonPath, [
        pythonScript,
        '--video', videoPath,
        '--output', outputPath
      ], {
        cwd: join(appRoot, 'python')  // Set working directory to python folder for imports
      })

      let output = ''
      let errorOutput = ''

      python.stdout.on('data', (data) => {
        output += data.toString()
      })

      python.stderr.on('data', (data) => {
        errorOutput += data.toString()
        console.log('Unified analysis progress:', data.toString())
      })

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output)
            resolve(result)
          } catch (err) {
            console.error('Failed to parse unified analysis output:', output)
            reject(new Error(`Failed to parse unified analysis: ${err}`))
          }
        } else {
          console.error('Unified analysis failed:', errorOutput)
          reject(new Error(`Unified analysis failed with code ${code}: ${errorOutput}`))
        }
      })

      python.on('error', (err) => {
        console.error('Failed to spawn python for unified analysis:', err)
        reject(err)
      })
    })
  })

  // Timeline analysis handler - analyzes the entire timeline composition
  ipcMain.handle('timeline:analyze', async (_, composition: Array<{
    videoPath: string
    start: number
    duration: number
    clipStart: number
    clipEnd: number
  }>) => {
    return new Promise(async (resolve, reject) => {
      try {
        const tempDir = app.getPath('temp')
        const timestamp = Date.now()
        const concatListPath = join(tempDir, `timeline-concat-${timestamp}.txt`)
        const outputVideoPath = join(tempDir, `timeline-preview-${timestamp}.mp4`)

        console.log('Analyzing timeline composition:', { clips: composition.length })

        // Step 1: Create FFmpeg concat file
        // Format: file 'path' \n inpoint X \n outpoint Y \n duration Z
        const concatContent = composition.map((clip, index) => {
          // Escape single quotes in path for FFmpeg
          const escapedPath = clip.videoPath.replace(/'/g, "'\\''")
          const lines = [`file '${escapedPath}'`]

          // Add trim points if specified
          if (clip.clipStart > 0) {
            lines.push(`inpoint ${clip.clipStart}`)
          }
          if (clip.clipEnd > clip.clipStart) {
            lines.push(`outpoint ${clip.clipEnd}`)
          }

          return lines.join('\n')
        }).join('\n')

        // Write concat file
        await writeFile(concatListPath, concatContent, 'utf-8')
        console.log('Created concat file:', concatListPath)

        // Step 2: Concatenate videos using FFmpeg
        // Add silent audio if video has no audio stream
        console.log('Concatenating timeline clips...')
        const ffmpegConcat = spawn(getFFmpegPath(), [
          '-f', 'concat',
          '-safe', '0',
          '-i', concatListPath,
          '-f', 'lavfi',           // Add silent audio filter if needed
          '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
          '-vf', 'scale=-2:720',   // Downscale to 720p for faster analysis
          '-c:v', 'libx264',
          '-preset', 'ultrafast',  // Fast encoding for analysis
          '-crf', '28',            // Lower quality (faster encoding)
          '-c:a', 'aac',
          '-b:a', '128k',
          '-shortest',             // End when shortest input ends
          '-y',                    // Overwrite output
          outputVideoPath
        ])

        let ffmpegError = ''
        ffmpegConcat.stderr.on('data', (data) => {
          ffmpegError += data.toString()
        })

        await new Promise((resolve, reject) => {
          ffmpegConcat.on('close', (code) => {
            if (code === 0) {
              console.log('Timeline concatenation complete:', outputVideoPath)
              resolve(true)
            } else {
              console.error('FFmpeg concatenation failed:', ffmpegError)
              reject(new Error(`FFmpeg failed with code ${code}`))
            }
          })
          ffmpegConcat.on('error', reject)
        })

        // Step 3: Analyze the concatenated timeline video
        console.log('Analyzing concatenated timeline...')
        const scriptName = 'unified_analyzer.py'
        const pythonScript = join(appRoot, 'python', scriptName)
        const pythonPath = getPythonPath()

        const analysisOutputPath = join(tempDir, `timeline-analysis-${timestamp}.json`)

        const python = spawn(pythonPath, [
          pythonScript,
          '--video', outputVideoPath,
          '--output', analysisOutputPath
        ], {
          cwd: pythonDir
        })

        let pythonOutput = ''
        let pythonError = ''

        python.stdout.on('data', (data) => {
          pythonOutput += data.toString()
        })

        python.stderr.on('data', (data) => {
          pythonError += data.toString()
          console.log('Analysis progress:', data.toString().trim())
        })

        python.on('close', async (code) => {
          // Clean up temporary files
          try {
            await unlink(concatListPath)
            await unlink(outputVideoPath)
          } catch (err) {
            console.warn('Failed to clean up temp files:', err)
          }

          if (code === 0) {
            try {
              // Read analysis results
              const analysisData = await readFile(analysisOutputPath, 'utf-8')
              const analysis = JSON.parse(analysisData)

              // Clean up analysis file
              try {
                await unlink(analysisOutputPath)
              } catch (err) {
                console.warn('Failed to clean up analysis file:', err)
              }

              // Format response for Timeline component
              resolve({
                success: true,
                subtitles: analysis.transcription || [],
                suggestedSFX: analysis.sfx_suggestions || []
              })
            } catch (err) {
              console.error('Failed to parse analysis results:', err)
              reject(new Error(`Failed to parse analysis: ${err}`))
            }
          } else {
            console.error('Timeline analysis failed:', pythonError)
            reject(new Error(`Analysis failed with code ${code}: ${pythonError}`))
          }
        })

        python.on('error', (err) => {
          console.error('Failed to spawn python:', err)
          reject(err)
        })

      } catch (err) {
        console.error('Timeline analysis error:', err)
        reject(err)
      }
    })
  })

  // Thumbnail generation handlers
  ipcMain.handle('thumbnail:analyze', async (_, videoPath: string) => {
    return new Promise((resolve, reject) => {
      const pythonScript = join(appRoot, 'python', 'thumbnail_generator.py')
      const pythonPath = getPythonPath()

      const outputPath = join(app.getPath('temp'), `thumbnail-analysis-${Date.now()}.json`)

      console.log('Analyzing video for thumbnails:', { pythonPath, pythonScript, videoPath })

      const python = spawn(pythonPath, [
        pythonScript,
        '--mode', 'analyze',
        '--video', videoPath,
        '--output', outputPath,
        '--interval', '2',
        '--max-frames', '15'
      ], {
        cwd: pythonDir
      })

      let output = ''
      let errorOutput = ''

      python.stdout.on('data', (data) => {
        output += data.toString()
      })

      python.stderr.on('data', (data) => {
        errorOutput += data.toString()
        console.log('Thumbnail analysis:', data.toString())
      })

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output)
            resolve(result)
          } catch (err) {
            console.error('Failed to parse JSON:', output)
            reject(new Error(`Failed to parse thumbnail analysis results: ${err}`))
          }
        } else {
          console.error('Thumbnail analysis failed:', errorOutput)
          reject(new Error(`Thumbnail analysis failed with code ${code}: ${errorOutput}`))
        }
      })

      python.on('error', (err) => {
        console.error('Failed to spawn python for thumbnail analysis:', err)
        reject(err)
      })
    })
  })

  ipcMain.handle('thumbnail:extract', async (_, videoPath: string, timestamp: number) => {
    return new Promise((resolve, reject) => {
      const pythonScript = join(appRoot, 'python', 'thumbnail_generator.py')
      const pythonPath = getPythonPath()

      const outputPath = join(app.getPath('temp'), `thumbnail-frame-${Date.now()}.png`)

      console.log('Extracting thumbnail frame:', { videoPath, timestamp, outputPath })

      const python = spawn(pythonPath, [
        pythonScript,
        '--mode', 'extract',
        '--video', videoPath,
        '--timestamp', timestamp.toString(),
        '--output', outputPath
      ], {
        cwd: pythonDir
      })

      let output = ''
      let errorOutput = ''

      python.stdout.on('data', (data) => {
        output += data.toString()
      })

      python.stderr.on('data', (data) => {
        errorOutput += data.toString()
        console.log('Frame extraction:', data.toString())
      })

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output)
            resolve(result)
          } catch (err) {
            console.error('Failed to parse JSON:', output)
            reject(new Error(`Failed to parse frame extraction result: ${err}`))
          }
        } else {
          console.error('Frame extraction failed:', errorOutput)
          reject(new Error(`Frame extraction failed with code ${code}: ${errorOutput}`))
        }
      })

      python.on('error', (err) => {
        console.error('Failed to spawn python for frame extraction:', err)
        reject(err)
      })
    })
  })

  ipcMain.handle('thumbnail:generate', async (_, options: {
    videoPath: string
    timestamp: number
    text: string
    template: string
    background?: string
  }) => {
    return new Promise((resolve, reject) => {
      const pythonScript = join(appRoot, 'python', 'thumbnail_generator.py')
      const pythonPath = getPythonPath()

      const outputPath = join(app.getPath('temp'), `thumbnail-${Date.now()}.png`)

      console.log('Generating thumbnail:', { options, outputPath })

      const args = [
        pythonScript,
        '--mode', 'generate',
        '--video', options.videoPath,
        '--timestamp', options.timestamp.toString(),
        '--text', options.text,
        '--template', options.template,
        '--output', outputPath
      ]

      // Add background parameter if specified
      if (options.background) {
        args.push('--background', options.background)
      }

      const python = spawn(pythonPath, args, {
        cwd: pythonDir
      })

      let output = ''
      let errorOutput = ''

      python.stdout.on('data', (data) => {
        output += data.toString()
      })

      python.stderr.on('data', (data) => {
        errorOutput += data.toString()
        console.log('Thumbnail generation:', data.toString())
      })

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output)
            resolve(result)
          } catch (err) {
            console.error('Failed to parse JSON:', output)
            reject(new Error(`Failed to parse thumbnail generation result: ${err}`))
          }
        } else {
          console.error('Thumbnail generation failed:', errorOutput)
          reject(new Error(`Thumbnail generation failed with code ${code}: ${errorOutput}`))
        }
      })

      python.on('error', (err) => {
        console.error('Failed to spawn python for thumbnail generation:', err)
        reject(err)
      })
    })
  })

  // AI Caption Generation for thumbnails
  ipcMain.handle('thumbnail:generateCaptions', async (_, videoPath: string, timestamp: number) => {
    return new Promise((resolve, reject) => {
      const pythonScript = join(appRoot, 'python', 'caption_generator.py')
      const pythonPath = getPythonPath()

      const outputPath = join(app.getPath('temp'), `captions-${Date.now()}.json`)

      console.log('Generating AI captions:', { videoPath, timestamp, outputPath })

      const python = spawn(pythonPath, [
        pythonScript,
        '--video', videoPath,
        '--timestamp', timestamp.toString(),
        '--output', outputPath
      ], {
        cwd: pythonDir
      })

      let output = ''
      let errorOutput = ''

      python.stdout.on('data', (data) => {
        output += data.toString()
      })

      python.stderr.on('data', (data) => {
        errorOutput += data.toString()
        console.log('Caption generation:', data.toString())
      })

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output)
            resolve(result)
          } catch (err) {
            console.error('Failed to parse JSON:', output)
            // Fallback to default captions if parsing fails
            resolve({
              success: false,
              captions: ["WATCH THIS NOW", "MUST SEE", "YOU WON'T BELIEVE THIS"],
              error: `Failed to parse result: ${err}`
            })
          }
        } else {
          console.error('Caption generation failed:', errorOutput)
          // Provide fallback captions even on failure
          resolve({
            success: false,
            captions: ["WATCH THIS NOW", "MUST SEE", "YOU WON'T BELIEVE THIS"],
            error: `Caption generation failed with code ${code}`
          })
        }
      })

      python.on('error', (err) => {
        console.error('Failed to spawn python for caption generation:', err)
        // Provide fallback captions
        resolve({
          success: false,
          captions: ["WATCH THIS NOW", "MUST SEE", "YOU WON'T BELIEVE THIS"],
          error: err.message
        })
      })
    })
  })

  // Multi-Platform Export handler
  ipcMain.handle('thumbnail:multiExport', async (_, options: {
    sourcePath: string
    platforms: any[]
    outputDir: string
    baseFilename?: string
    format?: any
    smartCrop?: boolean
    preserveAspect?: boolean
  }) => {
    return new Promise((resolve, reject) => {
      const pythonScript = join(appRoot, 'python', 'multi_export.py')

      const args = [
        pythonScript,
        '--source', options.sourcePath,
        '--platforms', JSON.stringify(options.platforms),
        '--output-dir', options.outputDir
      ]

      if (options.baseFilename) {
        args.push('--base-filename', options.baseFilename)
      }
      if (options.format) {
        args.push('--format', JSON.stringify(options.format))
      }
      if (options.smartCrop !== undefined) {
        args.push('--smart-crop', options.smartCrop.toString())
      }
      if (options.preserveAspect !== undefined) {
        args.push('--preserve-aspect', options.preserveAspect.toString())
      }

      const python = spawn(pythonPath, args, {
        cwd: pythonDir
      })

      let stdoutData = ''
      let stderrData = ''

      python.stdout.on('data', (data) => {
        stdoutData += data.toString()
      })

      python.stderr.on('data', (data) => {
        stderrData += data.toString()
        console.log('Multi-export:', data.toString())
      })

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdoutData)
            resolve(result)
          } catch (e) {
            reject(new Error('Failed to parse multi-export result'))
          }
        } else {
          reject(new Error(stderrData || 'Multi-export failed'))
        }
      })

      python.on('error', (err) => {
        reject(err)
      })
    })
  })

  // Brand Kit Management handlers
  ipcMain.handle('brandkit:list', async () => {
    try {
      const pythonScript = join(appRoot, 'python', 'brandkit_cli.py')
      const pythonPath = getPythonPath()
      const result = await new Promise((resolve, reject) => {
        exec(`"${pythonPath}" "${pythonScript}" list`, (error, stdout, stderr) => {
          if (error) {
            console.error('Brand kit list error:', stderr)
            reject(new Error(stderr || error.message))
            return
          }
          try {
            const data = JSON.parse(stdout)
            resolve(data)
          } catch (e) {
            reject(new Error('Failed to parse brand kit list'))
          }
        })
      })
      return { success: true, brandKits: result }
    } catch (error: any) {
      console.error('Brand kit list error:', error)
      return { success: false, error: error.message, brandKits: [] }
    }
  })

  ipcMain.handle('brandkit:load', async (_, brandKitId: string) => {
    try {
      const pythonScript = join(appRoot, 'python', 'brandkit_cli.py')
      const pythonPath = getPythonPath()
      const result = await new Promise((resolve, reject) => {
        exec(`"${pythonPath}" "${pythonScript}" load "${brandKitId}"`, (error, stdout, stderr) => {
          if (error) {
            console.error('Brand kit load error:', stderr)
            reject(new Error(stderr || error.message))
            return
          }
          try {
            const data = JSON.parse(stdout)
            resolve(data)
          } catch (e) {
            reject(new Error('Failed to parse brand kit'))
          }
        })
      })
      return { success: true, brandKit: result }
    } catch (error: any) {
      console.error('Brand kit load error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('brandkit:save', async (_, brandKit: any) => {
    try {
      const pythonScript = join(appRoot, 'python', 'brandkit_cli.py')
      const pythonPath = getPythonPath()
      const brandKitJson = JSON.stringify(brandKit)
      const result = await new Promise((resolve, reject) => {
        exec(`"${pythonPath}" "${pythonScript}" save '${brandKitJson}'`, (error, stdout, stderr) => {
          if (error) {
            console.error('Brand kit save error:', stderr)
            reject(new Error(stderr || error.message))
            return
          }
          resolve(true)
        })
      })
      return { success: true }
    } catch (error: any) {
      console.error('Brand kit save error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('brandkit:delete', async (_, brandKitId: string) => {
    try {
      const pythonScript = join(appRoot, 'python', 'brandkit_cli.py')
      const pythonPath = getPythonPath()
      await new Promise((resolve, reject) => {
        exec(`"${pythonPath}" "${pythonScript}" delete "${brandKitId}"`, (error, stdout, stderr) => {
          if (error) {
            console.error('Brand kit delete error:', stderr)
            reject(new Error(stderr || error.message))
            return
          }
          resolve(true)
        })
      })
      return { success: true }
    } catch (error: any) {
      console.error('Brand kit delete error:', error)
      return { success: false, error: error.message }
    }
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
  ipcMain.handle('video:render', async (event, options: RenderOptions) => {
    return new Promise(async (resolve, reject) => {
      const { videoPath, outputPath, subtitles, sfxTracks, overlays } = options

      console.log('Starting video render:', { videoPath, outputPath })

      // Get video duration for progress calculation
      let videoDuration = 0
      try {
        const metadata = await getVideoMetadata(videoPath)
        videoDuration = parseFloat(metadata.format.duration)
      } catch (err) {
        console.error('Failed to get video metadata:', err)
      }

      // Build complex FFmpeg command with filters
      const ffmpegArgs = buildRenderCommand(videoPath, outputPath, {
        subtitles,
        sfxTracks,
        overlays
      })

      console.log('FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '))

      const ffmpeg = spawn(getFFmpegPath(), ffmpegArgs)

      let ffmpegOutput = ''

      // Parse FFmpeg progress output
      ffmpeg.stderr.on('data', (data: Buffer) => {
        const output = data.toString()
        ffmpegOutput += output

        // Parse progress from FFmpeg output
        // Example: frame=  123 fps= 25 q=28.0 size=    1024kB time=00:00:05.00 bitrate=1677.7kbits/s speed=1.2x
        const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/)
        if (timeMatch && videoDuration > 0) {
          const hours = parseInt(timeMatch[1])
          const minutes = parseInt(timeMatch[2])
          const seconds = parseFloat(timeMatch[3])
          const currentTime = hours * 3600 + minutes * 60 + seconds

          const progress = Math.min(100, (currentTime / videoDuration) * 100)

          // Send progress to renderer
          event.sender.send('render-progress', {
            progress: progress.toFixed(1),
            currentTime,
            totalTime: videoDuration
          })
        }

        // Also check for speed and ETA
        const speedMatch = output.match(/speed=\s*(\d+\.?\d*)x/)
        if (speedMatch) {
          const speed = parseFloat(speedMatch[1])
          event.sender.send('render-speed', { speed })
        }
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('Render completed successfully')
          event.sender.send('render-progress', { progress: 100 })
          resolve(outputPath)
        } else {
          console.error('Render failed with code:', code)
          console.error('FFmpeg output:', ffmpegOutput)
          reject(new Error(`Render failed with code ${code}. Check console for details.`))
        }
      })

      ffmpeg.on('error', (err) => {
        console.error('FFmpeg error:', err)
        reject(err)
      })
    })
  })

  // Helper function to get video metadata
  async function getVideoMetadata(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn(getFFprobePath(), [
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
  }

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

  // FreeSound API handlers (API key only - no OAuth)
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

  // Unsaved changes tracking
  ipcMain.handle('app:setUnsavedChanges', async (_, hasChanges: boolean) => {
    hasUnsavedChanges = hasChanges
    return true
  })

  ipcMain.handle('app:getUnsavedChanges', async () => {
    return hasUnsavedChanges
  })

  // SFX Library handlers
  ipcMain.handle('sfxLibrary:load', async () => {
    try {
      const libraryPath = join(appRoot, 'sfx_library', 'library_metadata.json')

      // Import synchronous fs functions
      const fsSync = require('fs')

      if (!fsSync.existsSync(libraryPath)) {
        return {
          success: false,
          error: 'SFX library not found. Please run the library generation script first.'
        }
      }

      const metadata = JSON.parse(fsSync.readFileSync(libraryPath, 'utf-8'))

      return {
        success: true,
        metadata
      }
    } catch (error: any) {
      console.error('Error loading SFX library:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  ipcMain.handle('sfxLibrary:getPath', async (_, relativePath: string) => {
    try {
      const absolutePath = join(appRoot, relativePath)

      // Import synchronous fs functions
      const fsSync = require('fs')

      if (!fsSync.existsSync(absolutePath)) {
        return {
          success: false,
          error: 'Sound file not found'
        }
      }

      return {
        success: true,
        path: absolutePath
      }
    } catch (error: any) {
      console.error('Error getting SFX path:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  ipcMain.handle('sfxLibrary:copyToProject', async (_, libraryPath: string, projectPath: string) => {
    try {
      // Get source path from library
      const sourcePath = join(__dirname, '..', libraryPath)

      // Import synchronous fs functions
      const fsSync = require('fs')

      if (!fsSync.existsSync(sourcePath)) {
        return {
          success: false,
          error: 'Source sound file not found'
        }
      }

      // Create assets/sfx directory in project if it doesn't exist
      const projectDir = dirname(projectPath)
      const sfxDir = join(projectDir, 'assets', 'sfx')

      if (!fsSync.existsSync(sfxDir)) {
        fsSync.mkdirSync(sfxDir, { recursive: true })
      }

      // Copy file to project with unique name
      const fileName = basename(libraryPath)
      const timestamp = Date.now()
      const outputFileName = `library-${timestamp}-${fileName}`
      const outputPath = join(sfxDir, outputFileName)

      fsSync.copyFileSync(sourcePath, outputPath)

      // Return absolute path for playback
      return {
        success: true,
        projectPath: outputPath
      }
    } catch (error: any) {
      console.error('Error copying SFX to project:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  // Animation Library handlers
  ipcMain.handle('animationLibrary:load', async () => {
    try {
      const libraryPath = join(__dirname, '..', 'animation_library', 'animation_library_metadata.json')

      // Import synchronous fs functions
      const fsSync = require('fs')

      if (!fsSync.existsSync(libraryPath)) {
        return {
          success: false,
          error: 'Animation library not found. Please run the download script first.'
        }
      }

      const metadata = JSON.parse(fsSync.readFileSync(libraryPath, 'utf-8'))

      return {
        success: true,
        metadata
      }
    } catch (error: any) {
      console.error('Error loading animation library:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  ipcMain.handle('animationLibrary:getAnimation', async (_, category: string, filename: string) => {
    try {
      const animationPath = join(__dirname, '..', 'animation_library', category, filename)

      // Import synchronous fs functions
      const fsSync = require('fs')

      if (!fsSync.existsSync(animationPath)) {
        return {
          success: false,
          error: 'Animation file not found'
        }
      }

      const animationData = JSON.parse(fsSync.readFileSync(animationPath, 'utf-8'))

      return {
        success: true,
        data: animationData,
        path: animationPath
      }
    } catch (error: any) {
      console.error('Error loading animation:', error)
      return {
        success: false,
        error: error.message
      }
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
  let inputIndex = 1

  // Add SFX tracks as additional inputs
  const sfxInputs: Array<{ index: number; start: number; path: string }> = []
  options.sfxTracks?.forEach(sfx => {
    args.push('-i', sfx.path)
    sfxInputs.push({ index: inputIndex, start: sfx.start, path: sfx.path })
    inputIndex++
  })

  // Add media overlay inputs (images/videos)
  const overlayInputs: Array<{ index: number; overlay: any }> = []
  options.overlays?.forEach(overlay => {
    if (overlay.mediaPath) {
      args.push('-i', overlay.mediaPath)
      overlayInputs.push({ index: inputIndex, overlay })
      inputIndex++
    }
  })

  // Build filter complex for video, subtitles, overlays, and audio mixing
  const filters: string[] = []
  let videoLabel = '[0:v]'

  // 1. Burn subtitles into video
  if (options.subtitles && options.subtitles.length > 0) {
    const subtitleFilter = buildSubtitleFilter(options.subtitles)
    filters.push(`${videoLabel}${subtitleFilter}[v_sub]`)
    videoLabel = '[v_sub]'
  }

  // 2. Apply media overlays (images/videos with transforms)
  if (overlayInputs.length > 0) {
    overlayInputs.forEach((input, idx) => {
      const overlay = input.overlay
      const overlayFilter = buildOverlayFilter(input.index, overlay)
      const outputLabel = idx === overlayInputs.length - 1 ? '[vout]' : `[v_overlay_${idx}]`
      filters.push(`${videoLabel}[${input.index}:v]${overlayFilter}${outputLabel}`)
      videoLabel = outputLabel
    })
  } else {
    // No overlays, just pass through the video stream
    if (videoLabel !== '[0:v]') {
      filters.push(`${videoLabel}null[vout]`)
    } else {
      videoLabel = '[vout]'
      filters.push(`[0:v]null[vout]`)
    }
  }

  // 3. Mix audio tracks (original + SFX with timing)
  if (sfxInputs.length > 0) {
    const audioFilter = buildAudioMixFilter(sfxInputs)
    filters.push(`${audioFilter}[aout]`)
  } else {
    // No SFX, just pass through original audio
    filters.push('[0:a]anull[aout]')
  }

  // Apply all filters
  if (filters.length > 0) {
    args.push('-filter_complex', filters.join(';'))
    args.push('-map', '[vout]')
    args.push('-map', '[aout]')
  } else {
    // No filters, just copy streams
    args.push('-map', '0:v')
    args.push('-map', '0:a')
  }

  // Output encoding settings
  args.push(
    '-c:v', 'libx264',      // H.264 video codec
    '-preset', 'medium',     // Encoding speed/quality balance
    '-crf', '23',            // Quality (lower = better, 18-28 range)
    '-c:a', 'aac',           // AAC audio codec
    '-b:a', '192k',          // Audio bitrate
    '-movflags', '+faststart', // Enable streaming
    '-y',                    // Overwrite output file
    outputPath
  )

  return args
}

// Build subtitle filter (burn subtitles into video)
function buildSubtitleFilter(subtitles: Array<{ text: string; start: number; end: number; style?: any; words?: any[]; emphasisColor?: string; animation?: any }>): string {
  // Escape text for FFmpeg drawtext filter
  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/:/g, '\\:')
      .replace(/\n/g, '\\n')
  }

  // Build drawtext filter for each subtitle with enable condition
  const drawTextFilters = subtitles.map((sub, idx) => {
    const style = sub.style || {}
    const fontSize = style.fontSize || 24
    const fontColor = style.color || 'white'
    const borderColor = style.borderColor || 'black'
    const borderWidth = style.borderWidth || 2

    // Check if subtitle has word-level data for AI styling
    if (sub.words && sub.words.length > 0 && sub.animation?.type) {
      const animationType = sub.animation.type
      const animDuration = (sub.animation.duration || 150) / 1000  // Convert ms to seconds

      const baseX = style.position === 'top' ? '(w-text_w)/2' :
                    style.position === 'center' ? '(w-text_w)/2' :
                    '(w-text_w)/2'

      const baseY = style.position === 'top' ? '50' :
                    style.position === 'center' ? '(h-text_h)/2' :
                    'h-th-50'

      // Create word-by-word filters with chosen animation
      return sub.words.map((word: any, wordIdx: number) => {
        const escapedWord = escapeText(word.text)
        const wordColor = word.emphasized && sub.emphasisColor ? sub.emphasisColor : fontColor
        const wordSize = word.emphasized ? Math.round(fontSize * 1.1) : fontSize
        const wordOffset = wordIdx * fontSize * 0.6

        const wordStart = word.start
        const wordEnd = word.end
        const wordDuration = wordEnd - wordStart

        if (animationType === 'karaoke') {
          // Karaoke: Simple reveal during word time
          return `drawtext=text='${escapedWord}':fontsize=${wordSize}:fontcolor=${wordColor}:bordercolor=${borderColor}:borderw=${borderWidth}:x=${baseX}+${wordOffset}:y=${baseY}:enable='between(t,${wordStart},${wordEnd})'`

        } else if (animationType === 'pop') {
          // Pop: Scale from 0 to full size at start of word, then stay visible
          // Use alpha fade-in combined with word timing
          const fadeStart = wordStart
          const fadeEnd = wordStart + Math.min(animDuration, wordDuration)

          return `drawtext=text='${escapedWord}':fontsize=${wordSize}:fontcolor=${wordColor}:bordercolor=${borderColor}:borderw=${borderWidth}:x=${baseX}+${wordOffset}:y=${baseY}:alpha='if(lt(t,${fadeStart}),0,if(lt(t,${fadeEnd}),(t-${fadeStart})/${animDuration},if(lt(t,${wordEnd}),1,0)))'`

        } else if (animationType === 'slide') {
          // Slide: Slide in from bottom, then stay visible
          const slideStart = wordStart
          const slideEnd = wordStart + Math.min(animDuration, wordDuration)
          const slideDistance = 50  // pixels to slide

          return `drawtext=text='${escapedWord}':fontsize=${wordSize}:fontcolor=${wordColor}:bordercolor=${borderColor}:borderw=${borderWidth}:x=${baseX}+${wordOffset}:y='if(lt(t,${slideStart}),${baseY}+${slideDistance},if(lt(t,${slideEnd}),${baseY}+${slideDistance}*(1-(t-${slideStart})/${animDuration}),${baseY}))':alpha='if(lt(t,${wordStart}),0,if(lt(t,${wordEnd}),1,0))'`

        } else {
          // Fallback: no animation
          return `drawtext=text='${escapedWord}':fontsize=${wordSize}:fontcolor=${wordColor}:bordercolor=${borderColor}:borderw=${borderWidth}:x=${baseX}+${wordOffset}:y=${baseY}:enable='between(t,${wordStart},${wordEnd})'`
        }
      }).join(',')
    } else if (sub.words && sub.words.length > 0) {
      // Static rendering with emphasis colors (no animation)
      // Build full text with emphasis markers for FFmpeg
      const fullText = sub.words.map((word: any) => word.text).join(' ')
      const escapedText = escapeText(fullText)

      // For now, render as single text block
      // TODO: Advanced implementation would render each emphasized word separately
      const x = style.x !== undefined ? style.x : '(w-text_w)/2'
      const y = style.y !== undefined ? style.y : 'h-th-50'

      return `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${fontColor}:bordercolor=${borderColor}:borderw=${borderWidth}:x=${x}:y=${y}:enable='between(t,${sub.start},${sub.end})'`
    } else {
      // Standard subtitle (no AI styling)
      const escapedText = escapeText(sub.text)
      const fontFile = style.fontFamily ? `fontfile='${style.fontFamily}'` : ''

      // Position (default: bottom center)
      const x = style.x !== undefined ? style.x : '(w-text_w)/2'
      const y = style.y !== undefined ? style.y : 'h-th-50'

      return `drawtext=${fontFile ? fontFile + ':' : ''}text='${escapedText}':fontsize=${fontSize}:fontcolor=${fontColor}:bordercolor=${borderColor}:borderw=${borderWidth}:x=${x}:y=${y}:enable='between(t,${sub.start},${sub.end})'`
    }
  }).join(',')

  return drawTextFilters
}

// Build overlay filter for media overlays (images/videos)
function buildOverlayFilter(overlayInputIndex: number, overlay: any): string {
  const x = overlay.x || 0
  const y = overlay.y || 0
  const width = overlay.width || -1  // -1 means keep aspect ratio
  const height = overlay.height || -1
  const opacity = overlay.opacity !== undefined ? overlay.opacity : 1
  const start = overlay.start || 0
  const end = overlay.end || 999999

  // Scale and position overlay
  let filter = `[${overlayInputIndex}:v]`

  // Apply transforms (scale, opacity)
  if (width !== -1 || height !== -1) {
    filter += `scale=${width}:${height},`
  }

  if (opacity < 1) {
    filter += `format=yuva420p,colorchannelmixer=aa=${opacity},`
  }

  // Apply rotation if specified
  if (overlay.rotation) {
    filter += `rotate=${overlay.rotation * Math.PI / 180}:c=none,`
  }

  // Remove trailing comma
  filter = filter.replace(/,$/, '')
  filter += `[ovr];`

  // Overlay onto main video with timing
  return `[ovr]overlay=x=${x}:y=${y}:enable='between(t,${start},${end})'`
}

// Build audio mix filter with timing (delayed audio for SFX)
function buildAudioMixFilter(sfxInputs: Array<{ index: number; start: number; path: string }>): string {
  // Delay each SFX track to match its start time
  const delayedTracks = sfxInputs.map((sfx, idx) => {
    const delayMs = Math.floor(sfx.start * 1000)
    return `[${sfx.index}:a]adelay=${delayMs}|${delayMs}[sfx${idx}]`
  })

  // Mix all tracks together
  const mixInputs = ['[0:a]', ...sfxInputs.map((_, idx) => `[sfx${idx}]`)].join('')
  const mixFilter = `${mixInputs}amix=inputs=${sfxInputs.length + 1}:duration=longest:dropout_transition=2`

  return delayedTracks.join(';') + ';' + mixFilter
}
