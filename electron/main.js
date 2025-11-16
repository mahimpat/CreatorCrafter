var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { app, BrowserWindow, ipcMain, dialog, protocol, shell } from 'electron';
import { join } from 'path';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as projectManager from './projectManager';
import { initializeFreesoundService, getFreesoundService } from './freesoundService';
import * as elevenlabsService from './elevenlabsService';
import * as dotenv from 'dotenv';
// Load environment variables
dotenv.config();
// Handle running as root (WSL/Linux) - MUST be before any app initialization
if (process.getuid && process.getuid() === 0) {
    app.commandLine.appendSwitch('no-sandbox');
    app.commandLine.appendSwitch('disable-gpu-sandbox');
}
// Security: Disable remote module
app.on('remote-require', function (event) {
    event.preventDefault();
});
app.on('remote-get-builtin', function (event) {
    event.preventDefault();
});
app.on('remote-get-global', function (event) {
    event.preventDefault();
});
app.on('remote-get-current-window', function (event) {
    event.preventDefault();
});
app.on('remote-get-current-web-contents', function (event) {
    event.preventDefault();
});
var mainWindow = null;
var hasUnsavedChanges = false;
var isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
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
    });
    // Graceful show
    mainWindow.once('ready-to-show', function () {
        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.show();
    });
    // Load the app
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(join(__dirname, '../dist/index.html'));
    }
    // Security: Prevent navigation to external URLs
    mainWindow.webContents.on('will-navigate', function (event, url) {
        var allowedOrigins = isDev ? ['http://localhost:5173'] : [];
        var parsedUrl = new URL(url);
        if (!allowedOrigins.includes(parsedUrl.origin)) {
            event.preventDefault();
        }
    });
    // Security: Prevent opening new windows
    mainWindow.webContents.setWindowOpenHandler(function () {
        return { action: 'deny' };
    });
    // Prevent closing with unsaved changes
    mainWindow.on('close', function (event) {
        if (hasUnsavedChanges) {
            event.preventDefault();
            dialog.showMessageBox(mainWindow, {
                type: 'warning',
                buttons: ['Save and Close', 'Discard Changes', 'Cancel'],
                defaultId: 0,
                title: 'Unsaved Changes',
                message: 'You have unsaved changes.',
                detail: 'Do you want to save your changes before closing?'
            }).then(function (_a) {
                var response = _a.response;
                if (response === 0) {
                    // Save and close
                    mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.send('save-before-close');
                    // Wait for save confirmation, then close
                    setTimeout(function () {
                        hasUnsavedChanges = false;
                        mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.close();
                    }, 1000);
                }
                else if (response === 1) {
                    // Discard and close
                    hasUnsavedChanges = false;
                    mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.close();
                }
                // response === 2: Cancel, do nothing
            });
        }
    });
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}
// Register custom protocol for local file access
app.whenReady().then(function () {
    // Register protocol to serve local video files
    protocol.registerFileProtocol('localfile', function (request, callback) {
        var url = request.url.replace('localfile://', '');
        try {
            return callback(decodeURIComponent(url));
        }
        catch (error) {
            console.error('Error loading file:', error);
            return callback({ error: -2 });
        }
    });
});
// App lifecycle
app.whenReady().then(function () {
    createWindow();
    registerIpcHandlers();
    // Initialize FreeSound service with API key only
    var apiKey = process.env.FREESOUND_CLIENT_ID || '';
    if (apiKey) {
        initializeFreesoundService(apiKey);
        console.log('FreeSound service initialized with API key');
    }
    else {
        console.warn('FREESOUND_CLIENT_ID not found in .env file');
    }
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
// IPC Handlers
function registerIpcHandlers() {
    var _this = this;
    // File dialog handlers
    ipcMain.handle('dialog:openFile', function () { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, dialog.showOpenDialog({
                        properties: ['openFile'],
                        filters: [
                            { name: 'All Media', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] },
                            { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
                            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'] }
                        ]
                    })];
                case 1:
                    result = _a.sent();
                    if (result.canceled || result.filePaths.length === 0) {
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, result.filePaths[0]];
            }
        });
    }); });
    ipcMain.handle('dialog:saveFile', function (_, defaultPath) { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, dialog.showSaveDialog({
                        defaultPath: defaultPath,
                        filters: [
                            { name: 'Videos', extensions: ['mp4'] },
                            { name: 'Subtitles', extensions: ['srt', 'vtt'] }
                        ]
                    })];
                case 1:
                    result = _a.sent();
                    if (result.canceled) {
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, result.filePath];
            }
        });
    }); });
    // Get the application root directory
    // In production, Python scripts are in resources/ directory (extraResources)
    // In development, they're in the project root
    var appRoot = app.isPackaged
        ? process.resourcesPath
        : join(__dirname, '..');
    // Get the installation directory (parent of resources)
    // This is where venv is created by the installer
    var installDir = app.isPackaged
        ? join(process.resourcesPath, '..')
        : join(__dirname, '..');
    // Video processing handlers
    ipcMain.handle('video:extractAudio', function (_, videoPath) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var outputPath = join(app.getPath('temp'), "audio-".concat(Date.now(), ".wav"));
                    console.log('Extracting audio from:', videoPath);
                    console.log('Output path:', outputPath);
                    // FFmpeg command to extract audio
                    var ffmpeg = spawn('ffmpeg', [
                        '-i', videoPath,
                        '-vn',
                        '-acodec', 'pcm_s16le',
                        '-ar', '16000', // 16kHz for Whisper compatibility
                        '-ac', '1', // Mono for Whisper
                        '-y', // Overwrite output file
                        outputPath
                    ]);
                    var errorOutput = '';
                    ffmpeg.stderr.on('data', function (data) {
                        errorOutput += data.toString();
                    });
                    ffmpeg.on('close', function (code) {
                        if (code === 0) {
                            console.log('Audio extraction successful');
                            resolve(outputPath);
                        }
                        else {
                            console.error('FFmpeg error output:', errorOutput);
                            // Check if video has no audio stream
                            if (errorOutput.includes('does not contain any stream') ||
                                errorOutput.includes('No audio') ||
                                errorOutput.includes('Output file is empty')) {
                                reject(new Error('Video has no audio track. Please use a video with audio for analysis.'));
                            }
                            else {
                                reject(new Error("FFmpeg exited with code ".concat(code, ": ").concat(errorOutput.substring(0, 500))));
                            }
                        }
                    });
                    ffmpeg.on('error', reject);
                })];
        });
    }); });
    ipcMain.handle('video:getMetadata', function (_, videoPath) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var ffprobe = spawn('ffprobe', [
                        '-v', 'quiet',
                        '-print_format', 'json',
                        '-show_format',
                        '-show_streams',
                        videoPath
                    ]);
                    var output = '';
                    ffprobe.stdout.on('data', function (data) {
                        output += data.toString();
                    });
                    ffprobe.on('close', function (code) {
                        if (code === 0) {
                            try {
                                var metadata = JSON.parse(output);
                                resolve(metadata);
                            }
                            catch (err) {
                                reject(err);
                            }
                        }
                        else {
                            reject(new Error("FFprobe exited with code ".concat(code)));
                        }
                    });
                    ffprobe.on('error', reject);
                })];
        });
    }); });
    // AudioCraft integration (Python bridge)
    ipcMain.handle('audiocraft:generate', function (_1, prompt_1, duration_1) {
        var args_1 = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            args_1[_i - 3] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([_1, prompt_1, duration_1], args_1, true), void 0, function (_, prompt, duration, modelType) {
            if (modelType === void 0) { modelType = 'audiogen'; }
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        // Always use .py files (cross-version compatible)
                        var scriptName = 'audiocraft_generator.py';
                        var pythonScript = join(appRoot, 'python', scriptName);
                        var outputPath = join(app.getPath('temp'), "sfx-".concat(Date.now(), ".wav"));
                        // Use venv python (platform-specific paths)
                        // Windows: Embeddable Python has python.exe in root, not Scripts/
                        var pythonPath = process.platform === 'win32'
                            ? join(installDir, 'venv', 'python.exe')
                            : join(installDir, 'venv', 'bin', 'python');
                        var modelName = modelType === 'musicgen' ? 'MusicGen' : 'AudioGen';
                        console.log("Starting ".concat(modelName, " generation:"), { prompt: prompt, duration: duration, outputPath: outputPath, modelType: modelType });
                        var python = spawn(pythonPath, [
                            pythonScript,
                            '--prompt', prompt,
                            '--duration', duration.toString(),
                            '--output', outputPath,
                            '--model', modelType
                        ]);
                        var errorOutput = '';
                        var isResolved = false;
                        // Set a timeout for AudioGen model download/generation (5 minutes)
                        var timeout = setTimeout(function () {
                            if (!isResolved) {
                                isResolved = true;
                                python.kill('SIGTERM');
                                reject(new Error('SFX generation timed out. AudioGen model may be downloading for the first time. Please try again in a few minutes.'));
                            }
                        }, 5 * 60 * 1000); // 5 minutes
                        python.stderr.on('data', function (data) {
                            var output = data.toString();
                            errorOutput += output;
                            console.error('AudioCraft stderr:', output);
                            // Show progress for model loading (both AudioGen and MusicGen)
                            if (output.includes('Loading AudioGen model') || output.includes('Loading MusicGen model')) {
                                console.log("".concat(modelName, " model loading..."));
                            }
                            if (output.includes('Model loaded successfully') || output.includes('model loaded successfully')) {
                                console.log("".concat(modelName, " model loaded successfully"));
                            }
                            if (output.includes('Generating')) {
                                console.log("Generating ".concat(modelType === 'musicgen' ? 'music' : 'sound effect', "..."));
                            }
                        });
                        python.on('close', function (code) {
                            clearTimeout(timeout);
                            if (isResolved)
                                return;
                            isResolved = true;
                            if (code === 0) {
                                console.log('AudioCraft generation completed successfully');
                                resolve(outputPath);
                            }
                            else {
                                console.error('AudioCraft generation failed:', errorOutput);
                                var errorMessage = "AudioCraft generation failed with code ".concat(code);
                                // Provide more helpful error messages
                                if (errorOutput.includes('Repository Not Found')) {
                                    errorMessage = "".concat(modelName, " model not found. Please check your internet connection.");
                                }
                                else if (errorOutput.includes('401 Client Error')) {
                                    errorMessage = "Authentication error downloading ".concat(modelName, " model. Please check your internet connection and try again.");
                                }
                                else if (errorOutput.includes('torch.cuda')) {
                                    errorMessage = 'GPU initialization warning (this is normal and won\'t affect generation)';
                                }
                                else if (errorOutput.includes('No module named')) {
                                    errorMessage = 'AudioCraft dependencies missing. Please reinstall dependencies.';
                                }
                                reject(new Error(errorMessage));
                            }
                        });
                        python.on('error', function (err) {
                            clearTimeout(timeout);
                            if (isResolved)
                                return;
                            isResolved = true;
                            console.error('Failed to spawn python for AudioCraft:', err);
                            reject(new Error("Failed to start AudioCraft: ".concat(err.message)));
                        });
                    })];
            });
        });
    });
    // ElevenLabs Sound Effects handler
    ipcMain.handle('elevenlabs:generate', function (_, prompt, duration, apiKey) { return __awaiter(_this, void 0, void 0, function () {
        var outputPath, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    outputPath = join(app.getPath('temp'), "sfx-".concat(Date.now(), ".wav"));
                    console.log('Starting ElevenLabs generation:', { prompt: prompt, duration: duration });
                    return [4 /*yield*/, elevenlabsService.generateSoundEffect({ apiKey: apiKey, defaultDuration: duration }, { prompt: prompt, duration: duration, outputPath: outputPath })];
                case 1:
                    result = _a.sent();
                    if (result.success && result.filePath) {
                        console.log('ElevenLabs generation successful:', result);
                        return [2 /*return*/, {
                                success: true,
                                filePath: result.filePath,
                                duration: result.duration,
                                creditsUsed: result.creditsUsed
                            }];
                    }
                    else {
                        throw new Error(result.error || 'Unknown error');
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('ElevenLabs generation error:', error_1);
                    return [2 /*return*/, {
                            success: false,
                            error: error_1.message || 'Failed to generate sound effect'
                        }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // ElevenLabs API key validation
    ipcMain.handle('elevenlabs:validateKey', function (_, apiKey) { return __awaiter(_this, void 0, void 0, function () {
        var isValid, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, elevenlabsService.validateApiKey(apiKey)];
                case 1:
                    isValid = _a.sent();
                    return [2 /*return*/, { valid: isValid }];
                case 2:
                    error_2 = _a.sent();
                    console.error('ElevenLabs key validation error:', error_2);
                    return [2 /*return*/, { valid: false }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // ElevenLabs credits check
    ipcMain.handle('elevenlabs:getCredits', function (_, apiKey) { return __awaiter(_this, void 0, void 0, function () {
        var credits, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, elevenlabsService.getRemainingCredits(apiKey)];
                case 1:
                    credits = _a.sent();
                    return [2 /*return*/, { credits: credits }];
                case 2:
                    error_3 = _a.sent();
                    console.error('ElevenLabs credits check error:', error_3);
                    return [2 /*return*/, { credits: null }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // AI analysis handler (video understanding)
    ipcMain.handle('ai:analyzeVideo', function (_, videoPath, audioPath) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    // Always use .py files (cross-version compatible)
                    var scriptName = 'video_analyzer.py';
                    var pythonScript = join(appRoot, 'python', scriptName);
                    // Use venv python (platform-specific paths)
                    // Windows: Embeddable Python has python.exe in root, not Scripts/
                    var pythonPath = process.platform === 'win32'
                        ? join(installDir, 'venv', 'python.exe')
                        : join(installDir, 'venv', 'bin', 'python');
                    console.log('Analyzing video with:', { pythonPath: pythonPath, pythonScript: pythonScript, videoPath: videoPath, audioPath: audioPath });
                    var python = spawn(pythonPath, [
                        pythonScript,
                        '--video', videoPath,
                        '--audio', audioPath
                    ]);
                    var output = '';
                    var errorOutput = '';
                    python.stdout.on('data', function (data) {
                        output += data.toString();
                    });
                    python.stderr.on('data', function (data) {
                        errorOutput += data.toString();
                        console.error('Python stderr:', data.toString());
                    });
                    python.on('close', function (code) {
                        if (code === 0) {
                            try {
                                var analysis = JSON.parse(output);
                                resolve(analysis);
                            }
                            catch (err) {
                                console.error('Failed to parse JSON:', output);
                                reject(new Error("Failed to parse analysis results: ".concat(err)));
                            }
                        }
                        else {
                            console.error('Video analysis failed:', errorOutput);
                            reject(new Error("Video analysis failed with code ".concat(code, ": ").concat(errorOutput)));
                        }
                    });
                    python.on('error', function (err) {
                        console.error('Failed to spawn python:', err);
                        reject(err);
                    });
                })];
        });
    }); });
    // File system handlers
    ipcMain.handle('fs:readFile', function (_, filePath) { return __awaiter(_this, void 0, void 0, function () {
        var content, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs.readFile(filePath, 'utf-8')];
                case 1:
                    content = _a.sent();
                    return [2 /*return*/, content];
                case 2:
                    error_4 = _a.sent();
                    throw error_4;
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('fs:writeFile', function (_, filePath, content) { return __awaiter(_this, void 0, void 0, function () {
        var error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs.writeFile(filePath, content, 'utf-8')];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    error_5 = _a.sent();
                    throw error_5;
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Render final video
    ipcMain.handle('video:render', function (event, options) { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                    var videoPath, outputPath, subtitles, sfxTracks, overlays, videoDuration, metadata, err_1, ffmpegArgs, ffmpeg, ffmpegOutput;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                videoPath = options.videoPath, outputPath = options.outputPath, subtitles = options.subtitles, sfxTracks = options.sfxTracks, overlays = options.overlays;
                                console.log('Starting video render:', { videoPath: videoPath, outputPath: outputPath });
                                videoDuration = 0;
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, getVideoMetadata(videoPath)];
                            case 2:
                                metadata = _a.sent();
                                videoDuration = parseFloat(metadata.format.duration);
                                return [3 /*break*/, 4];
                            case 3:
                                err_1 = _a.sent();
                                console.error('Failed to get video metadata:', err_1);
                                return [3 /*break*/, 4];
                            case 4:
                                ffmpegArgs = buildRenderCommand(videoPath, outputPath, {
                                    subtitles: subtitles,
                                    sfxTracks: sfxTracks,
                                    overlays: overlays
                                });
                                console.log('FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
                                ffmpeg = spawn('ffmpeg', ffmpegArgs);
                                ffmpegOutput = '';
                                // Parse FFmpeg progress output
                                ffmpeg.stderr.on('data', function (data) {
                                    var output = data.toString();
                                    ffmpegOutput += output;
                                    // Parse progress from FFmpeg output
                                    // Example: frame=  123 fps= 25 q=28.0 size=    1024kB time=00:00:05.00 bitrate=1677.7kbits/s speed=1.2x
                                    var timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                                    if (timeMatch && videoDuration > 0) {
                                        var hours = parseInt(timeMatch[1]);
                                        var minutes = parseInt(timeMatch[2]);
                                        var seconds = parseFloat(timeMatch[3]);
                                        var currentTime = hours * 3600 + minutes * 60 + seconds;
                                        var progress = Math.min(100, (currentTime / videoDuration) * 100);
                                        // Send progress to renderer
                                        event.sender.send('render-progress', {
                                            progress: progress.toFixed(1),
                                            currentTime: currentTime,
                                            totalTime: videoDuration
                                        });
                                    }
                                    // Also check for speed and ETA
                                    var speedMatch = output.match(/speed=\s*(\d+\.?\d*)x/);
                                    if (speedMatch) {
                                        var speed = parseFloat(speedMatch[1]);
                                        event.sender.send('render-speed', { speed: speed });
                                    }
                                });
                                ffmpeg.on('close', function (code) {
                                    if (code === 0) {
                                        console.log('Render completed successfully');
                                        event.sender.send('render-progress', { progress: 100 });
                                        resolve(outputPath);
                                    }
                                    else {
                                        console.error('Render failed with code:', code);
                                        console.error('FFmpeg output:', ffmpegOutput);
                                        reject(new Error("Render failed with code ".concat(code, ". Check console for details.")));
                                    }
                                });
                                ffmpeg.on('error', function (err) {
                                    console.error('FFmpeg error:', err);
                                    reject(err);
                                });
                                return [2 /*return*/];
                        }
                    });
                }); })];
        });
    }); });
    // Helper function to get video metadata
    function getVideoMetadata(videoPath) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var ffprobe = spawn('ffprobe', [
                            '-v', 'quiet',
                            '-print_format', 'json',
                            '-show_format',
                            '-show_streams',
                            videoPath
                        ]);
                        var output = '';
                        ffprobe.stdout.on('data', function (data) {
                            output += data.toString();
                        });
                        ffprobe.on('close', function (code) {
                            if (code === 0) {
                                try {
                                    var metadata = JSON.parse(output);
                                    resolve(metadata);
                                }
                                catch (err) {
                                    reject(err);
                                }
                            }
                            else {
                                reject(new Error("FFprobe exited with code ".concat(code)));
                            }
                        });
                        ffprobe.on('error', reject);
                    })];
            });
        });
    }
    // Project management handlers
    ipcMain.handle('project:create', function (_, options) { return __awaiter(_this, void 0, void 0, function () {
        var projectName, projectPath, videoPath, fullProjectPath, videoRelativePath, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    projectName = options.projectName, projectPath = options.projectPath, videoPath = options.videoPath;
                    fullProjectPath = join(projectPath, projectName);
                    // Create project structure
                    return [4 /*yield*/, projectManager.createProjectStructure(fullProjectPath)
                        // Copy video to project
                    ];
                case 1:
                    // Create project structure
                    _a.sent();
                    return [4 /*yield*/, projectManager.copyAssetToProject(videoPath, fullProjectPath, 'source')];
                case 2:
                    videoRelativePath = _a.sent();
                    return [2 /*return*/, {
                            projectPath: fullProjectPath,
                            videoRelativePath: videoRelativePath
                        }];
                case 3:
                    error_6 = _a.sent();
                    console.error('Failed to create project:', error_6);
                    throw error_6;
                case 4: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('project:save', function (_, projectPath, projectData) { return __awaiter(_this, void 0, void 0, function () {
        var error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, projectManager.saveProject(projectPath, projectData)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, projectManager.addToRecentProjects(projectPath, projectData.projectName)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, true];
                case 3:
                    error_7 = _a.sent();
                    console.error('Failed to save project:', error_7);
                    throw error_7;
                case 4: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('project:load', function (_, projectPath) { return __awaiter(_this, void 0, void 0, function () {
        var projectData, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, projectManager.loadProject(projectPath)];
                case 1:
                    projectData = _a.sent();
                    return [4 /*yield*/, projectManager.addToRecentProjects(projectPath, projectData.projectName)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, projectData];
                case 3:
                    error_8 = _a.sent();
                    console.error('Failed to load project:', error_8);
                    throw error_8;
                case 4: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('project:openFolder', function () { return __awaiter(_this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, dialog.showOpenDialog({
                        properties: ['openDirectory', 'createDirectory'],
                        title: 'Select Project Location'
                    })];
                case 1:
                    result = _a.sent();
                    if (result.canceled || result.filePaths.length === 0) {
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, result.filePaths[0]];
            }
        });
    }); });
    ipcMain.handle('project:openFile', function () { return __awaiter(_this, void 0, void 0, function () {
        var result, projectFilePath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, dialog.showOpenDialog({
                        properties: ['openFile'],
                        filters: [
                            { name: 'Project Files', extensions: ['json'] },
                            { name: 'All Files', extensions: ['*'] }
                        ],
                        title: 'Open Project'
                    })];
                case 1:
                    result = _a.sent();
                    if (result.canceled || result.filePaths.length === 0) {
                        return [2 /*return*/, null];
                    }
                    projectFilePath = result.filePaths[0];
                    // Return the directory containing the project.json file
                    return [2 /*return*/, join(projectFilePath, '..')];
            }
        });
    }); });
    ipcMain.handle('project:getRecent', function () { return __awaiter(_this, void 0, void 0, function () {
        var error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, projectManager.getRecentProjects()];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_9 = _a.sent();
                    console.error('Failed to get recent projects:', error_9);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('project:removeRecent', function (_, projectPath) { return __awaiter(_this, void 0, void 0, function () {
        var error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, projectManager.removeFromRecentProjects(projectPath)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    error_10 = _a.sent();
                    console.error('Failed to remove from recent:', error_10);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('project:copyAsset', function (_, sourcePath, projectPath, assetType) { return __awaiter(_this, void 0, void 0, function () {
        var relativePath, error_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, projectManager.copyAssetToProject(sourcePath, projectPath, assetType)];
                case 1:
                    relativePath = _a.sent();
                    return [2 /*return*/, relativePath];
                case 2:
                    error_11 = _a.sent();
                    console.error('Failed to copy asset:', error_11);
                    throw error_11;
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('project:resolvePath', function (_, projectPath, relativePath) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, projectManager.resolveProjectPath(projectPath, relativePath)];
        });
    }); });
    ipcMain.handle('project:getSFXFiles', function (_, projectPath) { return __awaiter(_this, void 0, void 0, function () {
        var error_12;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, projectManager.getProjectSFXFiles(projectPath)];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_12 = _a.sent();
                    console.error('Failed to get SFX files:', error_12);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('project:getExports', function (_, projectPath) { return __awaiter(_this, void 0, void 0, function () {
        var error_13;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, projectManager.getProjectExports(projectPath)];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_13 = _a.sent();
                    console.error('Failed to get exports:', error_13);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('project:fileExists', function (_, filePath) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, projectManager.fileExists(filePath)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    ipcMain.handle('project:deleteFile', function (_, filePath) { return __awaiter(_this, void 0, void 0, function () {
        var error_14;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, projectManager.deleteFile(filePath)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    error_14 = _a.sent();
                    console.error('Failed to delete file:', error_14);
                    throw error_14;
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('project:showInFolder', function (_, filePath) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            try {
                shell.showItemInFolder(filePath);
                return [2 /*return*/, true];
            }
            catch (error) {
                console.error('Failed to show in folder:', error);
                return [2 /*return*/, false];
            }
            return [2 /*return*/];
        });
    }); });
    ipcMain.handle('project:isValid', function (_, projectPath) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, projectManager.isValidProject(projectPath)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    }); });
    // FreeSound API handlers (API key only - no OAuth)
    ipcMain.handle('freesound:search', function (_, params) { return __awaiter(_this, void 0, void 0, function () {
        var service, results, error_15;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    service = getFreesoundService();
                    return [4 /*yield*/, service.search(params)];
                case 1:
                    results = _a.sent();
                    return [2 /*return*/, { success: true, results: results }];
                case 2:
                    error_15 = _a.sent();
                    console.error('FreeSound search error:', error_15);
                    return [2 /*return*/, { success: false, error: error_15.message }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('freesound:getSound', function (_, soundId) { return __awaiter(_this, void 0, void 0, function () {
        var service, sound, error_16;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    service = getFreesoundService();
                    return [4 /*yield*/, service.getSound(soundId)];
                case 1:
                    sound = _a.sent();
                    return [2 /*return*/, { success: true, sound: sound }];
                case 2:
                    error_16 = _a.sent();
                    console.error('FreeSound getSound error:', error_16);
                    return [2 /*return*/, { success: false, error: error_16.message }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('freesound:downloadPreview', function (_, previewUrl, outputPath) { return __awaiter(_this, void 0, void 0, function () {
        var service, filePath, error_17;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    service = getFreesoundService();
                    return [4 /*yield*/, service.downloadPreview(previewUrl, outputPath)];
                case 1:
                    filePath = _a.sent();
                    return [2 /*return*/, { success: true, filePath: filePath }];
                case 2:
                    error_17 = _a.sent();
                    console.error('FreeSound preview download error:', error_17);
                    return [2 /*return*/, { success: false, error: error_17.message }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Unsaved changes tracking
    ipcMain.handle('app:setUnsavedChanges', function (_, hasChanges) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            hasUnsavedChanges = hasChanges;
            return [2 /*return*/, true];
        });
    }); });
    ipcMain.handle('app:getUnsavedChanges', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, hasUnsavedChanges];
        });
    }); });
}
function buildRenderCommand(videoPath, outputPath, options) {
    var _a, _b;
    var args = ['-i', videoPath];
    var inputIndex = 1;
    // Add SFX tracks as additional inputs
    var sfxInputs = [];
    (_a = options.sfxTracks) === null || _a === void 0 ? void 0 : _a.forEach(function (sfx) {
        args.push('-i', sfx.path);
        sfxInputs.push({ index: inputIndex, start: sfx.start, path: sfx.path });
        inputIndex++;
    });
    // Add media overlay inputs (images/videos)
    var overlayInputs = [];
    (_b = options.overlays) === null || _b === void 0 ? void 0 : _b.forEach(function (overlay) {
        if (overlay.mediaPath) {
            args.push('-i', overlay.mediaPath);
            overlayInputs.push({ index: inputIndex, overlay: overlay });
            inputIndex++;
        }
    });
    // Build filter complex for video, subtitles, overlays, and audio mixing
    var filters = [];
    var videoLabel = '[0:v]';
    // 1. Burn subtitles into video
    if (options.subtitles && options.subtitles.length > 0) {
        var subtitleFilter = buildSubtitleFilter(options.subtitles);
        filters.push("".concat(videoLabel).concat(subtitleFilter, "[v_sub]"));
        videoLabel = '[v_sub]';
    }
    // 2. Apply media overlays (images/videos with transforms)
    if (overlayInputs.length > 0) {
        overlayInputs.forEach(function (input, idx) {
            var overlay = input.overlay;
            var overlayFilter = buildOverlayFilter(input.index, overlay);
            var outputLabel = idx === overlayInputs.length - 1 ? '[vout]' : "[v_overlay_".concat(idx, "]");
            filters.push("".concat(videoLabel, "[").concat(input.index, ":v]").concat(overlayFilter).concat(outputLabel));
            videoLabel = outputLabel;
        });
    }
    else {
        // No overlays, just rename the video stream
        if (videoLabel !== '[0:v]') {
            filters.push("".concat(videoLabel, "copy[vout]"));
        }
        else {
            videoLabel = '[vout]';
            filters.push("[0:v]copy[vout]");
        }
    }
    // 3. Mix audio tracks (original + SFX with timing)
    if (sfxInputs.length > 0) {
        var audioFilter = buildAudioMixFilter(sfxInputs);
        filters.push("[0:a]".concat(audioFilter, "[aout]"));
    }
    else {
        // No SFX, just copy original audio
        filters.push('[0:a]copy[aout]');
    }
    // Apply all filters
    if (filters.length > 0) {
        args.push('-filter_complex', filters.join(';'));
        args.push('-map', '[vout]');
        args.push('-map', '[aout]');
    }
    else {
        // No filters, just copy streams
        args.push('-map', '0:v');
        args.push('-map', '0:a');
    }
    // Output encoding settings
    args.push('-c:v', 'libx264', // H.264 video codec
    '-preset', 'medium', // Encoding speed/quality balance
    '-crf', '23', // Quality (lower = better, 18-28 range)
    '-c:a', 'aac', // AAC audio codec
    '-b:a', '192k', // Audio bitrate
    '-movflags', '+faststart', // Enable streaming
    '-y', // Overwrite output file
    outputPath);
    return args;
}
// Build subtitle filter (burn subtitles into video)
function buildSubtitleFilter(subtitles) {
    // Escape text for FFmpeg drawtext filter
    var escapeText = function (text) {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/:/g, '\\:')
            .replace(/\n/g, '\\n');
    };
    // Build drawtext filter for each subtitle with enable condition
    var drawTextFilters = subtitles.map(function (sub, idx) {
        var escapedText = escapeText(sub.text);
        var style = sub.style || {};
        var fontFile = style.fontFamily ? "fontfile='".concat(style.fontFamily, "'") : '';
        var fontSize = style.fontSize || 24;
        var fontColor = style.color || 'white';
        var borderColor = style.borderColor || 'black';
        var borderWidth = style.borderWidth || 2;
        // Position (default: bottom center)
        var x = style.x !== undefined ? style.x : '(w-text_w)/2';
        var y = style.y !== undefined ? style.y : 'h-th-50';
        return "drawtext=".concat(fontFile ? fontFile + ':' : '', "text='").concat(escapedText, "':fontsize=").concat(fontSize, ":fontcolor=").concat(fontColor, ":bordercolor=").concat(borderColor, ":borderw=").concat(borderWidth, ":x=").concat(x, ":y=").concat(y, ":enable='between(t,").concat(sub.start, ",").concat(sub.end, ")'");
    }).join(',');
    return drawTextFilters;
}
// Build overlay filter for media overlays (images/videos)
function buildOverlayFilter(overlayInputIndex, overlay) {
    var x = overlay.x || 0;
    var y = overlay.y || 0;
    var width = overlay.width || -1; // -1 means keep aspect ratio
    var height = overlay.height || -1;
    var opacity = overlay.opacity !== undefined ? overlay.opacity : 1;
    var start = overlay.start || 0;
    var end = overlay.end || 999999;
    // Scale and position overlay
    var filter = "[".concat(overlayInputIndex, ":v]");
    // Apply transforms (scale, opacity)
    if (width !== -1 || height !== -1) {
        filter += "scale=".concat(width, ":").concat(height, ",");
    }
    if (opacity < 1) {
        filter += "format=yuva420p,colorchannelmixer=aa=".concat(opacity, ",");
    }
    // Apply rotation if specified
    if (overlay.rotation) {
        filter += "rotate=".concat(overlay.rotation * Math.PI / 180, ":c=none,");
    }
    // Remove trailing comma
    filter = filter.replace(/,$/, '');
    filter += "[ovr];";
    // Overlay onto main video with timing
    return "[ovr]overlay=x=".concat(x, ":y=").concat(y, ":enable='between(t,").concat(start, ",").concat(end, ")'");
}
// Build audio mix filter with timing (delayed audio for SFX)
function buildAudioMixFilter(sfxInputs) {
    // Delay each SFX track to match its start time
    var delayedTracks = sfxInputs.map(function (sfx, idx) {
        var delayMs = Math.floor(sfx.start * 1000);
        return "[".concat(sfx.index, ":a]adelay=").concat(delayMs, "|").concat(delayMs, "[sfx").concat(idx, "]");
    });
    // Mix all tracks together
    var mixInputs = __spreadArray(['[0:a]'], sfxInputs.map(function (_, idx) { return "[sfx".concat(idx, "]"); }), true).join('');
    var mixFilter = "".concat(mixInputs, "amix=inputs=").concat(sfxInputs.length + 1, ":duration=longest:dropout_transition=2");
    return delayedTracks.join(';') + ';' + mixFilter;
}
