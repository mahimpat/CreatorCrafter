import { v4 as uuidv4 } from 'uuid';
import log from 'electron-log';
import { Project } from '../../common/types';
import { DatabaseService } from './database-service';
import { VideoService } from './video-service';
import { CaptionService } from './caption-service';
import { OverlayService } from './overlay-service';
import { SFXService } from './sfx-service';

export class ProjectService {
  constructor(
    private db: DatabaseService,
    private videoService: VideoService,
    private captionService: CaptionService,
    private overlayService: OverlayService,
    private sfxService: SFXService
  ) {}

  async initialize(): Promise<void> {
    log.info('Project service initialized');
  }

  async createProject(name: string): Promise<Project> {
    const project: Project = {
      id: uuidv4(),
      name,
      videoPath: '',
      videoMetadata: {} as any,
      captions: [],
      textOverlays: [],
      soundEffects: [],
      timeline: { currentTime: 0, zoom: 1, selectedItems: [], playbackRate: 1, isPlaying: false },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.db.saveProject(project);
    return project;
  }

  async openProject(projectId: string): Promise<Project> {
    const project = this.db.getProject(projectId);
    if (!project) throw new Error('Project not found');
    return project;
  }

  async saveProject(project: Project): Promise<void> {
    this.db.saveProject(project);
  }

  async closeProject(projectId: string): Promise<void> {
    log.info('Closing project:', projectId);
  }

  async listProjects(): Promise<any[]> {
    return this.db.listProjects();
  }

  async deleteProject(projectId: string): Promise<void> {
    this.db.deleteProject(projectId);
  }
}
