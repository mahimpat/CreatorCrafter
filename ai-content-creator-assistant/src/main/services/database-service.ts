/**
 * Database Service
 *
 * Manages local SQLite database for projects, settings, and metadata.
 * Uses better-sqlite3 for synchronous, high-performance access.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';
import { Project } from '../../common/types';
import { DB_VERSION } from '../../common/constants';

export class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    // Store database in user data directory
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'ai-content-creator.db');
  }

  /**
   * Initialize database and create tables
   */
  async initialize(): Promise<void> {
    log.info('Initializing database at:', this.dbPath);

    try {
      this.db = new Database(this.dbPath);

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');

      // Create tables
      this.createTables();

      // Run migrations if needed
      this.runMigrations();

      log.info('Database initialized successfully');
    } catch (error) {
      log.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        video_path TEXT NOT NULL,
        video_metadata TEXT NOT NULL,
        timeline_state TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Captions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS captions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        start_time REAL NOT NULL,
        end_time REAL NOT NULL,
        text TEXT NOT NULL,
        style TEXT NOT NULL,
        confidence REAL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Text overlays table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS text_overlays (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        text TEXT NOT NULL,
        start_time REAL NOT NULL,
        end_time REAL NOT NULL,
        position TEXT NOT NULL,
        style TEXT NOT NULL,
        layer INTEGER NOT NULL,
        animation TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Sound effects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sound_effects (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        start_time REAL NOT NULL,
        duration REAL NOT NULL,
        volume REAL NOT NULL,
        audio_path TEXT,
        prompt TEXT,
        category TEXT,
        is_generated INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Schema version table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      )
    `);

    // Insert initial schema version
    const versionExists = this.db.prepare('SELECT version FROM schema_version').get();
    if (!versionExists) {
      this.db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(DB_VERSION);
    }

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_captions_project_id ON captions(project_id);
      CREATE INDEX IF NOT EXISTS idx_overlays_project_id ON text_overlays(project_id);
      CREATE INDEX IF NOT EXISTS idx_sfx_project_id ON sound_effects(project_id);
    `);
  }

  /**
   * Run database migrations
   */
  private runMigrations(): void {
    if (!this.db) throw new Error('Database not initialized');

    const currentVersion = this.db.prepare('SELECT version FROM schema_version').get() as { version: number };

    if (currentVersion.version < DB_VERSION) {
      log.info(`Running migrations from v${currentVersion.version} to v${DB_VERSION}`);

      // Add migration logic here as schema evolves
      // Example:
      // if (currentVersion.version < 2) {
      //   this.db.exec('ALTER TABLE projects ADD COLUMN new_field TEXT');
      // }

      this.db.prepare('UPDATE schema_version SET version = ?').run(DB_VERSION);
      log.info('Migrations completed');
    }
  }

  /**
   * Get project by ID
   */
  getProject(projectId: string): Project | null {
    if (!this.db) throw new Error('Database not initialized');

    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;

    if (!row) return null;

    // Load related data
    const captions = this.db.prepare('SELECT * FROM captions WHERE project_id = ?').all(projectId);
    const overlays = this.db.prepare('SELECT * FROM text_overlays WHERE project_id = ?').all(projectId);
    const soundEffects = this.db.prepare('SELECT * FROM sound_effects WHERE project_id = ?').all(projectId);

    return {
      id: row.id,
      name: row.name,
      videoPath: row.video_path,
      videoMetadata: JSON.parse(row.video_metadata),
      timeline: JSON.parse(row.timeline_state),
      captions: captions.map((c: any) => ({
        ...c,
        style: JSON.parse(c.style),
      })),
      textOverlays: overlays.map((o: any) => ({
        ...o,
        position: JSON.parse(o.position),
        style: JSON.parse(o.style),
        animation: o.animation ? JSON.parse(o.animation) : undefined,
      })),
      soundEffects: soundEffects.map((s: any) => ({
        ...s,
        isGenerated: Boolean(s.is_generated),
        metadata: s.metadata ? JSON.parse(s.metadata) : undefined,
      })),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Save or update project
   */
  saveProject(project: Project): void {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(() => {
      // Upsert project
      this.db!.prepare(`
        INSERT INTO projects (id, name, video_path, video_metadata, timeline_state, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          video_path = excluded.video_path,
          video_metadata = excluded.video_metadata,
          timeline_state = excluded.timeline_state,
          updated_at = excluded.updated_at
      `).run(
        project.id,
        project.name,
        project.videoPath,
        JSON.stringify(project.videoMetadata),
        JSON.stringify(project.timeline),
        project.createdAt.toISOString(),
        new Date().toISOString()
      );

      // Delete existing related data
      this.db!.prepare('DELETE FROM captions WHERE project_id = ?').run(project.id);
      this.db!.prepare('DELETE FROM text_overlays WHERE project_id = ?').run(project.id);
      this.db!.prepare('DELETE FROM sound_effects WHERE project_id = ?').run(project.id);

      // Insert captions
      const captionStmt = this.db!.prepare(`
        INSERT INTO captions (id, project_id, start_time, end_time, text, style, confidence)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const caption of project.captions) {
        captionStmt.run(
          caption.id,
          project.id,
          caption.startTime,
          caption.endTime,
          caption.text,
          JSON.stringify(caption.style),
          caption.confidence ?? null
        );
      }

      // Insert overlays
      const overlayStmt = this.db!.prepare(`
        INSERT INTO text_overlays (id, project_id, text, start_time, end_time, position, style, layer, animation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const overlay of project.textOverlays) {
        overlayStmt.run(
          overlay.id,
          project.id,
          overlay.text,
          overlay.startTime,
          overlay.endTime,
          JSON.stringify(overlay.position),
          JSON.stringify(overlay.style),
          overlay.layer,
          overlay.animation ? JSON.stringify(overlay.animation) : null
        );
      }

      // Insert sound effects
      const sfxStmt = this.db!.prepare(`
        INSERT INTO sound_effects (id, project_id, name, start_time, duration, volume, audio_path, prompt, category, is_generated, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const sfx of project.soundEffects) {
        sfxStmt.run(
          sfx.id,
          project.id,
          sfx.name,
          sfx.startTime,
          sfx.duration,
          sfx.volume,
          sfx.audioPath ?? null,
          sfx.prompt ?? null,
          sfx.category ?? null,
          sfx.isGenerated ? 1 : 0,
          sfx.metadata ? JSON.stringify(sfx.metadata) : null
        );
      }
    });

    transaction();
  }

  /**
   * List all projects
   */
  listProjects(): Array<{ id: string; name: string; createdAt: Date; updatedAt: Date }> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = this.db.prepare('SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC').all() as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  /**
   * Delete project
   */
  deleteProject(projectId: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
  }

  /**
   * Get setting value
   */
  getSetting(key: string): string | null {
    if (!this.db) throw new Error('Database not initialized');

    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  /**
   * Set setting value
   */
  setSetting(key: string, value: string): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
  }

  /**
   * Cleanup and close database
   */
  async cleanup(): Promise<void> {
    if (this.db) {
      log.info('Closing database...');
      this.db.close();
      this.db = null;
    }
  }
}
