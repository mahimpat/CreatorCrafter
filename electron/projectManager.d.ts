/**
 * Create project folder structure
 */
export declare function createProjectStructure(projectPath: string): Promise<void>;
/**
 * Check if a path is a valid project folder
 */
export declare function isValidProject(projectPath: string): Promise<boolean>;
/**
 * Save project data to project.json
 */
export declare function saveProject(projectPath: string, projectData: any): Promise<void>;
/**
 * Load project data from project.json
 */
export declare function loadProject(projectPath: string): Promise<any>;
/**
 * Copy a file into the project's assets directory
 */
export declare function copyAssetToProject(sourcePath: string, projectPath: string, assetType: 'source' | 'sfx' | 'exports'): Promise<string>;
/**
 * Get absolute path from relative path within project
 */
export declare function resolveProjectPath(projectPath: string, relativePath: string): string;
/**
 * Get recent projects list
 */
export declare function getRecentProjects(): Promise<any[]>;
/**
 * Add or update a project in recent projects list
 */
export declare function addToRecentProjects(projectPath: string, projectName: string): Promise<void>;
/**
 * Remove a project from recent projects list
 */
export declare function removeFromRecentProjects(projectPath: string): Promise<void>;
/**
 * Get list of SFX files in project
 */
export declare function getProjectSFXFiles(projectPath: string): Promise<string[]>;
/**
 * Get list of exported videos in project
 */
export declare function getProjectExports(projectPath: string): Promise<string[]>;
/**
 * Check if file exists
 */
export declare function fileExists(filePath: string): Promise<boolean>;
/**
 * Delete a file
 */
export declare function deleteFile(filePath: string): Promise<void>;
/**
 * Generate unique filename to avoid conflicts
 */
export declare function generateUniqueFilename(directory: string, originalName: string): string;
