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
import { app, BrowserWindow, ipcMain, dialog, protocol, shell } from 'electron';
import { join } from 'path';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as projectManager from './projectManager';
import { initializeFreesoundService, getFreesoundService } from './freesoundService';
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
                            { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }
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
    var appRoot = app.isPackaged
        ? join(process.resourcesPath, 'app')
        : join(__dirname, '..');
    // Video processing handlers
    ipcMain.handle('video:extractAudio', function (_, videoPath) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var outputPath = join(app.getPath('temp'), "audio-".concat(Date.now(), ".wav"));
                    // FFmpeg command to extract audio
                    var ffmpeg = spawn('ffmpeg', [
                        '-i', videoPath,
                        '-vn',
                        '-acodec', 'pcm_s16le',
                        '-ar', '44100',
                        '-ac', '2',
                        outputPath
                    ]);
                    ffmpeg.on('close', function (code) {
                        if (code === 0) {
                            resolve(outputPath);
                        }
                        else {
                            reject(new Error("FFmpeg exited with code ".concat(code)));
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
    ipcMain.handle('audiocraft:generate', function (_, prompt, duration) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var pythonScript = join(appRoot, 'python', 'audiocraft_generator.py');
                    var outputPath = join(app.getPath('temp'), "sfx-".concat(Date.now(), ".wav"));
                    // Use venv python
                    var pythonPath = join(appRoot, 'venv', 'bin', 'python');
                    console.log('Starting AudioCraft generation:', { prompt: prompt, duration: duration, outputPath: outputPath });
                    var python = spawn(pythonPath, [
                        pythonScript,
                        '--prompt', prompt,
                        '--duration', duration.toString(),
                        '--output', outputPath
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
                        // Show progress for model loading
                        if (output.includes('Loading AudioGen model')) {
                            console.log('AudioGen model loading...');
                        }
                        if (output.includes('Model loaded successfully')) {
                            console.log('AudioGen model loaded successfully');
                        }
                        if (output.includes('Generating audio for')) {
                            console.log('Generating audio...');
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
                                errorMessage = 'AudioGen model not found. Please check your internet connection.';
                            }
                            else if (errorOutput.includes('401 Client Error')) {
                                errorMessage = 'Authentication error downloading AudioGen model. Please check your internet connection and try again.';
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
    }); });
    // AI analysis handler (video understanding)
    ipcMain.handle('ai:analyzeVideo', function (_, videoPath, audioPath) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var pythonScript = join(appRoot, 'python', 'video_analyzer.py');
                    // Use venv python
                    var pythonPath = join(appRoot, 'venv', 'bin', 'python');
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
        var content, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs.readFile(filePath, 'utf-8')];
                case 1:
                    content = _a.sent();
                    return [2 /*return*/, content];
                case 2:
                    error_1 = _a.sent();
                    throw error_1;
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('fs:writeFile', function (_, filePath, content) { return __awaiter(_this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs.writeFile(filePath, content, 'utf-8')];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    error_2 = _a.sent();
                    throw error_2;
                case 3: return [2 /*return*/];
            }
        });
    }); });
    // Render final video
    ipcMain.handle('video:render', function (_, options) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var videoPath = options.videoPath, outputPath = options.outputPath, subtitles = options.subtitles, sfxTracks = options.sfxTracks, overlays = options.overlays;
                    // Build complex FFmpeg command with filters
                    var ffmpegArgs = buildRenderCommand(videoPath, outputPath, {
                        subtitles: subtitles,
                        sfxTracks: sfxTracks,
                        overlays: overlays
                    });
                    var ffmpeg = spawn('ffmpeg', ffmpegArgs);
                    ffmpeg.on('close', function (code) {
                        if (code === 0) {
                            resolve(outputPath);
                        }
                        else {
                            reject(new Error("Render failed with code ".concat(code)));
                        }
                    });
                    ffmpeg.on('error', reject);
                })];
        });
    }); });
    // Project management handlers
    ipcMain.handle('project:create', function (_, options) { return __awaiter(_this, void 0, void 0, function () {
        var projectName, projectPath, videoPath, fullProjectPath, videoRelativePath, error_3;
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
                    error_3 = _a.sent();
                    console.error('Failed to create project:', error_3);
                    throw error_3;
                case 4: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('project:save', function (_, projectPath, projectData) { return __awaiter(_this, void 0, void 0, function () {
        var error_4;
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
                    error_4 = _a.sent();
                    console.error('Failed to save project:', error_4);
                    throw error_4;
                case 4: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('project:load', function (_, projectPath) { return __awaiter(_this, void 0, void 0, function () {
        var projectData, error_5;
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
                    error_5 = _a.sent();
                    console.error('Failed to load project:', error_5);
                    throw error_5;
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
        var error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, projectManager.getRecentProjects()];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_6 = _a.sent();
                    console.error('Failed to get recent projects:', error_6);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('project:removeRecent', function (_, projectPath) { return __awaiter(_this, void 0, void 0, function () {
        var error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, projectManager.removeFromRecentProjects(projectPath)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    error_7 = _a.sent();
                    console.error('Failed to remove from recent:', error_7);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('project:copyAsset', function (_, sourcePath, projectPath, assetType) { return __awaiter(_this, void 0, void 0, function () {
        var relativePath, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, projectManager.copyAssetToProject(sourcePath, projectPath, assetType)];
                case 1:
                    relativePath = _a.sent();
                    return [2 /*return*/, relativePath];
                case 2:
                    error_8 = _a.sent();
                    console.error('Failed to copy asset:', error_8);
                    throw error_8;
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
        var error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, projectManager.getProjectSFXFiles(projectPath)];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_9 = _a.sent();
                    console.error('Failed to get SFX files:', error_9);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('project:getExports', function (_, projectPath) { return __awaiter(_this, void 0, void 0, function () {
        var error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, projectManager.getProjectExports(projectPath)];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_10 = _a.sent();
                    console.error('Failed to get exports:', error_10);
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
        var error_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, projectManager.deleteFile(filePath)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    error_11 = _a.sent();
                    console.error('Failed to delete file:', error_11);
                    throw error_11;
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
        var service, results, error_12;
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
                    error_12 = _a.sent();
                    console.error('FreeSound search error:', error_12);
                    return [2 /*return*/, { success: false, error: error_12.message }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('freesound:getSound', function (_, soundId) { return __awaiter(_this, void 0, void 0, function () {
        var service, sound, error_13;
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
                    error_13 = _a.sent();
                    console.error('FreeSound getSound error:', error_13);
                    return [2 /*return*/, { success: false, error: error_13.message }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
    ipcMain.handle('freesound:downloadPreview', function (_, previewUrl, outputPath) { return __awaiter(_this, void 0, void 0, function () {
        var service, filePath, error_14;
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
                    error_14 = _a.sent();
                    console.error('FreeSound preview download error:', error_14);
                    return [2 /*return*/, { success: false, error: error_14.message }];
                case 3: return [2 /*return*/];
            }
        });
    }); });
}
function buildRenderCommand(videoPath, outputPath, options) {
    var _a;
    var args = ['-i', videoPath];
    // Add SFX tracks as additional inputs
    (_a = options.sfxTracks) === null || _a === void 0 ? void 0 : _a.forEach(function (sfx) {
        args.push('-i', sfx.path);
    });
    // Build filter complex for overlays and mixing audio
    var filters = [];
    if (options.sfxTracks && options.sfxTracks.length > 0) {
        // Mix audio tracks
        var audioInputs = options.sfxTracks.map(function (_, i) { return "[".concat(i + 1, ":a]"); }).join('');
        filters.push("[0:a]".concat(audioInputs, "amix=inputs=").concat(options.sfxTracks.length + 1, "[aout]"));
    }
    if (filters.length > 0) {
        args.push('-filter_complex', filters.join(';'));
        args.push('-map', '0:v');
        args.push('-map', '[aout]');
    }
    args.push('-c:v', 'libx264', '-c:a', 'aac', '-y', outputPath);
    return args;
}
