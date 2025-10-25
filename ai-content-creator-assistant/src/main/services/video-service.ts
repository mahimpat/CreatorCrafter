/**
 * Video Service
 * Handles video upload, processing, metadata extraction, and FFmpeg operations
 */

import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import log from 'electron-log';
import { v4 as uuidv4 } from 'uuid';
import { VideoMetadata, VideoAnalysis } from '../../common/types';
import { PythonBridgeService } from './python-bridge-service';

export class VideoService {
  private videoCacheDir: string;
  private pythonBridge: PythonBridgeService;

  constructor(pythonBridge: PythonBridgeService) {
    this.pythonBridge = pythonBridge;
    const userDataPath = app.getPath('userData');
    this.videoCacheDir = path.join(userDataPath, 'video-cache');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.videoCacheDir, { recursive: true });
    log.info('Video service initialized');
  }

  async uploadVideo(filePath: string): Promise<{ videoId: string; metadata: VideoMetadata }> {
    log.info('Uploading video:', filePath);

    const videoId = uuidv4();
    const ext = path.extname(filePath);
    const cachePath = path.join(this.videoCacheDir, videoId + ext);

    await fs.copyFile(filePath, cachePath);
    const metadata = await this.getMetadata(cachePath);

    return { videoId, metadata };
  }

  async getMetadata(videoPath: string): Promise<VideoMetadata> {
    // Stub: In production, use FFprobe
    return {
      duration: 120,
      width: 1920,
      height: 1080,
      fps: 30,
      codec: 'h264',
      bitrate: 5000000,
      size: 50000000,
      format: 'mp4',
      hasAudio: true,
      audioCodec: 'aac',
      audioChannels: 2,
      audioSampleRate: 48000,
    };
  }

  async analyzeVideo(videoPath: string): Promise<VideoAnalysis> {
    return await this.pythonBridge.analyzeVideo(videoPath);
  }

  async extractAudio(videoPath: string): Promise<string> {
    const audioPath = videoPath.replace(/\.[^.]+$/, '.wav');
    log.info('Extracting audio to:', audioPath);
    return audioPath;
  }

  async getFrame(videoPath: string, timestamp: number): Promise<string> {
    const framePath = path.join(this.videoCacheDir, 'frame-' + uuidv4() + '.jpg');
    return framePath;
  }

  async getThumbnail(videoPath: string): Promise<string> {
    return await this.getFrame(videoPath, 0);
  }
}
