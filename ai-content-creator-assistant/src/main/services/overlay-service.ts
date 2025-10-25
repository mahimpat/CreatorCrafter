import { v4 as uuidv4 } from 'uuid';
import log from 'electron-log';
import { TextOverlay } from '../../common/types';
import { DEFAULT_OVERLAY_STYLE } from '../../common/constants';
import { DatabaseService } from './database-service';

export class OverlayService {
  constructor(private db: DatabaseService) {}

  async initialize(): Promise<void> {
    log.info('Overlay service initialized');
  }

  async addOverlay(projectId: string, overlay: Partial<TextOverlay>): Promise<TextOverlay> {
    const newOverlay: TextOverlay = {
      id: uuidv4(),
      text: overlay.text || '',
      startTime: overlay.startTime || 0,
      endTime: overlay.endTime || 1,
      position: overlay.position || { x: 50, y: 50 },
      style: overlay.style || DEFAULT_OVERLAY_STYLE,
      layer: overlay.layer || 1,
      animation: overlay.animation,
    };
    return newOverlay;
  }

  async updateOverlay(projectId: string, overlay: TextOverlay): Promise<TextOverlay> {
    return overlay;
  }

  async deleteOverlay(projectId: string, overlayId: string): Promise<void> {
    log.info('Deleting overlay:', overlayId);
  }
}
