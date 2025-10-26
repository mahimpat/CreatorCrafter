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
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { app } from 'electron';
// Constants for project structure
var PROJECT_FILE = 'project.json';
var ASSETS_DIR = 'assets';
var SOURCE_DIR = 'assets/source';
var SFX_DIR = 'assets/sfx';
var EXPORTS_DIR = 'assets/exports';
var RECENT_PROJECTS_FILE = 'recent-projects.json';
var MAX_RECENT_PROJECTS = 10;
/**
 * Get the path to store recent projects list
 */
function getRecentProjectsPath() {
    return path.join(app.getPath('userData'), RECENT_PROJECTS_FILE);
}
/**
 * Create project folder structure
 */
export function createProjectStructure(projectPath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // Create main project directory
                return [4 /*yield*/, fs.mkdir(projectPath, { recursive: true })
                    // Create subdirectories
                ];
                case 1:
                    // Create main project directory
                    _a.sent();
                    // Create subdirectories
                    return [4 /*yield*/, fs.mkdir(path.join(projectPath, SOURCE_DIR), { recursive: true })];
                case 2:
                    // Create subdirectories
                    _a.sent();
                    return [4 /*yield*/, fs.mkdir(path.join(projectPath, SFX_DIR), { recursive: true })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, fs.mkdir(path.join(projectPath, EXPORTS_DIR), { recursive: true })];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if a path is a valid project folder
 */
export function isValidProject(projectPath) {
    return __awaiter(this, void 0, void 0, function () {
        var projectFilePath, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    projectFilePath = path.join(projectPath, PROJECT_FILE);
                    return [4 /*yield*/, fs.access(projectFilePath)];
                case 1:
                    _b.sent();
                    return [2 /*return*/, true];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Save project data to project.json
 */
export function saveProject(projectPath, projectData) {
    return __awaiter(this, void 0, void 0, function () {
        var projectFilePath, jsonData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    projectFilePath = path.join(projectPath, PROJECT_FILE);
                    jsonData = JSON.stringify(projectData, null, 2);
                    return [4 /*yield*/, fs.writeFile(projectFilePath, jsonData, 'utf-8')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Load project data from project.json
 */
export function loadProject(projectPath) {
    return __awaiter(this, void 0, void 0, function () {
        var projectFilePath, jsonData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    projectFilePath = path.join(projectPath, PROJECT_FILE);
                    return [4 /*yield*/, fs.readFile(projectFilePath, 'utf-8')];
                case 1:
                    jsonData = _a.sent();
                    return [2 /*return*/, JSON.parse(jsonData)];
            }
        });
    });
}
/**
 * Copy a file into the project's assets directory
 */
export function copyAssetToProject(sourcePath, projectPath, assetType) {
    return __awaiter(this, void 0, void 0, function () {
        var fileName, destDir, destPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fileName = path.basename(sourcePath);
                    destDir = path.join(projectPath, ASSETS_DIR, assetType);
                    destPath = path.join(destDir, fileName);
                    // Ensure destination directory exists
                    return [4 /*yield*/, fs.mkdir(destDir, { recursive: true })
                        // Copy file
                    ];
                case 1:
                    // Ensure destination directory exists
                    _a.sent();
                    // Copy file
                    return [4 /*yield*/, fs.copyFile(sourcePath, destPath)
                        // Return relative path from project root
                    ];
                case 2:
                    // Copy file
                    _a.sent();
                    // Return relative path from project root
                    return [2 /*return*/, path.relative(projectPath, destPath)];
            }
        });
    });
}
/**
 * Get absolute path from relative path within project
 */
export function resolveProjectPath(projectPath, relativePath) {
    return path.join(projectPath, relativePath);
}
/**
 * Get recent projects list
 */
export function getRecentProjects() {
    return __awaiter(this, void 0, void 0, function () {
        var recentPath, data, projects, validProjects, _i, projects_1, project, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 6, , 7]);
                    recentPath = getRecentProjectsPath();
                    return [4 /*yield*/, fs.readFile(recentPath, 'utf-8')];
                case 1:
                    data = _b.sent();
                    projects = JSON.parse(data);
                    validProjects = [];
                    _i = 0, projects_1 = projects;
                    _b.label = 2;
                case 2:
                    if (!(_i < projects_1.length)) return [3 /*break*/, 5];
                    project = projects_1[_i];
                    return [4 /*yield*/, isValidProject(project.path)];
                case 3:
                    if (_b.sent()) {
                        validProjects.push(project);
                    }
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, validProjects];
                case 6:
                    _a = _b.sent();
                    // No recent projects file yet
                    return [2 /*return*/, []];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Add or update a project in recent projects list
 */
export function addToRecentProjects(projectPath, projectName) {
    return __awaiter(this, void 0, void 0, function () {
        var recentPath, projects;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    recentPath = getRecentProjectsPath();
                    return [4 /*yield*/, getRecentProjects()
                        // Remove existing entry if present
                    ];
                case 1:
                    projects = _a.sent();
                    // Remove existing entry if present
                    projects = projects.filter(function (p) { return p.path !== projectPath; });
                    // Add to front of list
                    projects.unshift({
                        path: projectPath,
                        name: projectName,
                        lastOpened: new Date().toISOString()
                    });
                    // Keep only MAX_RECENT_PROJECTS
                    projects = projects.slice(0, MAX_RECENT_PROJECTS);
                    // Save
                    return [4 /*yield*/, fs.writeFile(recentPath, JSON.stringify(projects, null, 2), 'utf-8')];
                case 2:
                    // Save
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Remove a project from recent projects list
 */
export function removeFromRecentProjects(projectPath) {
    return __awaiter(this, void 0, void 0, function () {
        var recentPath, projects;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    recentPath = getRecentProjectsPath();
                    return [4 /*yield*/, getRecentProjects()];
                case 1:
                    projects = _a.sent();
                    projects = projects.filter(function (p) { return p.path !== projectPath; });
                    return [4 /*yield*/, fs.writeFile(recentPath, JSON.stringify(projects, null, 2), 'utf-8')];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Get list of SFX files in project
 */
export function getProjectSFXFiles(projectPath) {
    return __awaiter(this, void 0, void 0, function () {
        var sfxDir, files, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    sfxDir = path.join(projectPath, SFX_DIR);
                    return [4 /*yield*/, fs.readdir(sfxDir)];
                case 1:
                    files = _b.sent();
                    return [2 /*return*/, files.filter(function (f) { return f.endsWith('.wav') || f.endsWith('.mp3'); })];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get list of exported videos in project
 */
export function getProjectExports(projectPath) {
    return __awaiter(this, void 0, void 0, function () {
        var exportsDir, files, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    exportsDir = path.join(projectPath, EXPORTS_DIR);
                    return [4 /*yield*/, fs.readdir(exportsDir)];
                case 1:
                    files = _b.sent();
                    return [2 /*return*/, files.filter(function (f) { return f.endsWith('.mp4') || f.endsWith('.mov'); })];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if file exists
 */
export function fileExists(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs.access(filePath)];
                case 1:
                    _b.sent();
                    return [2 /*return*/, true];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Delete a file
 */
export function deleteFile(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.unlink(filePath)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Generate unique filename to avoid conflicts
 */
export function generateUniqueFilename(directory, originalName) {
    var ext = path.extname(originalName);
    var base = path.basename(originalName, ext);
    var counter = 1;
    var newName = originalName;
    while (fsSync.existsSync(path.join(directory, newName))) {
        newName = "".concat(base, "-").concat(counter).concat(ext);
        counter++;
    }
    return newName;
}
