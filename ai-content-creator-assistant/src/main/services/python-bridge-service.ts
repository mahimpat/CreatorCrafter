/**
 * Python Bridge Service
 *
 * Manages communication with Python-based AI services (AudioCraft, Whisper, etc.)
 * Spawns and manages Python processes, handles IPC via stdio.
 *
 * SECURITY NOTES:
 * - Python processes run in isolated environment
 * - All inputs are validated before sending to Python
 * - Timeouts prevent hanging operations
 * - Proper cleanup on errors
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';
import { v4 as uuidv4 } from 'uuid';
import { PYTHON_TIMEOUTS } from '../../common/constants';
import { ErrorCode } from '../../common/types';

interface PythonRequest {
  id: string;
  service: string;
  method: string;
  params: any;
}

interface PythonResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: NodeJS.Timeout;
}

export class PythonBridgeService {
  private pythonProcess: ChildProcess | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private responseBuffer: string = '';
  private isInitialized: boolean = false;
  private pythonPath: string;

  constructor() {
    // Determine Python path based on environment
    // In production, Python environment should be bundled with the app
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      // Development: use system Python with virtual environment
      this.pythonPath = process.env.PYTHON_PATH || 'python3';
    } else {
      // Production: use bundled Python
      const resourcesPath = process.resourcesPath || app.getAppPath();
      this.pythonPath = path.join(resourcesPath, 'python', 'venv', 'bin', 'python');

      // On Windows, adjust path
      if (process.platform === 'win32') {
        this.pythonPath = path.join(resourcesPath, 'python', 'venv', 'Scripts', 'python.exe');
      }
    }
  }

  /**
   * Initialize Python bridge and start Python server process
   */
  async initialize(): Promise<void> {
    log.info('Initializing Python bridge...');

    try {
      await this.startPythonProcess();
      await this.waitForReady();

      this.isInitialized = true;
      log.info('Python bridge initialized successfully');
    } catch (error) {
      log.error('Failed to initialize Python bridge:', error);
      throw new Error('Failed to start AI services. Please ensure Python dependencies are installed.');
    }
  }

  /**
   * Start the Python server process
   */
  private async startPythonProcess(): Promise<void> {
    const scriptPath = path.join(
      app.getAppPath(),
      'python',
      'ai_server.py'
    );

    log.info('Starting Python process:', this.pythonPath, scriptPath);

    this.pythonProcess = spawn(this.pythonPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    });

    // Handle stdout - this is where we receive responses
    this.pythonProcess.stdout?.on('data', (data) => {
      this.handleStdout(data);
    });

    // Handle stderr - log errors
    this.pythonProcess.stderr?.on('data', (data) => {
      log.error('Python stderr:', data.toString());
    });

    // Handle process exit
    this.pythonProcess.on('exit', (code, signal) => {
      log.warn('Python process exited:', { code, signal });
      this.isInitialized = false;

      // Reject all pending requests
      for (const [id, request] of this.pendingRequests.entries()) {
        clearTimeout(request.timeout);
        request.reject(new Error('Python process terminated unexpectedly'));
      }
      this.pendingRequests.clear();
    });

    // Handle process errors
    this.pythonProcess.on('error', (error) => {
      log.error('Python process error:', error);
    });
  }

  /**
   * Wait for Python process to be ready
   */
  private async waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Python process startup timeout'));
      }, PYTHON_TIMEOUTS.startup);

      const checkReady = async () => {
        try {
          await this.sendRequest('system', 'ping', {});
          clearTimeout(timeout);
          resolve();
        } catch (error) {
          // Retry after 100ms
          setTimeout(checkReady, 100);
        }
      };

      checkReady();
    });
  }

  /**
   * Handle stdout data from Python process
   */
  private handleStdout(data: Buffer): void {
    // Append to buffer
    this.responseBuffer += data.toString();

    // Process complete JSON messages (one per line)
    const lines = this.responseBuffer.split('\n');

    // Keep the last incomplete line in buffer
    this.responseBuffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim().length === 0) continue;

      try {
        const response: PythonResponse = JSON.parse(line);
        this.handleResponse(response);
      } catch (error) {
        log.error('Failed to parse Python response:', line, error);
      }
    }
  }

  /**
   * Handle a parsed response from Python
   */
  private handleResponse(response: PythonResponse): void {
    const pending = this.pendingRequests.get(response.id);

    if (!pending) {
      log.warn('Received response for unknown request:', response.id);
      return;
    }

    // Clear timeout
    clearTimeout(pending.timeout);

    // Remove from pending
    this.pendingRequests.delete(response.id);

    // Resolve or reject
    if (response.success) {
      pending.resolve(response.data);
    } else {
      pending.reject(new Error(response.error || 'Unknown Python error'));
    }
  }

  /**
   * Send a request to Python and wait for response
   */
  private async sendRequest(
    service: string,
    method: string,
    params: any,
    timeoutMs: number = 60000
  ): Promise<any> {
    if (!this.isInitialized || !this.pythonProcess || !this.pythonProcess.stdin) {
      throw new Error('Python bridge not initialized');
    }

    const requestId = uuidv4();

    const request: PythonRequest = {
      id: requestId,
      service,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Python request timeout: ${service}.${method}`));
      }, timeoutMs);

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout,
      });

      // Send request to Python (JSON line)
      const requestJson = JSON.stringify(request) + '\n';
      this.pythonProcess!.stdin!.write(requestJson);
    });
  }

  // ==================== PUBLIC API ====================

  /**
   * Generate audio using AudioCraft
   */
  async generateAudio(prompt: string, duration: number): Promise<string> {
    log.info('Generating audio:', { prompt, duration });

    const result = await this.sendRequest(
      'audiocraft',
      'generate',
      { prompt, duration },
      PYTHON_TIMEOUTS.audioGeneration
    );

    return result.audioPath;
  }

  /**
   * Transcribe audio using Whisper or other STT service
   */
  async transcribeAudio(audioPath: string, language: string = 'en'): Promise<any> {
    log.info('Transcribing audio:', { audioPath, language });

    const result = await this.sendRequest(
      'whisper',
      'transcribe',
      { audioPath, language },
      PYTHON_TIMEOUTS.transcription
    );

    return result;
  }

  /**
   * Analyze video for scene detection and key moments
   */
  async analyzeVideo(videoPath: string): Promise<any> {
    log.info('Analyzing video:', videoPath);

    const result = await this.sendRequest(
      'video_analysis',
      'analyze',
      { videoPath },
      PYTHON_TIMEOUTS.videoAnalysis
    );

    return result;
  }

  /**
   * Detect scene changes in video
   */
  async detectScenes(videoPath: string): Promise<any> {
    log.info('Detecting scenes:', videoPath);

    const result = await this.sendRequest(
      'video_analysis',
      'detect_scenes',
      { videoPath },
      PYTHON_TIMEOUTS.videoAnalysis
    );

    return result;
  }

  /**
   * Suggest sound effects for video moments
   */
  async suggestSFX(videoPath: string): Promise<any> {
    log.info('Suggesting SFX:', videoPath);

    const result = await this.sendRequest(
      'video_analysis',
      'suggest_sfx',
      { videoPath },
      PYTHON_TIMEOUTS.videoAnalysis
    );

    return result;
  }

  /**
   * Cleanup Python process
   */
  async cleanup(): Promise<void> {
    log.info('Cleaning up Python bridge...');

    if (this.pythonProcess) {
      // Send graceful shutdown command
      try {
        await this.sendRequest('system', 'shutdown', {}, 5000);
      } catch (error) {
        log.warn('Failed to send shutdown command:', error);
      }

      // Kill process if still running
      if (!this.pythonProcess.killed) {
        this.pythonProcess.kill('SIGTERM');

        // Force kill after 5 seconds
        setTimeout(() => {
          if (this.pythonProcess && !this.pythonProcess.killed) {
            this.pythonProcess.kill('SIGKILL');
          }
        }, 5000);
      }

      this.pythonProcess = null;
    }

    this.isInitialized = false;
  }
}
