import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import { app } from 'electron'

// Constants for project structure
const PROJECT_FILE = 'project.json'
const ASSETS_DIR = 'assets'
const SOURCE_DIR = 'assets/source'
const SFX_DIR = 'assets/sfx'
const EXPORTS_DIR = 'assets/exports'
const RECENT_PROJECTS_FILE = 'recent-projects.json'
const MAX_RECENT_PROJECTS = 10

/**
 * Get the path to store recent projects list
 */
function getRecentProjectsPath(): string {
  return path.join(app.getPath('userData'), RECENT_PROJECTS_FILE)
}

/**
 * Create project folder structure
 */
export async function createProjectStructure(projectPath: string): Promise<void> {
  // Create main project directory
  await fs.mkdir(projectPath, { recursive: true })

  // Create subdirectories
  await fs.mkdir(path.join(projectPath, SOURCE_DIR), { recursive: true })
  await fs.mkdir(path.join(projectPath, SFX_DIR), { recursive: true })
  await fs.mkdir(path.join(projectPath, EXPORTS_DIR), { recursive: true })
}

/**
 * Check if a path is a valid project folder
 */
export async function isValidProject(projectPath: string): Promise<boolean> {
  try {
    const projectFilePath = path.join(projectPath, PROJECT_FILE)
    await fs.access(projectFilePath)
    return true
  } catch {
    return false
  }
}

/**
 * Save project data to project.json
 */
export async function saveProject(projectPath: string, projectData: any): Promise<void> {
  const projectFilePath = path.join(projectPath, PROJECT_FILE)
  const jsonData = JSON.stringify(projectData, null, 2)
  await fs.writeFile(projectFilePath, jsonData, 'utf-8')
}

/**
 * Load project data from project.json
 */
export async function loadProject(projectPath: string): Promise<any> {
  const projectFilePath = path.join(projectPath, PROJECT_FILE)
  const jsonData = await fs.readFile(projectFilePath, 'utf-8')
  return JSON.parse(jsonData)
}

/**
 * Copy a file into the project's assets directory
 */
export async function copyAssetToProject(
  sourcePath: string,
  projectPath: string,
  assetType: 'source' | 'sfx' | 'exports'
): Promise<string> {
  const fileName = path.basename(sourcePath)
  const destDir = path.join(projectPath, ASSETS_DIR, assetType)
  const destPath = path.join(destDir, fileName)

  // Ensure destination directory exists
  await fs.mkdir(destDir, { recursive: true })

  // Copy file
  await fs.copyFile(sourcePath, destPath)

  // Return relative path from project root
  return path.relative(projectPath, destPath)
}

/**
 * Get absolute path from relative path within project
 */
export function resolveProjectPath(projectPath: string, relativePath: string): string {
  return path.join(projectPath, relativePath)
}

/**
 * Get recent projects list
 */
export async function getRecentProjects(): Promise<any[]> {
  try {
    const recentPath = getRecentProjectsPath()
    const data = await fs.readFile(recentPath, 'utf-8')
    const projects = JSON.parse(data)

    // Filter out projects that no longer exist
    const validProjects = []
    for (const project of projects) {
      if (await isValidProject(project.path)) {
        validProjects.push(project)
      }
    }

    return validProjects
  } catch {
    // No recent projects file yet
    return []
  }
}

/**
 * Add or update a project in recent projects list
 */
export async function addToRecentProjects(projectPath: string, projectName: string): Promise<void> {
  const recentPath = getRecentProjectsPath()
  let projects = await getRecentProjects()

  // Remove existing entry if present
  projects = projects.filter(p => p.path !== projectPath)

  // Add to front of list
  projects.unshift({
    path: projectPath,
    name: projectName,
    lastOpened: new Date().toISOString()
  })

  // Keep only MAX_RECENT_PROJECTS
  projects = projects.slice(0, MAX_RECENT_PROJECTS)

  // Save
  await fs.writeFile(recentPath, JSON.stringify(projects, null, 2), 'utf-8')
}

/**
 * Remove a project from recent projects list
 */
export async function removeFromRecentProjects(projectPath: string): Promise<void> {
  const recentPath = getRecentProjectsPath()
  let projects = await getRecentProjects()

  projects = projects.filter(p => p.path !== projectPath)

  await fs.writeFile(recentPath, JSON.stringify(projects, null, 2), 'utf-8')
}

/**
 * Get list of SFX files in project
 */
export async function getProjectSFXFiles(projectPath: string): Promise<string[]> {
  try {
    const sfxDir = path.join(projectPath, SFX_DIR)
    const files = await fs.readdir(sfxDir)
    return files.filter(f => f.endsWith('.wav') || f.endsWith('.mp3'))
  } catch {
    return []
  }
}

/**
 * Get list of exported videos in project
 */
export async function getProjectExports(projectPath: string): Promise<string[]> {
  try {
    const exportsDir = path.join(projectPath, EXPORTS_DIR)
    const files = await fs.readdir(exportsDir)
    return files.filter(f => f.endsWith('.mp4') || f.endsWith('.mov'))
  } catch {
    return []
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Delete a file
 */
export async function deleteFile(filePath: string): Promise<void> {
  await fs.unlink(filePath)
}

/**
 * Generate unique filename to avoid conflicts
 */
export function generateUniqueFilename(directory: string, originalName: string): string {
  const ext = path.extname(originalName)
  const base = path.basename(originalName, ext)
  let counter = 1
  let newName = originalName

  while (fsSync.existsSync(path.join(directory, newName))) {
    newName = `${base}-${counter}${ext}`
    counter++
  }

  return newName
}
