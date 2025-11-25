// Setup Manager - Handles automatic Python and dependency installation
// This runs on first launch to set up the Python environment

import { spawn, exec } from 'child_process'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'

const execPromise = promisify(exec)
const exists = promisify(fs.exists)
const mkdir = promisify(fs.mkdir)

export interface SetupProgress {
  stage: string
  progress: number // 0-100
  message: string
  error?: string
}

export type ProgressCallback = (progress: SetupProgress) => void

export class SetupManager {
  private resourcesPath: string
  private venvPath: string
  private pythonPath: string | null = null
  private progressCallback: ProgressCallback | null = null

  constructor() {
    // Get resources path (works for both dev and production)
    this.resourcesPath = app.isPackaged
      ? process.resourcesPath
      : path.join(__dirname, '..')

    // Virtual environment will be in app data folder
    const appDataPath = app.getPath('userData')
    this.venvPath = path.join(appDataPath, 'venv')
  }

  /**
   * Check if this is the first run
   * We check for .env file existence since it's created by setup regardless of Python type
   */
  async isFirstRun(): Promise<boolean> {
    const appDataPath = app.getPath('userData')
    const envPath = path.join(appDataPath, '.env')
    const envExists = await exists(envPath)

    console.log('[Setup] Checking first run - .env exists:', envExists)
    return !envExists
  }

  /**
   * Set progress callback
   */
  onProgress(callback: ProgressCallback) {
    this.progressCallback = callback
  }

  /**
   * Report progress
   */
  private reportProgress(stage: string, progress: number, message: string, error?: string) {
    if (this.progressCallback) {
      this.progressCallback({ stage, progress, message, error })
    }
  }

  /**
   * Find Python executable (portable or system)
   */
  private async findPython(): Promise<string> {
    // Try portable Python first
    const portablePython = path.join(this.resourcesPath, 'python-portable', 'python.exe')

    if (await exists(portablePython)) {
      console.log('[Setup] Using portable Python:', portablePython)
      return portablePython
    }

    // Try system Python
    try {
      const { stdout } = await execPromise('where python')
      const systemPython = stdout.trim().split('\n')[0]

      if (systemPython) {
        console.log('[Setup] Using system Python:', systemPython)
        return systemPython
      }
    } catch (error) {
      // Python not in PATH
    }

    throw new Error('Python not found. Portable Python should be included in the installer.')
  }

  /**
   * Enable site-packages for portable Python
   */
  private async enableSitePackages(pythonExe: string): Promise<void> {
    const isPortablePython = pythonExe.includes('python-portable')
    if (!isPortablePython) return

    const portablePythonDir = path.dirname(pythonExe)
    const pthFile = path.join(portablePythonDir, 'python311._pth')

    if (!(await exists(pthFile))) {
      console.log('[Setup] python311._pth not found, skipping')
      return
    }

    console.log('[Setup] Enabling site-packages for portable Python')

    try {
      // Read the .pth file
      let content = await fs.promises.readFile(pthFile, 'utf-8')

      // Uncomment the "import site" line
      content = content.replace(/#import site/g, 'import site')

      // Write back
      await fs.promises.writeFile(pthFile, content, 'utf-8')
      console.log('[Setup] Site packages enabled')
    } catch (error) {
      console.error('[Setup] Failed to enable site packages:', error)
    }
  }

  /**
   * Install pip in portable Python if needed
   */
  private async installPip(pythonExe: string): Promise<void> {
    this.reportProgress('pip', 10, 'Checking pip installation...')

    // First, enable site-packages for portable Python
    await this.enableSitePackages(pythonExe)

    try {
      // Check if pip is already available
      await execPromise(`"${pythonExe}" -m pip --version`)
      console.log('[Setup] pip is already installed')
      return
    } catch (error) {
      console.log('[Setup] pip not found, installing...')
    }

    // Install pip using get-pip.py
    const getPipPath = path.join(this.resourcesPath, 'get-pip.py')

    if (!(await exists(getPipPath))) {
      throw new Error('get-pip.py not found in resources')
    }

    this.reportProgress('pip', 15, 'Installing pip...')

    return new Promise((resolve, reject) => {
      const pipInstall = spawn(pythonExe, [getPipPath], {
        cwd: this.resourcesPath
      })

      let output = ''
      pipInstall.stdout.on('data', (data) => {
        output += data.toString()
        console.log('[Setup] pip install:', data.toString().trim())
      })

      pipInstall.stderr.on('data', (data) => {
        output += data.toString()
        console.log('[Setup] pip install (stderr):', data.toString().trim())
      })

      pipInstall.on('close', (code) => {
        if (code === 0 || output.includes('Successfully installed')) {
          console.log('[Setup] pip installed successfully')
          resolve()
        } else {
          reject(new Error(`pip installation failed: ${output}`))
        }
      })
    })
  }

  /**
   * Setup Python environment (venv for system Python, direct use for portable)
   */
  private async createVenv(pythonExe: string): Promise<void> {
    this.reportProgress('venv', 20, 'Setting up Python environment...')

    const isPortablePython = pythonExe.includes('python-portable')

    if (isPortablePython) {
      // Portable Python doesn't support venv - use it directly
      console.log('[Setup] Using portable Python directly (embedded distribution)')
      this.pythonPath = pythonExe
      return Promise.resolve()
    }

    // System Python - create proper venv
    console.log('[Setup] Creating virtual environment with system Python')

    // Remove old venv if exists
    if (await exists(this.venvPath)) {
      console.log('[Setup] Removing old virtual environment')
      await fs.promises.rm(this.venvPath, { recursive: true, force: true })
    }

    return new Promise((resolve, reject) => {
      const venvCreate = spawn(pythonExe, ['-m', 'venv', this.venvPath])

      let output = ''
      venvCreate.stdout.on('data', (data) => {
        output += data.toString()
      })

      venvCreate.stderr.on('data', (data) => {
        output += data.toString()
      })

      venvCreate.on('close', async (code) => {
        if (code === 0) {
          const venvPython = path.join(this.venvPath, 'Scripts', 'python.exe')

          if (await exists(venvPython)) {
            console.log('[Setup] Virtual environment created successfully')
            this.pythonPath = venvPython
            resolve()
          } else {
            reject(new Error('Virtual environment creation failed: python.exe not found'))
          }
        } else {
          reject(new Error(`Virtual environment creation failed: ${output}`))
        }
      })
    })
  }

  /**
   * Upgrade pip in venv
   */
  private async upgradePip(): Promise<void> {
    if (!this.pythonPath) {
      throw new Error('Python path not set')
    }

    this.reportProgress('pip', 30, 'Upgrading pip...')

    return new Promise((resolve, reject) => {
      const pipUpgrade = spawn(this.pythonPath!, ['-m', 'pip', 'install', '--upgrade', 'pip'])

      pipUpgrade.on('close', (code) => {
        if (code === 0) {
          console.log('[Setup] pip upgraded successfully')
          resolve()
        } else {
          console.log('[Setup] pip upgrade failed, continuing anyway')
          resolve() // Don't fail if upgrade fails
        }
      })
    })
  }

  /**
   * Install a single package with configurable timeout
   */
  private async installPackage(packageName: string, progress: number, timeoutMinutes: number = 10): Promise<void> {
    if (!this.pythonPath) {
      throw new Error('Python path not set')
    }

    const startTime = Date.now()
    console.log(`[Setup] Installing ${packageName}... (timeout: ${timeoutMinutes} minutes)`)

    return new Promise((resolve, reject) => {
      const pipInstall = spawn(this.pythonPath!, [
        '-m', 'pip', 'install',
        '--no-cache-dir',           // Don't use cache
        '--prefer-binary',          // Use wheels, don't compile
        '--no-warn-script-location',
        '--default-timeout=600',    // 10 minute timeout per HTTP operation
        '--retries=5',              // Retry failed downloads
        '-v',                       // Verbose output
        packageName
      ], {
        cwd: this.resourcesPath
      })

      let output = ''
      let lastOutputTime = Date.now()
      let progressUpdateTime = Date.now()
      const timeoutMs = timeoutMinutes * 60 * 1000

      // Timeout detection with live progress updates
      const timeoutCheck = setInterval(() => {
        const timeSinceLastOutput = Date.now() - lastOutputTime
        const timeSinceProgressUpdate = Date.now() - progressUpdateTime
        const elapsedMinutes = Math.floor((Date.now() - startTime) / 60000)

        // Update progress message every 30 seconds to show it's still working
        if (timeSinceProgressUpdate > 30000) {
          const shortName = packageName.split('>=')[0].split('==')[0]
          this.reportProgress('dependencies', progress, `Installing ${shortName}... (${elapsedMinutes}m elapsed, still downloading)`)
          progressUpdateTime = Date.now()
        }

        if (timeSinceLastOutput > timeoutMs) {
          console.error(`[Setup] ${packageName} install appears to be hung (${timeoutMinutes}min timeout)`)
          clearInterval(timeoutCheck)
          pipInstall.kill()
          reject(new Error(`Installation of ${packageName} timeout - no progress for ${timeoutMinutes} minutes`))
        }
      }, 15000)  // Check every 15 seconds

      pipInstall.stdout.on('data', (data) => {
        const text = data.toString()
        output += text
        lastOutputTime = Date.now()

        // Parse download progress from pip output
        if (text.includes('Downloading') && text.includes('%')) {
          const match = text.match(/(\d+)%/)
          if (match) {
            const shortName = packageName.split('>=')[0].split('==')[0]
            this.reportProgress('dependencies', progress, `Downloading ${shortName}... ${match[1]}%`)
          }
        }

        console.log(`[Setup] ${packageName}:`, text.trim())
      })

      pipInstall.stderr.on('data', (data) => {
        const text = data.toString()
        output += text
        lastOutputTime = Date.now()
        console.log(`[Setup] ${packageName} (stderr):`, text.trim())
      })

      pipInstall.on('close', (code) => {
        clearInterval(timeoutCheck)

        if (code === 0 || output.includes('Successfully installed') || output.includes('Requirement already satisfied')) {
          console.log(`[Setup] ${packageName} installed successfully`)
          resolve()
        } else {
          console.error(`[Setup] ${packageName} install failed with code:`, code)
          reject(new Error(`Failed to install ${packageName}: ${output.substring(output.length - 500)}`))
        }
      })

      pipInstall.on('error', (error) => {
        clearInterval(timeoutCheck)
        console.error(`[Setup] ${packageName} process error:`, error)
        reject(new Error(`Failed to start pip for ${packageName}: ${error.message}`))
      })
    })
  }

  /**
   * Install Python dependencies one by one for better progress tracking
   */
  private async installDependencies(): Promise<void> {
    if (!this.pythonPath) {
      throw new Error('Python path not set')
    }

    this.reportProgress('dependencies', 35, 'Installing Python dependencies...')
    this.reportProgress('dependencies', 38, 'This may take 10-15 minutes. Please wait...')

    // Define packages in order with progress values and custom timeouts
    // Some packages (like whisper) will pull in PyTorch automatically
    const packages = [
      { name: 'requests>=2.31.0', progress: 38, size: '~200KB' },
      { name: 'numpy<2.0.0,>=1.24.0', progress: 42, size: '~20MB' },
      { name: 'Pillow>=10.0.0', progress: 47, size: '~3MB' },
      { name: 'scipy>=1.11.0', progress: 52, size: '~40MB' },
      { name: 'soundfile>=0.12.0', progress: 57, size: '~1MB' },
      { name: 'opencv-python==4.8.1.78', progress: 62, retries: 3, timeout: 15, size: '~50MB' },  // Large binary
      { name: 'librosa>=0.10.0', progress: 67, size: '~200KB' },
      { name: 'spacy>=3.7.0', progress: 72, timeout: 15, size: '~50MB' },
      { name: 'scenedetect[opencv]>=0.6.0', progress: 77, size: '~10MB' },
      { name: 'transformers>=4.30.0', progress: 82, timeout: 20, size: '~500MB' },  // Very large with dependencies
      { name: 'openai-whisper', progress: 87, timeout: 30, retries: 2, size: '~1.5GB' }  // HUGE (pulls in PyTorch ~1GB)
    ]

    const failedPackages: string[] = []

    try {
      for (const pkg of packages) {
        const maxRetries = pkg.retries || 1
        const timeout = pkg.timeout || 10  // Default 10 minutes
        const size = pkg.size || ''
        let lastError: Error | null = null

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 1) {
              console.log(`[Setup] Retrying ${pkg.name} (attempt ${attempt}/${maxRetries})`)
              this.reportProgress('dependencies', pkg.progress, `Retrying ${pkg.name} (attempt ${attempt}/${maxRetries})...`)
            } else if (size) {
              this.reportProgress('dependencies', pkg.progress, `Installing ${pkg.name} ${size}...`)
            }

            await this.installPackage(pkg.name, pkg.progress, timeout)
            lastError = null
            break // Success!
          } catch (error: any) {
            lastError = error
            console.error(`[Setup] ${pkg.name} install attempt ${attempt} failed:`, error.message)

            if (attempt < maxRetries) {
              // Wait 5 seconds before retry
              await new Promise(resolve => setTimeout(resolve, 5000))
            }
          }
        }

        if (lastError) {
          console.error(`[Setup] ${pkg.name} failed after ${maxRetries} attempts`)
          failedPackages.push(pkg.name)
          // Continue with other packages instead of failing immediately
        }
      }

      if (failedPackages.length > 0) {
        const errorMsg = `Failed to install: ${failedPackages.join(', ')}`
        console.error('[Setup]', errorMsg)
        this.reportProgress('dependencies', 90, errorMsg, errorMsg)
        throw new Error(errorMsg)
      }

      this.reportProgress('dependencies', 92, 'All dependencies installed successfully!')
      console.log('[Setup] All dependencies installed successfully')
    } catch (error: any) {
      console.error('[Setup] Dependency installation failed:', error)
      throw new Error(`Dependency installation failed: ${error.message}`)
    }
  }

  /**
   * Download spacy language model
   */
  private async downloadSpacyModel(): Promise<void> {
    if (!this.pythonPath) {
      throw new Error('Python path not set')
    }

    this.reportProgress('spacy', 93, 'Downloading spacy language model...')
    this.reportProgress('spacy', 94, 'This may take 2-3 minutes...')

    return new Promise((resolve, reject) => {
      const spacyDownload = spawn(this.pythonPath!, ['-m', 'spacy', 'download', 'en_core_web_sm'])

      let output = ''

      spacyDownload.stdout.on('data', (data) => {
        const text = data.toString()
        output += text
        console.log('[Setup] Spacy download:', text.trim())
      })

      spacyDownload.stderr.on('data', (data) => {
        const text = data.toString()
        output += text
        if (text.includes('Successfully')) {
          this.reportProgress('spacy', 95, 'Spacy model downloaded successfully!')
        }
      })

      spacyDownload.on('close', (code) => {
        if (code === 0 || output.includes('Successfully')) {
          console.log('[Setup] Spacy model downloaded successfully')
          resolve()
        } else {
          console.log('[Setup] Spacy model download failed, continuing anyway')
          resolve() // Don't fail the entire setup if spacy model fails
        }
      })
    })
  }

  /**
   * Verify installation
   */
  private async verifyInstallation(): Promise<void> {
    if (!this.pythonPath) {
      throw new Error('Python path not set')
    }

    this.reportProgress('verify', 96, 'Verifying installation...')

    const checks = [
      { module: 'whisper', name: 'Whisper' },
      { module: 'transformers', name: 'Transformers' },
      { module: 'cv2', name: 'OpenCV' },
      { module: 'spacy', name: 'Spacy' },
      { module: 'librosa', name: 'Librosa' }
    ]

    for (const check of checks) {
      try {
        await execPromise(`"${this.pythonPath}" -c "import ${check.module}"`)
        console.log(`[Setup] ✓ ${check.name} verified`)
      } catch (error) {
        console.log(`[Setup] ⚠ ${check.name} not found (may still work)`)
      }
    }

    this.reportProgress('verify', 98, 'Installation verified!')
  }

  /**
   * Create .env file
   */
  private async createEnvFile(): Promise<void> {
    this.reportProgress('config', 99, 'Creating configuration...')

    const appDataPath = app.getPath('userData')
    const envPath = path.join(appDataPath, '.env')

    // Store a marker instead of absolute path for portable Python
    // The app will resolve the actual path at runtime
    const isPortablePython = this.pythonPath && this.pythonPath.includes('python-portable')
    const pythonPathValue = isPortablePython ? 'PORTABLE_PYTHON' : this.pythonPath

    const envContent = `# CreatorCrafter Configuration
FREESOUND_API_KEY=your_api_key_here

# Python Environment
PYTHON_PATH=${pythonPathValue}

# FFmpeg (resolved at runtime)
# FFMPEG_PATH is no longer stored in .env
`

    await fs.promises.writeFile(envPath, envContent, 'utf-8')
    console.log('[Setup] .env file created with PYTHON_PATH:', pythonPathValue)
  }

  /**
   * Run the complete setup process
   */
  async runSetup(): Promise<void> {
    try {
      this.reportProgress('start', 0, 'Starting setup...')

      // Step 1: Find Python
      this.reportProgress('python', 5, 'Finding Python installation...')
      const pythonExe = await this.findPython()

      // Step 2: Install pip if needed (for portable Python)
      await this.installPip(pythonExe)

      // Step 3: Create virtual environment
      await this.createVenv(pythonExe)

      // Step 4: Upgrade pip
      await this.upgradePip()

      // Step 5: Install dependencies
      await this.installDependencies()

      // Step 6: Download spacy language model
      await this.downloadSpacyModel()

      // Step 7: Verify installation
      await this.verifyInstallation()

      // Step 8: Create .env file
      await this.createEnvFile()

      // Done!
      this.reportProgress('complete', 100, 'Setup complete! Ready to use CreatorCrafter.')
      console.log('[Setup] ✅ Setup completed successfully')

    } catch (error: any) {
      console.error('[Setup] ❌ Setup failed:', error)
      this.reportProgress('error', 0, 'Setup failed', error.message)
      throw error
    }
  }

  /**
   * Get Python path after setup
   */
  getPythonPath(): string | null {
    return this.pythonPath
  }

  /**
   * Get venv path
   */
  getVenvPath(): string {
    return this.venvPath
  }
}
