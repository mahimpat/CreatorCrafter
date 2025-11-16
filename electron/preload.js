import { contextBridge, ipcRenderer } from 'electron';
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Dialog APIs
    openFileDialog: function () { return ipcRenderer.invoke('dialog:openFile'); },
    saveFileDialog: function (defaultPath) { return ipcRenderer.invoke('dialog:saveFile', defaultPath); },
    // Video processing APIs
    extractAudio: function (videoPath) { return ipcRenderer.invoke('video:extractAudio', videoPath); },
    getVideoMetadata: function (videoPath) { return ipcRenderer.invoke('video:getMetadata', videoPath); },
    renderVideo: function (options) { return ipcRenderer.invoke('video:render', options); },
    // AI/ML APIs
    analyzeVideo: function (videoPath, audioPath) {
        return ipcRenderer.invoke('ai:analyzeVideo', videoPath, audioPath);
    },
    generateSFX: function (prompt, duration, modelType) {
        return ipcRenderer.invoke('audiocraft:generate', prompt, duration, modelType || 'audiogen');
    },
    // ElevenLabs APIs
    elevenlabsGenerate: function (prompt, duration, apiKey) {
        return ipcRenderer.invoke('elevenlabs:generate', prompt, duration, apiKey);
    },
    elevenlabsValidateKey: function (apiKey) {
        return ipcRenderer.invoke('elevenlabs:validateKey', apiKey);
    },
    elevenlabsGetCredits: function (apiKey) {
        return ipcRenderer.invoke('elevenlabs:getCredits', apiKey);
    },
    // File system APIs
    readFile: function (filePath) { return ipcRenderer.invoke('fs:readFile', filePath); },
    writeFile: function (filePath, content) {
        return ipcRenderer.invoke('fs:writeFile', filePath, content);
    },
    // Project management APIs
    createProject: function (options) {
        return ipcRenderer.invoke('project:create', options);
    },
    saveProject: function (projectPath, projectData) {
        return ipcRenderer.invoke('project:save', projectPath, projectData);
    },
    loadProject: function (projectPath) {
        return ipcRenderer.invoke('project:load', projectPath);
    },
    openProjectFolder: function () {
        return ipcRenderer.invoke('project:openFolder');
    },
    openProjectFile: function () {
        return ipcRenderer.invoke('project:openFile');
    },
    getRecentProjects: function () {
        return ipcRenderer.invoke('project:getRecent');
    },
    removeRecentProject: function (projectPath) {
        return ipcRenderer.invoke('project:removeRecent', projectPath);
    },
    copyAssetToProject: function (sourcePath, projectPath, assetType) {
        return ipcRenderer.invoke('project:copyAsset', sourcePath, projectPath, assetType);
    },
    resolveProjectPath: function (projectPath, relativePath) {
        return ipcRenderer.invoke('project:resolvePath', projectPath, relativePath);
    },
    getProjectSFXFiles: function (projectPath) {
        return ipcRenderer.invoke('project:getSFXFiles', projectPath);
    },
    getProjectExports: function (projectPath) {
        return ipcRenderer.invoke('project:getExports', projectPath);
    },
    fileExists: function (filePath) {
        return ipcRenderer.invoke('project:fileExists', filePath);
    },
    deleteFile: function (filePath) {
        return ipcRenderer.invoke('project:deleteFile', filePath);
    },
    showInFolder: function (filePath) {
        return ipcRenderer.invoke('project:showInFolder', filePath);
    },
    isValidProject: function (projectPath) {
        return ipcRenderer.invoke('project:isValid', projectPath);
    },
    // FreeSound APIs (API key only - no OAuth)
    freesoundSearch: function (params) {
        return ipcRenderer.invoke('freesound:search', params);
    },
    freesoundGetSound: function (soundId) {
        return ipcRenderer.invoke('freesound:getSound', soundId);
    },
    freesoundDownloadPreview: function (previewUrl, outputPath) {
        return ipcRenderer.invoke('freesound:downloadPreview', previewUrl, outputPath);
    },
    // App state management
    setUnsavedChanges: function (hasChanges) {
        return ipcRenderer.invoke('app:setUnsavedChanges', hasChanges);
    },
    getUnsavedChanges: function () {
        return ipcRenderer.invoke('app:getUnsavedChanges');
    }
});
// Expose electron object for IPC event listeners (needed for progress tracking)
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        on: function (channel, func) {
            var validChannels = ['render-progress', 'render-speed'];
            if (validChannels.includes(channel)) {
                ipcRenderer.on(channel, func);
            }
        },
        removeListener: function (channel, func) {
            var validChannels = ['render-progress', 'render-speed'];
            if (validChannels.includes(channel)) {
                ipcRenderer.removeListener(channel, func);
            }
        }
    }
});
