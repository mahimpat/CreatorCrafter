import { v4 as uuidv4 } from 'uuid';
import log from 'electron-log';
import { Caption, Transcription } from '../../common/types';
import { DEFAULT_CAPTION_STYLE } from '../../common/constants';
import { PythonBridgeService } from './python-bridge-service';
import { DatabaseService } from './database-service';

export class CaptionService {
  constructor(private pythonBridge: PythonBridgeService, private db: DatabaseService) {}

  async initialize(): Promise<void> {
    log.info('Caption service initialized');
  }

  async generateCaptions(videoPath: string, language: string): Promise<Caption[]> {
    log.info('Generating captions for:', videoPath);
    const transcription = await this.pythonBridge.transcribeAudio(videoPath, language);

    return transcription.segments.map((segment: any) => ({
      id: uuidv4(),
      startTime: segment.startTime,
      endTime: segment.endTime,
      text: segment.text,
      style: DEFAULT_CAPTION_STYLE,
      confidence: segment.confidence,
    }));
  }

  async addCaption(projectId: string, caption: Partial<Caption>): Promise<Caption> {
    const newCaption: Caption = {
      id: uuidv4(),
      startTime: caption.startTime || 0,
      endTime: caption.endTime || 1,
      text: caption.text || '',
      style: caption.style || DEFAULT_CAPTION_STYLE,
      confidence: caption.confidence,
    };
    return newCaption;
  }

  async updateCaption(projectId: string, caption: Caption): Promise<Caption> {
    return caption;
  }

  async deleteCaption(projectId: string, captionId: string): Promise<void> {
    log.info('Deleting caption:', captionId);
  }

  async exportCaptions(projectId: string, format: string): Promise<string> {
    const project = this.db.getProject(projectId);
    if (!project) throw new Error('Project not found');

    // Stub: Convert captions to SRT, VTT, etc.
    return '/path/to/exported/captions.' + format;
  }
}
